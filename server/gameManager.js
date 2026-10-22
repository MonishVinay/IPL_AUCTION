const { TEAMS } = require("./data/teams");
const { SQUADS } = require("./data/squads");
const { BONUS_PLAYERS } = require("./data/bonusPlayers");

// Standard IPL retention deduction slab (in ₹ Crores)
// 1st: 18 Cr, 2nd: 14 Cr, 3rd: 11 Cr, 4th: 18 Cr, 5th: 14 Cr, 6th: 4 Cr (uncapped)
const RETENTION_SLABS = [18.0, 14.0, 11.0, 18.0, 14.0, 4.0];

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomCode -> roomState
    this.playerSockets = new Map(); // socketId -> { roomCode, playerId }
  }

  generateRoomCode() {
    let code;
    do {
      code = Math.random().toString(36).substring(2, 7).toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId, hostName) {
    const roomCode = this.generateRoomCode();
    const playerId = `player_${Math.random().toString(36).substr(2, 9)}`;

    const room = {
      code: roomCode,
      hostId: playerId,
      status: "LOBBY", // LOBBY, RETENTION, POOL_PREVIEW, AUCTION, RTM_CHALLENGE, POST_AUCTION
      settings: {
        purse: 120.0, // in Crores
        maxRetentions: 4, // 0 to 6
        retentionMode: "official", // "official" slabs or "flat" (10 Cr)
        flatRetentionCost: 10.0,
        maxRTM: 2, // 0 to 6
        minSquad: 18,
        maxSquad: 25,
        maxOverseas: 8,
        includeBonusPlayers: true,
        bidTimerSeconds: 20, // Increased default timer for better tactical play
        antiSnipeSeconds: 8, // Reset timer to at least 8s if bid comes under 8s
        poolPreviewSeconds: 8
      },
      players: [
        {
          id: playerId,
          name: hostName || "Host",
          socketId: hostSocketId,
          isHost: true,
          teamId: null, // chosen franchise
          retentionsLocked: false
        }
      ],
      teamsState: {}, // teamId -> { purse, spent, squad: [], retained: [], rtmCardsLeft: 0 }
      pools: [], // organized auction sets
      currentPoolIndex: -1,
      currentPool: null,
      currentPoolPlayerIndex: -1,
      poolPreviewTimeLeft: 0,
      currentPlayer: null,
      currentBid: 0,
      currentBidder: null, // teamId
      bidHistory: [],
      passedTeams: [], // teamIds that clicked "Pass" on the current player
      timer: null,
      transitionTimeout: null,
      timeLeft: 0,
      rtmState: null, // active RTM request
      lastSale: null, // { player, buyerTeamId, amount, viaRTM }
      unsoldPool: [],
      soldCount: 0
    };

    this.rooms.set(roomCode, room);
    this.playerSockets.set(hostSocketId, { roomCode, playerId });
    return { roomCode, playerId, room: this.getSanitizedRoom(room) };
  }

  joinRoom(socketId, roomCode, playerName) {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);

    if (!room) {
      return { error: "Room not found. Check the code." };
    }

    if (room.status !== "LOBBY") {
      return { error: "Auction is already in progress or completed." };
    }

    if (room.players.length >= 10) {
      return { error: "Room is already full (maximum 10 players)." };
    }

    const playerId = `player_${Math.random().toString(36).substr(2, 9)}`;
    const newPlayer = {
      id: playerId,
      name: playerName || `Player ${room.players.length + 1}`,
      socketId,
      isHost: false,
      teamId: null,
      retentionsLocked: false
    };

    room.players.push(newPlayer);
    this.playerSockets.set(socketId, { roomCode: code, playerId });
    return { roomCode: code, playerId, room: this.getSanitizedRoom(room) };
  }

  selectTeam(socketId, teamId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in a room" };

    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "LOBBY") return { error: "Cannot change team now" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player) return { error: "Player not found" };

    const taken = room.players.some((p) => p.teamId === teamId && p.id !== player.id);
    if (taken) {
      return { error: "This franchise is already selected by another player." };
    }

    player.teamId = teamId;
    return { success: true, room: this.getSanitizedRoom(room) };
  }

  updateSettings(socketId, newSettings) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in a room" };

    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "LOBBY") return { error: "Cannot modify settings now" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || !player.isHost) return { error: "Only the host can adjust settings." };

    room.settings = {
      ...room.settings,
      purse: Math.max(50, Math.min(200, Number(newSettings.purse) || 120)),
      maxRetentions: Math.max(0, Math.min(6, Number(newSettings.maxRetentions) ?? 4)),
      retentionMode: newSettings.retentionMode === "flat" ? "flat" : "official",
      flatRetentionCost: Math.max(1, Math.min(25, Number(newSettings.flatRetentionCost) || 10)),
      maxRTM: Math.max(0, Math.min(6, Number(newSettings.maxRTM) ?? 2)),
      minSquad: Math.max(11, Math.min(20, Number(newSettings.minSquad) || 18)),
      maxSquad: Math.max(18, Math.min(25, Number(newSettings.maxSquad) || 25)),
      includeBonusPlayers: Boolean(newSettings.includeBonusPlayers),
      bidTimerSeconds: Math.max(10, Math.min(60, Number(newSettings.bidTimerSeconds) || 20))
    };

    return { success: true, room: this.getSanitizedRoom(room) };
  }

  getRetentionSlotCost(room, slotIndex) {
    if (room.settings.retentionMode === "flat") {
      return room.settings.flatRetentionCost;
    }
    return RETENTION_SLABS[slotIndex] !== undefined ? RETENTION_SLABS[slotIndex] : 4.0;
  }

  calculateRetentionCost(room, count) {
    if (count <= 0) return 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.getRetentionSlotCost(room, i);
    }
    return total;
  }

  startRetentionPhase(socketId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in a room" };

    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "LOBBY") return { error: "Game already started" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || !player.isHost) return { error: "Only host can start the game" };

    const unpicked = room.players.filter((p) => !p.teamId);
    if (unpicked.length > 0) {
      return { error: `All players must pick a franchise before starting (${unpicked.map(p => p.name).join(", ")} haven't picked yet).` };
    }

    room.teamsState = {};
    room.players.forEach((p) => {
      room.teamsState[p.teamId] = {
        ownerName: p.name,
        ownerId: p.id,
        purse: room.settings.purse,
        spent: 0,
        squad: [],
        retained: [],
        rtmCardsLeft: room.settings.maxRTM
      };
    });

    if (room.settings.maxRetentions === 0) {
      this.buildAuctionPoolsAndStart(room);
    } else {
      room.status = "RETENTION";
    }

    return { success: true, room: this.getSanitizedRoom(room) };
  }

  toggleRetentionPlayer(socketId, playerId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };

    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "RETENTION") return { error: "Not in retention phase" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || !player.teamId) return { error: "Player not assigned to a team" };
    if (player.retentionsLocked) return { error: "Your retentions are already locked" };

    const teamState = room.teamsState[player.teamId];
    const playerRecord = SQUADS.find((s) => s.id === playerId && s.originalTeamId === player.teamId);
    if (!playerRecord) return { error: "Player does not belong to your original franchise" };

    const idx = teamState.retained.findIndex((r) => r.id === playerId);
    if (idx >= 0) {
      teamState.retained.splice(idx, 1);
    } else {
      if (teamState.retained.length >= room.settings.maxRetentions) {
        return { error: `Maximum ${room.settings.maxRetentions} retentions allowed.` };
      }
      teamState.retained.push(playerRecord);
    }

    teamState.retained = teamState.retained.map((p, slotIdx) => ({
      ...p,
      slotNumber: slotIdx + 1,
      cost: this.getRetentionSlotCost(room, slotIdx)
    }));

    const totalCost = teamState.retained.reduce((acc, p) => acc + p.cost, 0);
    teamState.spent = totalCost;
    teamState.purse = +(room.settings.purse - totalCost).toFixed(2);

    return { success: true, room: this.getSanitizedRoom(room) };
  }

  lockRetentions(socketId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };

    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "RETENTION") return { error: "Not in retention phase" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player) return { error: "Player not found" };

    player.retentionsLocked = true;

    const teamState = room.teamsState[player.teamId];
    teamState.squad = [...teamState.retained];
    teamState.rtmCardsLeft = Math.max(0, room.settings.maxRTM);

    const allLocked = room.players.every((p) => p.retentionsLocked);
    if (allLocked) {
      this.buildAuctionPoolsAndStart(room);
    }

    return { success: true, room: this.getSanitizedRoom(room) };
  }

  // ==================== POOL & SET MANAGEMENT ====================
  buildAuctionPoolsAndStart(room) {
    const retainedIds = new Set();
    Object.values(room.teamsState).forEach((t) => {
      t.retained.forEach((r) => retainedIds.add(r.id));
    });

    // 1. All squad players that are not retained
    let pool = SQUADS.filter((player) => !retainedIds.has(player.id));

    // Global de-duplication registry: guarantees NO player appears in more than 1 pool
    const seenIds = new Set();
    const takeUnique = (list) => {
      const result = [];
      for (const p of list) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          result.push(p);
        }
      }
      return result;
    };

    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

    // Build real IPL Auction Sets:
    // Set 1: Marquee Superstars (M1) — Key players from squads
    const marquee = pool.filter((p) => p.isKeyPlayer);

    // Set 2: Capped Batters (BA1)
    const cappedBatters = pool.filter((p) => !p.isKeyPlayer && p.role === "BAT" && p.basePrice >= 1.0);

    // Set 3: Capped Wicketkeepers (WK1)
    const cappedKeepers = pool.filter((p) => !p.isKeyPlayer && p.role === "WK" && p.basePrice >= 1.0);

    // Set 4: Capped All-Rounders (AL1)
    const cappedAllrounders = pool.filter((p) => !p.isKeyPlayer && p.role === "ALL" && p.basePrice >= 1.0);

    // Set 5: Capped Fast Bowlers (FA1)
    const cappedPacers = pool.filter((p) => !p.isKeyPlayer && p.role === "PACE" && p.basePrice >= 1.0);

    // Set 6: Capped Spinners (SP1)
    const cappedSpinners = pool.filter((p) => !p.isKeyPlayer && p.role === "SPIN" && p.basePrice >= 1.0);

    // Set 7: Uncapped Talents (UNCAP)
    const uncapped = pool.filter((p) => !p.isKeyPlayer && p.basePrice < 1.0);

    const rawSets = [
      {
        id: "set_m1",
        code: "M1",
        name: "Set 1: Marquee Superstars",
        description: "World-class match winners & marquee franchise icons",
        players: shuffle(takeUnique(marquee))
      },
      {
        id: "set_ba1",
        code: "BA1",
        name: "Set 2: Capped Batters",
        description: "Proven international & domestic top-order specialists",
        players: shuffle(takeUnique(cappedBatters))
      },
      {
        id: "set_wk1",
        code: "WK1",
        name: "Set 3: Capped Wicketkeepers",
        description: "Explosive glovemen & middle-order finishers",
        players: shuffle(takeUnique(cappedKeepers))
      },
      {
        id: "set_al1",
        code: "AL1",
        name: "Set 4: Capped All-Rounders",
        description: "Dual-threat pace & spin bowling all-rounders",
        players: shuffle(takeUnique(cappedAllrounders))
      },
      {
        id: "set_fa1",
        code: "FA1",
        name: "Set 5: Capped Fast Bowlers",
        description: "Express speedsters, swing masters & death overs specialists",
        players: shuffle(takeUnique(cappedPacers))
      },
      {
        id: "set_sp1",
        code: "SP1",
        name: "Set 6: Capped Spinners",
        description: "Wrist spinners, mystery turners & middle-overs controllers",
        players: shuffle(takeUnique(cappedSpinners))
      },
      {
        id: "set_uncap",
        code: "UNCAP",
        name: "Set 7: Uncapped Emerging Stars",
        description: "Exciting domestic prodigies & rising Indian stars",
        players: shuffle(takeUnique(uncapped))
      }
    ];

    // Optional Bonus Pool (STAR)
    if (room.settings.includeBonusPlayers && BONUS_PLAYERS.length > 0) {
      rawSets.push({
        id: "set_star",
        code: "STAR",
        name: "Set 8: Global Wildcard Legends",
        description: "Bonus international stars & world cricket legends",
        players: shuffle(takeUnique(BONUS_PLAYERS))
      });
    }

    room.pools = rawSets.filter((s) => s.players.length > 0);
    room.currentPoolIndex = 0;
    room.unsoldPool = [];
    room.soldCount = 0;

    this.startPoolPreview(room, 0);
  }

  startPoolPreview(room, poolIndex) {
    this.clearRoomTimer(room);

    if (poolIndex >= room.pools.length) {
      this.finishAuction(room);
      return;
    }

    room.currentPoolIndex = poolIndex;
    room.currentPool = room.pools[poolIndex];
    room.currentPoolPlayerIndex = -1;
    room.status = "POOL_PREVIEW";
    room.poolPreviewTimeLeft = room.settings.poolPreviewSeconds || 8;
    room.currentPlayer = null;
    room.currentBid = 0;
    room.currentBidder = null;
    room.passedTeams = [];
    room.rtmState = null;
    room.lastSale = null;

    this.io.to(room.code).emit("pool_preview_started", {
      pool: room.currentPool,
      poolIndex: room.currentPoolIndex,
      totalPools: room.pools.length,
      timeLeft: room.poolPreviewTimeLeft
    });

    room.timer = setInterval(() => {
      room.poolPreviewTimeLeft -= 1;
      this.io.to(room.code).emit("pool_preview_tick", { timeLeft: room.poolPreviewTimeLeft });

      if (room.poolPreviewTimeLeft <= 0) {
        this.clearRoomTimer(room);
        this.startCurrentPoolAuction(room);
      }
    }, 1000);
  }

  skipPoolPreview(socketId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };
    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "POOL_PREVIEW") return { error: "Not in pool preview" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || !player.isHost) return { error: "Only the host can advance the preview." };

    this.clearRoomTimer(room);
    this.startCurrentPoolAuction(room);
    return { success: true };
  }

  startCurrentPoolAuction(room) {
    room.status = "AUCTION";
    this.presentNextPlayerInPool(room);
  }

  presentNextPlayerInPool(room) {
    this.clearRoomTimer(room);
    room.currentPoolPlayerIndex += 1;
    room.lastSale = null;

    if (room.currentPoolPlayerIndex >= room.currentPool.players.length) {
      if (room.currentPoolIndex + 1 < room.pools.length) {
        this.startPoolPreview(room, room.currentPoolIndex + 1);
      } else {
        this.finishAuction(room);
      }
      return;
    }

    const player = room.currentPool.players[room.currentPoolPlayerIndex];
    room.currentPlayer = player;
    room.currentBid = 0;
    room.currentBidder = null;
    room.bidHistory = [];
    room.passedTeams = []; // Reset passed list for new player
    room.timeLeft = room.settings.bidTimerSeconds;
    room.status = "AUCTION";
    room.rtmState = null;

    this.startCountdown(room);
  }

  getBidIncrement(currentBid, basePrice) {
    if (currentBid === 0) return basePrice;
    if (currentBid < 1.0) return 0.20;
    if (currentBid < 5.0) return 0.25;
    if (currentBid < 10.0) return 0.50;
    return 1.00;
  }

  placeBid(socketId, customAmount = null) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };

    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "AUCTION" || !room.currentPlayer) {
      return { error: "Auction is not open for bidding right now." };
    }

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || !player.teamId) return { error: "No team assigned" };

    const teamId = player.teamId;
    const teamState = room.teamsState[teamId];
    if (!teamState) return { error: "Team state not found" };

    if (room.currentBidder === teamId) {
      return { error: "You are already holding the highest bid!" };
    }

    if (teamState.squad.length >= room.settings.maxSquad) {
      return { error: `Squad is full! Max ${room.settings.maxSquad} players allowed.` };
    }

    if (room.currentPlayer.isOverseas) {
      const overseasCount = teamState.squad.filter((p) => p.isOverseas).length;
      if (overseasCount >= room.settings.maxOverseas) {
        return { error: `Overseas quota full! Max ${room.settings.maxOverseas} overseas players.` };
      }
    }

    let nextBid;
    if (customAmount && Number(customAmount) > room.currentBid) {
      nextBid = +Number(customAmount).toFixed(2);
    } else {
      if (room.currentBid === 0) {
        nextBid = +room.currentPlayer.basePrice.toFixed(2);
      } else {
        const inc = this.getBidIncrement(room.currentBid, room.currentPlayer.basePrice);
        nextBid = +(room.currentBid + inc).toFixed(2);
      }
    }

    // Direct, reliable purse check (no strict reserve equation locking out bids)
    if (teamState.purse < nextBid) {
      return {
        error: `Insufficient purse! You have ₹${teamState.purse.toFixed(2)} Cr remaining, but this bid requires ₹${nextBid.toFixed(2)} Cr.`
      };
    }

    room.currentBid = nextBid;
    room.currentBidder = teamId;
    room.passedTeams = []; // Reset passed list whenever a new bid is placed!

    room.bidHistory.unshift({
      teamId,
      teamName: TEAMS.find((t) => t.id === teamId)?.name || teamId,
      amount: nextBid,
      time: new Date().toLocaleTimeString()
    });

    // Anti-sniping reset
    if (room.timeLeft < room.settings.antiSnipeSeconds) {
      room.timeLeft = room.settings.antiSnipeSeconds;
    }

    this.io.to(room.code).emit("bid_updated", {
      currentBid: room.currentBid,
      currentBidder: room.currentBidder,
      bidHistory: room.bidHistory,
      timeLeft: room.timeLeft,
      passedTeams: room.passedTeams
    });

    return { success: true };
  }

  passTurn(socketId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };
    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "AUCTION") return { error: "Not in auction" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || !player.teamId) return { error: "No team assigned" };

    if (!room.passedTeams.includes(player.teamId)) {
      room.passedTeams.push(player.teamId);
    }

    this.io.to(room.code).emit("team_passed", {
      teamId: player.teamId,
      playerName: player.name,
      passedTeams: room.passedTeams
    });

    // Fast-Forward Logic:
    // If all competing teams have passed, don't make them wait!
    const allActiveTeams = room.players.map((p) => p.teamId).filter(Boolean);

    let shouldFastForward = false;
    if (room.currentBidder) {
      // Someone is leading: check if all rival teams passed
      const rivalTeams = allActiveTeams.filter((t) => t !== room.currentBidder);
      shouldFastForward = rivalTeams.length > 0 && rivalTeams.every((t) => room.passedTeams.includes(t));
    } else {
      // No bid yet: check if ALL teams passed
      shouldFastForward = allActiveTeams.length > 0 && allActiveTeams.every((t) => room.passedTeams.includes(t));
    }

    if (shouldFastForward) {
      this.clearRoomTimer(room);
      this.io.to(room.code).emit("fast_forward", {
        message: room.currentBidder ? "All rival managers have passed! Gavel striking..." : "All managers passed! Player unsold..."
      });
      room.transitionTimeout = setTimeout(() => {
        this.handleGavelStrike(room);
      }, 1000);
    }

    return { success: true };
  }

  startCountdown(room) {
    this.clearRoomTimer(room);

    this.io.to(room.code).emit("player_presented", {
      currentPlayer: room.currentPlayer,
      currentBid: room.currentBid,
      currentBidder: room.currentBidder,
      bidHistory: room.bidHistory,
      passedTeams: room.passedTeams,
      timeLeft: room.timeLeft,
      currentPool: room.currentPool,
      currentPoolIndex: room.currentPoolIndex,
      currentPoolPlayerIndex: room.currentPoolPlayerIndex,
      poolPlayerCount: room.currentPool.players.length,
      totalPools: room.pools.length
    });

    room.timer = setInterval(() => {
      room.timeLeft -= 1;
      this.io.to(room.code).emit("timer_tick", { timeLeft: room.timeLeft });

      if (room.timeLeft <= 0) {
        this.clearRoomTimer(room);
        this.handleGavelStrike(room);
      }
    }, 1000);
  }

  handleGavelStrike(room) {
    this.clearRoomTimer(room);

    if (room.currentBid === 0 || !room.currentBidder) {
      // UNSOLD
      room.unsoldPool.push(room.currentPlayer);
      room.lastSale = {
        player: room.currentPlayer,
        unsold: true
      };

      this.io.to(room.code).emit("player_unsold", {
        player: room.currentPlayer
      });

      room.transitionTimeout = setTimeout(() => {
        this.presentNextPlayerInPool(room);
      }, 2500);
      return;
    }

    // Check RTM eligibility
    const origTeamId = room.currentPlayer.originalTeamId;
    const winningTeamId = room.currentBidder;
    const origTeamState = origTeamId ? room.teamsState[origTeamId] : null;

    if (
      origTeamId &&
      origTeamState &&
      origTeamId !== winningTeamId &&
      origTeamState.rtmCardsLeft > 0 &&
      origTeamState.purse >= room.currentBid
    ) {
      this.initiateRTM(room, origTeamId, winningTeamId);
      return;
    }

    // Standard Direct Sale
    this.finalizeSale(room, winningTeamId, room.currentBid, false);
  }

  initiateRTM(room, origTeamId, winningTeamId) {
    this.clearRoomTimer(room);
    room.status = "RTM_CHALLENGE";
    room.rtmState = {
      player: room.currentPlayer,
      origTeamId,
      winningTeamId,
      matchAmount: room.currentBid,
      timeLeft: 12
    };

    this.io.to(room.code).emit("rtm_challenge_started", {
      rtmState: room.rtmState
    });

    room.timer = setInterval(() => {
      room.rtmState.timeLeft -= 1;
      this.io.to(room.code).emit("rtm_timer_tick", { timeLeft: room.rtmState.timeLeft });

      if (room.rtmState.timeLeft <= 0) {
        this.clearRoomTimer(room);
        this.io.to(room.code).emit("rtm_declined", {
          origTeamId,
          reason: "Time Expired"
        });
        this.finalizeSale(room, winningTeamId, room.currentBid, false);
      }
    }, 1000);
  }

  respondRTM(socketId, exerciseRTM) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };
    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "RTM_CHALLENGE" || !room.rtmState) {
      return { error: "No active RTM challenge." };
    }

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || player.teamId !== room.rtmState.origTeamId) {
      return { error: "Only the original franchise owner can exercise RTM." };
    }

    this.clearRoomTimer(room);

    if (exerciseRTM) {
      const origTeamState = room.teamsState[room.rtmState.origTeamId];
      origTeamState.rtmCardsLeft = Math.max(0, origTeamState.rtmCardsLeft - 1);

      this.io.to(room.code).emit("rtm_exercised", {
        teamId: room.rtmState.origTeamId,
        player: room.currentPlayer,
        amount: room.rtmState.matchAmount
      });

      this.finalizeSale(room, room.rtmState.origTeamId, room.rtmState.matchAmount, true);
    } else {
      this.io.to(room.code).emit("rtm_declined", {
        origTeamId: room.rtmState.origTeamId,
        reason: "Declined by Franchise"
      });
      this.finalizeSale(room, room.rtmState.winningTeamId, room.rtmState.matchAmount, false);
    }

    return { success: true };
  }

  finalizeSale(room, buyerTeamId, amount, viaRTM = false) {
    this.clearRoomTimer(room);

    const buyer = room.teamsState[buyerTeamId];
    if (buyer) {
      buyer.purse = +(buyer.purse - amount).toFixed(2);
      buyer.spent = +(buyer.spent + amount).toFixed(2);
      buyer.squad.push({
        ...room.currentPlayer,
        boughtFor: amount,
        viaRTM
      });
    }

    room.soldCount += 1;

    const saleInfo = {
      player: room.currentPlayer,
      buyerTeamId,
      amount,
      viaRTM
    };
    room.lastSale = saleInfo;

    this.io.to(room.code).emit("player_sold", {
      ...saleInfo,
      teamsState: room.teamsState
    });

    room.transitionTimeout = setTimeout(() => {
      this.presentNextPlayerInPool(room);
    }, 3500);
  }

  skipCurrentPlayer(socketId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };
    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "AUCTION") return { error: "Not in auction" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || !player.isHost) return { error: "Only the host can skip a player." };

    this.clearRoomTimer(room);
    room.unsoldPool.push(room.currentPlayer);
    this.io.to(room.code).emit("player_unsold", { player: room.currentPlayer, skipped: true });

    room.transitionTimeout = setTimeout(() => {
      this.presentNextPlayerInPool(room);
    }, 1200);

    return { success: true };
  }

  reAuctionUnsold(socketId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };
    const room = this.rooms.get(info.roomCode);
    if (!room) return { error: "Room not found" };

    const player = room.players.find((p) => p.id === info.playerId);
    if (!player || !player.isHost) return { error: "Only the host can trigger re-auction." };

    if (room.unsoldPool.length === 0) {
      return { error: "No unsold players available for re-auction." };
    }

    const accelPool = {
      id: `set_accel_${Date.now()}`,
      code: "ACCEL",
      name: "Accelerated Round: Unsold Players",
      description: "Fast-track re-auction of previously unsold players",
      players: [...room.unsoldPool.sort(() => Math.random() - 0.5)]
    };

    room.pools.push(accelPool);
    room.unsoldPool = [];

    this.io.to(room.code).emit("accelerated_round_started", {
      pool: accelPool,
      count: accelPool.players.length
    });

    this.startPoolPreview(room, room.pools.length - 1);
    return { success: true };
  }

  finishAuction(room) {
    this.clearRoomTimer(room);
    room.status = "POST_AUCTION";

    const ratings = {};
    Object.entries(room.teamsState).forEach(([tId, tState]) => {
      ratings[tId] = this.evaluateSquad(tState.squad);
    });

    this.io.to(room.code).emit("auction_completed", {
      teamsState: room.teamsState,
      unsoldPool: room.unsoldPool,
      ratings
    });
  }

  evaluateSquad(squad) {
    if (!squad || squad.length === 0) {
      return { overall: 0, batting: 0, bowling: 0, balance: 0 };
    }

    const batters = squad.filter((p) => p.role === "BAT" || p.role === "WK").sort((a, b) => b.rating - a.rating);
    const bowlers = squad.filter((p) => p.role === "PACE" || p.role === "SPIN").sort((a, b) => b.rating - a.rating);
    const allrounders = squad.filter((p) => p.role === "ALL").sort((a, b) => b.rating - a.rating);

    const topBatters = batters.slice(0, 5);
    const topBowlers = bowlers.slice(0, 4);

    const avgBat = topBatters.length ? topBatters.reduce((acc, p) => acc + p.rating, 0) / topBatters.length : 60;
    const avgBowl = topBowlers.length ? topBowlers.reduce((acc, p) => acc + p.rating, 0) / topBowlers.length : 60;
    const avgAll = allrounders.length ? allrounders.slice(0, 2).reduce((acc, p) => acc + p.rating, 0) / Math.min(2, allrounders.length) : 65;

    const overall = +(avgBat * 0.4 + avgBowl * 0.4 + avgAll * 0.2).toFixed(1);

    return {
      overall,
      batting: +avgBat.toFixed(1),
      bowling: +avgBowl.toFixed(1),
      balance: +avgAll.toFixed(1),
      squadSize: squad.length,
      overseasCount: squad.filter((p) => p.isOverseas).length
    };
  }

  clearRoomTimer(room) {
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }
    if (room.transitionTimeout) {
      clearTimeout(room.transitionTimeout);
      room.transitionTimeout = null;
    }
  }

  handleDisconnect(socketId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return;

    const room = this.rooms.get(info.roomCode);
    this.playerSockets.delete(socketId);

    if (!room) return;

    const playerIndex = room.players.findIndex((p) => p.id === info.playerId);
    if (playerIndex >= 0) {
      const player = room.players[playerIndex];

      if (room.status === "LOBBY") {
        room.players.splice(playerIndex, 1);

        if (player.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }

        if (room.players.length === 0) {
          this.clearRoomTimer(room);
          this.rooms.delete(info.roomCode);
          return;
        }

        this.io.to(room.code).emit("player_left", {
          playerId: player.id,
          room: this.getSanitizedRoom(room)
        });
      } else {
        this.io.to(room.code).emit("player_disconnected", {
          playerId: player.id,
          playerName: player.name
        });
      }
    }
  }

  getSanitizedRoom(room) {
    const totalPlayersCount = room.pools.reduce((acc, p) => acc + (p.players?.length || 0), 0);

    return {
      code: room.code,
      hostId: room.hostId,
      status: room.status,
      settings: room.settings,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        teamId: p.teamId,
        retentionsLocked: p.retentionsLocked
      })),
      teamsState: room.teamsState,
      currentPool: room.currentPool,
      currentPoolIndex: room.currentPoolIndex,
      currentPoolPlayerIndex: room.currentPoolPlayerIndex,
      poolPreviewTimeLeft: room.poolPreviewTimeLeft,
      pools: room.pools.map((p, idx) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        playerCount: p.players.length,
        isCurrent: idx === room.currentPoolIndex,
        isCompleted: idx < room.currentPoolIndex
      })),
      currentPlayer: room.currentPlayer,
      currentBid: room.currentBid,
      currentBidder: room.currentBidder,
      bidHistory: room.bidHistory,
      passedTeams: room.passedTeams || [],
      timeLeft: room.timeLeft,
      totalPlayers: totalPlayersCount,
      rtmState: room.rtmState,
      lastSale: room.lastSale,
      unsoldPoolCount: room.unsoldPool.length,
      soldCount: room.soldCount
    };
  }
}

module.exports = GameManager;

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
      status: "LOBBY", // LOBBY, RETENTION, AUCTION, RTM_CHALLENGE, POST_AUCTION
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
        bidTimerSeconds: 12,
        antiSnipeSeconds: 5
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
      auctionPool: [],
      currentIndex: -1,
      currentPlayer: null,
      currentBid: 0,
      currentBidder: null, // teamId
      bidHistory: [],
      timer: null,
      timeLeft: 0,
      rtmState: null, // active RTM request
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

    // Check if team is already taken
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

    // Validate settings
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
      bidTimerSeconds: Math.max(6, Math.min(30, Number(newSettings.bidTimerSeconds) || 12))
    };

    return { success: true, room: this.getSanitizedRoom(room) };
  }

  // Calculate retention cost for n players
  calculateRetentionCost(room, count) {
    if (count <= 0) return 0;
    if (room.settings.retentionMode === "flat") {
      return count * room.settings.flatRetentionCost;
    }
    // Official Slabs
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += RETENTION_SLABS[i] || 4.0;
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

    // Ensure all players picked a franchise
    const unpicked = room.players.filter((p) => !p.teamId);
    if (unpicked.length > 0) {
      return { error: `All players must pick a franchise before starting (${unpicked.map(p => p.name).join(", ")} haven't picked yet).` };
    }

    // Initialize active teams state
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
      // Skip directly to auction pool building
      this.buildAuctionPoolAndStart(room);
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
      // Deselect
      teamState.retained.splice(idx, 1);
    } else {
      // Select
      if (teamState.retained.length >= room.settings.maxRetentions) {
        return { error: `Maximum ${room.settings.maxRetentions} retentions allowed.` };
      }
      teamState.retained.push(playerRecord);
    }

    // Recalculate remaining purse
    const cost = this.calculateRetentionCost(room, teamState.retained.length);
    teamState.spent = cost;
    teamState.purse = +(room.settings.purse - cost).toFixed(2);

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

    // Put retained players into squad
    const teamState = room.teamsState[player.teamId];
    teamState.squad = [...teamState.retained];

    // Adjust RTM cards based on retentions:
    // IPL rule: 6 total retention + RTM pool, or use host maxRTM setting
    const retCount = teamState.retained.length;
    teamState.rtmCardsLeft = Math.max(0, room.settings.maxRTM);

    // Check if all players locked
    const allLocked = room.players.every((p) => p.retentionsLocked);
    if (allLocked) {
      this.buildAuctionPoolAndStart(room);
    }

    return { success: true, room: this.getSanitizedRoom(room) };
  }

  buildAuctionPoolAndStart(room) {
    // Gather all retained player IDs across all active teams
    const retainedIds = new Set();
    Object.values(room.teamsState).forEach((t) => {
      t.retained.forEach((r) => retainedIds.add(r.id));
    });

    // 1. Gather all squad players that are not retained
    let pool = SQUADS.filter((player) => !retainedIds.has(player.id));

    // 2. Add bonus players if enabled
    if (room.settings.includeBonusPlayers) {
      pool = pool.concat(BONUS_PLAYERS);
    }

    // 3. Shuffle or organize into Sets
    // Set priority:
    // Marquee Key Players -> Capped Bat/WK -> Capped All-Rounders -> Capped Bowlers -> Uncapped -> Bonus
    const marquee = pool.filter((p) => p.isKeyPlayer);
    const battersWk = pool.filter((p) => !p.isKeyPlayer && (p.role === "BAT" || p.role === "WK") && p.basePrice >= 1.0);
    const allrounders = pool.filter((p) => !p.isKeyPlayer && p.role === "ALL" && p.basePrice >= 1.0);
    const bowlers = pool.filter((p) => !p.isKeyPlayer && (p.role === "PACE" || p.role === "SPIN") && p.basePrice >= 1.0);
    const uncapped = pool.filter((p) => !p.isKeyPlayer && p.basePrice < 1.0);

    // Shuffle within sets for fairness
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

    room.auctionPool = [
      ...shuffle(marquee),
      ...shuffle(battersWk),
      ...shuffle(allrounders),
      ...shuffle(bowlers),
      ...shuffle(uncapped)
    ];

    room.status = "AUCTION";
    room.currentIndex = -1;
    room.unsoldPool = [];
    room.soldCount = 0;

    // Start with first player
    this.presentNextPlayer(room);
  }

  presentNextPlayer(room) {
    this.clearRoomTimer(room);
    room.currentIndex += 1;

    if (room.currentIndex >= room.auctionPool.length) {
      // Check if there are unsold players and host wants accelerated, or finish
      this.finishAuction(room);
      return;
    }

    const player = room.auctionPool[room.currentIndex];
    room.currentPlayer = player;
    room.currentBid = 0;
    room.currentBidder = null;
    room.bidHistory = [];
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

    // Cannot bid against yourself
    if (room.currentBidder === teamId) {
      return { error: "You are already the highest bidder!" };
    }

    // Squad size checks
    if (teamState.squad.length >= room.settings.maxSquad) {
      return { error: `Squad is full! Max ${room.settings.maxSquad} players.` };
    }

    // Overseas quota check
    if (room.currentPlayer.isOverseas) {
      const overseasCount = teamState.squad.filter((p) => p.isOverseas).length;
      if (overseasCount >= room.settings.maxOverseas) {
        return { error: `Overseas quota full! Max ${room.settings.maxOverseas} overseas players.` };
      }
    }

    // Determine bid price
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

    // Check if team has enough purse
    // Rule: Must retain at least ₹0.20 Cr per unfilled slot to reach minSquad
    const slotsNeeded = Math.max(0, room.settings.minSquad - (teamState.squad.length + 1));
    const reservedPurse = +(slotsNeeded * 0.20).toFixed(2);

    if (teamState.purse - nextBid < reservedPurse) {
      return {
        error: `Insufficient purse! You need ₹${reservedPurse.toFixed(2)} Cr reserved to complete the minimum ${room.settings.minSquad} players.`
      };
    }

    // Valid bid placed!
    room.currentBid = nextBid;
    room.currentBidder = teamId;
    room.bidHistory.unshift({
      teamId,
      teamName: TEAMS.find((t) => t.id === teamId)?.name || teamId,
      amount: nextBid,
      time: new Date().toLocaleTimeString()
    });

    // Anti-sniping: Reset timer if under antiSnipeSeconds
    if (room.timeLeft < room.settings.antiSnipeSeconds) {
      room.timeLeft = room.settings.antiSnipeSeconds;
    }

    this.io.to(room.code).emit("bid_updated", {
      currentBid: room.currentBid,
      currentBidder: room.currentBidder,
      bidHistory: room.bidHistory,
      timeLeft: room.timeLeft
    });

    return { success: true };
  }

  passTurn(socketId) {
    const info = this.playerSockets.get(socketId);
    if (!info) return { error: "Not in room" };
    const room = this.rooms.get(info.roomCode);
    if (!room || room.status !== "AUCTION") return { error: "Not in auction" };

    // Just an indicator to room that this player passed
    const player = room.players.find((p) => p.id === info.playerId);
    if (player && player.teamId) {
      this.io.to(room.code).emit("team_passed", { teamId: player.teamId, playerName: player.name });
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
      timeLeft: room.timeLeft,
      currentIndex: room.currentIndex,
      totalPlayers: room.auctionPool.length
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
    if (room.currentBid === 0 || !room.currentBidder) {
      // UNSOLD
      room.unsoldPool.push(room.currentPlayer);
      this.io.to(room.code).emit("player_unsold", {
        player: room.currentPlayer
      });

      setTimeout(() => {
        this.presentNextPlayer(room);
      }, 3000);
      return;
    }

    // Check RTM eligibility
    // Criteria:
    // 1. Player has originalTeamId
    // 2. originalTeamId is held by an active human player
    // 3. Winning bidder is NOT the originalTeamId
    // 4. originalTeam has rtmCardsLeft > 0
    // 5. originalTeam has enough purse to match
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
      // Trigger RTM challenge window!
      this.initiateRTM(room, origTeamId, winningTeamId);
      return;
    }

    // Direct Sale to winning bidder
    this.finalizeSale(room, winningTeamId, room.currentBid);
  }

  initiateRTM(room, origTeamId, winningTeamId) {
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
        // Original team timed out -> Goes to winning bidder
        this.io.to(room.code).emit("rtm_declined", {
          origTeamId,
          reason: "Time Expired"
        });
        this.finalizeSale(room, winningTeamId, room.currentBid);
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
      // Original team matches!
      const origTeamState = room.teamsState[room.rtmState.origTeamId];
      origTeamState.rtmCardsLeft = Math.max(0, origTeamState.rtmCardsLeft - 1);

      this.io.to(room.code).emit("rtm_exercised", {
        teamId: room.rtmState.origTeamId,
        player: room.currentPlayer,
        amount: room.rtmState.matchAmount
      });

      this.finalizeSale(room, room.rtmState.origTeamId, room.rtmState.matchAmount, true);
    } else {
      // Original team declined
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

    this.io.to(room.code).emit("player_sold", {
      player: room.currentPlayer,
      buyerTeamId,
      amount,
      viaRTM,
      teamsState: room.teamsState
    });

    setTimeout(() => {
      this.presentNextPlayer(room);
    }, 4000);
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

    setTimeout(() => {
      this.presentNextPlayer(room);
    }, 1500);

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

    // Append unsold pool as accelerated round
    room.auctionPool = [...room.unsoldPool.sort(() => Math.random() - 0.5)];
    room.unsoldPool = [];
    room.currentIndex = -1;
    room.status = "AUCTION";

    this.io.to(room.code).emit("accelerated_round_started", {
      count: room.auctionPool.length
    });

    this.presentNextPlayer(room);
    return { success: true };
  }

  finishAuction(room) {
    this.clearRoomTimer(room);
    room.status = "POST_AUCTION";

    // Calculate preliminary team strengths
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

      // If in lobby, remove player
      if (room.status === "LOBBY") {
        room.players.splice(playerIndex, 1);

        // If host left and there are other players, reassign host
        if (player.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }

        // If room is empty, delete room
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
        // Player disconnected during active game -> Keep player record so they can reconnect
        this.io.to(room.code).emit("player_disconnected", {
          playerId: player.id,
          playerName: player.name
        });
      }
    }
  }

  getSanitizedRoom(room) {
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
      currentPlayer: room.currentPlayer,
      currentBid: room.currentBid,
      currentBidder: room.currentBidder,
      bidHistory: room.bidHistory,
      timeLeft: room.timeLeft,
      currentIndex: room.currentIndex,
      totalPlayers: room.auctionPool.length,
      rtmState: room.rtmState,
      unsoldPoolCount: room.unsoldPool.length,
      soldCount: room.soldCount
    };
  }
}

module.exports = GameManager;

import React, { useState, useEffect } from "react";
import { socket } from "./socket";
import { sounds } from "./sound";
import Lobby from "./components/Lobby";
import SettingsModal from "./components/SettingsModal";
import RetentionPhase from "./components/RetentionPhase";
import AuctionArena from "./components/AuctionArena";
import PoolPreview from "./components/PoolPreview";
import RTMModal from "./components/RTMModal";
import PlayingXIBuilder from "./components/PlayingXIBuilder";

const SESSION_KEY = "ipl_auction_session";

export default function App() {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // 0. Auto-reconnect on load from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (saved?.roomCode && saved?.playerId) {
        socket.emit("reconnect_player", { roomCode: saved.roomCode, playerId: saved.playerId }, (res) => {
          if (res?.success) {
            setPlayerId(res.playerId);
            setRoom(res.room);
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        });
      }
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
    }

    // 0b. Auto-reconnect whenever socket reconnects
    const handleSocketConnect = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (saved?.roomCode && saved?.playerId) {
          socket.emit("reconnect_player", { roomCode: saved.roomCode, playerId: saved.playerId }, (res) => {
            if (res?.success) {
              setPlayerId(res.playerId);
              setRoom(res.room);
            } else {
              localStorage.removeItem(SESSION_KEY);
            }
          });
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    };

    socket.on("connect", handleSocketConnect);

    // 1. Room updates
    socket.on("room_updated", ({ room }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom(room);
    });

    // 2. Game Phase Changed
    socket.on("game_phase_changed", ({ room }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom(room);
    });

    // 2b. Pool Preview Started
    socket.on("pool_preview_started", (data) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "POOL_PREVIEW",
          currentPool: data.pool,
          currentPoolIndex: data.poolIndex,
          poolPreviewTimeLeft: data.timeLeft
        };
      });
      sounds.playGavel();
    });

    // 2c. Pool Preview Tick
    socket.on("pool_preview_tick", ({ timeLeft }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          poolPreviewTimeLeft: timeLeft
        };
      });
    });

    // 2d. Pool Skipped
    socket.on("pool_skipped", () => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      sounds.playGavel();
    });

    // 3. Player Presented in Auction
    socket.on("player_presented", (data) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentPlayer: data.currentPlayer,
          currentBid: data.currentBid,
          currentBidder: data.currentBidder,
          bidHistory: data.bidHistory,
          passedTeams: data.passedTeams || [],
          timeLeft: data.timeLeft,
          currentPool: data.currentPool,
          currentPoolIndex: data.currentPoolIndex,
          currentPoolPlayerIndex: data.currentPoolPlayerIndex,
          totalPools: data.totalPools,
          persistentPassTeams: data.persistentPassTeams || prev.persistentPassTeams || [],
          status: "AUCTION",
          rtmState: null,
          lastSale: null
        };
      });
      sounds.playGavel();
    });

    // 4. Bid Updated
    socket.on("bid_updated", (data) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentBid: data.currentBid,
          currentBidder: data.currentBidder,
          bidHistory: data.bidHistory,
          timeLeft: data.timeLeft,
          passedTeams: data.passedTeams || [],
          persistentPassTeams: data.persistentPassTeams || prev.persistentPassTeams || []
        };
      });
      sounds.playBid();
    });

    // 4b. Team Passed
    socket.on("team_passed", ({ passedTeams }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, passedTeams: passedTeams || [] };
      });
    });

    // 4c. Persistent Pass Updated
    socket.on("persistent_pass_updated", ({ persistentPassTeams, passedTeams }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          persistentPassTeams: persistentPassTeams || [],
          passedTeams: passedTeams || []
        };
      });
    });

    // 4d. All Teams Passed Fast Forward
    socket.on("all_teams_passed", () => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      sounds.playGavel();
    });

    socket.on("fast_forward", () => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      sounds.playGavel();
    });

    // 5. Timer Tick
    socket.on("timer_tick", ({ timeLeft }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, timeLeft };
      });
      if (timeLeft <= 3 && timeLeft > 0) {
        sounds.playTick(true);
      }
    });

    // 6. Player Sold
    socket.on("player_sold", (data) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "AUCTION",
          rtmState: null,
          teamsState: data.teamsState,
          soldCount: (prev.soldCount || 0) + 1,
          lastSale: {
            player: data.player,
            buyerTeamId: data.buyerTeamId,
            amount: data.amount,
            viaRTM: data.viaRTM,
            unsold: false
          }
        };
      });
      sounds.playGavel();
      sounds.playSold();
    });

    // 7. Player Unsold
    socket.on("player_unsold", (data) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unsoldPoolCount: (prev.unsoldPoolCount || 0) + 1,
          lastSale: {
            player: data?.player || prev.currentPlayer,
            unsold: true
          }
        };
      });
      sounds.playGavel();
    });

    // 8. RTM Challenge Started
    socket.on("rtm_challenge_started", ({ rtmState }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "RTM_CHALLENGE",
          rtmState
        };
      });
      sounds.playRTMAlert();
    });

    // 9. RTM Timer Tick
    socket.on("rtm_timer_tick", ({ timeLeft }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev || !prev.rtmState) return prev;
        return {
          ...prev,
          rtmState: {
            ...prev.rtmState,
            timeLeft
          }
        };
      });
    });

    // 10. RTM Exercised
    socket.on("rtm_exercised", () => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "AUCTION",
          rtmState: null
        };
      });
      sounds.playSold();
    });

    // 10b. RTM Declined
    socket.on("rtm_declined", () => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "AUCTION",
          rtmState: null
        };
      });
      sounds.playGavel();
    });

    // 11. Accelerated Round Started
    socket.on("accelerated_round_started", ({ count }) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "AUCTION",
          totalPlayers: count,
          unsoldPoolCount: 0
        };
      });
      sounds.playGavel();
    });

    // 12. Auction Completed
    socket.on("auction_completed", (data) => {
      if (!localStorage.getItem(SESSION_KEY)) return;
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "POST_AUCTION",
          teamsState: data.teamsState,
          auctionStats: data.auctionStats || prev.auctionStats,
          totalBidsByTeam: data.totalBidsByTeam || prev.totalBidsByTeam
        };
      });
      sounds.playSold();
    });

    return () => {
      socket.off("connect", handleSocketConnect);
      socket.off("room_updated");
      socket.off("game_phase_changed");
      socket.off("pool_preview_started");
      socket.off("pool_preview_tick");
      socket.off("pool_skipped");
      socket.off("player_presented");
      socket.off("bid_updated");
      socket.off("team_passed");
      socket.off("persistent_pass_updated");
      socket.off("all_teams_passed");
      socket.off("fast_forward");
      socket.off("timer_tick");
      socket.off("player_sold");
      socket.off("player_unsold");
      socket.off("rtm_challenge_started");
      socket.off("rtm_timer_tick");
      socket.off("rtm_exercised");
      socket.off("rtm_declined");
      socket.off("accelerated_round_started");
      socket.off("auction_completed");
    };
  }, []);

  // Handlers
  const handleCreateRoom = (hostName) => {
    socket.emit("create_room", { hostName }, (res) => {
      if (res.success) {
        setPlayerId(res.playerId);
        setRoom(res.room);
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            roomCode: res.roomCode,
            playerId: res.playerId,
            playerName: hostName
          }));
        } catch (e) {}
      }
    });
  };

  const handleJoinRoom = (roomCode, playerName, onError) => {
    socket.emit("join_room", { roomCode, playerName }, (res) => {
      if (res.error) {
        if (onError) onError(res.error);
        return;
      }
      if (res.success) {
        setPlayerId(res.playerId);
        setRoom(res.room);
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify({
            roomCode: res.roomCode,
            playerId: res.playerId,
            playerName
          }));
        } catch (e) {}
      }
    });
  };

  const handleLeaveRoom = () => {
    if (!window.confirm("Do you want to exit the room?")) {
      return;
    }
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem("ipl_auction_session");
      localStorage.clear();
    } catch (e) {}
    socket.emit("leave_room", { roomCode: room?.code, playerId });
    setRoom(null);
    setPlayerId(null);
  };

  const handleSelectTeam = (teamId) => {
    socket.emit("select_team", { teamId, roomCode: room?.code, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleSaveSettings = (newSettings) => {
    socket.emit("update_settings", { newSettings, roomCode: room?.code, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleStartGame = () => {
    socket.emit("start_game", { roomCode: room?.code, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleToggleRetention = (targetPlayerId) => {
    socket.emit(
      "toggle_retention_player",
      {
        targetPlayerId,
        userPlayerId: playerId,
        playerId,
        roomCode: room?.code
      },
      (res) => {
        if (res?.error) alert(res.error);
      }
    );
  };

  const handleLockRetentions = () => {
    socket.emit("lock_retentions", { roomCode: room?.code, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handlePlaceBid = (customAmount, callback) => {
    socket.emit("place_bid", { customAmount, roomCode: room?.code, playerId }, callback);
  };

  const handlePassTurn = () => {
    socket.emit("pass_turn", { roomCode: room?.code, playerId });
  };

  const handleTogglePersistentPass = (enabled) => {
    socket.emit("toggle_persistent_pass", { enabled, roomCode: room?.code, playerId });
  };

  const handleSkipPlayer = () => {
    socket.emit("skip_player", { roomCode: room?.code, playerId });
  };

  const handleRespondRTM = (exerciseRTM) => {
    // Immediately close modal optimistically so buttons cannot be double-clicked
    setRoom((prev) => {
      if (!prev) return prev;
      return { ...prev, status: "AUCTION", rtmState: null };
    });
    socket.emit("respond_rtm", { exerciseRTM, roomCode: room?.code, playerId });
  };

  const handleReAuctionUnsold = () => {
    socket.emit("re_auction_unsold", { roomCode: room?.code, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleSkipPoolPreview = () => {
    socket.emit("skip_pool_preview", { roomCode: room?.code, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleSkipPool = () => {
    socket.emit("skip_pool", { roomCode: room?.code, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleEndBid = () => {
    socket.emit("end_bid", { roomCode: room?.code, playerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const toggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  // Render Based on Phase
  if (!room || room.status === "LOBBY") {
    return (
      <>
        <Lobby
          room={room}
          playerId={playerId}
          onSelectTeam={handleSelectTeam}
          onStartGame={handleStartGame}
          onOpenSettings={() => setSettingsOpen(true)}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
        />
        {settingsOpen && room && (
          <SettingsModal
            settings={room.settings}
            onClose={() => setSettingsOpen(false)}
            onSave={handleSaveSettings}
          />
        )}
      </>
    );
  }

  if (room.status === "RETENTION") {
    return (
      <RetentionPhase
        room={room}
        playerId={playerId}
        onToggleRetention={handleToggleRetention}
        onLockRetentions={handleLockRetentions}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  if (room.status === "POOL_PREVIEW") {
    const myPlayer = room.players.find((p) => p.id === playerId);
    return (
      <PoolPreview
        pool={room.currentPool}
        poolIndex={room.currentPoolIndex}
        totalPools={room.pools?.length || 1}
        timeLeft={room.poolPreviewTimeLeft}
        pools={room.pools}
        isHost={myPlayer?.isHost}
        onSkipPreview={handleSkipPoolPreview}
        onSkipPool={handleSkipPool}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  if (room.status === "AUCTION" || room.status === "RTM_CHALLENGE") {
    const myPlayer = room.players.find((p) => p.id === playerId);
    const enrichedRtmState = room.rtmState
      ? { ...room.rtmState, origTeamIdPlayerTeam: myPlayer?.teamId }
      : null;

    return (
      <>
        <AuctionArena
          room={room}
          playerId={playerId}
          onPlaceBid={handlePlaceBid}
          onPassTurn={handlePassTurn}
          onTogglePersistentPass={handleTogglePersistentPass}
          onSkipPlayer={handleSkipPlayer}
          onSkipPool={handleSkipPool}
          onEndBid={handleEndBid}
          onLeaveRoom={handleLeaveRoom}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />
        {room.status === "RTM_CHALLENGE" && enrichedRtmState && (
          <RTMModal
            rtmState={enrichedRtmState}
            playerId={playerId}
            onRespondRTM={handleRespondRTM}
          />
        )}
      </>
    );
  }

  if (room.status === "POST_AUCTION") {
    return (
      <PlayingXIBuilder
        room={room}
        playerId={playerId}
        onReAuctionUnsold={handleReAuctionUnsold}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return null;
}

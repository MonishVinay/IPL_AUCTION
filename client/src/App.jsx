import React, { useState, useEffect } from "react";
import { socket } from "./socket";
import { sounds } from "./sound";
import Lobby from "./components/Lobby";
import SettingsModal from "./components/SettingsModal";
import RetentionPhase from "./components/RetentionPhase";
import AuctionArena from "./components/AuctionArena";
import RTMModal from "./components/RTMModal";
import PlayingXIBuilder from "./components/PlayingXIBuilder";

export default function App() {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // 1. Room updates
    socket.on("room_updated", ({ room }) => {
      setRoom(room);
    });

    // 2. Game Phase Changed
    socket.on("game_phase_changed", ({ room }) => {
      setRoom(room);
    });

    // 3. Player Presented in Auction
    socket.on("player_presented", (data) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentPlayer: data.currentPlayer,
          currentBid: data.currentBid,
          currentBidder: data.currentBidder,
          bidHistory: data.bidHistory,
          timeLeft: data.timeLeft,
          currentIndex: data.currentIndex,
          totalPlayers: data.totalPlayers,
          status: "AUCTION",
          rtmState: null
        };
      });
      sounds.playGavel();
    });

    // 4. Bid Updated
    socket.on("bid_updated", (data) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentBid: data.currentBid,
          currentBidder: data.currentBidder,
          bidHistory: data.bidHistory,
          timeLeft: data.timeLeft
        };
      });
      sounds.playBid();
    });

    // 5. Timer Tick
    socket.on("timer_tick", ({ timeLeft }) => {
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
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          teamsState: data.teamsState,
          soldCount: (prev.soldCount || 0) + 1
        };
      });
      sounds.playGavel();
      sounds.playSold();
    });

    // 7. Player Unsold
    socket.on("player_unsold", () => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unsoldPoolCount: (prev.unsoldPoolCount || 0) + 1
        };
      });
      sounds.playGavel();
    });

    // 8. RTM Challenge Started
    socket.on("rtm_challenge_started", ({ rtmState }) => {
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

    // 10. RTM Exercised or Declined
    socket.on("rtm_exercised", () => {
      sounds.playSold();
    });

    // 11. Accelerated Round Started
    socket.on("accelerated_round_started", ({ count }) => {
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
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "POST_AUCTION",
          teamsState: data.teamsState
        };
      });
      sounds.playSold();
    });

    return () => {
      socket.off("room_updated");
      socket.off("game_phase_changed");
      socket.off("player_presented");
      socket.off("bid_updated");
      socket.off("timer_tick");
      socket.off("player_sold");
      socket.off("player_unsold");
      socket.off("rtm_challenge_started");
      socket.off("rtm_timer_tick");
      socket.off("rtm_exercised");
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
      }
    });
  };

  const handleSelectTeam = (teamId) => {
    socket.emit("select_team", { teamId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleSaveSettings = (newSettings) => {
    socket.emit("update_settings", newSettings, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleStartGame = () => {
    socket.emit("start_game", (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleToggleRetention = (targetPlayerId) => {
    socket.emit("toggle_retention_player", { playerId: targetPlayerId }, (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handleLockRetentions = () => {
    socket.emit("lock_retentions", (res) => {
      if (res?.error) alert(res.error);
    });
  };

  const handlePlaceBid = (customAmount, callback) => {
    socket.emit("place_bid", { customAmount }, callback);
  };

  const handlePassTurn = () => {
    socket.emit("pass_turn");
  };

  const handleSkipPlayer = () => {
    socket.emit("skip_player");
  };

  const handleRespondRTM = (exerciseRTM) => {
    socket.emit("respond_rtm", { exerciseRTM });
  };

  const handleReAuctionUnsold = () => {
    socket.emit("re_auction_unsold", (res) => {
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
      />
    );
  }

  if (room.status === "AUCTION" || room.status === "RTM_CHALLENGE") {
    // Determine if player's team is original franchise
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
          onSkipPlayer={handleSkipPlayer}
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
      />
    );
  }

  return null;
}

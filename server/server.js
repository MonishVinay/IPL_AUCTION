const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const GameManager = require("./gameManager");
const { TEAMS } = require("./data/teams");
const { SQUADS } = require("./data/squads");
const { BONUS_PLAYERS } = require("./data/bonusPlayers");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const gameManager = new GameManager(io);

// Health check endpoint for Render
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    roomsCount: gameManager.rooms.size,
    timestamp: new Date().toISOString()
  });
});

// API endpoint to get static reference data
app.get("/api/meta", (req, res) => {
  res.json({
    teams: TEAMS,
    totalSquadPlayers: SQUADS.length,
    totalBonusPlayers: BONUS_PLAYERS.length
  });
});

// Serve frontend static files from client/dist in production
const clientDistPath = path.join(__dirname, "../client/dist");
app.use(express.static(clientDistPath));

// Socket.io Connection & Event Handling
io.on("connection", (socket) => {
  // 1. Room Creation
  socket.on("create_room", ({ hostName }, callback) => {
    try {
      const result = gameManager.createRoom(socket.id, hostName);
      socket.join(result.roomCode);
      if (typeof callback === "function") callback({ success: true, ...result });
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 2. Joining Room
  socket.on("join_room", ({ roomCode, playerName }, callback) => {
    try {
      const result = gameManager.joinRoom(socket.id, roomCode, playerName);
      if (result.error) {
        if (typeof callback === "function") callback(result);
        return;
      }
      socket.join(result.roomCode);
      io.to(result.roomCode).emit("room_updated", { room: result.room });
      if (typeof callback === "function") callback({ success: true, ...result });
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 2b. Reconnect Player (from localStorage or network drop)
  socket.on("reconnect_player", ({ roomCode, playerId }, callback) => {
    try {
      const result = gameManager.reconnectPlayer(socket.id, roomCode, playerId);
      if (result.error) {
        if (typeof callback === "function") callback(result);
        return;
      }
      socket.join(result.roomCode);
      io.to(result.roomCode).emit("player_reconnected", { playerId, playerName: result.playerName });
      if (typeof callback === "function") callback({ success: true, ...result });
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 2c. Explicit Leave Room
  socket.on("leave_room", (data, callback) => {
    try {
      const cb = typeof data === "function" ? data : (typeof callback === "function" ? callback : null);
      const payload = typeof data === "object" && data !== null ? data : {};

      const info = gameManager.playerSockets.get(socket.id);
      const roomCode = payload.roomCode || info?.roomCode;

      if (roomCode) {
        socket.leave(roomCode);
      }

      const result = gameManager.leaveRoom(socket.id, roomCode, payload.playerId);
      if (cb) cb(result);
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 3. Team Selection
  socket.on("select_team", ({ teamId, roomCode, playerId }, callback) => {
    try {
      const result = gameManager.selectTeam(socket.id, teamId, roomCode, playerId);
      if (result.error) {
        if (typeof callback === "function") callback(result);
        return;
      }
      io.to(result.room.code).emit("room_updated", { room: result.room });
      if (typeof callback === "function") callback({ success: true });
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 4. Update Game Settings
  socket.on("update_settings", ({ newSettings, roomCode, playerId }, callback) => {
    try {
      const result = gameManager.updateSettings(socket.id, newSettings, roomCode, playerId);
      if (result.error) {
        if (typeof callback === "function") callback(result);
        return;
      }
      io.to(result.room.code).emit("room_updated", { room: result.room });
      if (typeof callback === "function") callback({ success: true });
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 5. Start Retention Phase
  socket.on("start_game", ({ roomCode, playerId } = {}, callback) => {
    try {
      const result = gameManager.startRetentionPhase(socket.id, roomCode, playerId);
      if (result.error) {
        if (typeof callback === "function") callback(result);
        return;
      }
      io.to(result.room.code).emit("game_phase_changed", { room: result.room });
      if (typeof callback === "function") callback({ success: true });
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 6. Toggle Retention Player
  socket.on("toggle_retention_player", (data, callback) => {
    try {
      const targetPlayerId = data?.targetPlayerId || (data?.playerId && data?.playerId !== data?.userPlayerId ? data?.playerId : null);
      const userPlayerId = data?.userPlayerId || (data?.targetPlayerId ? data?.playerId : null);
      const roomCode = data?.roomCode;

      const result = gameManager.toggleRetentionPlayer(socket.id, targetPlayerId, roomCode, userPlayerId);
      if (result.error) {
        if (typeof callback === "function") callback(result);
        return;
      }
      io.to(result.room.code).emit("room_updated", { room: result.room });
      if (typeof callback === "function") callback({ success: true });
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 7. Lock Retentions
  socket.on("lock_retentions", ({ roomCode, playerId } = {}, callback) => {
    try {
      const result = gameManager.lockRetentions(socket.id, roomCode, playerId);
      if (result.error) {
        if (typeof callback === "function") callback(result);
        return;
      }
      io.to(result.room.code).emit("room_updated", { room: result.room });
      if (typeof callback === "function") callback({ success: true });
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 8. Place Bid (with self-healing fallback)
  socket.on("place_bid", ({ customAmount, roomCode, playerId } = {}, callback) => {
    try {
      const result = gameManager.placeBid(socket.id, customAmount, roomCode, playerId);
      if (typeof callback === "function") callback(result);
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 9. Pass / Fold Current Player
  socket.on("pass_turn", ({ roomCode, playerId } = {}, callback) => {
    try {
      const result = gameManager.passTurn(socket.id, roomCode, playerId);
      if (typeof callback === "function") callback(result);
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 10. Respond to RTM challenge
  socket.on("respond_rtm", ({ exerciseRTM, roomCode, playerId }, callback) => {
    try {
      const result = gameManager.respondRTM(socket.id, exerciseRTM, roomCode, playerId);
      if (typeof callback === "function") callback(result);
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 11. Skip Player (Host only)
  socket.on("skip_player", ({ roomCode, playerId } = {}, callback) => {
    try {
      const result = gameManager.skipCurrentPlayer(socket.id, roomCode, playerId);
      if (typeof callback === "function") callback(result);
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 12. Re-auction Unsold (Host only)
  socket.on("re_auction_unsold", ({ roomCode, playerId } = {}, callback) => {
    try {
      const result = gameManager.reAuctionUnsold(socket.id, roomCode, playerId);
      if (typeof callback === "function") callback(result);
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // 13. Skip Pool Preview (Host only)
  socket.on("skip_pool_preview", ({ roomCode, playerId } = {}, callback) => {
    try {
      const result = gameManager.skipPoolPreview(socket.id, roomCode, playerId);
      if (typeof callback === "function") callback(result);
    } catch (err) {
      if (typeof callback === "function") callback({ error: err.message });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    gameManager.handleDisconnect(socket.id);
  });
});

// Single Page Application Fallback (Express 4 & 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("IPL Auction Game Server is running. Client build pending.");
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🏏 IPL Auction Server running on port ${PORT}`);
});

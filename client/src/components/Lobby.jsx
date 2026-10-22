import React, { useState } from "react";
import { TEAMS } from "../teamsData";
import { Users, Copy, Check, Play, Settings, Shield, Award, Sparkles, AlertCircle } from "lucide-react";

export default function Lobby({
  room,
  playerId,
  onSelectTeam,
  onStartGame,
  onOpenSettings,
  onCreateRoom,
  onJoinRoom
}) {
  const [copied, setCopied] = useState(false);
  const [hostNameInput, setHostNameInput] = useState("");
  const [joinNameInput, setJoinNameInput] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [mode, setMode] = useState("HOME"); // "HOME", "CREATE", "JOIN"

  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If player hasn't joined or created a room yet
  if (!room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-xl shadow-amber-500/20 mb-3 text-3xl">
              🏏
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              IPL MEGA AUCTION
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Multiplayer Room Auction • Retentions • RTM Cards • Squad Builder
            </p>
          </div>

          {/* Mode Switcher */}
          {mode === "HOME" && (
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4">
              <button
                onClick={() => setMode("CREATE")}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Host New Auction Room</span>
              </button>

              <button
                onClick={() => setMode("JOIN")}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5 text-blue-400" />
                <span>Join with Room Code</span>
              </button>

              <div className="pt-4 border-t border-slate-800/80 text-center">
                <span className="text-xs text-slate-500">
                  Play with 1 to 10 friends • Official squad rosters & ratings
                </span>
              </div>
            </div>
          )}

          {/* Create Room Form */}
          {mode === "CREATE" && (
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Create Auction Room
              </h2>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Your Name / Franchise Boss
                </label>
                <input
                  type="text"
                  placeholder="e.g. Captain Cool"
                  value={hostNameInput}
                  onChange={(e) => setHostNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode("HOME")}
                  className="w-1/3 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onCreateRoom(hostNameInput.trim() || "Host Boss")}
                  className="w-2/3 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 transition text-sm"
                >
                  Create Room
                </button>
              </div>
            </div>
          )}

          {/* Join Room Form */}
          {mode === "JOIN" && (
            <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Join Existing Auction
              </h2>

              {joinError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Room Code (5 Letters)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7XQ9A"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono uppercase tracking-wider placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gambhir"
                  value={joinNameInput}
                  onChange={(e) => setJoinNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("HOME");
                    setJoinError("");
                  }}
                  className="w-1/3 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!joinCodeInput.trim()}
                  onClick={() => {
                    onJoinRoom(joinCodeInput.trim(), joinNameInput.trim() || "Player", (err) => {
                      if (err) setJoinError(err);
                    });
                  }}
                  className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition text-sm"
                >
                  Join Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inside Active Lobby
  const currentPlayer = room.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost;
  const unpickedCount = room.players.filter((p) => !p.teamId).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏏</span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              IPL MEGA AUCTION LOBBY
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Claim your franchise below. Each franchise can be chosen by 1 manager.
          </p>
        </div>

        {/* Room Code Card */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Room Code</div>
              <div className="text-lg font-black tracking-widest text-amber-400 font-mono">
                {room.code}
              </div>
            </div>
            <button
              onClick={copyRoomCode}
              title="Copy code"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {isHost && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-semibold text-slate-200 transition"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Rules & Purse</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 flex-1">
        {/* Left 2 Cols: Franchise Selection Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Choose Your Franchise ({TEAMS.length} Teams Available)</span>
            </h2>
            <span className="text-xs text-slate-400">
              {room.players.filter((p) => p.teamId).length} / {room.players.length} Players Ready
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-2 gap-3.5">
            {TEAMS.map((team) => {
              const selectedByPlayer = room.players.find((p) => p.teamId === team.id);
              const isMine = selectedByPlayer?.id === playerId;
              const isTakenByOther = selectedByPlayer && !isMine;

              return (
                <div
                  key={team.id}
                  onClick={() => {
                    if (!isTakenByOther) {
                      onSelectTeam(team.id);
                    }
                  }}
                  className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                    isMine
                      ? "ring-2 ring-amber-400 border-amber-400/80 bg-slate-900 shadow-xl shadow-amber-500/10 scale-[1.01]"
                      : isTakenByOther
                      ? "opacity-60 cursor-not-allowed bg-slate-950/80 border-slate-800"
                      : "bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Team Accent Color Bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: team.primaryColor }}
                  />

                  <div className="flex items-start justify-between mt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{team.logoEmoji}</span>
                      <div>
                        <div className="font-extrabold text-base text-white">{team.shortName}</div>
                        <div className="text-xs text-slate-400 line-clamp-1">{team.name}</div>
                      </div>
                    </div>

                    {isMine && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                        You
                      </span>
                    )}
                  </div>

                  {/* Owner Status */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 italic">"{team.badgeText}"</span>
                    {selectedByPlayer ? (
                      <span
                        className={`font-semibold ${
                          isMine ? "text-amber-400" : "text-blue-400"
                        }`}
                      >
                        👤 {selectedByPlayer.name}
                      </span>
                    ) : (
                      <span className="text-emerald-400/90 font-medium text-[11px]">
                        Available (Click to Pick)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Room Settings Summary & Start Game */}
        <div className="space-y-6">
          {/* Active Players Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Joined Players ({room.players.length}/10)</span>
              </h3>
            </div>

            <div className="space-y-2">
              {room.players.map((p) => {
                const team = TEAMS.find((t) => t.id === p.teamId);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-200">
                        {p.name} {p.id === playerId && "(You)"}
                      </span>
                      {p.isHost && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded font-semibold">
                          Host
                        </span>
                      )}
                    </div>
                    {team ? (
                      <span className="font-bold flex items-center gap-1 text-slate-300">
                        <span>{team.logoEmoji}</span>
                        <span>{team.shortName}</span>
                      </span>
                    ) : (
                      <span className="text-amber-400/80 italic text-[11px]">Picking team...</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Rules Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Current Auction Rules</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Initial Purse</div>
                <div className="text-amber-400 font-extrabold text-base mt-0.5">
                  ₹{room.settings.purse} Cr
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Retentions Allowed</div>
                <div className="text-white font-extrabold text-base mt-0.5">
                  {room.settings.maxRetentions} Players
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">RTM Cards</div>
                <div className="text-white font-extrabold text-base mt-0.5">
                  {room.settings.maxRTM} Cards
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Squad Range</div>
                <div className="text-white font-extrabold text-base mt-0.5">
                  {room.settings.minSquad}-{room.settings.maxSquad} (Max 8 OS)
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>36 Extra Star Players Pool:</span>
              <span className={`font-semibold ${room.settings.includeBonusPlayers ? "text-emerald-400" : "text-rose-400"}`}>
                {room.settings.includeBonusPlayers ? "Included ✓" : "Excluded ✕"}
              </span>
            </div>
          </div>

          {/* Action CTA for Host */}
          {isHost ? (
            <div className="space-y-2">
              <button
                disabled={unpickedCount > 0}
                onClick={onStartGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 text-base"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>
                  {room.settings.maxRetentions > 0
                    ? "Start Retention Phase"
                    : "Start Live Mega Auction"}
                </span>
              </button>

              {unpickedCount > 0 && (
                <p className="text-center text-xs text-rose-400">
                  Waiting for all players to pick an IPL franchise before starting.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
              Waiting for the host (<span className="text-amber-400 font-semibold">{room.players.find(p => p.isHost)?.name}</span>) to start the auction...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

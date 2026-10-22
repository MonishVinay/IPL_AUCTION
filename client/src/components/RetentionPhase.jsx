import React, { useState } from "react";
import { SQUADS } from "../squadsData";
import { getTeam } from "../teamsData";
import { Shield, Check, Lock, DollarSign, Users, Sparkles, Filter } from "lucide-react";

export default function RetentionPhase({
  room,
  playerId,
  onToggleRetention,
  onLockRetentions
}) {
  const [roleFilter, setRoleFilter] = useState("ALL_ROLES");

  const currentPlayer = room.players.find((p) => p.id === playerId);
  const myTeamId = currentPlayer?.teamId;
  const myTeam = getTeam(myTeamId);
  const myTeamState = room.teamsState[myTeamId] || {
    purse: room.settings.purse,
    spent: 0,
    retained: []
  };

  const isLocked = currentPlayer?.retentionsLocked;
  const myOriginalPlayers = SQUADS.filter((p) => p.originalTeamId === myTeamId);

  const filteredPlayers = myOriginalPlayers.filter((p) => {
    if (roleFilter === "ALL_ROLES") return true;
    if (roleFilter === "BAT") return p.role === "BAT";
    if (roleFilter === "WK") return p.role === "WK";
    if (roleFilter === "ALL") return p.role === "ALL";
    if (roleFilter === "BOWL") return p.role === "PACE" || p.role === "SPIN";
    return true;
  });

  const retainedIds = new Set(myTeamState.retained.map((r) => r.id));

  // Role pill color helper
  const getRoleBadge = (role) => {
    switch (role) {
      case "BAT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">BAT</span>;
      case "WK":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">WK-BAT</span>;
      case "ALL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">ALL-ROUNDER</span>;
      case "PACE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">FAST BOWL</span>;
      case "SPIN":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">SPIN BOWL</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col">
      {/* Top Banner */}
      <header className="max-w-6xl w-full mx-auto pb-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{myTeam.logoEmoji}</div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white">{myTeam.name}</h1>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Retention Window
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Select up to {room.settings.maxRetentions} players from your original squad to retain before the mega auction.
            </p>
          </div>
        </div>

        {/* Purse & Retention Counter */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-3">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Remaining Purse</div>
              <div className="text-xl font-extrabold text-amber-400">
                ₹{myTeamState.purse.toFixed(2)} Cr
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Retained</div>
              <div className="text-xl font-extrabold text-white">
                {myTeamState.retained.length} / {room.settings.maxRetentions}
              </div>
            </div>
          </div>

          <button
            onClick={onLockRetentions}
            disabled={isLocked}
            className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-xl transition flex items-center gap-2 ${
              isLocked
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                : "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400 shadow-amber-500/20"
            }`}
          >
            {isLocked ? (
              <>
                <Check className="w-4 h-4" />
                <span>Retentions Locked</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Lock My Retentions</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 py-8 flex-1">
        {/* Left 3 Cols: Squad Players to Retain */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: "ALL_ROLES", label: "All Squad" },
                { id: "BAT", label: "Batters" },
                { id: "WK", label: "Keepers" },
                { id: "ALL", label: "All-Rounders" },
                { id: "BOWL", label: "Bowlers" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    roleFilter === tab.id
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400">
              Showing {filteredPlayers.length} players
            </div>
          </div>

          {/* Player Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredPlayers.map((player) => {
              const isRetained = retainedIds.has(player.id);
              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (!isLocked) onToggleRetention(player.id);
                  }}
                  className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                    isRetained
                      ? "bg-amber-500/10 border-amber-400 ring-1 ring-amber-400 shadow-lg shadow-amber-500/5"
                      : "bg-slate-900/60 hover:bg-slate-900 border-slate-800"
                  } ${isLocked ? "cursor-default opacity-80" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-base leading-tight">
                        {player.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {getRoleBadge(player.role)}
                        {player.isOverseas ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400">
                            ✈️ OS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400">
                            🇮🇳 IND
                          </span>
                        )}
                        {player.isKeyPlayer && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300">
                            ★ Key
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Checkbox indicator */}
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                        isRetained
                          ? "bg-amber-400 border-amber-400 text-slate-950 font-black"
                          : "border-slate-700 bg-slate-950 text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Rating: <b className="text-slate-200">{player.rating}</b></span>
                    <span className="text-amber-400 font-semibold">Base: ₹{player.basePrice} Cr</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: League Status & Locked Franchises */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Franchise Retention Status</span>
            </h3>

            <div className="space-y-2.5">
              {room.players.map((p) => {
                const team = getTeam(p.teamId);
                const tState = room.teamsState[p.teamId] || { retained: [] };
                return (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{team.logoEmoji}</span>
                      <div>
                        <div className="font-bold text-white">{team.shortName}</div>
                        <div className="text-[11px] text-slate-400">{p.name}</div>
                      </div>
                    </div>

                    <div>
                      {p.retentionsLocked ? (
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Locked ({tState.retained.length})</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Choosing ({tState.retained.length})...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-xs text-slate-400 text-center">
              The Mega Auction will begin automatically as soon as all managers lock their retentions.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

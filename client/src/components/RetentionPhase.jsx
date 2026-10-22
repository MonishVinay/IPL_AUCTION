import React, { useState } from "react";
import { SQUADS } from "../squadsData";
import { getTeam } from "../teamsData";
import { Shield, Check, Lock, DollarSign, Users, Sparkles, Filter, Info, Trash2, LogOut } from "lucide-react";

const RETENTION_SLABS = [18.0, 14.0, 11.0, 18.0, 14.0, 4.0];

export default function RetentionPhase({
  room,
  playerId,
  onToggleRetention,
  onLockRetentions,
  onLeaveRoom
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

  const retainedMap = new Map();
  myTeamState.retained.forEach((r, idx) => {
    const cost = r.cost !== undefined
      ? r.cost
      : room.settings.retentionMode === "flat"
      ? room.settings.flatRetentionCost
      : (RETENTION_SLABS[idx] || 4.0);
    retainedMap.set(r.id, { ...r, cost, slotNumber: idx + 1 });
  });

  const currentCount = myTeamState.retained.length;
  const maxRetentions = room.settings.maxRetentions;
  const nextSlotCost = room.settings.retentionMode === "flat"
    ? room.settings.flatRetentionCost
    : (RETENTION_SLABS[currentCount] || 4.0);

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
              Select up to {maxRetentions} players. Each retention slot has an official slab cost deducted from your purse.
            </p>
          </div>
        </div>

        {/* Purse & Retention Counter */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-3">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Purse Remaining</div>
              <div className="text-xl font-extrabold text-amber-400">
                ₹{myTeamState.purse.toFixed(2)} Cr
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Total Deducted</div>
              <div className="text-xl font-extrabold text-rose-400">
                -₹{Number(myTeamState.spent || 0).toFixed(2)} Cr
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Retained</div>
              <div className="text-xl font-extrabold text-white">
                {currentCount} / {maxRetentions}
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

          {onLeaveRoom && (
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to exit the auction room?")) {
                  onLeaveRoom();
                }
              }}
              title="Leave Room"
              className="px-3.5 py-3 rounded-2xl bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 text-slate-400 hover:text-red-300 font-semibold text-xs transition flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}
        </div>
      </header>

      {/* Retention Slabs Price Guide Bar */}
      <div className="max-w-6xl w-full mx-auto my-4 p-3 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Retention Cost Slabs:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto text-[11px]">
          {room.settings.retentionMode === "flat" ? (
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
              Flat ₹{room.settings.flatRetentionCost} Cr per retained player
            </span>
          ) : (
            [
              { slot: 1, cost: 18 },
              { slot: 2, cost: 14 },
              { slot: 3, cost: 11 },
              { slot: 4, cost: 18 },
              { slot: 5, cost: 14 },
              { slot: 6, cost: 4 }
            ].slice(0, maxRetentions).map((s) => (
              <span
                key={s.slot}
                className={`px-2.5 py-1 rounded-lg border font-mono transition ${
                  currentCount === s.slot - 1
                    ? "bg-amber-400 text-slate-950 font-black border-amber-400 shadow-md"
                    : currentCount >= s.slot
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                Slot {s.slot}: ₹{s.cost} Cr
              </span>
            ))
          )}
        </div>
      </div>

      {/* Main Grid */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 py-4 flex-1">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {filteredPlayers.map((player) => {
              const retainedData = retainedMap.get(player.id);
              const isRetained = !!retainedData;

              return (
                <div
                  key={player.id}
                  onClick={() => {
                    if (!isLocked) onToggleRetention(player.id);
                  }}
                  className={`relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isRetained
                      ? "bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/80 shadow-xl shadow-amber-500/10 scale-[1.01]"
                      : "bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700"
                  } ${isLocked ? "cursor-default opacity-85" : ""}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-white text-base leading-tight">
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
                  </div>

                  {/* COST BREAKDOWN FOOTER ON CARD */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    {isRetained ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Slot #{retainedData.slotNumber}
                        </span>
                        <div className="font-mono font-black text-rose-400 text-sm">
                          -₹{retainedData.cost.toFixed(2)} Cr
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                          Rating: <b className="text-slate-200">{player.rating}</b>
                        </span>
                        {currentCount < maxRetentions ? (
                          <span className="text-amber-400/90 font-semibold text-[11px]">
                            Costs: <b className="text-amber-400 font-mono">₹{nextSlotCost.toFixed(2)} Cr</b>
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Max retained</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Itemized Retention Bill & Other Franchises */}
        <div className="space-y-6">
          {/* Active Retention Bill */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Your Retention Bill</span>
              </h3>
              <span className="text-xs text-amber-400 font-bold">
                {currentCount} / {maxRetentions}
              </span>
            </div>

            {myTeamState.retained.length === 0 ? (
              <div className="p-4 bg-slate-950/70 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No players selected yet. Click any player above to retain them.
              </div>
            ) : (
              <div className="space-y-2">
                {myTeamState.retained.map((r, idx) => {
                  const cost = r.cost !== undefined
                    ? r.cost
                    : room.settings.retentionMode === "flat"
                    ? room.settings.flatRetentionCost
                    : (RETENTION_SLABS[idx] || 4.0);
                  return (
                    <div
                      key={r.id}
                      className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="text-[10px] text-amber-400 font-mono">#{idx + 1}</span>
                          <span>{r.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{r.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-400">
                          -₹{Number(cost).toFixed(2)} Cr
                        </span>
                        {!isLocked && (
                          <button
                            onClick={() => onToggleRetention(r.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400">Total Retention Deduction:</span>
                  <span className="font-mono font-black text-rose-400 text-sm">
                    -₹{Number(myTeamState.spent || 0).toFixed(2)} Cr
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="font-semibold text-slate-400">Remaining Auction Purse:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    ₹{Number(myTeamState.purse || 0).toFixed(2)} Cr
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Franchise Status */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Franchise Lock Status</span>
            </h3>

            <div className="space-y-2">
              {room.players.map((p) => {
                const team = getTeam(p.teamId);
                const tState = room.teamsState[p.teamId] || { retained: [] };
                return (
                  <div
                    key={p.id}
                    className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{team.logoEmoji}</span>
                      <div>
                        <div className="font-bold text-white">{team.shortName}</div>
                        <div className="text-[10px] text-slate-400">{p.name}</div>
                      </div>
                    </div>

                    <div>
                      {p.retentionsLocked ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Locked ({tState.retained.length})</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Choosing ({tState.retained.length})...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import React, { useState } from "react";
import { getTeam, TEAMS } from "../teamsData";
import { X, Shield, DollarSign, Users, Award, Sparkles, Filter } from "lucide-react";

export default function SquadDrawer({
  isOpen,
  onClose,
  teamsState,
  initialTeamId,
  players
}) {
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || "CSK");
  const [roleFilter, setRoleFilter] = useState("ALL"); // "ALL", "BAT", "WK", "ALL_ROUNDER", "BOWL"

  if (!isOpen) return null;

  const currentTeam = getTeam(selectedTeamId);
  const teamData = teamsState[selectedTeamId] || {
    purse: 0,
    spent: 0,
    squad: [],
    rtmCardsLeft: 0
  };

  const squad = teamData.squad || [];
  const overseasCount = squad.filter((p) => p.isOverseas).length;

  const batters = squad.filter((p) => p.role === "BAT");
  const keepers = squad.filter((p) => p.role === "WK");
  const allrounders = squad.filter((p) => p.role === "ALL");
  const bowlers = squad.filter((p) => p.role === "PACE" || p.role === "SPIN");

  const getRoleBadge = (role) => {
    switch (role) {
      case "BAT":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">BAT</span>;
      case "WK":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">WK</span>;
      case "ALL":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">ALL</span>;
      case "PACE":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">PACE</span>;
      case "SPIN":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">SPIN</span>;
      default:
        return null;
    }
  };

  const renderPlayerRow = (player, idx) => (
    <div
      key={player.id + idx}
      className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 hover:border-slate-700 transition text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="w-5 text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
        <div>
          <div className="font-bold text-white flex items-center gap-1.5">
            <span>{player.name}</span>
            {player.viaRTM && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                RTM
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {getRoleBadge(player.role)}
            {player.isOverseas ? (
              <span className="text-[10px] text-sky-400 font-semibold">✈️ OS</span>
            ) : (
              <span className="text-[10px] text-orange-400 font-semibold">🇮🇳 IND</span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-black text-amber-400 font-mono">
          {player.boughtFor ? `₹${Number(player.boughtFor).toFixed(2)} Cr` : "Retained"}
        </div>
        <div className="text-[10px] text-slate-400">
          Rating: <b className="text-slate-200">{player.rating}</b>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-white text-base">Squad Roster & Department Breakdown</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Tabs */}
        <div className="flex items-center gap-1.5 p-3 overflow-x-auto bg-slate-950/50 border-b border-slate-800">
          {Object.keys(teamsState).map((tId) => {
            const team = getTeam(tId);
            const isSelected = selectedTeamId === tId;
            return (
              <button
                key={tId}
                onClick={() => setSelectedTeamId(tId)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 shadow-md"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{team.logoEmoji}</span>
                <span>{team.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Team Overview Banner */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{currentTeam.logoEmoji}</span>
              <div>
                <h3 className="font-black text-white text-base leading-tight">{currentTeam.name}</h3>
                <span className="text-xs text-slate-400">
                  Manager: <b className="text-slate-200">{teamData.ownerName || "Franchise"}</b>
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500">Purse Left</div>
              <div className="text-xl font-black text-amber-400 font-mono">
                ₹{Number(teamData.purse || 0).toFixed(2)} Cr
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-[10px]">Squad Size</div>
              <div className="font-bold text-white mt-0.5">{squad.length} / 25</div>
            </div>
            <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-[10px]">Overseas</div>
              <div className={`font-bold mt-0.5 ${overseasCount > 8 ? "text-rose-400" : "text-sky-400"}`}>
                {overseasCount} / 8
              </div>
            </div>
            <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-[10px]">Total Spent</div>
              <div className="font-bold text-amber-400 mt-0.5">₹{Number(teamData.spent || 0).toFixed(1)} Cr</div>
            </div>
            <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
              <div className="text-slate-500 text-[10px]">RTM Left</div>
              <div className="font-bold text-emerald-400 mt-0.5">{teamData.rtmCardsLeft || 0}</div>
            </div>
          </div>

          {/* Department Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800/80 overflow-x-auto text-[11px]">
            {[
              { id: "ALL", label: `All (${squad.length})` },
              { id: "BAT", label: `🏏 Batters (${batters.length})` },
              { id: "WK", label: `🧤 WKs (${keepers.length})` },
              { id: "ALL_ROUNDER", label: `⚡ All-Rounders (${allrounders.length})` },
              { id: "BOWL", label: `🎯 Bowlers (${bowlers.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition ${
                  roleFilter === tab.id
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Players Categorized Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {squad.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No players acquired yet. Bidding underway!
            </div>
          ) : (
            <>
              {/* 1. BATTERS SECTION */}
              {(roleFilter === "ALL" || roleFilter === "BAT") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-wider pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span>🏏</span>
                      <span>Batters ({batters.length})</span>
                    </span>
                  </div>

                  {batters.length === 0 ? (
                    <div className="text-xs text-slate-600 italic py-1">No pure batters acquired yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {batters.map((player, idx) => renderPlayerRow(player, idx))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. WICKETKEEPERS SECTION */}
              {(roleFilter === "ALL" || roleFilter === "WK") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span>🧤</span>
                      <span>Wicketkeepers ({keepers.length})</span>
                    </span>
                  </div>

                  {keepers.length === 0 ? (
                    <div className="text-xs text-slate-600 italic py-1">No wicketkeepers acquired yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {keepers.map((player, idx) => renderPlayerRow(player, idx))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. ALL-ROUNDERS SECTION */}
              {(roleFilter === "ALL" || roleFilter === "ALL_ROUNDER") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>All-Rounders ({allrounders.length})</span>
                    </span>
                  </div>

                  {allrounders.length === 0 ? (
                    <div className="text-xs text-slate-600 italic py-1">No all-rounders acquired yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {allrounders.map((player, idx) => renderPlayerRow(player, idx))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. BOWLERS SECTION */}
              {(roleFilter === "ALL" || roleFilter === "BOWL") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase tracking-wider pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span>🎯</span>
                      <span>Bowlers ({bowlers.length})</span>
                    </span>
                  </div>

                  {bowlers.length === 0 ? (
                    <div className="text-xs text-slate-600 italic py-1">No bowlers acquired yet.</div>
                  ) : (
                    <div className="space-y-1.5">
                      {bowlers.map((player, idx) => renderPlayerRow(player, idx))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

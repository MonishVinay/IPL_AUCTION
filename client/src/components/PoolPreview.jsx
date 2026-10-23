import React from "react";
import { getTeam } from "../teamsData";
import { Sparkles, Clock, FastForward, SkipForward, Users, ArrowRight, Shield, LogOut } from "lucide-react";

export default function PoolPreview({
  pool,
  poolIndex,
  totalPools,
  timeLeft,
  pools,
  isHost,
  onSkipPreview,
  onSkipPool,
  onLeaveRoom
}) {
  if (!pool) return null;

  const players = pool.players || [];

  const getRoleBadge = (role) => {
    switch (role) {
      case "BAT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">BATTER</span>;
      case "WK":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">WK-BAT</span>;
      case "ALL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">ALL-ROUNDER</span>;
      case "PACE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">FAST BOWL</span>;
      case "SPIN":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">SPINNER</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Set Roadmap Header */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Auction Sets:</span>
            {pools?.map((p, idx) => (
              <div
                key={p.id || idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                  idx === poolIndex
                    ? "bg-amber-400 text-slate-950 shadow"
                    : idx < poolIndex
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 line-through opacity-70"
                    : "bg-slate-900 text-slate-400 border border-slate-800"
                }`}
              >
                <span>{p.code}</span>
              </div>
            ))}
          </div>

          <div className="text-slate-400 font-semibold text-[11px]">
            Set {poolIndex + 1} of {totalPools}
          </div>
        </div>

        {/* Hero Pool Announcement Banner */}
        <div className="p-6 md:p-8 bg-gradient-to-r from-amber-500/15 via-slate-900 to-purple-500/15 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 uppercase tracking-widest">
                {pool.code}
              </span>
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Auction Pool</span>
              </span>
            </div>

            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              {pool.name}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm max-w-xl">
              {pool.description} • <b>{players.length} Players</b> in this set
            </p>
          </div>

          {/* Host Controls or Spectator Status (No auto-timer; Host decides when to close list and start) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {isHost ? (
              <>
                {onSkipPool && (
                  <button
                    onClick={() => {
                      if (window.confirm("Skip this entire pool without auctioning it?")) {
                        onSkipPool();
                      }
                    }}
                    title="Skip entire pool"
                    className="py-3 px-4 bg-slate-950/80 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-400 font-bold text-xs rounded-2xl transition flex items-center gap-1.5"
                  >
                    <SkipForward className="w-4 h-4 text-amber-400" />
                    <span>Skip Pool</span>
                  </button>
                )}

                <button
                  onClick={onSkipPreview}
                  className="py-3 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
                >
                  <FastForward className="w-4 h-4 fill-slate-950" />
                  <span>Close List & Start Pool</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-semibold text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Host is reviewing list • Waiting for host to close & start bidding</span>
              </div>
            )}

            {onLeaveRoom && (
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem("ipl_auction_session");
                  } catch (e) {}
                  onLeaveRoom();
                }}
                title="Leave Room"
                className="p-3 bg-slate-950/80 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 rounded-2xl text-slate-400 hover:text-red-300 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Players Showcase Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-slate-200 uppercase tracking-wider">
              Players Appearing in this Pool ({players.length})
            </span>
            <span>Target your bids and prepare your purse strategy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {players.map((player) => {
              const origTeam = player.originalTeamId ? getTeam(player.originalTeamId) : null;
              return (
                <div
                  key={player.id}
                  className="p-3.5 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl flex flex-col justify-between transition"
                >
                  <div>
                    <div className="font-extrabold text-white text-sm leading-tight">
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
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-mono font-bold">
                      ₹{player.basePrice} Cr
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Rating: <b className="text-slate-200">{player.rating}</b>
                    </span>
                  </div>

                  {origTeam && (
                    <div className="mt-1 text-[10px] text-slate-500 flex items-center gap-1">
                      <span>Ex:</span>
                      <span className="font-semibold text-slate-300">{origTeam.shortName}</span>
                      <span>{origTeam.logoEmoji}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

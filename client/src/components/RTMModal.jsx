import React from "react";
import { getTeam } from "../teamsData";
import { ShieldAlert, Check, X, Clock, Sparkles } from "lucide-react";

export default function RTMModal({ rtmState, playerId, onRespondRTM }) {
  if (!rtmState) return null;

  const { player, origTeamId, winningTeamId, matchAmount, timeLeft } = rtmState;
  const origTeam = getTeam(origTeamId);
  const winningTeam = getTeam(winningTeamId);

  const isMyTeamOrig = origTeamId === playerId || origTeamId === rtmState.origTeamIdPlayerTeam;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-400 rounded-3xl shadow-2xl shadow-amber-500/20 overflow-hidden flex flex-col">
        {/* Pulsing Top Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-4 text-center text-slate-950 font-black flex items-center justify-center gap-2 tracking-wider uppercase text-sm">
          <ShieldAlert className="w-5 h-5 fill-slate-950" />
          <span>RIGHT TO MATCH (RTM) CHALLENGE!</span>
        </div>

        {/* Timer Bar */}
        <div className="w-full bg-slate-800 h-1.5">
          <div
            className="bg-amber-400 h-full transition-all duration-1000"
            style={{ width: `${Math.max(0, (timeLeft / 12) * 100)}%` }}
          />
        </div>

        {/* Content Body */}
        <div className="p-6 text-center space-y-5">
          {/* Player Info */}
          <div>
            <div className="text-2xl font-black text-white">{player.name}</div>
            <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">{player.role}</span>
              <span>•</span>
              <span>Rating: <b className="text-amber-400">{player.rating}</b></span>
              <span>•</span>
              <span>{player.isOverseas ? "✈️ Overseas" : "🇮🇳 Indian"}</span>
            </div>
          </div>

          {/* Bid Matchup */}
          <div className="flex items-center justify-around p-4 bg-slate-950/70 rounded-2xl border border-slate-800">
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">Winning Bidder</div>
              <div className="text-2xl">{winningTeam.logoEmoji}</div>
              <div className="font-extrabold text-sm text-white mt-0.5">{winningTeam.shortName}</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Match Price</div>
              <div className="text-2xl md:text-3xl font-black text-amber-400 font-mono mt-0.5">
                ₹{matchAmount.toFixed(2)} Cr
              </div>
            </div>

            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">Original Team</div>
              <div className="text-2xl">{origTeam.logoEmoji}</div>
              <div className="font-extrabold text-sm text-white mt-0.5">{origTeam.shortName}</div>
            </div>
          </div>

          {/* Clock Countdown */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Time Remaining: {timeLeft}s</span>
          </div>

          {/* Decision Buttons (If user is original team owner) or Spectator Message */}
          {isMyTeamOrig ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-slate-300">
                You hold the Right to Match! Match the winning bid to acquire <b>{player.name}</b> for your squad using 1 RTM card.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onRespondRTM(false)}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl border border-slate-700 transition flex items-center justify-center gap-2 text-sm"
                >
                  <X className="w-4 h-4 text-rose-400" />
                  <span>Pass (Let Go)</span>
                </button>

                <button
                  onClick={() => onRespondRTM(true)}
                  className="py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Match with RTM!</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-400">
                Waiting for <span className="font-bold text-white">{origTeam.name}</span> ({origTeam.shortName}) to decide whether to trigger their RTM card...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

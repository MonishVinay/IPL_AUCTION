import React, { useState } from "react";
import { Gavel, FastForward, SkipForward, AlertCircle, Plus, Check, X, ShieldAlert, UserX } from "lucide-react";
import { getTeam } from "../teamsData";

export default function BiddingControls({
  currentBid,
  currentBidder,
  currentPlayer,
  myTeamId,
  myTeamState,
  passedTeams = [],
  persistentPassTeams = [],
  settings,
  isHost,
  isResolved = false,
  players = [],
  teamsState = {},
  onPlaceBid,
  onPassTurn,
  onTogglePersistentPass,
  onSetPlayerAutoSkip,
  onSkipPlayer,
  onSkipPool,
  onEndBid
}) {
  const [errorMsg, setErrorMsg] = useState("");
  const [showAutoSkipModal, setShowAutoSkipModal] = useState(false);

  if (!currentPlayer) return null;

  const isLeading = currentBidder === myTeamId;
  const hasPassed = passedTeams.includes(myTeamId);
  const isAutoPassActive = persistentPassTeams.includes(myTeamId);
  const purse = myTeamState?.purse || 0;
  const squad = myTeamState?.squad || [];
  const overseasCount = squad.filter((p) => p.isOverseas).length;

  const autoSkippedRivalsCount = persistentPassTeams.filter((t) => t !== myTeamId).length;
  const rivalList = Object.keys(teamsState)
    .filter((tId) => tId !== myTeamId)
    .map((tId) => {
      const team = getTeam(tId);
      const player = (players || []).find((p) => p.teamId === tId);
      const isOnline = player ? player.isConnected !== false : true;
      const isAutoSkip = persistentPassTeams.includes(tId);
      const hasPassedThisPlayer = passedTeams.includes(tId);
      return {
        teamId: tId,
        team,
        player,
        isOnline,
        isAutoSkip,
        hasPassedThisPlayer
      };
    });

  const getNextIncrement = (curr, base) => {
    if (curr === 0) return base;
    if (curr < 1.0) return 0.20;
    if (curr < 5.0) return 0.25;
    if (curr < 10.0) return 0.50;
    return 1.00;
  };

  const defaultNextBid = currentBid === 0
    ? currentPlayer.basePrice
    : +(currentBid + getNextIncrement(currentBid, currentPlayer.basePrice)).toFixed(2);

  const validateBid = (amount) => {
    if (isResolved) return "Sale is currently being finalized.";
    if (isLeading) return "You already hold the highest bid!";
    if (squad.length >= settings.maxSquad) return `Squad is full (${settings.maxSquad} players).`;
    if (currentPlayer.isOverseas && overseasCount >= settings.maxOverseas) {
      return `Overseas quota full (${settings.maxOverseas} max).`;
    }
    if (purse < amount) {
      return `Insufficient purse! You have ₹${purse.toFixed(2)} Cr left, but this bid requires ₹${amount.toFixed(2)} Cr.`;
    }
    return null;
  };

  const handleQuickBid = (increment) => {
    if (isResolved) return;
    setErrorMsg("");
    const targetAmount = +(currentBid === 0 ? currentPlayer.basePrice : currentBid + increment).toFixed(2);
    const err = validateBid(targetAmount);
    if (err) {
      setErrorMsg(err);
      return;
    }
    onPlaceBid(targetAmount, (res) => {
      if (res?.error) setErrorMsg(res.error);
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl backdrop-blur-md">
      {/* Error / Warning Alert */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Single-Click Bid Button */}
      <div>
        <button
          onClick={() => handleQuickBid(getNextIncrement(currentBid, currentPlayer.basePrice))}
          disabled={isLeading || isResolved}
          className={`w-full py-4 rounded-2xl font-black text-base shadow-xl transition-all duration-150 flex items-center justify-center gap-2 ${
            isResolved
              ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-70"
              : isLeading
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
              : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99]"
          }`}
        >
          {isResolved ? (
            <>
              <Check className="w-5 h-5 stroke-[2] text-slate-400" />
              <span>Bidding Closed — Sale Finalizing</span>
            </>
          ) : isLeading ? (
            <>
              <Check className="w-5 h-5 stroke-[3]" />
              <span>You Hold The Highest Bid! (₹{currentBid.toFixed(2)} Cr)</span>
            </>
          ) : (
            <>
              <Gavel className="w-5 h-5 fill-slate-950" />
              <span>
                {currentBid === 0
                  ? `Open Bidding at Base Price (₹${defaultNextBid.toFixed(2)} Cr)`
                  : `Bid Next: ₹${defaultNextBid.toFixed(2)} Cr`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Quick Increment Buttons (+20L, +50L, +1 Cr, +2 Cr) */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "+₹20L", val: 0.20 },
          { label: "+₹50L", val: 0.50 },
          { label: "+₹1 Cr", val: 1.00 },
          { label: "+₹2 Cr", val: 2.00 }
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => handleQuickBid(btn.val)}
            disabled={isLeading || isResolved}
            className="py-2.5 bg-slate-950/80 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Interactive Pass & Host Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pass Button with state */}
          <button
            onClick={onPassTurn}
            disabled={isLeading || hasPassed || isResolved}
            title={hasPassed ? "You have already passed on this player" : "Pass on this player"}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              isResolved || hasPassed
                ? "bg-slate-800 text-slate-500 cursor-default border border-slate-800 opacity-60"
                : "bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-300 hover:text-rose-400"
            }`}
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            <span>{hasPassed ? "Passed ✕" : "Pass"}</span>
          </button>

          {/* Persistent Auto-Pass Button */}
          {onTogglePersistentPass && (
            <button
              type="button"
              onClick={() => onTogglePersistentPass(!isAutoPassActive)}
              disabled={isResolved}
              title={
                isAutoPassActive
                  ? "Auto-Pass is ACTIVE: You remain passed until unchecked or you bid. Click to disable."
                  : "Enable Auto-Pass: Remain passed across upcoming players until you uncheck it."
              }
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isAutoPassActive
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/20"
                  : "bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
              } disabled:opacity-50`}
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold border transition ${
                  isAutoPassActive ? "bg-amber-400 text-slate-950 border-amber-400" : "border-slate-600 bg-slate-900 text-transparent"
                }`}
              >
                ✓
              </span>
              <span>{isAutoPassActive ? "Auto-Pass: ON" : "Auto-Pass"}</span>
            </button>
          )}
        </div>

        {isHost && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {onEndBid && (
              <button
                onClick={onEndBid}
                disabled={isResolved}
                title="End current bid immediately: strikes gavel and sells to highest bidder, or marks unsold"
                className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1"
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>End Bid</span>
              </button>
            )}

            <button
              onClick={onSkipPlayer}
              disabled={isResolved}
              title="Host skip current player"
              className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition flex items-center gap-1"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Skip Player</span>
            </button>

            {onSkipPool && (
              <button
                onClick={() => {
                  if (window.confirm("Skip remaining players in this pool and go to the next set?")) {
                    onSkipPool();
                  }
                }}
                disabled={isResolved}
                title="Host skip entire remaining pool"
                className="px-2.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip Pool</span>
              </button>
            )}

            {onSetPlayerAutoSkip && rivalList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAutoSkipModal(true)}
                title="Host: Configure Auto-Skip for offline or AFK managers"
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  autoSkippedRivalsCount > 0
                    ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"
                    : "bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800"
                }`}
              >
                <UserX className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Skip AFK {autoSkippedRivalsCount > 0 ? `(${autoSkippedRivalsCount})` : ""}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 text-center">
        Tip: Toggle <b className="text-slate-400">Auto-Pass</b> to remain passed across upcoming players until you uncheck it or place a bid.
      </div>

      {/* Host AFK / Auto-Skip Manager Modal */}
      {showAutoSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-base">Host: Auto-Skip AFK Managers</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoSkipModal(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enable <b>Auto-Skip</b> for offline or AFK managers. Their turns will pass immediately, so the auction won't wait for countdown timers or RTM.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {rivalList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No rival managers in this room.
                </div>
              ) : (
                rivalList.map(({ teamId, team, player, isOnline, isAutoSkip, hasPassedThisPlayer }) => (
                  <div
                    key={teamId}
                    className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{team.logoEmoji}</span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{team.shortName}</span>
                          <span className="text-slate-400 font-normal">({player?.name || "Manager"})</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] ${isOnline ? "text-emerald-400" : "text-rose-400 font-bold"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-rose-400"}`} />
                            {isOnline ? "Online" : "Offline"}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {hasPassedThisPlayer ? "Passed" : "Active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSetPlayerAutoSkip(teamId, !isAutoSkip)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border ${
                        isAutoSkip
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20 hover:bg-amber-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isAutoSkip ? "Auto-Skip: ON" : "Set Auto-Skip"}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowAutoSkipModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

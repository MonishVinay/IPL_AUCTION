import React, { useState } from "react";
import { Gavel, FastForward, SkipForward, AlertCircle, Plus, Check, X, ShieldAlert } from "lucide-react";

export default function BiddingControls({
  currentBid,
  currentBidder,
  currentPlayer,
  myTeamId,
  myTeamState,
  passedTeams = [],
  settings,
  isHost,
  onPlaceBid,
  onPassTurn,
  onSkipPlayer,
  onSkipPool
}) {
  const [customInput, setCustomInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!currentPlayer) return null;

  const isLeading = currentBidder === myTeamId;
  const hasPassed = passedTeams.includes(myTeamId);
  const purse = myTeamState?.purse || 0;
  const squad = myTeamState?.squad || [];
  const overseasCount = squad.filter((p) => p.isOverseas).length;

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

  const handleCustomBid = (e) => {
    e.preventDefault();
    setErrorMsg("");
    const amount = Number(customInput);
    if (!amount || amount <= currentBid) {
      setErrorMsg("Custom bid must be strictly higher than the current bid.");
      return;
    }
    const err = validateBid(amount);
    if (err) {
      setErrorMsg(err);
      return;
    }
    onPlaceBid(amount, (res) => {
      if (res?.error) setErrorMsg(res.error);
      else setCustomInput("");
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
          disabled={isLeading}
          className={`w-full py-4 rounded-2xl font-black text-base shadow-xl transition-all duration-150 flex items-center justify-center gap-2 ${
            isLeading
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
              : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99]"
          }`}
        >
          {isLeading ? (
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
            disabled={isLeading}
            className="py-2.5 bg-slate-950/80 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3 text-amber-400" />
            <span>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Bid Input & Interactive Pass Button */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
        <form onSubmit={handleCustomBid} className="flex-1 flex gap-2">
          <input
            type="number"
            step="0.05"
            min={currentBid + 0.05}
            placeholder={`Custom bid (> ₹${currentBid || currentPlayer.basePrice} Cr)...`}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            disabled={isLeading}
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={isLeading || !customInput}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-white rounded-xl transition"
          >
            Raise
          </button>
        </form>

        {/* Pass Button with state */}
        <button
          onClick={onPassTurn}
          disabled={isLeading || hasPassed}
          title={hasPassed ? "You have already passed on this player" : "Pass your turn. If all rivals pass, bidding ends immediately."}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            hasPassed
              ? "bg-slate-800 text-slate-500 cursor-default border border-slate-800"
              : "bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-300 hover:text-rose-400"
          }`}
        >
          <X className="w-3.5 h-3.5 text-rose-400" />
          <span>{hasPassed ? "Passed ✕" : "Pass"}</span>
        </button>

        {isHost && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onSkipPlayer}
              title="Host skip current player"
              className="px-2.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition flex items-center gap-1"
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
                title="Host skip entire remaining pool"
                className="px-2.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-xl transition flex items-center gap-1"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Skip Pool</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 text-center">
        Tip: If all managers click <b className="text-slate-400">Pass</b>, the player is sold or marked unsold immediately without waiting for the timer!
      </div>
    </div>
  );
}

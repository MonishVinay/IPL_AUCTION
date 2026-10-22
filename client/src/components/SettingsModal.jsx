import React, { useState } from "react";
import { Settings, X, Shield, Users, Clock, DollarSign, Sparkles } from "lucide-react";

export default function SettingsModal({ settings, onClose, onSave }) {
  const [form, setForm] = useState({
    purse: settings.purse || 120,
    maxRetentions: settings.maxRetentions ?? 4,
    retentionMode: settings.retentionMode || "official",
    flatRetentionCost: settings.flatRetentionCost || 10,
    maxRTM: settings.maxRTM ?? 2,
    minSquad: settings.minSquad || 18,
    maxSquad: settings.maxSquad || 25,
    includeBonusPlayers: settings.includeBonusPlayers ?? true,
    bidTimerSeconds: settings.bidTimerSeconds || 20
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
            <Settings className="w-5 h-5" />
            <span>Auction & League Rules</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Starting Purse */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Starting Franchise Purse (₹ Crores)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[80, 100, 120, 150].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setForm({ ...form, purse: val })}
                  className={`py-2 text-sm font-semibold rounded-lg border transition ${
                    form.purse === val
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  ₹{val} Cr
                </button>
              ))}
            </div>
            <input
              type="number"
              min="50"
              max="200"
              value={form.purse}
              onChange={(e) => setForm({ ...form, purse: Number(e.target.value) })}
              className="mt-2 w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
              placeholder="Or enter custom purse..."
            />
          </div>

          {/* Retention Settings */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Shield className="w-4 h-4 text-amber-400" />
                Allowed Retentions Per Franchise
              </label>
              <span className="text-amber-400 font-bold">{form.maxRetentions} Players</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              value={form.maxRetentions}
              onChange={(e) => setForm({ ...form, maxRetentions: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0 (Fresh Auction)</span>
              <span>2</span>
              <span>4 (Default)</span>
              <span>6 (Max)</span>
            </div>

            {form.maxRetentions > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">
                  Retention Cost Deduction Formula
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, retentionMode: "official" })}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      form.retentionMode === "official"
                        ? "bg-amber-500/10 border-amber-500 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="font-bold">Official IPL Slabs</div>
                    <div className="text-[11px] opacity-80 mt-0.5">18Cr, 14Cr, 11Cr, 18Cr...</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, retentionMode: "flat" })}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      form.retentionMode === "flat"
                        ? "bg-amber-500/10 border-amber-500 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="font-bold">Flat ₹10 Cr / player</div>
                    <div className="text-[11px] opacity-80 mt-0.5">Simple fixed price</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RTM Cards */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200">
                Right to Match (RTM) Cards Per Franchise
              </label>
              <span className="text-amber-400 font-bold">{form.maxRTM} Cards</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              value={form.maxRTM}
              onChange={(e) => setForm({ ...form, maxRTM: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-xs text-slate-400">
              Allows the original franchise to match the winning bid when another team tries to buy their player.
            </p>
          </div>

          {/* Bonus Star Players Toggle */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-950/30 to-purple-950/30 border border-amber-500/30 rounded-xl">
            <div className="space-y-0.5 pr-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Include 36 Extra Star Players
              </div>
              <div className="text-xs text-slate-400">
                Adds top stars like Maxwell, Warner, Faf du Plessis, Williamson, Steve Smith, Bairstow & more to the auction pool.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, includeBonusPlayers: !form.includeBonusPlayers })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                form.includeBonusPlayers ? "bg-amber-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <div className="w-4 h-4 bg-slate-950 rounded-full shadow-md" />
            </button>
          </div>

          {/* Squad Constraints & Timer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Min Squad Size
              </label>
              <select
                value={form.minSquad}
                onChange={(e) => setForm({ ...form, minSquad: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
              >
                {[15, 16, 18, 20].map((num) => (
                  <option key={num} value={num}>
                    {num} Players
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                Bid Timer
              </label>
              <select
                value={form.bidTimerSeconds}
                onChange={(e) => setForm({ ...form, bidTimerSeconds: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm"
              >
                {[15, 20, 25, 30, 45].map((sec) => (
                  <option key={sec} value={sec}>
                    {sec} Seconds
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 transition"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

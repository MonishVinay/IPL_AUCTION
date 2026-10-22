import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { getTeam } from "../teamsData";
import { Trophy, Award, Users, Shield, RefreshCw, Check, AlertCircle, Sparkles, LogOut } from "lucide-react";

export default function PlayingXIBuilder({
  room,
  playerId,
  onReAuctionUnsold,
  onLeaveRoom
}) {
  const [selectedXI, setSelectedXI] = useState([]);
  const [activeTab, setActiveTab] = useState("LEADERBOARD"); // "LEADERBOARD", "PLAYING_XI"

  const myPlayer = room.players.find((p) => p.id === playerId);
  const myTeamId = myPlayer?.teamId;
  const myTeam = getTeam(myTeamId);
  const myTeamData = room.teamsState[myTeamId] || { squad: [], purse: 0 };
  const squad = myTeamData.squad || [];

  // Trigger confetti on mounting
  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  // Playing XI selection helper
  const toggleSelectPlayer = (player) => {
    const exists = selectedXI.find((p) => p.id === player.id);
    if (exists) {
      setSelectedXI(selectedXI.filter((p) => p.id !== player.id));
    } else {
      if (selectedXI.length >= 11) return;
      setSelectedXI([...selectedXI, player]);
    }
  };

  // XI validation
  const xiOverseas = selectedXI.filter((p) => p.isOverseas).length;
  const xiKeepers = selectedXI.filter((p) => p.role === "WK").length;
  const xiBowlers = selectedXI.filter((p) => p.role === "PACE" || p.role === "SPIN" || p.role === "ALL").length;

  const isValidXI = selectedXI.length === 11 && xiOverseas <= 4 && xiKeepers >= 1;

  // Calculate XI Rating
  const xiBatters = selectedXI.filter((p) => p.role === "BAT" || p.role === "WK").sort((a, b) => b.rating - a.rating);
  const xiBowlingUnit = selectedXI.filter((p) => p.role === "PACE" || p.role === "SPIN" || p.role === "ALL").sort((a, b) => b.rating - a.rating);

  const avgXIBat = xiBatters.length ? (xiBatters.reduce((acc, p) => acc + p.rating, 0) / xiBatters.length).toFixed(1) : 0;
  const avgXIBowl = xiBowlingUnit.length ? (xiBowlingUnit.slice(0, 5).reduce((acc, p) => acc + p.rating, 0) / Math.min(5, xiBowlingUnit.length)).toFixed(1) : 0;
  const overallXIRating = selectedXI.length === 11 ? ((+avgXIBat * 0.5) + (+avgXIBowl * 0.5)).toFixed(1) : 0;

  // League Leaderboard calculation
  const leaderboard = Object.entries(room.teamsState).map(([tId, tData]) => {
    const team = getTeam(tId);
    const sq = tData.squad || [];
    const batRating = sq.filter((p) => p.role === "BAT" || p.role === "WK").slice(0, 6).reduce((a, b) => a + b.rating, 0) / Math.max(1, Math.min(6, sq.length));
    const bowlRating = sq.filter((p) => p.role === "PACE" || p.role === "SPIN").slice(0, 5).reduce((a, b) => a + b.rating, 0) / Math.max(1, Math.min(5, sq.length));
    const overall = +((batRating * 0.5) + (bowlRating * 0.5)).toFixed(1);

    return {
      teamId: tId,
      team,
      ownerName: tData.ownerName,
      squadSize: sq.length,
      overseasCount: sq.filter((p) => p.isOverseas).length,
      purseLeft: tData.purse,
      spent: tData.spent,
      overallRating: isNaN(overall) ? 0 : overall
    };
  }).sort((a, b) => b.overallRating - a.overallRating);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col">
      {/* Celebration Header */}
      <header className="max-w-6xl w-full mx-auto text-center pb-8 border-b border-slate-800">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-xl shadow-amber-500/20 mb-3 text-3xl">
          🏆
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          IPL MEGA AUCTION COMPLETE!
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review the final franchise rankings and select your official Playing XI.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setActiveTab("LEADERBOARD")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeTab === "LEADERBOARD"
                ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Franchise Leaderboard</span>
          </button>

          <button
            onClick={() => setActiveTab("PLAYING_XI")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeTab === "PLAYING_XI"
                ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Select My Playing XI ({selectedXI.length}/11)</span>
          </button>

          {myPlayer?.isHost && room.unsoldPoolCount > 0 && (
            <button
              onClick={onReAuctionUnsold}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Auction {room.unsoldPoolCount} Unsold</span>
            </button>
          )}

          {onLeaveRoom && (
            <button
              onClick={() => {
                if (window.confirm("Exit this auction room and return to home?")) {
                  onLeaveRoom();
                }
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Room</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto py-8 flex-1">
        {activeTab === "LEADERBOARD" ? (
          <div className="space-y-6">
            {/* Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm text-white">Final League Standings</span>
                <span className="text-xs text-slate-400">Based on Squad Depth & Overall Rating</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Franchise</th>
                      <th className="py-3 px-4">Manager</th>
                      <th className="py-3 px-4 text-center">Squad Size</th>
                      <th className="py-3 px-4 text-center">Overseas</th>
                      <th className="py-3 px-4 text-right">Purse Left</th>
                      <th className="py-3 px-4 text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {leaderboard.map((item, idx) => (
                      <tr
                        key={item.teamId}
                        className={`hover:bg-slate-800/40 transition ${
                          item.teamId === myTeamId ? "bg-amber-500/5 font-bold" : ""
                        }`}
                      >
                        <td className="py-4 px-4 font-mono">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{item.team.logoEmoji}</span>
                            <div>
                              <div className="font-bold text-white">{item.team.name}</div>
                              <div className="text-[10px] text-slate-500">{item.team.shortName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-300">
                          {item.ownerName} {item.teamId === myTeamId && "(You)"}
                        </td>
                        <td className="py-4 px-4 text-center text-slate-300">
                          {item.squadSize} / 25
                        </td>
                        <td className="py-4 px-4 text-center text-sky-400">
                          {item.overseasCount} / 8
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-amber-400">
                          ₹{Number(item.purseLeft).toFixed(2)} Cr
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-black text-sm text-emerald-400">
                          {item.overallRating} ★
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Playing XI Builder Tab */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Squad selector */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">Select Your Playing XI</h3>
                  <p className="text-xs text-slate-400">
                    Click players from your acquired squad to add or remove them from your Starting XI.
                  </p>
                </div>
                <div className="text-xs font-bold text-amber-400">
                  {selectedXI.length} / 11 Picked
                </div>
              </div>

              {/* Player list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {squad.map((player) => {
                  const isPicked = selectedXI.some((p) => p.id === player.id);
                  return (
                    <div
                      key={player.id}
                      onClick={() => toggleSelectPlayer(player)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isPicked
                          ? "bg-amber-500/10 border-amber-400 ring-1 ring-amber-400 text-white"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                            isPicked ? "bg-amber-400 text-slate-950" : "border border-slate-700 bg-slate-950"
                          }`}
                        >
                          {isPicked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="font-bold text-sm leading-tight">{player.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-300">{player.role}</span>
                            <span>•</span>
                            <span>{player.isOverseas ? "✈️ OS" : "🇮🇳 IND"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-400 text-xs">
                          {player.rating} ★
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: XI Synergy & Constraints */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Playing XI Rules & Synergy</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Total Players:</span>
                    <span className={`font-bold ${selectedXI.length === 11 ? "text-emerald-400" : "text-amber-400"}`}>
                      {selectedXI.length} / 11
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Overseas Quota:</span>
                    <span className={`font-bold ${xiOverseas <= 4 ? "text-emerald-400" : "text-rose-400"}`}>
                      {xiOverseas} / 4 Max
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Wicketkeepers:</span>
                    <span className={`font-bold ${xiKeepers >= 1 ? "text-emerald-400" : "text-rose-400"}`}>
                      {xiKeepers} / At least 1
                    </span>
                  </div>
                </div>

                {/* Rating Card */}
                <div className="p-4 bg-gradient-to-tr from-slate-950 to-slate-900 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Playing XI Overall Strength</div>
                  <div className="text-4xl font-black text-amber-400 font-mono mt-1">
                    {overallXIRating} ★
                  </div>
                  <div className="flex justify-around text-xs mt-3 pt-3 border-t border-slate-800 text-slate-400">
                    <div>Batting: <b className="text-white">{avgXIBat}</b></div>
                    <div>Bowling: <b className="text-white">{avgXIBowl}</b></div>
                  </div>
                </div>

                {isValidXI ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-400 font-bold">
                    ✓ Valid Playing XI Composition!
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-xs text-amber-400">
                    Pick 11 players (Max 4 OS & Min 1 WK).
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

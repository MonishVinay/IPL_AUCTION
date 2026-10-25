import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { getTeam, TEAMS } from "../teamsData";
import {
  Trophy,
  Award,
  Users,
  Shield,
  RefreshCw,
  Check,
  CheckCheck,
  AlertCircle,
  Sparkles,
  LogOut,
  Copy,
  ArrowUp,
  ArrowDown,
  Zap,
  Flame,
  Star,
  Eye
} from "lucide-react";

export default function PlayingXIBuilder({
  room,
  playerId,
  onReAuctionUnsold,
  onLeaveRoom
}) {
  const [selectedXI, setSelectedXI] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  const [viceCaptainId, setViceCaptainId] = useState(null);
  const [impactPlayerId, setImpactPlayerId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("PLAYING_XI"); // "PLAYING_XI", "ALL_SQUADS", "LEADERBOARD"

  const myPlayer = room.players.find((p) => p.id === playerId);
  const myTeamId = myPlayer?.teamId;
  const myTeam = getTeam(myTeamId);
  const myTeamData = room.teamsState[myTeamId] || { squad: [], purse: 0 };
  const squad = myTeamData.squad || [];

  const [viewTeamId, setViewTeamId] = useState(myTeamId || Object.keys(room.teamsState)[0] || "CSK");
  const [squadRoleFilter, setSquadRoleFilter] = useState("ALL"); // "ALL", "BAT", "WK", "ALL_ROUNDER", "BOWL"

  // Trigger confetti on mounting
  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  // Compute auction stats
  const allSoldPlayers = [];
  Object.entries(room.teamsState || {}).forEach(([tId, tData]) => {
    (tData.squad || []).forEach((p) => {
      allSoldPlayers.push({ ...p, teamId: tId });
    });
  });

  let mostExpensivePlayer = room.auctionStats?.mostExpensivePlayer;
  if (!mostExpensivePlayer && allSoldPlayers.length > 0) {
    mostExpensivePlayer = allSoldPlayers.reduce((max, p) => {
      const currPrice = Number(p.boughtFor || p.price || 0);
      const maxPrice = Number(max?.boughtFor || max?.price || 0);
      return !max || currPrice > maxPrice ? p : max;
    }, null);
  }

  const totalBidsByTeam = room.totalBidsByTeam || {};
  let teamWithMostBids = room.auctionStats?.teamWithMostBids;
  if (!teamWithMostBids) {
    let maxBids = 0;
    let maxTeamId = null;
    Object.entries(totalBidsByTeam).forEach(([tId, count]) => {
      if (count > maxBids) {
        maxBids = count;
        maxTeamId = tId;
      }
    });
    if (maxTeamId) {
      teamWithMostBids = { teamId: maxTeamId, count: maxBids };
    }
  }

  let biggestSpender = room.auctionStats?.biggestSpender;
  let totalAuctionSpend = room.auctionStats?.totalSpend || 0;
  if (!biggestSpender) {
    let maxSpent = 0;
    let maxSpenderId = null;
    let sumSpent = 0;
    Object.entries(room.teamsState || {}).forEach(([tId, tData]) => {
      sumSpent += (tData.spent || 0);
      if ((tData.spent || 0) > maxSpent) {
        maxSpent = tData.spent;
        maxSpenderId = tId;
      }
    });
    if (maxSpenderId) {
      biggestSpender = { teamId: maxSpenderId, spent: maxSpent };
      totalAuctionSpend = sumSpent;
    }
  }

  // Playing XI selection helper: order of click determines batting order
  const toggleSelectPlayer = (player) => {
    const exists = selectedXI.find((p) => p.id === player.id);
    if (exists) {
      setSelectedXI(selectedXI.filter((p) => p.id !== player.id));
      if (captainId === player.id) setCaptainId(null);
      if (viceCaptainId === player.id) setViceCaptainId(null);
    } else {
      if (selectedXI.length >= 11) return;
      if (impactPlayerId === player.id) setImpactPlayerId(null);
      setSelectedXI([...selectedXI, player]);
    }
  };

  // Move batting order up or down
  const moveBattingOrder = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= selectedXI.length) return;
    const newXI = [...selectedXI];
    const temp = newXI[index];
    newXI[index] = newXI[targetIdx];
    newXI[targetIdx] = temp;
    setSelectedXI(newXI);
  };

  // Toggle Captain
  const toggleCaptain = (playerIdToSet) => {
    if (captainId === playerIdToSet) {
      setCaptainId(null);
    } else {
      setCaptainId(playerIdToSet);
      if (viceCaptainId === playerIdToSet) setViceCaptainId(null);
    }
  };

  // Toggle Vice Captain
  const toggleViceCaptain = (playerIdToSet) => {
    if (viceCaptainId === playerIdToSet) {
      setViceCaptainId(null);
    } else {
      setViceCaptainId(playerIdToSet);
      if (captainId === playerIdToSet) setCaptainId(null);
    }
  };

  // Bench: All players not in Playing XI and not the Impact Player
  const benchPlayers = squad.filter(
    (p) => !selectedXI.some((x) => x.id === p.id) && p.id !== impactPlayerId
  );

  // XI validation
  const xiOverseas = selectedXI.filter((p) => p.isOverseas).length;
  const xiKeepers = selectedXI.filter((p) => p.role === "WK").length;
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

  // Formatted Lineup Text for Export & Copy
  const generateLineupText = () => {
    const xiLines = selectedXI.map((p, idx) => `${idx + 1}. ${p.name}`);
    const impactPlayer = squad.find((p) => p.id === impactPlayerId);
    const captainPlayer = squad.find((p) => p.id === captainId);
    const vcPlayer = squad.find((p) => p.id === viceCaptainId);

    const benchString = benchPlayers.map((p) => p.name).join(", ");

    return [
      ...xiLines,
      "",
      `impact: ${impactPlayer ? impactPlayer.name : ""}`,
      `Captain: ${captainPlayer ? captainPlayer.name : ""}`,
      `vice captain: ${vcPlayer ? vcPlayer.name : ""}`,
      `bench: ${benchString}`
    ].join("\n");
  };

  const formattedLineup = generateLineupText();

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(formattedLineup).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        fallbackCopy(formattedLineup);
      });
    } else {
      fallbackCopy(formattedLineup);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "BAT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">BAT</span>;
      case "WK":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">WK</span>;
      case "ALL":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ALL</span>;
      case "PACE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">PACE</span>;
      case "SPIN":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">SPIN</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col">
      {/* Celebration Header */}
      <header className="max-w-6xl w-full mx-auto text-center pb-6 border-b border-slate-800">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-xl shadow-amber-500/20 mb-3 text-3xl">
          🏆
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          IPL MEGA AUCTION COMPLETE!
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review the auction stats, inspect every franchise's full squad, and finalize your official Playing XI.
        </p>

        {/* 4 AUCTION SUMMARY STATS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 text-left">
          {/* Most Expensive Player */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-lg">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5" />
              <span>Most Expensive</span>
            </div>
            {mostExpensivePlayer ? (
              <div className="mt-2">
                <div className="font-black text-white text-sm truncate">{mostExpensivePlayer.name}</div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400 font-medium">
                    {getTeam(mostExpensivePlayer.teamId)?.shortName || "Franchise"}
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    ₹{Number(mostExpensivePlayer.boughtFor || mostExpensivePlayer.price || 0).toFixed(2)} Cr
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-2">No player sold</div>
            )}
          </div>

          {/* Team with Most Bids */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-lg">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Most Bids Placed</span>
            </div>
            {teamWithMostBids ? (
              <div className="mt-2">
                <div className="font-black text-white text-sm flex items-center gap-1.5 truncate">
                  <span>{getTeam(teamWithMostBids.teamId)?.logoEmoji}</span>
                  <span className="truncate">{getTeam(teamWithMostBids.teamId)?.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400 font-medium">Total Bids:</span>
                  <span className="font-mono font-bold text-sky-400">{teamWithMostBids.count} bids</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-2">0 bids recorded</div>
            )}
          </div>

          {/* Biggest Spender */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-lg">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              <span>Biggest Spender</span>
            </div>
            {biggestSpender ? (
              <div className="mt-2">
                <div className="font-black text-white text-sm flex items-center gap-1.5 truncate">
                  <span>{getTeam(biggestSpender.teamId)?.logoEmoji}</span>
                  <span className="truncate">{getTeam(biggestSpender.teamId)?.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400 font-medium">Spent:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ₹{Number(biggestSpender.spent).toFixed(2)} Cr
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 mt-2">₹0.00 Cr</div>
            )}
          </div>

          {/* Total Auction Turnover */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-lg">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auction Turnover</span>
            </div>
            <div className="mt-2">
              <div className="font-mono font-black text-white text-base">
                ₹{Number(totalAuctionSpend).toFixed(2)} Cr
              </div>
              <div className="flex items-center justify-between text-xs mt-1 text-slate-400">
                <span>Sold: <b className="text-emerald-400">{room.soldCount || allSoldPlayers.length}</b></span>
                <span>Unsold: <b className="text-rose-400">{room.unsoldPoolCount || 0}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
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

          <button
            onClick={() => setActiveTab("ALL_SQUADS")}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              activeTab === "ALL_SQUADS"
                ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>All Franchise Squads</span>
          </button>

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

          {myPlayer?.isHost && (room.unsoldPoolCount > 0 || room.unsoldPool?.length > 0) && (
            <button
              onClick={onReAuctionUnsold}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Auction {room.unsoldPoolCount || room.unsoldPool?.length} Unsold</span>
            </button>
          )}

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Room</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto py-6 flex-1">
        {activeTab === "LEADERBOARD" ? (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm text-white">Final League Standings</span>
                <span className="text-xs text-slate-400">Click any franchise to inspect their full squad</span>
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
                      <th className="py-3 px-4 text-center">Full Squad</th>
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
                        <td
                          className="py-4 px-4 cursor-pointer"
                          onClick={() => {
                            setViewTeamId(item.teamId);
                            setActiveTab("ALL_SQUADS");
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{item.team.logoEmoji}</span>
                            <div>
                              <div className="font-bold text-white hover:text-amber-400 transition">{item.team.name}</div>
                              <div className="text-[10px] text-slate-500">{item.team.shortName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-300">
                          {item.ownerName} {item.teamId === myTeamId && "(You)"}
                        </td>
                        <td className="py-4 px-4 text-center text-slate-300 font-mono">
                          {item.squadSize} / 25
                        </td>
                        <td className="py-4 px-4 text-center text-sky-400 font-mono">
                          {item.overseasCount} / 8
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-amber-400">
                          ₹{Number(item.purseLeft).toFixed(2)} Cr
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-black text-sm text-emerald-400">
                          {item.overallRating} ★
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => {
                              setViewTeamId(item.teamId);
                              setActiveTab("ALL_SQUADS");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-bold text-xs border border-amber-400/20 hover:border-amber-400 transition flex items-center gap-1 mx-auto shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Squad</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === "ALL_SQUADS" ? (
          /* All Franchise Squads View */
          <div className="space-y-6">
            {/* Horizontal Franchise Tabs Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 shadow-xl flex items-center gap-2 overflow-x-auto pb-3">
              {Object.keys(room.teamsState).map((tId) => {
                const team = getTeam(tId);
                const tState = room.teamsState[tId] || { squad: [] };
                const isSelected = viewTeamId === tId;
                const isMyTeam = tId === myTeamId;

                return (
                  <button
                    key={tId}
                    onClick={() => {
                      setViewTeamId(tId);
                      setSquadRoleFilter("ALL");
                    }}
                    className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shrink-0 transition-all ${
                      isSelected
                        ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 scale-[1.02]"
                        : "bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-base">{team.logoEmoji}</span>
                    <span>{team.shortName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSelected ? "bg-slate-950 text-amber-300 font-black" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {tState.squad?.length || 0}
                    </span>
                    {isMyTeam && (
                      <span
                        className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-slate-900 text-amber-400" : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        You
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Franchise Squad Showcase */}
            {(() => {
              const currentViewTeam = getTeam(viewTeamId);
              const currentTeamState = room.teamsState[viewTeamId] || { squad: [], purse: 0, spent: 0 };
              const currentSquad = currentTeamState.squad || [];

              const currentBatters = currentSquad.filter((p) => p.role === "BAT");
              const currentKeepers = currentSquad.filter((p) => p.role === "WK");
              const currentAllrounders = currentSquad.filter((p) => p.role === "ALL");
              const currentBowlers = currentSquad.filter((p) => p.role === "PACE" || p.role === "SPIN");
              const currentOverseas = currentSquad.filter((p) => p.isOverseas).length;

              const filteredSquad =
                squadRoleFilter === "ALL"
                  ? currentSquad
                  : squadRoleFilter === "BAT"
                  ? currentBatters
                  : squadRoleFilter === "WK"
                  ? currentKeepers
                  : squadRoleFilter === "ALL_ROUNDER"
                  ? currentAllrounders
                  : currentBowlers;

              const renderPlayerCard = (player, idx) => (
                <div
                  key={player.id + idx}
                  className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800/90 hover:border-slate-700 transition flex items-center justify-between text-xs shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-[11px] text-slate-500 font-mono font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-white text-sm flex items-center gap-2 truncate">
                        <span className="truncate">{player.name}</span>
                        {player.viaRTM && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            RTM
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getRoleBadge(player.role)}
                        <span className={`text-[10px] font-medium ${player.isOverseas ? "text-sky-400" : "text-amber-400"}`}>
                          {player.isOverseas ? "✈️ Overseas" : "🇮🇳 Indian"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-amber-400 font-mono text-sm">
                      {player.boughtFor ? `₹${Number(player.boughtFor).toFixed(2)} Cr` : "Retained"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Rating: <b className="text-slate-100 font-mono">{player.rating} ★</b>
                    </div>
                  </div>
                </div>
              );

              return (
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                  {/* Franchise Banner */}
                  <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl shadow-inner">
                        {currentViewTeam.logoEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black text-white">{currentViewTeam.name}</h2>
                          {viewTeamId === myTeamId && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px]">
                              YOUR SQUAD
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Manager: <b className="text-slate-200">{currentTeamState.ownerName || "Franchise Manager"}</b>
                          {" • "}{currentViewTeam.badgeText}
                        </p>
                      </div>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center w-full md:w-auto">
                      <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Squad Size</div>
                        <div className="font-mono font-bold text-white text-sm mt-0.5">
                          {currentSquad.length} / 25
                        </div>
                      </div>

                      <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Overseas</div>
                        <div className={`font-mono font-bold text-sm mt-0.5 ${currentOverseas > 8 ? "text-rose-400" : "text-sky-400"}`}>
                          {currentOverseas} / 8
                        </div>
                      </div>

                      <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Total Spent</div>
                        <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                          ₹{Number(currentTeamState.spent || 0).toFixed(2)} Cr
                        </div>
                      </div>

                      <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Purse Left</div>
                        <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                          ₹{Number(currentTeamState.purse || 0).toFixed(2)} Cr
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Department Filter Tabs */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
                      {[
                        { id: "ALL", label: `All Players (${currentSquad.length})` },
                        { id: "BAT", label: `🏏 Batters (${currentBatters.length})` },
                        { id: "WK", label: `🧤 Wicketkeepers (${currentKeepers.length})` },
                        { id: "ALL_ROUNDER", label: `⚡ All-Rounders (${currentAllrounders.length})` },
                        { id: "BOWL", label: `🎯 Bowlers (${currentBowlers.length})` }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSquadRoleFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                            squadRoleFilter === tab.id
                              ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                              : "bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="text-xs text-slate-400 font-medium">
                      Showing <b className="text-white">{filteredSquad.length}</b> players
                    </div>
                  </div>

                  {/* Squad Display */}
                  {currentSquad.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                      No players acquired for {currentViewTeam.name}.
                    </div>
                  ) : squadRoleFilter === "ALL" ? (
                    /* Show Department-by-Department Breakdown */
                    <div className="space-y-6">
                      {/* Batters */}
                      {currentBatters.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                            <span>🏏 Batting Department ({currentBatters.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {currentBatters.map((p, i) => renderPlayerCard(p, i))}
                          </div>
                        </div>
                      )}

                      {/* Wicketkeepers */}
                      {currentKeepers.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                            <span>🧤 Wicketkeepers ({currentKeepers.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {currentKeepers.map((p, i) => renderPlayerCard(p, i))}
                          </div>
                        </div>
                      )}

                      {/* All-Rounders */}
                      {currentAllrounders.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                            <span>⚡ All-Rounders ({currentAllrounders.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {currentAllrounders.map((p, i) => renderPlayerCard(p, i))}
                          </div>
                        </div>
                      )}

                      {/* Bowlers */}
                      {currentBowlers.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-rose-400">
                            <span>🎯 Bowling Department ({currentBowlers.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {currentBowlers.map((p, i) => renderPlayerCard(p, i))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Filtered List */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {filteredSquad.map((p, i) => renderPlayerCard(p, i))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          /* Playing XI Builder Tab */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Squad Selector */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Squad Pool ({squad.length} Players)</h3>
                    <p className="text-[11px] text-slate-400">
                      Click in order to pick #1 to #11 batting positions.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {selectedXI.length}/11 Picked
                  </span>
                </div>

                {/* Squad list */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {squad.map((player) => {
                    const pickedIndex = selectedXI.findIndex((p) => p.id === player.id);
                    const isPicked = pickedIndex >= 0;
                    const isImpact = impactPlayerId === player.id;

                    return (
                      <div
                        key={player.id}
                        onClick={() => toggleSelectPlayer(player)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          isPicked
                            ? "bg-amber-500/10 border-amber-400 ring-1 ring-amber-400 text-white"
                            : isImpact
                            ? "bg-purple-500/10 border-purple-500/50 text-purple-200"
                            : "bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono transition ${
                              isPicked
                                ? "bg-amber-400 text-slate-950"
                                : isImpact
                                ? "bg-purple-500 text-white"
                                : "border border-slate-700 bg-slate-900 text-slate-500"
                            }`}
                          >
                            {isPicked ? `#${pickedIndex + 1}` : isImpact ? "IP" : "+"}
                          </div>

                          <div>
                            <div className="font-bold text-sm leading-tight flex items-center gap-1.5">
                              <span>{player.name}</span>
                              {captainId === player.id && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                                  C
                                </span>
                              )}
                              {viceCaptainId === player.id && (
                                <span className="px-1.5 py-0.2 rounded bg-sky-400 text-slate-950 text-[10px] font-black">
                                  VC
                                </span>
                              )}
                              {isImpact && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-500 text-white text-[10px] font-black">
                                  IMPACT
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-300">{player.role}</span>
                              <span>•</span>
                              <span>{player.isOverseas ? "✈️ Overseas" : "🇮🇳 Indian"}</span>
                              {player.boughtFor ? (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-400 font-mono">₹{Number(player.boughtFor).toFixed(2)} Cr</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <div className="font-mono font-bold text-amber-400 text-xs">
                            {player.rating} ★
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Batting Order (1-11), C/VC/Impact controls, and Copy Export */}
            <div className="lg:col-span-7 space-y-4">
              {/* Batting Order List with Controls */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>Starting XI & Batting Order</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Use ▲/▼ arrows to reorder batting positions. Assign Captain (C) and Vice-Captain (VC).
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${selectedXI.length === 11 ? "text-emerald-400" : "text-amber-400"}`}>
                      {selectedXI.length} / 11 Players
                    </span>
                  </div>
                </div>

                {selectedXI.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    Click players from your squad on the left to start building your batting order!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedXI.map((player, idx) => {
                      const isC = captainId === player.id;
                      const isVC = viceCaptainId === player.id;

                      return (
                        <div
                          key={player.id}
                          className="p-2.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          {/* Position Badge & Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 font-mono font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <div className="font-bold text-white truncate flex items-center gap-1.5">
                                <span>{player.name}</span>
                                {player.isOverseas && <span className="text-[10px] text-sky-400">✈️</span>}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {player.role} • {player.rating} ★
                              </div>
                            </div>
                          </div>

                          {/* Quick Controls: Reorder, C, VC, Remove */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Reorder Up */}
                            <button
                              onClick={() => moveBattingOrder(idx, -1)}
                              disabled={idx === 0}
                              title="Move up batting order"
                              className="p-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-20 text-slate-300"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Reorder Down */}
                            <button
                              onClick={() => moveBattingOrder(idx, 1)}
                              disabled={idx === selectedXI.length - 1}
                              title="Move down batting order"
                              className="p-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-20 text-slate-300"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Captain Toggle */}
                            <button
                              onClick={() => toggleCaptain(player.id)}
                              title={isC ? "Remove Captain" : "Set as Captain (C)"}
                              className={`px-2 py-1 rounded font-black text-[10px] transition ${
                                isC
                                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30"
                                  : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                              }`}
                            >
                              (C)
                            </button>

                            {/* Vice-Captain Toggle */}
                            <button
                              onClick={() => toggleViceCaptain(player.id)}
                              title={isVC ? "Remove Vice-Captain" : "Set as Vice-Captain (VC)"}
                              className={`px-2 py-1 rounded font-black text-[10px] transition ${
                                isVC
                                  ? "bg-sky-400 text-slate-950 shadow-md shadow-sky-400/30"
                                  : "bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800"
                              }`}
                            >
                              (VC)
                            </button>

                            {/* Remove from XI */}
                            <button
                              onClick={() => toggleSelectPlayer(player)}
                              title="Remove from XI"
                              className="p-1 text-slate-500 hover:text-rose-400"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Impact Player Selection Row */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-300">Impact Player:</span>
                    <select
                      value={impactPlayerId || ""}
                      onChange={(e) => setImpactPlayerId(e.target.value || null)}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Choose Impact Sub --</option>
                      {squad
                        .filter((p) => !selectedXI.some((x) => x.id === p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.role} {p.isOverseas ? "✈️" : ""})
                          </option>
                        ))}
                    </select>
                  </div>

                  {impactPlayerId && (
                    <button
                      onClick={() => setImpactPlayerId(null)}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      Clear Impact Player
                    </button>
                  )}
                </div>

                {/* Bench Summary */}
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">
                    Bench ({benchPlayers.length} Players):
                  </div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    {benchPlayers.length > 0 ? (
                      benchPlayers.map((p) => p.name).join(", ")
                    ) : (
                      <span className="text-slate-500 italic">No bench players remaining</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ready-to-Copy Lineup Export Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Copyable Lineup Text</h3>
                  </div>

                  {/* 1-Click Copy Button */}
                  <button
                    onClick={handleCopy}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg ${
                      copied
                        ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
                        : "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/20 active:scale-95"
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Lineup</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Easily copy and paste this lineup anywhere into chat, notes, or fantasy leagues:
                </p>

                {/* Formatted Text Box */}
                <div className="relative">
                  <textarea
                    readOnly
                    rows={12}
                    value={formattedLineup}
                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-slate-200 select-all focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

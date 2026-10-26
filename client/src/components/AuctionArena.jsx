import React, { useState } from "react";
import { getTeam } from "../teamsData";
import BiddingControls from "./BiddingControls";
import SquadDrawer from "./SquadDrawer";
import { Volume2, VolumeX, Users, Clock, Award, Shield, DollarSign, Sparkles, LogOut } from "lucide-react";

export default function AuctionArena({
  room,
  playerId,
  onPlaceBid,
  onPassTurn,
  onTogglePersistentPass,
  onSkipPlayer,
  onSkipPool,
  onEndBid,
  onLeaveRoom,
  soundEnabled,
  onToggleSound
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentPlayer = room.currentPlayer;
  const currentBid = room.currentBid || 0;
  const currentBidderId = room.currentBidder;
  const leadingTeam = currentBidderId ? getTeam(currentBidderId) : null;

  const myPlayer = room.players.find((p) => p.id === playerId);
  const myTeamId = myPlayer?.teamId;
  const myTeam = getTeam(myTeamId);
  const myTeamState = room.teamsState[myTeamId] || { purse: 0, squad: [] };

  const origTeam = currentPlayer?.originalTeamId ? getTeam(currentPlayer.originalTeamId) : null;

  // Role Badge Styling
  const getRoleBadge = (role) => {
    switch (role) {
      case "BAT":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">BATTER</span>;
      case "WK":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">WICKETKEEPER</span>;
      case "ALL":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ALL-ROUNDER</span>;
      case "PACE":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">FAST BOWLER</span>;
      case "SPIN":
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">SPINNER</span>;
      default:
        return null;
    }
  };

  // Timer Color Class
  const getTimerColor = (sec) => {
    if (sec <= 3) return "text-rose-500 border-rose-500/40 bg-rose-500/10 animate-pulse";
    if (sec <= 6) return "text-amber-400 border-amber-400/40 bg-amber-500/10";
    return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 md:p-6 select-none relative overflow-x-hidden">
      {/* Squad Drawer Slideover */}
      <SquadDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        teamsState={room.teamsState}
        initialTeamId={myTeamId}
        players={room.players}
      />

      {/* Top Broadcast Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
        {/* Franchise Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow">
            <span className="text-2xl">{myTeam.logoEmoji}</span>
            <div>
              <div className="font-extrabold text-xs text-white flex items-center gap-1">
                <span>{myTeam.shortName}</span>
                <span className="text-[10px] text-slate-400 font-normal">({myPlayer?.name})</span>
              </div>
              <div className="text-xs font-bold text-amber-400 font-mono">
                ₹{Number(myTeamState.purse || 0).toFixed(2)} Cr
              </div>
            </div>
          </div>

          <div className="hidden sm:block text-xs text-slate-400">
            Squad: <b className="text-white">{myTeamState.squad?.length || 0}/25</b> • OS:{" "}
            <b className="text-sky-400">{myTeamState.squad?.filter(p => p.isOverseas).length || 0}/8</b>
          </div>
        </div>

        {/* Center Progress */}
        <div className="text-center hidden md:block">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{room.currentPool ? `${room.currentPool.name} [${room.currentPool.code}]` : "IPL LIVE MEGA AUCTION"}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {room.currentPool
              ? `Pool Player ${(room.currentPoolPlayerIndex || 0) + 1} of ${room.currentPool.players?.length || 1} • Sold: ${room.soldCount || 0} • Unsold: ${room.unsoldPoolCount || 0}`
              : `Player ${room.currentIndex + 1} of ${room.totalPlayers} • Sold: ${room.soldCount || 0}`}
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl transition"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Squads</span>
          </button>

          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Mute audio" : "Enable audio"}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 hover:text-white transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              title="Exit Room"
              className="p-2 bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-800/50 rounded-xl text-slate-400 hover:text-red-300 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Auction Stage */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 my-auto py-4">
        {/* Center Stage: Player Showcase & Live Bid */}
        <div className="lg:col-span-2 space-y-5">
          {currentPlayer ? (
            <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
              {/* Franchise Accent Top Glow */}
              {origTeam && (
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: origTeam.primaryColor }}
                />
              )}

              {/* Player Header Badges */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  {getRoleBadge(currentPlayer.role)}

                  {currentPlayer.isOverseas ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      ✈️ OVERSEAS
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      🇮🇳 INDIA
                    </span>
                  )}

                  {currentPlayer.isKeyPlayer && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      ★ MARQUEE
                    </span>
                  )}

                  {currentPlayer.isBonus && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ✦ BONUS STAR
                    </span>
                  )}
                </div>

                {/* Rating & Base Price */}
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-slate-800/80 rounded-xl text-xs font-bold text-slate-300 border border-slate-700">
                    Rating: <b className="text-amber-400">{currentPlayer.rating}</b>
                  </div>
                  <div className="px-3 py-1 bg-slate-800/80 rounded-xl text-xs font-bold text-amber-400 border border-slate-700">
                    Base: ₹{currentPlayer.basePrice} Cr
                  </div>
                </div>
              </div>

              {/* Player Name & Original Team */}
              <div className="my-6">
                <div className="text-3xl md:text-5xl font-black tracking-tight text-white leading-none">
                  {currentPlayer.name}
                </div>
                {origTeam && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <span>Original Squad:</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <span>{origTeam.logoEmoji}</span>
                      <span>{origTeam.name}</span>
                    </span>
                    <span className="text-amber-400 text-[11px]">(Eligible for RTM)</span>
                  </div>
                )}
              </div>

              {/* Live Bid Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    Current Highest Bid
                  </div>
                  <div className="text-4xl md:text-5xl font-black text-amber-400 font-mono mt-0.5">
                    {currentBid === 0 ? "₹0.00 Cr" : `₹${currentBid.toFixed(2)} Cr`}
                  </div>
                </div>

                {/* Leading Team */}
                <div className="flex items-center gap-3">
                  {leadingTeam ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl">
                      <span className="text-3xl">{leadingTeam.logoEmoji}</span>
                      <div className="text-left">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Leading Bidder</div>
                        <div className="font-black text-white text-base leading-tight">
                          {leadingTeam.shortName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {room.teamsState[leadingTeam.id]?.ownerName || "Manager"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-center text-xs text-slate-500 italic">
                      Waiting for opening bid at base price
                    </div>
                  )}

                  {/* Countdown Timer Display */}
                  <div
                    className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-black transition-all ${getTimerColor(
                      room.timeLeft
                    )}`}
                  >
                    <span className="text-2xl leading-none font-mono">{room.timeLeft}</span>
                    <span className="text-[9px] uppercase tracking-wider">SEC</span>
                  </div>
                </div>
              </div>

              {/* Manager Pass Status Row */}
              <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] overflow-x-auto pb-0.5">
                  <span className="font-medium text-slate-400">Pass status:</span>
                  {room.passedTeams && room.passedTeams.length > 0 ? (
                    room.passedTeams.map((tId) => (
                      <span
                        key={tId}
                        className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-1"
                      >
                        <span>{getTeam(tId).shortName}</span>
                        {room.persistentPassTeams?.includes(tId) && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-normal">Auto</span>
                        )}
                        <span>✕</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600 italic">No managers passed yet</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {room.passedTeams?.length || 0} / {room.players?.length || 0} passed
                </span>
              </div>

              {/* SOLD / UNSOLD OVERLAY BANNER */}
              {room.lastSale && (
                <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                  {room.lastSale.unsold ? (
                    <div className="space-y-2">
                      <div className="text-5xl">🚫</div>
                      <div className="text-2xl md:text-3xl font-black text-rose-400 uppercase tracking-wider">
                        HAMMER DOWN — UNSOLD!
                      </div>
                      <p className="text-sm text-slate-400 max-w-sm mx-auto">
                        <b>{room.lastSale.player?.name}</b> received no bids and moves to the Unsold Pool.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-5xl animate-bounce">🔨</div>
                      <div className="inline-block px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-amber-400 text-slate-950 shadow-lg">
                        {room.lastSale.viaRTM ? "⚔️ RIGHT TO MATCH (RTM) EXERCISED!" : "🏆 SOLD!"}
                      </div>
                      <div className="text-3xl md:text-5xl font-black text-white">
                        {room.lastSale.player?.name}
                      </div>

                      <div className="flex items-center justify-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-md mx-auto">
                        <span className="text-4xl">{getTeam(room.lastSale.buyerTeamId).logoEmoji}</span>
                        <div className="text-left">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Winning Franchise</div>
                          <div className="text-lg font-black text-white leading-tight">
                            {getTeam(room.lastSale.buyerTeamId).name}
                          </div>
                          <div className="text-xs text-slate-400">
                            Manager: <b className="text-slate-200">{room.teamsState[room.lastSale.buyerTeamId]?.ownerName}</b>
                          </div>
                        </div>

                        <div className="border-l border-slate-800 pl-4 text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Price</div>
                          <div className="text-xl font-black text-amber-400 font-mono">
                            ₹{Number(room.lastSale.amount).toFixed(2)} Cr
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 pt-2 animate-pulse font-medium">
                        Loading next player in set...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center text-slate-500 bg-slate-900 rounded-3xl border border-slate-800">
              Auction concluded or loading next player...
            </div>
          )}

          {/* Bidding Controls Component */}
          <BiddingControls
            currentBid={currentBid}
            currentBidder={currentBidderId}
            currentPlayer={currentPlayer}
            myTeamId={myTeamId}
            myTeamState={myTeamState}
            passedTeams={room.passedTeams || []}
            persistentPassTeams={room.persistentPassTeams || []}
            settings={room.settings}
            isHost={myPlayer?.isHost}
            isResolved={Boolean(room.lastSale || room.isResolvingSale)}
            onPlaceBid={onPlaceBid}
            onPassTurn={onPassTurn}
            onTogglePersistentPass={onTogglePersistentPass}
            onSkipPlayer={onSkipPlayer}
            onSkipPool={onSkipPool}
            onEndBid={onEndBid}
          />
        </div>

        {/* Right Col: Live Bidding History Ticker & Opponents Purse */}
        <div className="space-y-4 flex flex-col">
          {/* Bid History Feed */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Live Paddle Ticker</span>
              </h3>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Real-time</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pt-3 max-h-[320px]">
              {room.bidHistory?.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No bids for this player yet.
                </div>
              ) : (
                room.bidHistory.map((b, idx) => {
                  const team = getTeam(b.teamId);
                  const isLatest = idx === 0;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                        isLatest
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold"
                          : "bg-slate-950/60 border-slate-800/80 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{team.logoEmoji}</span>
                        <div>
                          <div className="font-bold text-white">{team.shortName}</div>
                          <div className="text-[10px] text-slate-500">{b.time}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-extrabold text-sm text-amber-400">
                          ₹{Number(b.amount).toFixed(2)} Cr
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Opponent Purse Glance */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Franchise Purse Tracker
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(room.teamsState).map(([tId, tData]) => {
                const team = getTeam(tId);
                const isMe = tId === myTeamId;
                return (
                  <div
                    key={tId}
                    className={`p-2 rounded-xl border flex items-center justify-between ${
                      isMe
                        ? "bg-amber-500/10 border-amber-400/40"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{team.logoEmoji}</span>
                      <span className="font-bold text-white">{team.shortName}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-[11px]">
                      ₹{Number(tData.purse || 0).toFixed(1)} Cr
                    </span>
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

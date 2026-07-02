import React, { useState } from 'react';
import { Search, Trophy, TrendingUp, Medal, Star, ShieldCheck } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

export default function Leaderboard({ leaderboard }: LeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Sort leaderboard entries by points descending, then earlier first submission time
  const updatedLeaderboard = [...leaderboard].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aTime = a.firstPredictionAt ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.firstPredictionAt ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  // Recalculate rank based on points sorting
  const rankedLeaderboard = updatedLeaderboard.map((entry, idx) => ({
    ...entry,
    rank: idx + 1
  }));

  const filteredLeaderboard = rankedLeaderboard.filter((entry) =>
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="py-12 bg-[#220c14] relative min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Leaderboard Listing Column */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="font-sans text-2xl font-black text-[#ffd9e3] tracking-tight uppercase">
                GLOBAL LEADERBOARD
              </h2>
              <p className="font-sans text-xs text-[#debfc2]">
                Rankings of top predictors globally. Points updated in real-time.
              </p>
            </div>

            {/* Search filter input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#debfc2]/60 w-4 h-4" />
              <input
                type="text"
                placeholder="SEARCH USER..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#301821] text-[#ffd9e3] border border-[#e9c349]/20 focus:border-[#e9c349] rounded py-2 pl-9 pr-4 font-mono text-xs focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          {/* Leaders Table list */}
          <div className="bg-[#220c14] border border-[#e9c349]/20 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#301821] border-b border-[#e9c349]/10 font-mono text-[10px] text-[#debfc2] tracking-wider uppercase">
                    <th className="py-4 px-6 text-center w-16">RANK</th>
                    <th className="py-4 px-6">PREDICTOR</th>
                    <th className="py-4 px-6 text-center">LEVEL</th>
                    <th className="py-4 px-6 text-center">WIN ACCURACY</th>
                    <th className="py-4 px-6 text-right">TOTAL POINTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9c349]/5 font-sans">
                  {filteredLeaderboard.map((entry) => (
                    <tr
                      key={entry.id}
                      className={`transition-colors ${
                        entry.isCurrentUser
                          ? 'bg-[#8a1538]/20 hover:bg-[#8a1538]/30 font-bold border-l-4 border-l-[#e9c349]'
                          : 'hover:bg-[#301821]/40'
                      }`}
                    >
                      {/* Rank Indicator */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center">
                          {entry.rank === 1 ? (
                            <Medal className="w-5 h-5 text-[#e9c349]" />
                          ) : entry.rank === 2 ? (
                            <Medal className="w-5 h-5 text-[#debfc2]" />
                          ) : entry.rank === 3 ? (
                            <Medal className="w-5 h-5 text-[#af8d11]" />
                          ) : (
                            <span className="font-mono text-xs text-[#debfc2] font-bold">
                              #{entry.rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* User Avatar + Username */}
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <img
                            src={entry.avatarUrl}
                            alt={entry.username}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-[#e9c349]/30 object-cover mt-0.5"
                          />
                          <div className="space-y-0.5">
                            <span className="text-sm font-bold text-[#ffd9e3] block leading-tight">
                              {entry.username}
                            </span>
                            {entry.registerNumber && (
                              <div className="text-[10px] font-mono text-[#debfc2]/80 leading-normal">
                                <span className="text-[#e9c349] uppercase font-bold mr-1">{entry.registerNumber}</span> • {entry.classWithYear}
                              </div>
                            )}
                            {entry.department && (
                              <div className="text-[9px] text-[#debfc2]/50 italic">{entry.department}</div>
                            )}
                            {entry.isCurrentUser && (
                              <span className="inline-block bg-[#70db9d]/20 text-[#70db9d] font-mono text-[8px] px-1.5 py-0.2 rounded font-bold uppercase mt-0.5">YOU</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-4 px-6 text-center font-mono text-xs text-[#ffd9e3]/80">
                        LVL {entry.level}
                      </td>

                      {/* Accuracy */}
                      <td className="py-4 px-6 text-center font-mono text-xs">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          entry.accuracy >= 90
                            ? 'bg-[#70db9d]/20 text-[#70db9d]'
                            : 'bg-[#e9c349]/20 text-[#e9c349]'
                        }`}>
                          {entry.accuracy}%
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-4 px-6 text-right font-mono text-sm font-bold text-[#e9c349]">
                        {entry.points.toLocaleString()} PTS
                      </td>
                    </tr>
                  ))}

                  {filteredLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#debfc2]/60 font-sans text-xs">
                        No predictors matched your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  );
}

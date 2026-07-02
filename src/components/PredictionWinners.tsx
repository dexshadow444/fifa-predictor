import React, { useState, useEffect } from 'react';
import { Match, LeaderboardEntry, Ticket } from '../types';
import { Award, CheckCircle, Trophy, Users, Search, Target, Filter, Star } from 'lucide-react';

interface PredictionWinnersProps {
  matches: Match[];
  leaderboard: LeaderboardEntry[];
  tickets: Ticket[];
}

export default function PredictionWinners({ matches, leaderboard, tickets }: PredictionWinnersProps) {
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED');
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    finishedMatches.length > 0 ? finishedMatches[0].id : ''
  );

  // Sync selectedMatchId when finishedMatches list grows (e.g. admin marks a match finished)
  useEffect(() => {
    if (!selectedMatchId && finishedMatches.length > 0) {
      setSelectedMatchId(finishedMatches[0].id);
    }
  }, [finishedMatches, selectedMatchId]);
  const [filterType, setFilterType] = useState<'ALL' | 'EXACT' | 'OUTCOME'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedMatch = matches.find((m) => m.id === selectedMatchId);

  // Helper to generate predictions for the selected match, combining mock participants and real submitted tickets
  const getPredictionsForMatch = (match: Match) => {
    // 1. Map real tickets submitted by participants for this match
    const realPredictions = tickets
      .filter((t) => t.matchId === match.id)
      .map((t) => {
        let actualOutcome: 'A' | 'DRAW' | 'B' = 'DRAW';
        if (match.scoreA > match.scoreB) actualOutcome = 'A';
        else if (match.scoreA < match.scoreB) actualOutcome = 'B';

        const isExact = Number(t.predictedScoreA) === Number(match.scoreA) && Number(t.predictedScoreB) === Number(match.scoreB);
        const isOutcome = t.predictedOutcome === actualOutcome;

        return {
          id: t.id,
          username: t.participantName,
          registerNumber: t.registerNumber,
          department: t.department,
          classWithYear: t.classWithYear,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(t.participantName)}`,
          level: 1,
          points: isExact ? 1 : 0,
          predictedScoreA: t.predictedScoreA,
          predictedScoreB: t.predictedScoreB,
          predictedOutcome: t.predictedOutcome,
          isExact,
          isOutcome,
          earnedPoint: isExact ? 1 : 0,
          isRealTicket: true
        };
      });

    // 2. Generate mock participants predictions for consistent visual filling
    const mockPredictions = leaderboard.map((user, idx) => {
      // Deterministic scores based on username characters so they stay consistent
      const charSum = user.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      // Let's make some of them exact match, some outcome match, and some incorrect
      let predA = charSum % 4;
      let predB = (charSum + idx) % 4;

      // Adjust for some guaranteed exact winners on BRAZIL vs FRANCE (m1) which finished 2-1
      if (match.id === 'm1') {
        if (user.username === 'WORLD_CHAMP' || user.username === 'STRIKER_99') {
          predA = 2;
          predB = 1;
        } else if (user.username === 'GOAL_GETTER') {
          predA = 3;
          predB = 1; // Correct outcome, wrong score
        } else if (user.username === 'PREDICT_KING') {
          predA = 1;
          predB = 1; // Wrong outcome
        }
      }

      // If it is the current user (STRIKER_99) and we have a custom ticket placed, use that!
      const userTicket = tickets.find(t => t.matchId === match.id);
      if (user.isCurrentUser && userTicket) {
        predA = userTicket.predictedScoreA;
        predB = userTicket.predictedScoreB;
      }

      let outcome: 'A' | 'DRAW' | 'B' = 'DRAW';
      if (predA > predB) outcome = 'A';
      else if (predA < predB) outcome = 'B';

      let actualOutcome: 'A' | 'DRAW' | 'B' = 'DRAW';
      if (match.scoreA > match.scoreB) actualOutcome = 'A';
      else if (match.scoreA < match.scoreB) actualOutcome = 'B';

      const isExact = predA === match.scoreA && predB === match.scoreB;
      const isOutcome = outcome === actualOutcome;

      return {
        id: `pred_mock_${user.id}`,
        username: user.username,
        registerNumber: 'MOCK_ADMIN_ACC',
        department: 'Sports Association',
        classWithYear: 'Staff',
        avatarUrl: user.avatarUrl,
        level: user.level,
        points: user.points,
        predictedScoreA: predA,
        predictedScoreB: predB,
        predictedOutcome: outcome,
        isExact,
        isOutcome,
        earnedPoint: isExact ? 1 : 0,
        isRealTicket: false
      };
    });

    return [...realPredictions, ...mockPredictions];
  };

  const allPredictions = selectedMatch ? getPredictionsForMatch(selectedMatch) : [];

  const filteredPredictions = allPredictions.filter((p) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
      p.username.toLowerCase().includes(term) ||
      (p.registerNumber && p.registerNumber.toLowerCase().includes(term)) ||
      (p.department && p.department.toLowerCase().includes(term)) ||
      (p.classWithYear && p.classWithYear.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (filterType === 'EXACT') return p.isExact;
    if (filterType === 'OUTCOME') return p.isOutcome && !p.isExact;
    return true;
  });

  // Calculate the overall tournament winner (whoever has the highest points after exact matches)
  // Ties are broken by earliest first submission time.
  const topPredictor = [...leaderboard].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aTime = a.firstPredictionAt ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.firstPredictionAt ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  })[0];

  return (
    <section className="py-12 bg-[#220c14] min-h-[60vh] relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-l-4 border-[#e9c349] pl-4">
          <div>
            <h2 className="font-sans text-3xl font-extrabold text-[#ffd9e3] tracking-tight uppercase">
              PREDICTION WINNERS
            </h2>
            <p className="font-mono text-xs text-[#debfc2] tracking-wider uppercase">
              EXACT SCORE WINNERS TERMINAL • DYNAMIC FILTERING &amp; SCOREBOARD
            </p>
          </div>

          {/* Tournament Champion Highlight */}
          {topPredictor && (
            <div className="mt-4 md:mt-0 bg-[#301821] border border-[#e9c349]/30 rounded px-4 py-2 flex items-center gap-3">
              <Trophy className="w-5 h-5 text-[#e9c349] shrink-0 animate-pulse" />
              <div>
                <p className="text-[9px] font-mono text-[#debfc2]/60 uppercase">Tournament Leader</p>
                <p className="text-xs font-sans font-bold text-[#e9c349]">{topPredictor.username} ({topPredictor.points} pts)</p>
              </div>
            </div>
          )}
        </div>

        {finishedMatches.length === 0 ? (
          <div className="text-center py-16 bg-[#1c070f]/50 rounded-lg border border-[#e9c349]/10">
            <Award className="w-12 h-12 text-[#debfc2]/40 mx-auto mb-3" />
            <p className="font-sans text-sm text-[#debfc2]">No matches have finished yet. Once a match finishes, winners will appear here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left side: Selector and Filter Console */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Match Selector */}
              <div className="bg-[#2a111a]/90 border border-[#e9c349]/20 p-5 rounded-lg">
                <label className="block text-xs font-mono text-[#debfc2] mb-2 uppercase font-bold tracking-wider">
                  SELECT COMPLETED MATCH:
                </label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full bg-[#1c070f] text-[#ffd9e3] border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-3 font-mono text-xs focus:ring-0 focus:outline-none"
                >
                  {finishedMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.teamA} {match.scoreA} - {match.scoreB} {match.teamB} ({match.stage})
                    </option>
                  ))}
                </select>

                {selectedMatch && (
                  <div className="mt-4 bg-[#1c070f] p-4 rounded border border-[#e9c349]/10 space-y-3">
                    <div className="flex justify-between items-center text-center">
                      <div className="w-2/5 flex flex-col items-center">
                        <img src={selectedMatch.flagA} alt="" referrerPolicy="no-referrer" className="w-10 h-7 object-cover rounded border border-[#e9c349]/10" />
                        <span className="font-sans text-xs font-bold text-[#ffd9e3] mt-1 block truncate w-full">{selectedMatch.teamA}</span>
                      </div>
                      <div className="w-1/5 font-mono text-xl font-extrabold text-[#e9c349]">
                        {selectedMatch.scoreA} - {selectedMatch.scoreB}
                      </div>
                      <div className="w-2/5 flex flex-col items-center">
                        <img src={selectedMatch.flagB} alt="" referrerPolicy="no-referrer" className="w-10 h-7 object-cover rounded border border-[#e9c349]/10" />
                        <span className="font-sans text-xs font-bold text-[#ffd9e3] mt-1 block truncate w-full">{selectedMatch.teamB}</span>
                      </div>
                    </div>
                    <div className="text-center font-mono text-[9px] text-[#debfc2]/60 uppercase border-t border-[#e9c349]/10 pt-2">
                      WINDOW: {selectedMatch.predictionStartTime ? new Date(selectedMatch.predictionStartTime).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A'} - {selectedMatch.predictionEndTime ? new Date(selectedMatch.predictionEndTime).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A'}
                    </div>
                  </div>
                )}
              </div>

              {/* Filtering Rules */}
              <div className="bg-[#2a111a]/90 border border-[#e9c349]/20 p-5 rounded-lg space-y-4">
                <h3 className="font-sans text-sm font-bold text-[#ffd9e3] uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#e9c349]" /> WINNER RULES
                </h3>
                <div className="space-y-3 font-sans text-[11px] text-[#debfc2]/80 leading-relaxed">
                  <p className="flex items-start gap-2 bg-[#1c070f] p-2.5 rounded border-l-2 border-l-[#e9c349] border-[#e9c349]/5">
                    <span className="font-mono text-xs text-[#e9c349] font-black">🎯</span>
                    <span>
                      <strong className="text-[#e9c349] uppercase block font-bold">Exact Score Rule:</strong>
                      If a predictor predicts the <strong className="text-[#ffd9e3]">exact goal score</strong>, they get <strong className="text-[#70db9d] font-bold">+1 Point</strong> on the leaderboard.
                    </span>
                  </p>
                  <p className="flex items-start gap-2 bg-[#1c070f] p-2.5 rounded border-l-2 border-l-[#debfc2] border-[#debfc2]/5">
                    <span className="font-mono text-xs text-[#debfc2] font-black">⚽</span>
                    <span>
                      <strong className="text-[#debfc2] uppercase block font-bold">Outcome-Only Rule:</strong>
                      If a predictor gets the correct general outcome (Win/Draw) but incorrect goal score, they get <strong className="text-[#ffb2bd]">0 points</strong>.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Dynamic Filterable Winners List */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                
                {/* Switcher Toggles */}
                <div className="flex bg-[#3c222b] border border-[#e9c349]/20 p-1 font-mono text-[9px] font-bold">
                  <button
                    onClick={() => setFilterType('ALL')}
                    className={`px-3 py-1.5 transition-all ${
                      filterType === 'ALL' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2] hover:text-[#e9c349]'
                    }`}
                  >
                    ALL PREDICTIONS
                  </button>
                  <button
                    onClick={() => setFilterType('EXACT')}
                    className={`px-3 py-1.5 transition-all flex items-center gap-1 ${
                      filterType === 'EXACT' ? 'bg-[#70db9d] text-[#00391f]' : 'text-[#70db9d]/80 hover:text-[#70db9d]'
                    }`}
                  >
                    <Target className="w-3 h-3" />
                    EXACT SCORE ({allPredictions.filter(p => p.isExact).length})
                  </button>
                  <button
                    onClick={() => setFilterType('OUTCOME')}
                    className={`px-3 py-1.5 transition-all ${
                      filterType === 'OUTCOME' ? 'bg-[#ffb2bd] text-[#4d0014]' : 'text-[#ffb2bd]/80 hover:text-[#ffb2bd]'
                    }`}
                  >
                    OUTCOME ONLY ({allPredictions.filter(p => p.isOutcome && !p.isExact).length})
                  </button>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#debfc2]/60 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search Predictor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#301821] text-[#ffd9e3] border border-[#e9c349]/20 focus:border-[#e9c349] rounded py-1.5 pl-8 pr-3 font-mono text-[10px] focus:ring-0 focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Winners Table */}
              <div className="bg-[#220c14] border border-[#e9c349]/20 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#301821] border-b border-[#e9c349]/10 font-mono text-[9px] text-[#debfc2] tracking-wider uppercase">
                        <th className="py-3 px-4">PREDICTOR</th>
                        <th className="py-3 px-4 text-center">PREDICTION</th>
                        <th className="py-3 px-4 text-center">STATUS</th>
                        <th className="py-3 px-4 text-right">POINTS AWARDED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e9c349]/5 font-sans text-xs">
                      {filteredPredictions.map((pred) => (
                        <tr
                          key={pred.id}
                          className={`transition-colors ${
                            pred.isExact
                              ? 'bg-[#70db9d]/5 hover:bg-[#70db9d]/10'
                              : 'hover:bg-[#301821]/30'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-2.5">
                              <img
                                src={pred.avatarUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full border border-[#e9c349]/20 object-cover mt-0.5"
                              />
                              <div className="space-y-0.5">
                                <span className="text-[#ffd9e3] font-bold block text-sm leading-tight">{pred.username}</span>
                                <div className="text-[10px] font-mono text-[#debfc2]/80 leading-normal">
                                  <span className="text-[#e9c349] uppercase mr-1">{pred.registerNumber}</span> • {pred.classWithYear}
                                </div>
                                <div className="text-[9px] text-[#debfc2]/50 italic">{pred.department}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-[#ffd9e3]">
                            {pred.predictedScoreA} - {pred.predictedScoreB}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {pred.isExact ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#70db9d]/20 text-[#70db9d] text-[9px] font-mono rounded font-bold uppercase tracking-wider border border-[#70db9d]/30">
                                <Target className="w-2.5 h-2.5" /> EXACT WINNER
                              </span>
                            ) : pred.isOutcome ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ffb2bd]/20 text-[#ffb2bd] text-[9px] font-mono rounded font-bold uppercase tracking-wider border border-[#ffb2bd]/30">
                                OUTCOME WIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/40 text-[#debfc2]/40 text-[9px] font-mono rounded font-bold uppercase tracking-wider">
                                INCORRECT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {pred.isExact ? (
                              <span className="font-mono text-[#70db9d] font-extrabold flex items-center justify-end gap-1">
                                <Star className="w-3.5 h-3.5 text-[#e9c349]" /> +1 POINT
                              </span>
                            ) : (
                              <span className="font-mono text-[#debfc2]/40">0 pts</span>
                            )}
                          </td>
                        </tr>
                      ))}

                      {filteredPredictions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-xs font-mono text-[#debfc2]/40">
                            NO PREDICTORS MATCHING THIS FILTER CRITERIA
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

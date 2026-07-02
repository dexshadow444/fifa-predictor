import React, { useState } from 'react';
import { Clock, HelpCircle, Coins, CheckCircle, Flame, ShieldAlert, Target } from 'lucide-react';
import { Match, Ticket, ParticipantInfo } from '../types';

const parseMaybeDate = (value?: string) => {
  if (!value) return NaN;

  // Native ISO or recognized date string
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return direct;

  // Accept strings like "July 1, 19:30" by appending current year.
  try {
    const withYear = `${value} ${new Date().getFullYear()}`;
    const fallback = Date.parse(withYear);
    if (!Number.isNaN(fallback)) return fallback;
  } catch {
    // ignore invalid parse
  }

  // If the string is missing separators, try converting common patterns
  const normalized = value.replace(/\s+/g, ' ').trim();
  const alt = Date.parse(normalized.replace(/\./g, ':'));
  if (!Number.isNaN(alt)) return alt;

  return NaN;
};

const formatPredictionWindow = (start?: string, end?: string) => {
  const parsedStart = parseMaybeDate(start);
  const parsedEnd = parseMaybeDate(end);
  if (Number.isNaN(parsedStart) || Number.isNaN(parsedEnd)) return `${start ?? 'N/A'} to ${end ?? 'N/A'}`;

  const startDate = new Date(parsedStart);
  const endDate = new Date(parsedEnd);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  return `${startDate.toLocaleString(undefined, options)} to ${endDate.toLocaleString(undefined, options)}`;
};

interface ScoreboardProps {
  matches: Match[];
  onAddPrediction: (
    matchId: string, 
    outcome: 'A' | 'DRAW' | 'B', 
    predictedScoreA: number, 
    predictedScoreB: number,
    registerNumber: string,
    participantName: string,
    department: string,
    classWithYear: string
  ) => Promise<boolean>;
  onOpenLoginModal: () => void;
  activeTickets: Ticket[];
  currentUser: ParticipantInfo | null;
  onSetCurrentUser: (user: ParticipantInfo) => void;
}

export default function Scoreboard({
  matches,
  onAddPrediction,
  onOpenLoginModal,
  activeTickets,
  currentUser,
  onSetCurrentUser
}: ScoreboardProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [predictionOutcome, setPredictionOutcome] = useState<'A' | 'DRAW' | 'B' | null>(null);
  const [predScoreA, setPredScoreA] = useState<number>(1);
  const [predScoreB, setPredScoreB] = useState<number>(0);
  
  // Participant Info fields
  const [registerNumber, setRegisterNumber] = useState<string>('');
  const [participantName, setParticipantName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [classWithYear, setClassWithYear] = useState<string>('');
  
  const [showConfirmScreen, setShowConfirmScreen] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'FINISHED'>('ALL');

  const filteredMatches = matches.filter((m) => {
    if (filterType === 'LIVE') return m.status === 'LIVE';
    if (filterType === 'UPCOMING') return m.status === 'UPCOMING';
    if (filterType === 'FINISHED') return m.status === 'FINISHED';
    return true;
  });

  const handleOpenPredictModal = (match: Match) => {
    // Check prediction window before opening
    const now = Date.now();
    const start = parseMaybeDate(match.predictionStartTime);
    const end = parseMaybeDate(match.predictionEndTime);
    if (!Number.isNaN(end) && now >= end) {
      alert('Predictions for this match are closed.');
      return;
    }
    if (!Number.isNaN(start) && now < start) {
      alert('Predictions for this match are not open yet.');
      return;
    }

    setSelectedMatch(match);
    setPredScoreA(1);
    setPredScoreB(0);
    setPredictionOutcome('A'); // Team A Win is default
    setRegisterNumber(currentUser?.registerNumber ?? '');
    setParticipantName(currentUser?.participantName ?? '');
    setDepartment(currentUser?.department ?? '');
    setClassWithYear(currentUser?.classWithYear ?? '');
    setShowConfirmScreen(false);
    setShowSuccess(false);
  };

  const handleScoreAChange = (val: number) => {
    const safeVal = Math.min(10, Math.max(0, val));
    setPredScoreA(safeVal);
    const outcome = safeVal > predScoreB ? 'A' : safeVal < predScoreB ? 'B' : 'DRAW';
    setPredictionOutcome(outcome);
  };

  const handleScoreBChange = (val: number) => {
    const safeVal = Math.min(10, Math.max(0, val));
    setPredScoreB(safeVal);
    const outcome = predScoreA > safeVal ? 'A' : predScoreA < safeVal ? 'B' : 'DRAW';
    setPredictionOutcome(outcome);
  };

  const [submitting, setSubmitting] = useState<boolean>(false);

  const handlePlacePrediction = async () => {
    if (!selectedMatch || !predictionOutcome) return;
    if (!registerNumber.trim()) {
      alert("Please provide a valid Register Number.");
      return;
    }
    if (!participantName.trim()) {
      alert("Please provide your Name.");
      return;
    }
    if (!department.trim()) {
      alert("Please provide your Department.");
      return;
    }
    if (!classWithYear.trim()) {
      alert("Please provide your Class with Year.");
      return;
    }

    const participantInfo = {
      registerNumber: registerNumber.trim().toUpperCase(),
      participantName: participantName.trim(),
      department: department.trim(),
      classWithYear: classWithYear.trim(),
    };

    setSubmitting(true);
    const ok = await onAddPrediction(
      selectedMatch.id, 
      predictionOutcome, 
      predScoreA, 
      predScoreB, 
      participantInfo.registerNumber, 
      participantInfo.participantName, 
      participantInfo.department, 
      participantInfo.classWithYear
    );
    setSubmitting(false);

    if (ok) {
      onSetCurrentUser(participantInfo);
      setShowSuccess(true);
    } else {
      // onAddPrediction already alerted with reason
      return;
    }
    setTimeout(() => {
      setSelectedMatch(null);
      setShowSuccess(false);
      setShowConfirmScreen(false);
    }, 2000);
  };

  const getOddsForOutcome = () => {
    if (!selectedMatch || !predictionOutcome) return 1.0;
    if (predictionOutcome === 'A') return selectedMatch.oddsA;
    if (predictionOutcome === 'DRAW') return selectedMatch.oddsDraw;
    return selectedMatch.oddsB;
  };

  const currentOdds = getOddsForOutcome();

  return (
    <section className="py-12 bg-[#2c141d]/40 relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-l-4 border-[#e9c349] pl-4">
          <div>
            <h3 className="font-sans text-3xl font-extrabold text-[#ffd9e3] tracking-tight uppercase">
              TOURNAMENT FIXTURES
            </h3>
            <p className="font-mono text-xs text-[#debfc2] tracking-wider uppercase">
              Real-Time Match Odds &amp; Instant Ticket Predictor
            </p>
          </div>

          {/* Tab Filter buttons */}
          <div className="flex bg-[#3c222b] border border-[#e9c349]/20 p-1 mt-4 md:mt-0 font-mono text-[10px] font-bold">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2 transition-all ${
                filterType === 'ALL' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2] hover:text-[#e9c349]'
              }`}
            >
              ALL MATCHES
            </button>
            <button
              onClick={() => setFilterType('LIVE')}
              className={`px-4 py-2 transition-all ${
                filterType === 'LIVE' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2] hover:text-[#e9c349]'
              }`}
            >
              LIVE
            </button>
            <button
              onClick={() => setFilterType('UPCOMING')}
              className={`px-4 py-2 transition-all ${
                filterType === 'UPCOMING' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2] hover:text-[#e9c349]'
              }`}
            >
              UPCOMING
            </button>
            <button
              onClick={() => setFilterType('FINISHED')}
              className={`px-4 py-2 transition-all ${
                filterType === 'FINISHED' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2] hover:text-[#e9c349]'
              }`}
            >
              FINISHED
            </button>
          </div>
        </div>

        {/* Scoreboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match) => {
            // Determine if predictions are open for this match
            const now = Date.now();
            const start = parseMaybeDate(match.predictionStartTime);
            const end = parseMaybeDate(match.predictionEndTime);
            const isBeforeStart = !Number.isNaN(start) && now < start;
            const isAfterEnd = !Number.isNaN(end) && now >= end;
            const userReg = currentUser?.registerNumber?.trim().toUpperCase();
            const userHasPrediction = userReg ? activeTickets.some((t) => t.matchId === match.id && (t.registerNumber || '').trim().toUpperCase() === userReg) : false;
            return (
              <div
                key={match.id}
                className="bg-[#220c14]/80 backdrop-blur-md border border-[#e9c349]/20 hover:border-[#e9c349] p-6 rounded-lg transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Live indicators */}
                {match.status === 'LIVE' ? (
                  <div className="absolute top-0 right-0 bg-[#70db9d] text-[#00391f] px-3 py-1 font-mono text-[9px] font-bold tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00391f] animate-ping"></span>
                    LIVE {match.liveMinute}' - {match.liveHalf}
                  </div>
                ) : (
                  <div className="absolute top-0 right-0 bg-[#3c222b] text-[#debfc2] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider">
                    {match.date} • {match.time}
                  </div>
                )}

                {/* Match Information */}
                <div className="mb-4">
                  <span className="font-mono text-[9px] text-[#e9c349] block mb-2 tracking-widest">
                    {match.stage}
                  </span>

                  {/* Prediction Window Display */}
                  {match.predictionStartTime && match.predictionEndTime && (
                    <div className="bg-[#1c070f] p-2 rounded border border-[#e9c349]/5 mb-3 flex flex-col gap-0.5">
                      <span className="text-[8px] font-mono text-[#debfc2]/50 uppercase font-extrabold tracking-wider flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-[#e9c349]" /> PREDICTION WINDOW:
                      </span>
                      <span className="text-[9.5px] font-mono text-[#e9c349] font-extrabold tracking-wide">
                        {formatPredictionWindow(match.predictionStartTime, match.predictionEndTime)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-4">
                    {/* Team A */}
                    <div className="text-center w-1/3 flex flex-col items-center">
                      <div className="w-16 h-12 bg-[#301821] rounded border border-[#e9c349]/20 overflow-hidden flex items-center justify-center p-0.5">
                        <img
                          src={match.flagA}
                          alt={match.teamA}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-sans font-bold text-xs mt-2 text-[#ffd9e3] tracking-wide block truncate w-full font-mono uppercase">
                        {match.teamA}
                      </span>
                    </div>

                    {/* Scores or VS */}
                    <div className="text-center w-1/3 flex flex-col justify-center items-center">
                      {match.status === 'LIVE' || match.status === 'FINISHED' ? (
                        <span className="font-mono text-3xl font-extrabold text-[#e9c349]">
                          {match.scoreA} - {match.scoreB}
                        </span>
                      ) : (
                        <span className="font-mono text-xl font-bold text-[#debfc2]/60">VS</span>
                      )}
                    </div>

                    {/* Team B */}
                    <div className="text-center w-1/3 flex flex-col items-center">
                      <div className="w-16 h-12 bg-[#301821] rounded border border-[#e9c349]/20 overflow-hidden flex items-center justify-center p-0.5">
                        <img
                          src={match.flagB}
                          alt={match.teamB}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-sans font-bold text-xs mt-2 text-[#ffd9e3] tracking-wide block truncate w-full font-mono uppercase">
                        {match.teamB}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Odds & Staking */}
                <div className="border-t border-[#e9c349]/10 pt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs">
                    <div className="bg-[#1c070f] py-2 rounded border border-[#e9c349]/5 hover:border-[#e9c349]/30 transition-all">
                      <span className="text-[8px] text-[#debfc2]/60 block mb-0.5">1 (Team A)</span>
                      <span className="text-[#e9c349] font-bold">{match.oddsA.toFixed(2)}</span>
                    </div>
                    <div className="bg-[#1c070f] py-2 rounded border border-[#e9c349]/5 hover:border-[#e9c349]/30 transition-all">
                      <span className="text-[8px] text-[#debfc2]/60 block mb-0.5">X (Draw)</span>
                      <span className="text-[#ffb2bd] font-bold">{match.oddsDraw.toFixed(2)}</span>
                    </div>
                    <div className="bg-[#1c070f] py-2 rounded border border-[#e9c349]/5 hover:border-[#e9c349]/30 transition-all">
                      <span className="text-[8px] text-[#debfc2]/60 block mb-0.5">2 (Team B)</span>
                      <span className="text-[#e9c349] font-bold">{match.oddsB.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Active predictions tracker bar */}
                  <div>
                    <div className="flex justify-between text-[9px] font-mono text-[#debfc2]/80 mb-1">
                      <span>COMMUNITY SPLIT:</span>
                      <span className="text-[#e9c349] font-bold">{match.communityPredictionA || 50}% vs {match.communityPredictionB || 50}%</span>
                    </div>
                    <div className="h-1.5 bg-[#301821] rounded-full overflow-hidden flex">
                      <div className="bg-[#e9c349]" style={{ width: `${match.communityPredictionA || 50}%` }}></div>
                      <div className="bg-[#ffb2bd]" style={{ width: `${match.communityPredictionB || 50}%` }}></div>
                    </div>
                  </div>

                  {/* CTA Prediction buttons */}
                  {isAfterEnd || match.status === 'FINISHED' ? (
                    <button className="w-full py-3 bg-black/40 border border-white/5 text-[#debfc2]/40 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed">
                      MATCH CONCLUDED
                    </button>
                  ) : isBeforeStart ? (
                    <button className="w-full py-3 bg-[#333] border border-white/5 text-[#debfc2]/60 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed">
                      <Clock className="w-3.5 h-3.5 text-[#e9c349]" /> PREDICTIONS OPEN SOON
                    </button>
                  ) : userHasPrediction ? (
                    <button className="w-full py-3 bg-[#333] border border-white/5 text-[#debfc2]/60 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed">
                      <Clock className="w-3.5 h-3.5 text-[#e9c349]" /> YOU HAVE ALREADY PREDICTED
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPredictModal(match)}
                      className="w-full py-3 bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] font-sans font-bold text-xs tracking-wider uppercase transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                    >
                      ENTER PREDICTION
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exquisite Prediction overlay Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#220c14] border-2 border-[#e9c349] p-6 max-w-md w-full rounded-lg shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
            
            {showSuccess ? (
              <div className="text-center py-12 space-y-4">
                <CheckCircle className="w-16 h-16 text-[#70db9d] mx-auto animate-bounce" />
                <h4 className="font-sans text-2xl font-extrabold text-[#ffd9e3]">PREDICTION SECURED!</h4>
                <p className="font-sans text-sm text-[#debfc2]">Your exact score prediction has been securely logged.</p>
              </div>
            ) : showConfirmScreen ? (
              <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                <div className="text-center space-y-3">
                  <ShieldAlert className="w-16 h-16 text-[#e9c349] mx-auto animate-pulse" />
                  <h4 className="font-sans text-xl font-extrabold text-[#ffd9e3] uppercase tracking-wide leading-tight">
                    CONFIRM YOUR PREDICTION
                  </h4>
                  <div className="bg-[#8a1538]/20 border border-[#8a1538]/40 p-3 rounded text-center">
                    <p className="font-mono text-xs text-[#ffb2bd] font-bold uppercase tracking-wider">
                      ⚠️ ONLY ONCE CAN ENTER &amp; CANNOT BE CHANGED
                    </p>
                    <p className="text-[10px] font-sans text-[#debfc2]/80 mt-1 leading-normal">
                      Once confirmed, your selected score and participant details are locked permanently.
                    </p>
                  </div>
                </div>

                <div className="bg-[#1c070f] p-4 rounded border border-[#e9c349]/10 space-y-3 font-sans text-xs">
                  <div className="border-b border-[#e9c349]/10 pb-2">
                    <span className="font-mono text-[10px] text-[#debfc2]/60 uppercase block mb-0.5">MATCH FIXTURE</span>
                    <span className="font-bold text-[#e9c349] uppercase font-mono">{selectedMatch.teamA} VS {selectedMatch.teamB}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-b border-[#e9c349]/10 pb-2">
                    <div>
                      <span className="font-mono text-[10px] text-[#debfc2]/60 uppercase block mb-0.5">PREDICTED SCORE</span>
                      <span className="font-mono text-base font-black text-[#ffb2bd]">{predScoreA} - {predScoreB}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] text-[#debfc2]/60 uppercase block mb-0.5">PREDICTED OUTCOME</span>
                      <span className="font-bold text-[#e9c349]">
                        {predictionOutcome === 'A' ? `${selectedMatch.teamA} WIN` : predictionOutcome === 'B' ? `${selectedMatch.teamB} WIN` : 'DRAW'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-[#debfc2]">
                    <div>
                      <span className="font-mono text-[9px] text-[#debfc2]/60 uppercase mr-1">REGISTER NUMBER:</span>
                      <span className="font-mono font-bold text-white uppercase">{registerNumber}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-[#debfc2]/60 uppercase mr-1">PARTICIPANT NAME:</span>
                      <span className="font-bold text-white">{participantName}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-[#debfc2]/60 uppercase mr-1">DEPARTMENT:</span>
                      <span className="text-white">{department}</span>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-[#debfc2]/60 uppercase mr-1">CLASS WITH YEAR:</span>
                      <span className="text-white">{classWithYear}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirmScreen(false)}
                    className="w-1/2 py-3 font-mono text-xs font-bold tracking-wider text-[#ffd9e3]/60 hover:text-[#ffd9e3] hover:bg-[#301821] border border-[#e9c349]/10 rounded transition-all"
                  >
                    GO BACK &amp; EDIT
                  </button>
                  <button
                    onClick={handlePlacePrediction}
                    disabled={submitting}
                    className="w-1/2 py-3 bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] font-sans font-bold text-xs tracking-widest uppercase rounded cursor-pointer transition-all active:scale-95 shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'SUBMITTING...' : 'CONFIRM & SUBMIT'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-sans text-base font-bold text-[#e9c349] tracking-wider uppercase flex items-center gap-1.5">
                      <Target className="w-4 h-4" /> PREDICTION TERMINAL
                    </h4>
                    <p className="font-mono text-[10px] text-[#debfc2] uppercase">
                      {selectedMatch.teamA} vs {selectedMatch.teamB}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="text-[#debfc2] hover:text-[#e9c349] font-bold font-mono text-base"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  
                  {/* Goal Sliders Selector (0 to 10) */}
                  <div className="space-y-3">
                    <label className="block font-mono text-[10px] text-[#debfc2] uppercase font-extrabold tracking-wider border-b border-[#e9c349]/10 pb-1.5">
                      1. SELECT PREDICTED GOALS (0 TO 10)
                    </label>

                    {/* Team A Slider */}
                    <div className="space-y-1.5 bg-[#1c070f] p-3.5 rounded border border-[#e9c349]/10">
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-xs text-[#ffd9e3] uppercase font-bold flex items-center gap-1.5 truncate max-w-[70%]">
                          <img src={selectedMatch.flagA} alt="" className="w-4 h-3 object-cover rounded border border-[#e9c349]/10" />
                          {selectedMatch.teamA} Goals
                        </span>
                        <span className="font-mono text-lg font-black text-[#e9c349] bg-[#301821] px-2.5 py-0.5 rounded border border-[#e9c349]/30">
                          {predScoreA}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={predScoreA}
                        onChange={(e) => handleScoreAChange(parseInt(e.target.value) || 0)}
                        className="w-full accent-[#e9c349] bg-[#301821] h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-[#debfc2]/40">
                        <span>0 Goals</span>
                        <span>5</span>
                        <span>10 Goals</span>
                      </div>
                    </div>

                    {/* Team B Slider */}
                    <div className="space-y-1.5 bg-[#1c070f] p-3.5 rounded border border-[#e9c349]/10">
                      <div className="flex justify-between items-center">
                        <span className="font-sans text-xs text-[#ffd9e3] uppercase font-bold flex items-center gap-1.5 truncate max-w-[70%]">
                          <img src={selectedMatch.flagB} alt="" className="w-4 h-3 object-cover rounded border border-[#e9c349]/10" />
                          {selectedMatch.teamB} Goals
                        </span>
                        <span className="font-mono text-lg font-black text-[#e9c349] bg-[#301821] px-2.5 py-0.5 rounded border border-[#e9c349]/30">
                          {predScoreB}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={predScoreB}
                        onChange={(e) => handleScoreBChange(parseInt(e.target.value) || 0)}
                        className="w-full accent-[#e9c349] bg-[#301821] h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-[#debfc2]/40">
                        <span>0 Goals</span>
                        <span>5</span>
                        <span>10 Goals</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated Outcome Summary */}
                  <div className="bg-[#1c070f] p-3 rounded border border-[#e9c349]/5 flex justify-between items-center font-sans text-xs">
                    <span className="text-[#debfc2]/60 font-mono text-[9px] uppercase font-bold">PREDICTED MATCH OUTCOME:</span>
                    <span className="font-extrabold text-[#e9c349] uppercase tracking-wider bg-[#301821] px-2.5 py-1 rounded">
                      {predictionOutcome === 'A' ? `${selectedMatch.teamA} WIN` : predictionOutcome === 'B' ? `${selectedMatch.teamB} WIN` : 'DRAW'}
                    </span>
                  </div>

                  {/* Participant Information Form Fields */}
                  <div className="bg-[#1c070f] p-4 rounded border border-[#e9c349]/10 space-y-3">
                    <label className="block font-mono text-[10px] text-[#e9c349] uppercase font-extrabold tracking-wider border-b border-[#e9c349]/10 pb-1.5">
                      2. PARTICIPANT DETAILS
                    </label>
                    
                    <div className="grid grid-cols-1 gap-2.5">
                      <div>
                        <label className="block text-[9px] font-mono text-[#debfc2]/60 mb-0.5 uppercase font-bold">Register Number</label>
                        <input
                          type="text"
                          required
                          placeholder="Enter register number"
                          value={registerNumber}
                          onChange={(e) => setRegisterNumber(e.target.value)}
                          className="w-full bg-[#301821] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2 text-xs focus:outline-none focus:ring-0 uppercase placeholder-[#debfc2]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-[#debfc2]/60 mb-0.5 uppercase font-bold">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Enter full name"
                          value={participantName}
                          onChange={(e) => setParticipantName(e.target.value)}
                          className="w-full bg-[#301821] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2 text-xs focus:outline-none focus:ring-0 placeholder-[#debfc2]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-[#debfc2]/60 mb-0.5 uppercase font-bold">Department</label>
                        <input
                          type="text"
                          required
                          placeholder="Enter department"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full bg-[#301821] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2 text-xs focus:outline-none focus:ring-0 placeholder-[#debfc2]/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-[#debfc2]/60 mb-0.5 uppercase font-bold">Class with Year</label>
                        <input
                          type="text"
                          required
                          placeholder="Enter class with year"
                          value={classWithYear}
                          onChange={(e) => setClassWithYear(e.target.value)}
                          className="w-full bg-[#301821] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2 text-xs focus:outline-none focus:ring-0 placeholder-[#debfc2]/30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission and Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setSelectedMatch(null)}
                      className="w-1/3 py-2.5 font-mono text-xs font-bold tracking-wider text-[#ffd9e3]/60 hover:text-[#ffd9e3] hover:bg-[#301821] border border-[#e9c349]/10 rounded transition-all"
                    >
                      CANCEL
                    </button>
                    <button
                      disabled={!predictionOutcome || !registerNumber.trim() || !participantName.trim() || !department.trim() || !classWithYear.trim()}
                      onClick={() => setShowConfirmScreen(true)}
                      className={`w-2/3 py-2.5 font-sans font-bold text-xs tracking-widest uppercase rounded transition-all ${
                        predictionOutcome && registerNumber.trim() && participantName.trim() && department.trim() && classWithYear.trim()
                          ? 'bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] cursor-pointer'
                          : 'bg-[#3c222b] text-[#debfc2]/40 border border-[#e9c349]/5 cursor-not-allowed'
                      }`}
                    >
                      SUBMIT PREDICTION
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

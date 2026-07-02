import React, { useState } from 'react';
import { Match, LeaderboardEntry, Ticket } from '../types';
import { Shield, Plus, Edit3, Save, Activity, RefreshCw, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import * as api from '../services/api';

interface AdminPanelProps {
  matches: Match[];
  leaderboard: LeaderboardEntry[];
  tickets: Ticket[];
  onUpdateMatch: (updatedMatch: Match) => void | Promise<void>;
  onAddMatch: (newMatch: Match) => void | Promise<void>;
  adminUsername: string;
  onCredentialsChanged: (newUsername: string) => void;
  onSyncComplete: () => void | Promise<void>;
}

export default function AdminPanel({
  matches,
  leaderboard,
  tickets,
  onUpdateMatch,
  onAddMatch,
  adminUsername,
  onCredentialsChanged,
  onSyncComplete
}: AdminPanelProps) {
  // Add Match form state
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [flagA, setFlagA] = useState('');
  const [flagB, setFlagB] = useState('');
  const [flagTypeA, setFlagTypeA] = useState<'url' | 'file'>('url');
  const [flagTypeB, setFlagTypeB] = useState<'url' | 'file'>('url');
  
  const [predictionStartDate, setPredictionStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0,10); // YYYY-MM-DD
  });
  const [predictionStartClock, setPredictionStartClock] = useState(() => '12:00');

  const [predictionEndDate, setPredictionEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0,10);
  });
  const [predictionEndClock, setPredictionEndClock] = useState(() => '20:00');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newAdminUser, setNewAdminUser] = useState(adminUsername);
  const [newAdminPass, setNewAdminPass] = useState('');
  const [credentialsSaving, setCredentialsSaving] = useState(false);

  const [stage, setStage] = useState('GROUP STAGE');
  const [time, setTime] = useState('20:00');
  const [date, setDate] = useState('July 1');

  // World Cup Sync state (sync itself now runs entirely server-side against
  // ESPN's public API, so the client just triggers it and shows the result)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Edit states for existing matches
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editedScoreA, setEditedScoreA] = useState(0);
  const [editedScoreB, setEditedScoreB] = useState(0);
  const [editedStatus, setEditedStatus] = useState<'UPCOMING' | 'LIVE' | 'FINISHED'>('UPCOMING');
  const [editedOddsA, setEditedOddsA] = useState(2.0);
  const [editedOddsDraw, setEditedOddsDraw] = useState(3.0);
  const [editedOddsB, setEditedOddsB] = useState(2.0);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamA || !teamB) {
      alert("Please fill in both team names.");
      return;
    }

    // id is a placeholder here - the server assigns the real Firestore
    // document id and onAddMatch discards this field before sending.
    const newMatch: Match = {
      id: '',
      teamA: teamA.toUpperCase(),
      teamB: teamB.toUpperCase(),
      flagA: flagA || '',
      flagB: flagB || '',
      oddsA: 2.0,
      oddsDraw: 3.0,
      oddsB: 2.0,
      scoreA: 0,
      scoreB: 0,
      status: 'UPCOMING',
      stage: stage,
      time: time,
      date: date,
      communityPredictionA: 50,
      communityPredictionB: 50,
      predictionStartTime: `${predictionStartDate}T${predictionStartClock}:00`,
      predictionEndTime: `${predictionEndDate}T${predictionEndClock}:00`
    };

    await onAddMatch(newMatch);

    // Reset Form
    setTeamA('');
    setTeamB('');
    setFlagA('');
    setFlagB('');
    alert("New Match published successfully!");
  };

  // ---- World Cup Score Sync ----
  // Runs entirely server-side: fetches free live scores from ESPN and
  // matches/updates our Firestore fixtures by team name. The client just
  // triggers it and refreshes.
  const handleSyncNow = async () => {
    setSyncStatus('loading');
    setSyncMessage('');
    try {
      const result = await api.syncScoresNow();
      if (result.espnMatchesFound === 0) {
        setSyncMessage('No World Cup matches found for the current window (±4 days). The tournament may be on a break day.');
      } else if (result.updated === 0) {
        setSyncMessage(`Checked ${result.checked} match(es) against ${result.espnMatchesFound} live ESPN fixture(s) - everything is already up to date.`);
      } else {
        setSyncMessage(`✅ Updated ${result.updated} of ${result.checked} match(es) from live ESPN data.`);
      }
      setSyncStatus('done');
      await onSyncComplete();
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(`Sync failed: ${err?.message || 'Network error. Check your connection.'}`);
    }
  };

  const startEditingMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setEditedScoreA(match.scoreA);
    setEditedScoreB(match.scoreB);
    setEditedStatus(match.status);
    setEditedOddsA(match.oddsA);
    setEditedOddsDraw(match.oddsDraw);
    setEditedOddsB(match.oddsB);
  };

  const handleSaveMatch = (match: Match) => {
    const updated: Match = {
      ...match,
      scoreA: Number(editedScoreA),
      scoreB: Number(editedScoreB),
      status: editedStatus,
      oddsA: Number(editedOddsA),
      oddsDraw: Number(editedOddsDraw),
      oddsB: Number(editedOddsB)
    };
    onUpdateMatch(updated);
    setEditingMatchId(null);
  };

  const handleChangeCredentials = async () => {
    if (!currentPassword || !newAdminUser || !newAdminPass) {
      alert('Please fill in your current password plus the new username and password.');
      return;
    }
    if (newAdminPass.length < 6) {
      alert('New password must be at least 6 characters.');
      return;
    }
    setCredentialsSaving(true);
    try {
      await api.changeCredentials(currentPassword, newAdminUser, newAdminPass);
      onCredentialsChanged(newAdminUser);
      setCurrentPassword('');
      setNewAdminPass('');
      alert('Admin credentials successfully updated and secured.');
    } catch (err: any) {
      alert(err?.message || 'Failed to update credentials.');
    } finally {
      setCredentialsSaving(false);
    }
  };

  return (
    <div className="py-12 bg-[#1c070f] text-[#ffd9e3] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 space-y-10">
        
        {/* Admin Banner */}
        <div className="bg-gradient-to-r from-[#8a1538] to-[#1c070f] p-6 rounded-lg border border-[#e9c349]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#e9c349]" />
            <div>
              <h1 className="font-sans text-2xl font-black text-[#e9c349] tracking-tight uppercase">
                ADMINISTRATION TERMINAL
              </h1>
              <p className="font-mono text-xs text-[#debfc2] uppercase">
                SECURE PLATFORM ENGINE &amp; LEDGER CONTROLS
              </p>
            </div>
          </div>
          <span className="font-mono text-[9px] bg-[#70db9d]/20 text-[#70db9d] px-3 py-1 rounded font-bold uppercase tracking-widest">
            ● ROOT PRIVILEGES GRANTED
          </span>
        </div>

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
          <div className="bg-[#220c14] border border-[#e9c349]/10 p-5 rounded-lg">
            <span className="text-[10px] font-mono text-[#debfc2] tracking-wider block uppercase">TOTAL MATCHES</span>
            <span className="text-3xl font-black text-[#e9c349]">{matches.length}</span>
            <span className="text-[9px] font-mono text-[#debfc2]/60 block mt-1">AVAILABLE TO PREDICT</span>
          </div>
          <div className="bg-[#220c14] border border-[#e9c349]/10 p-5 rounded-lg">
            <span className="text-[10px] font-mono text-[#debfc2] tracking-wider block uppercase">PLATFORM VOLUME</span>
            <span className="text-3xl font-black text-[#e9c349]">{tickets.length}</span>
            <span className="text-[9px] font-mono text-[#debfc2]/60 block mt-1">REAL PREDICTIONS SUBMITTED</span>
          </div>
          <div className="bg-[#220c14] border border-[#e9c349]/10 p-5 rounded-lg">
            <span className="text-[10px] font-mono text-[#debfc2] tracking-wider block uppercase">ACTIVE PARTICIPANTS</span>
            <span className="text-3xl font-black text-[#e9c349]">{leaderboard.length}</span>
            <span className="text-[9px] font-mono text-[#debfc2]/60 block mt-1">REGISTERED STUDENTS</span>
          </div>
          <div className="bg-[#220c14] border border-[#e9c349]/10 p-5 rounded-lg">
            <span className="text-[10px] font-mono text-[#debfc2] tracking-wider block uppercase">POINTS IN CIRCULATION</span>
            <span className="text-3xl font-black text-[#e9c349]">
              {leaderboard.reduce((sum, entry) => sum + entry.points, 0)}
            </span>
            <span className="text-[9px] font-mono text-[#debfc2]/60 block mt-1">TOTAL CORRECT POINTS</span>
          </div>
        </div>

        {/* Prediction Traffic Chart using Real Data */}
        <div className="bg-[#220c14] border border-[#e9c349]/20 p-6 rounded-lg space-y-4 font-sans">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-[#debfc2] font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#e9c349]" /> PREDICTION TRAFFIC CHART
            </span>
            <span className="text-[9px] font-mono text-[#debfc2]/60 uppercase">REAL-TIME TRAFFIC DATA</span>
          </div>
          
          <div className="h-52 flex items-end justify-between gap-4 pt-6 font-mono text-[9px] text-[#debfc2]/60 overflow-x-auto pb-2">
            {matches.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-center text-[#debfc2]/40 font-sans text-xs">
                No matches added yet. Create a match to track traffic.
              </div>
            ) : (
              matches.map((match) => {
                const matchTicketsCount = tickets.filter(t => t.matchId === match.id).length;
                
                // Find max count to normalize height properly, default to 1 if all are 0
                const counts = matches.map(m => tickets.filter(t => t.matchId === m.id).length);
                const maxCount = Math.max(...counts, 1);
                const heightPercent = Math.max(8, Math.round((matchTicketsCount / maxCount) * 100)); // min 8% for tiny bar

                return (
                  <div key={match.id} className="flex flex-col items-center flex-1 min-w-[120px] max-w-[180px] group">
                    <div className="w-full bg-[#8a1538]/10 group-hover:bg-[#8a1538]/20 border border-[#e9c349]/10 rounded h-28 transition-all duration-300 relative flex items-end">
                      <div 
                        className="w-full bg-[#8a1538] rounded-b group-hover:bg-[#e9c349] transition-all duration-300 relative" 
                        style={{ height: `${heightPercent}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[#ffd9e3] font-bold opacity-100 font-mono text-[10px] whitespace-nowrap">
                          {matchTicketsCount} preds
                        </span>
                      </div>
                    </div>
                    <span className="mt-2 text-center text-[10px] text-[#ffd9e3] font-bold truncate w-full" title={`${match.teamA} vs ${match.teamB}`}>
                      {match.teamA} v {match.teamB}
                    </span>
                    <span className="text-[8px] text-[#debfc2]/50 uppercase tracking-wider mt-0.5">{match.stage}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Existing Matches Editor */}
        <div className="bg-[#220c14] border border-[#e9c349]/20 p-6 rounded-lg space-y-6">
          <h2 className="font-sans text-xl font-extrabold text-[#e9c349] uppercase tracking-wider">
            MANAGE EXISTING MATCHES &amp; STATUSES
          </h2>

          <div className="space-y-4">
            {matches.map((match) => {
              const isEditing = editingMatchId === match.id;
              return (
                <div
                  key={match.id}
                  className="bg-[#1c070f] border border-[#e9c349]/10 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] bg-[#3c222b] text-[#debfc2] px-2 py-1 rounded">
                      {match.stage}
                    </span>
                    <span className="font-sans font-bold text-sm">
                      {match.teamA} VS {match.teamB}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#220c14] p-4 rounded border border-[#e9c349]/30">
                      {/* Scores inputs */}
                      <div className="space-y-1">
                        <label className="block font-mono text-[9px] text-[#debfc2] uppercase">Live Scores (A - B)</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            value={editedScoreA}
                            onChange={(e) => setEditedScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-12 bg-[#1c070f] text-[#e9c349] font-mono text-center font-bold border border-[#e9c349]/20 rounded py-1"
                          />
                          <span className="text-[#debfc2]">-</span>
                          <input
                            type="number"
                            value={editedScoreB}
                            onChange={(e) => setEditedScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-12 bg-[#1c070f] text-[#e9c349] font-mono text-center font-bold border border-[#e9c349]/20 rounded py-1"
                          />
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <div className="space-y-1">
                        <label className="block font-mono text-[9px] text-[#debfc2] uppercase font-bold">Match Status</label>
                        <select
                          value={editedStatus}
                          onChange={(e) => setEditedStatus(e.target.value as any)}
                          className="bg-[#1c070f] text-[#ffd9e3] font-mono text-xs border border-[#e9c349]/20 rounded py-1 px-2 focus:outline-none"
                        >
                          <option value="UPCOMING">UPCOMING</option>
                          <option value="LIVE">LIVE</option>
                          <option value="FINISHED">FINISHED</option>
                        </select>
                      </div>

                      {/* Odds modifications */}
                      <div className="space-y-1">
                        <label className="block font-mono text-[9px] text-[#debfc2] uppercase">Live Odds (1 - X - 2)</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            step="0.05"
                            value={editedOddsA}
                            onChange={(e) => setEditedOddsA(Number(e.target.value))}
                            className="w-12 bg-[#1c070f] font-mono text-[10px] text-center border border-[#e9c349]/20 rounded"
                          />
                          <input
                            type="number"
                            step="0.05"
                            value={editedOddsDraw}
                            onChange={(e) => setEditedOddsDraw(Number(e.target.value))}
                            className="w-12 bg-[#1c070f] font-mono text-[10px] text-center border border-[#e9c349]/20 rounded"
                          />
                          <input
                            type="number"
                            step="0.05"
                            value={editedOddsB}
                            onChange={(e) => setEditedOddsB(Number(e.target.value))}
                            className="w-12 bg-[#1c070f] font-mono text-[10px] text-center border border-[#e9c349]/20 rounded"
                          />
                        </div>
                      </div>

                      {/* Save btn */}
                      <div className="col-span-full flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setEditingMatchId(null)}
                          className="px-3 py-1 bg-[#3c222b] text-xs font-mono rounded text-[#debfc2]"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={() => handleSaveMatch(match)}
                          className="px-4 py-1 bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] font-mono font-bold text-xs rounded flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" /> SAVE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {/* Read-only Match values */}
                      <div className="text-right font-mono text-xs">
                        <span className="text-[#e9c349] font-bold mr-2">
                          SCORES: {match.scoreA} - {match.scoreB}
                        </span>
                        <span className="text-[#debfc2] uppercase mr-3">
                          ({match.status})
                        </span>
                        <span className="text-[#ffd9e3]/60">
                          ODDS: {match.oddsA.toFixed(2)} | {match.oddsDraw.toFixed(2)} | {match.oddsB.toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => startEditingMatch(match)}
                        className="p-1.5 bg-[#3c222b] hover:bg-[#e9c349] text-[#debfc2] hover:text-[#241a00] rounded transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== WORLD CUP SCORE SYNC ===== */}
        <div className="bg-[#220c14] border border-[#e9c349]/20 p-6 rounded-lg space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="font-sans text-xl font-extrabold text-[#e9c349] uppercase tracking-wider flex items-center gap-2">
                <Wifi className="w-5 h-5 text-[#e9c349]" /> WORLD CUP 2026 SCORE SYNC
              </h2>
              <p className="font-mono text-[10px] text-[#debfc2]/60 uppercase mt-1">
                Live &amp; finished scores sync automatically from ESPN while visitors browse the site.
                Use this button to force an immediate refresh.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncStatus === 'loading'}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#e9c349] hover:bg-[#ffd042] disabled:bg-[#3c222b] disabled:text-[#debfc2]/40 text-[#241a00] font-mono font-bold text-xs tracking-widest uppercase rounded transition-all active:scale-95 shadow-md shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'loading' ? 'animate-spin' : ''}`} />
              {syncStatus === 'loading' ? 'SYNCING...' : 'SYNC NOW'}
            </button>
          </div>

          {/* Status message */}
          {syncMessage && (
            <div className={`flex items-start gap-2 p-3 rounded border text-xs font-mono ${
              syncStatus === 'error'
                ? 'bg-[#ff4a4a]/10 border-[#ff4a4a]/30 text-[#ff6b6b]'
                : 'bg-[#70db9d]/10 border-[#70db9d]/30 text-[#70db9d]'
            }`}>
              {syncStatus === 'error'
                ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{syncMessage}</span>
            </div>
          )}
        </div>

        {/* ===== Add New Match Form ===== */}
        <div className="bg-[#220c14] border border-[#e9c349]/20 p-6 rounded-lg space-y-6">
          <h2 className="font-sans text-xl font-extrabold text-[#e9c349] uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#e9c349]" /> PUBLISH NEW MATCH
          </h2>

          <form onSubmit={handleCreateMatch} className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            <div>
              <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">TEAM A (e.g. ARGENTINA)</label>
              <input
                type="text"
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                placeholder="TEAM A"
                className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2.5 text-sm uppercase focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">TEAM B (e.g. ITALY)</label>
              <input
                type="text"
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                placeholder="TEAM B"
                className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2.5 text-sm uppercase focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">STAGE (e.g. ROUND OF 16)</label>
              <input
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="GROUP STAGE"
                className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2.5 text-sm uppercase focus:outline-none focus:ring-0"
              />
            </div>

            {/* Details flags */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-mono text-[#debfc2] uppercase font-bold">TEAM A FLAG</label>
                <div className="flex bg-[#3c222b] border border-[#e9c349]/20 p-0.5 rounded font-mono text-[9px] font-bold">
                  <button
                    type="button"
                    onClick={() => { setFlagTypeA('url'); setFlagA(''); }}
                    className={`px-2 py-0.5 rounded-sm transition-all ${flagTypeA === 'url' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2]'}`}
                  >
                    LINK
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFlagTypeA('file'); setFlagA(''); }}
                    className={`px-2 py-0.5 rounded-sm transition-all ${flagTypeA === 'file' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2]'}`}
                  >
                    IMAGE UPLOAD
                  </button>
                </div>
              </div>
              {flagTypeA === 'url' ? (
                <input
                  type="text"
                  value={flagA}
                  onChange={(e) => setFlagA(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2.5 text-sm focus:outline-none focus:ring-0"
                />
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') setFlagA(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-[#1c070f] text-[#debfc2] border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2 text-xs focus:outline-none focus:ring-0 file:bg-[#301821] file:text-[#e9c349] file:border-0 file:px-2.5 file:py-1 file:rounded file:mr-2 file:font-mono file:text-[10px] file:font-bold"
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-mono text-[#debfc2] uppercase font-bold">TEAM B FLAG</label>
                <div className="flex bg-[#3c222b] border border-[#e9c349]/20 p-0.5 rounded font-mono text-[9px] font-bold">
                  <button
                    type="button"
                    onClick={() => { setFlagTypeB('url'); setFlagB(''); }}
                    className={`px-2 py-0.5 rounded-sm transition-all ${flagTypeB === 'url' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2]'}`}
                  >
                    LINK
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFlagTypeB('file'); setFlagB(''); }}
                    className={`px-2 py-0.5 rounded-sm transition-all ${flagTypeB === 'file' ? 'bg-[#e9c349] text-[#241a00]' : 'text-[#debfc2]'}`}
                  >
                    IMAGE UPLOAD
                  </button>
                </div>
              </div>
              {flagTypeB === 'url' ? (
                <input
                  type="text"
                  value={flagB}
                  onChange={(e) => setFlagB(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2.5 text-sm focus:outline-none focus:ring-0"
                />
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') setFlagB(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-[#1c070f] text-[#debfc2] border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2 text-xs focus:outline-none focus:ring-0 file:bg-[#301821] file:text-[#e9c349] file:border-0 file:px-2.5 file:py-1 file:rounded file:mr-2 file:font-mono file:text-[10px] file:font-bold"
                />
              )}
            </div>

            {/* Custom prediction timeline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">PREDICTIONS START DATE</label>
                <input
                  type="date"
                  value={predictionStartDate}
                  onChange={(e) => setPredictionStartDate(e.target.value)}
                  className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 rounded p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">PREDICTIONS START TIME (24h)</label>
                <input
                  type="time"
                  value={predictionStartClock}
                  onChange={(e) => setPredictionStartClock(e.target.value)}
                  className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 rounded p-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">PREDICTIONS END DATE</label>
                <input
                  type="date"
                  value={predictionEndDate}
                  onChange={(e) => setPredictionEndDate(e.target.value)}
                  className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 rounded p-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">PREDICTIONS END TIME (24h)</label>
                <input
                  type="time"
                  value={predictionEndClock}
                  onChange={(e) => setPredictionEndClock(e.target.value)}
                  className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 rounded p-2.5 text-sm"
                />
              </div>
            </div>

            <div className="flex items-end justify-end md:col-span-3">
              <button
                type="submit"
                className="w-full py-3 bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] font-mono font-bold text-xs tracking-widest uppercase rounded cursor-pointer transition-all active:scale-95 shadow-md"
              >
                PUBLISH MATCH &amp; TIMELINE
              </button>
            </div>
          </form>
        </div>

        {/* Leaderboard Overview (read-only) */}
        <div className="bg-[#220c14] border border-[#e9c349]/20 p-6 rounded-lg space-y-6">
          <div>
            <h2 className="font-sans text-xl font-extrabold text-[#e9c349] uppercase tracking-wider">
              LEADERBOARD OVERVIEW
            </h2>
            <p className="font-mono text-[10px] text-[#debfc2]/60 uppercase mt-1">
              Points are calculated automatically from real match results and can't be edited here -
              that keeps the competition honest.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-[#301821] border-b border-[#e9c349]/10 font-mono text-[9px] text-[#debfc2] tracking-wider uppercase">
                  <th className="py-3 px-4">PREDICTOR USERNAME</th>
                  <th className="py-3 px-4 text-center">CURRENT POINTS</th>
                  <th className="py-3 px-4 text-center">ACCURACY (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9c349]/5">
                {leaderboard.map((user) => (
                  <tr key={user.id} className="hover:bg-[#301821]/40">
                    <td className="py-3 px-4 font-bold text-[#ffd9e3]">{user.username}</td>
                    <td className="py-3 px-4 text-center font-mono text-[#e9c349] font-bold">
                      {user.points.toLocaleString()} PTS
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[#70db9d] font-bold">
                      {user.accuracy}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Change Admin Credentials */}
        <div className="bg-[#220c14] border border-[#e9c349]/20 p-6 rounded-lg space-y-4">
          <h2 className="font-sans text-xl font-extrabold text-[#e9c349] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#e9c349]" /> UPDATE ADMIN ACCESS KEY
          </h2>
          <p className="font-sans text-xs text-[#debfc2]/60">
            Confirm your current password to set a new administrator username and password. This is verified and
            stored securely on the server - never in the browser.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">CURRENT PASSWORD</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2.5 text-sm focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">NEW USERNAME</label>
              <input
                type="text"
                value={newAdminUser}
                onChange={(e) => setNewAdminUser(e.target.value)}
                className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2.5 text-sm focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#debfc2] mb-1 uppercase font-bold">NEW PASSWORD</label>
              <input
                type="password"
                value={newAdminPass}
                onChange={(e) => setNewAdminPass(e.target.value)}
                className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded p-2.5 text-sm focus:outline-none focus:ring-0"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={credentialsSaving}
                onClick={handleChangeCredentials}
                className="w-full py-3 bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] font-mono font-bold text-xs tracking-widest uppercase rounded cursor-pointer transition-all active:scale-95 shadow-md disabled:opacity-50"
              >
                {credentialsSaving ? 'SAVING...' : 'SAVE NEW KEY'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

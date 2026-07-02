import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Scoreboard from './components/Scoreboard';
import Leaderboard from './components/Leaderboard';
import TicketsList from './components/TicketsList';
import AdminPanel from './components/AdminPanel';
import PredictionWinners from './components/PredictionWinners';
import { Match, Ticket, LeaderboardEntry, ParticipantInfo } from './types';
import { Shield, KeyRound, AlertTriangle } from 'lucide-react';
import { headerLogo } from './assets';
import * as api from './services/api';

const POLL_INTERVAL_MS = 15000;

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>('');

  const [currentTab, setCurrentTab] = useState<string>('live');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Current user session identity for ticket visibility (device-local only,
  // not a security boundary - the server enforces one prediction per match
  // per register number regardless of what's stored here).
  const [currentUser, setCurrentUser] = useState<ParticipantInfo | null>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('fifa_predict_current_user_v1') : null;
    if (!saved) return null;
    try {
      return JSON.parse(saved) as ParticipantInfo;
    } catch {
      return null;
    }
  });

  const firstLoadRef = useRef(true);

  const updateCurrentUser = (info: ParticipantInfo) => {
    setCurrentUser(info);
    localStorage.setItem('fifa_predict_current_user_v1', JSON.stringify(info));
  };

  // --- Load matches + tickets from the server, and poll for updates ---
  const refreshData = useCallback(async () => {
    try {
      const [matchesRes, ticketsRes] = await Promise.all([api.fetchMatches(), api.fetchTickets()]);
      setMatches(matchesRes.matches);
      setTickets(ticketsRes.tickets);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load data from the server.');
    } finally {
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshData();
    const timer = window.setInterval(refreshData, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  // --- Check admin session on load ---
  useEffect(() => {
    api
      .getSession()
      .then((res) => {
        setIsAdmin(res.isAdmin);
        if (res.username) setAdminUsername(res.username);
      })
      .catch(() => {
        setIsAdmin(false);
      });
  }, []);

  // --- Derived: leaderboard, computed purely from real match results ---
  // This can't be tampered with from the Admin Panel - it's always an
  // honest reflection of who actually predicted correctly.
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const participantsMap: Record<
      string,
      {
        registerNumber: string;
        participantName: string;
        department: string;
        classWithYear: string;
        correctCount: number;
        finishedCount: number;
        firstPredictionAt: number;
      }
    > = {};

    const getTicketTimestamp = (ticket: Ticket) => {
      if (ticket.submittedAt) {
        const parsed = Date.parse(ticket.submittedAt);
        if (!Number.isNaN(parsed)) return parsed;
      }
      const parsedCreatedAt = Date.parse(ticket.createdAt);
      return Number.isNaN(parsedCreatedAt) ? Number.MAX_SAFE_INTEGER : parsedCreatedAt;
    };

    tickets.forEach((ticket) => {
      const regNum = (ticket.registerNumber || 'UNKNOWN').trim().toUpperCase();
      if (!regNum || regNum === 'UNKNOWN') return;

      const match = matches.find((m) => m.id === ticket.matchId);
      const isFinished = match ? match.status === 'FINISHED' : false;
      const isCorrect =
        isFinished && match
          ? Number(ticket.predictedScoreA) === Number(match.scoreA) &&
            Number(ticket.predictedScoreB) === Number(match.scoreB)
          : false;

      if (!participantsMap[regNum]) {
        participantsMap[regNum] = {
          registerNumber: regNum,
          participantName: ticket.participantName || 'Anonymous',
          department: ticket.department || '',
          classWithYear: ticket.classWithYear || '',
          correctCount: 0,
          finishedCount: 0,
          firstPredictionAt: getTicketTimestamp(ticket),
        };
      }

      participantsMap[regNum].firstPredictionAt = Math.min(
        participantsMap[regNum].firstPredictionAt,
        getTicketTimestamp(ticket)
      );

      if (isFinished) {
        participantsMap[regNum].finishedCount += 1;
        if (isCorrect) participantsMap[regNum].correctCount += 1;
      }
    });

    return Object.values(participantsMap).map((p) => {
      const accuracy = p.finishedCount > 0 ? Math.round((p.correctCount / p.finishedCount) * 100) : 0;
      return {
        id: p.registerNumber,
        username: p.participantName,
        points: p.correctCount,
        accuracy,
        level: Math.max(1, p.correctCount * 2),
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.participantName)}`,
        rank: 0,
        registerNumber: p.registerNumber,
        department: p.department,
        classWithYear: p.classWithYear,
        firstPredictionAt: p.firstPredictionAt,
      };
    });
  }, [tickets, matches]);

  const totalSessionPoints = useMemo(() => {
    return tickets.filter((ticket) => {
      const match = matches.find((m) => m.id === ticket.matchId);
      return (
        match &&
        match.status === 'FINISHED' &&
        Number(ticket.predictedScoreA) === Number(match.scoreA) &&
        Number(ticket.predictedScoreB) === Number(match.scoreB)
      );
    }).length;
  }, [tickets, matches]);

  // --- User submits a prediction ---
  const handleAddPrediction = async (
    matchId: string,
    outcome: 'A' | 'DRAW' | 'B',
    predictedScoreA: number,
    predictedScoreB: number,
    registerNumber: string,
    participantName: string,
    department: string,
    classWithYear: string
  ): Promise<boolean> => {
    try {
      const { ticket } = await api.submitTicket({
        matchId,
        predictedOutcome: outcome,
        predictedScoreA,
        predictedScoreB,
        registerNumber,
        participantName,
        department,
        classWithYear,
      });
      setTickets((prev) => [ticket, ...prev]);
      return true;
    } catch (err: any) {
      alert(err?.message || 'Failed to submit prediction.');
      return false;
    }
  };

  // --- Admin: add / update match ---
  const handleAddMatch = async (newMatch: Match) => {
    const { id, ...rest } = newMatch;
    try {
      const { match } = await api.createMatch(rest);
      setMatches((prev) => [match, ...prev]);
    } catch (err: any) {
      alert(err?.message || 'Failed to create match.');
    }
  };

  const handleUpdateMatch = async (updatedMatch: Match) => {
    try {
      const { match } = await api.updateMatch(updatedMatch.id, updatedMatch);
      setMatches((prev) => prev.map((m) => (m.id === match.id ? match : m)));
    } catch (err: any) {
      alert(err?.message || 'Failed to update match.');
    }
  };

  // --- Admin login / logout ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError('');
    try {
      const res = await api.login(username, password);
      setIsAdmin(true);
      setAdminUsername(res.username);
      setShowLoginModal(false);
      setCurrentTab('admin');
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setLoginError(err?.message || 'Login failed.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogoutAdmin = async () => {
    try {
      await api.logout();
    } catch {
      // ignore network errors on logout
    }
    setIsAdmin(false);
    if (currentTab === 'admin') setCurrentTab('live');
    alert('Logged out from admin privileges.');
  };

  return (
    <div className="bg-[#1c070f] text-[#ffd9e3] font-sans min-h-screen relative overflow-x-hidden selection:bg-[#e9c349] selection:text-black">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#8a1538]/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#e9c349]/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Persistent Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        totalPoints={totalSessionPoints}
        isAdmin={isAdmin}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />
      {/* banner directly under the fixed navbar */}
      <div className="w-full mt-[96px] sm:mt-[84px] md:mt-[72px] overflow-hidden">
        <img src={headerLogo} alt="Site header" loading="lazy" className="w-full h-auto object-cover" />
      </div>

      {loadError && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="bg-[#ff4a4a]/10 border border-[#ff4a4a]/40 p-3 rounded text-[#ff6b6b] font-mono text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Couldn't reach the server: {loadError}. Retrying automatically...</span>
          </div>
        </div>
      )}

      {(currentTab === 'live' || currentTab === 'predictions') && (
        <Hero
          onPredictClick={() => {
            const el = document.getElementById('fixtures-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onLiveClick={() => {
            setCurrentTab('live');
            setTimeout(() => {
              const el = document.getElementById('fixtures-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />
      )}

      <main className="relative z-10 pt-20">
        {loading ? (
          <div className="py-24 text-center font-mono text-sm text-[#debfc2]/60">LOADING LIVE DATA...</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              id="fixtures-section"
            >
              {(currentTab === 'live' || currentTab === 'predictions') && (
                <Scoreboard
                  matches={matches}
                  onAddPrediction={handleAddPrediction}
                  onOpenLoginModal={() => setShowLoginModal(true)}
                  activeTickets={tickets}
                  currentUser={currentUser}
                  onSetCurrentUser={updateCurrentUser}
                />
              )}

              {currentTab === 'leaderboard' && <Leaderboard leaderboard={leaderboard} />}

              {currentTab === 'tickets' && (
                <TicketsList tickets={tickets} matches={matches} currentUser={currentUser} isAdmin={isAdmin} />
              )}

              {currentTab === 'winners' && (
                <PredictionWinners matches={matches} leaderboard={leaderboard} tickets={tickets} />
              )}

              {currentTab === 'admin' && isAdmin && (
                <AdminPanel
                  matches={matches}
                  leaderboard={leaderboard}
                  tickets={tickets}
                  onUpdateMatch={handleUpdateMatch}
                  onAddMatch={handleAddMatch}
                  adminUsername={adminUsername}
                  onCredentialsChanged={(newUsername) => setAdminUsername(newUsername)}
                  onSyncComplete={refreshData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer Area */}
      <footer className="bg-[#100308] border-t border-[#e9c349]/10 py-12 relative z-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <span className="font-sans font-black text-xl text-[#ffd9e3] tracking-tighter uppercase block mb-3">
              FIFA-PREDICT
            </span>
            <p className="font-sans text-xs text-[#debfc2]/60 max-w-sm leading-relaxed">
              FIFA Predict is a secure, state-of-the-art interactive gaming environment designed for prediction
              experts. Test your soccer calculations with live match dynamics.
            </p>
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-[#e9c349] tracking-widest block mb-4 uppercase">
              RESOURCES
            </span>
            <ul className="space-y-2 font-sans text-xs text-[#debfc2] font-semibold">
              <li>
                <button onClick={() => setCurrentTab('live')} className="hover:text-[#e9c349] transition-colors">
                  Match Scoreboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentTab('leaderboard')}
                  className="hover:text-[#e9c349] transition-colors"
                >
                  Global Leaderboard
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('tickets')} className="hover:text-[#e9c349] transition-colors">
                  Prediction Slips
                </button>
              </li>
            </ul>
          </div>
          <div>
            <span className="font-mono text-xs font-bold text-[#ffb2bd] tracking-widest block mb-4 uppercase">
              SECURITY &amp; CONTROLS
            </span>
            <p className="font-sans text-xs text-[#debfc2]/60 leading-relaxed mb-4">
              Administrative access is protected server-side. Credentials are never stored in the browser.
            </p>
            <div className="bg-[#1c070f] p-3 rounded border border-[#e9c349]/10 font-mono text-[10px] text-[#debfc2]/60">
              Admin credentials can be customized securely inside the administrative system console panel.
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-[#e9c349]/5 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-[#debfc2]/40 gap-4">
          <span>&copy; {new Date().getFullYear()} FIFA-PREDICT INC. ALL RIGHT RESERVED.</span>
          <span>CRAFTED FOR CHAMPIONS</span>
        </div>
      </footer>

      {/* --- credentials-based Login Overlay Modal --- */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-[#220c14] border-2 border-[#e9c349] max-w-sm w-full p-6 rounded-lg relative shadow-2xl">
            <button
              onClick={() => {
                setShowLoginModal(false);
                setLoginError('');
              }}
              className="absolute top-4 right-4 text-[#debfc2] hover:text-[#e9c349] font-bold font-mono text-lg"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-[#e9c349] mx-auto mb-2" />
              <h3 className="font-sans text-xl font-extrabold text-[#ffd9e3] tracking-tight uppercase">
                AUTHENTICATION TERMINAL
              </h3>
              <p className="font-mono text-[10px] text-[#debfc2] uppercase">Enter admin credentials to continue</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 font-sans text-xs">
              <div>
                <label className="block font-mono text-[10px] text-[#debfc2] mb-1 uppercase font-bold">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#debfc2]/40 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded py-2.5 pl-8 pr-4 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-[#debfc2] mb-1 uppercase font-bold">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[#debfc2]/40 w-3.5 h-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#1c070f] text-white border border-[#e9c349]/20 focus:border-[#e9c349] rounded py-2.5 pl-9 pr-4 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {loginError && (
                <div className="bg-[#ff4a4a]/10 border border-[#ff4a4a]/40 p-2.5 rounded text-[#ff6b6b] font-mono text-[10px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#ff6b6b]" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full py-3 bg-[#e9c349] hover:bg-[#ffd042] text-[#241a00] font-mono font-bold text-xs tracking-widest uppercase rounded transition-all active:scale-[0.98] shadow-md disabled:opacity-50"
              >
                {loginSubmitting ? 'CHECKING...' : 'PROCEED AUTHENTICATION'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

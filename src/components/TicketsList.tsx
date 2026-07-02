import React from 'react';
import { Ticket as TicketType, Match, ParticipantInfo } from '../types';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface TicketsListProps {
  tickets: TicketType[];
  matches: Match[];
  currentUser: ParticipantInfo | null;
  isAdmin: boolean;
}

export default function TicketsList({ tickets, matches, currentUser, isAdmin }: TicketsListProps) {
  
  const getMatchDetails = (matchId: string): Match | undefined => {
    return matches.find((m) => m.id === matchId);
  };

  const visibleTickets = isAdmin
    ? tickets
    : currentUser
      ? tickets.filter((ticket) => (ticket.registerNumber || '').trim().toUpperCase() === currentUser.registerNumber.trim().toUpperCase())
      : [];

  const getSelectionName = (outcome: 'A' | 'DRAW' | 'B', match?: Match): string => {
    if (!match) return outcome;
    if (outcome === 'A') return `${match.teamA} WIN`;
    if (outcome === 'DRAW') return 'MATCH DRAW';
    return `${match.teamB} WIN`;
  };

  // Determine if a ticket has indeed won (if match status is finished and prediction is correct)
  const computeActualTicketStatus = (ticket: TicketType, match?: Match): 'PENDING' | 'WON' | 'LOST' => {
    if (!match) return 'PENDING';
    if (match.status !== 'FINISHED') return 'PENDING';

    const isExactCorrect = Number(ticket.predictedScoreA) === Number(match.scoreA) && Number(ticket.predictedScoreB) === Number(match.scoreB);
    return isExactCorrect ? 'WON' : 'LOST';
  };

  return (
    <section className="py-12 bg-[#220c14] min-h-[60vh] relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-8 border-l-4 border-[#e9c349] pl-4">
          <h2 className="font-sans text-3xl font-extrabold text-[#ffd9e3] tracking-tight uppercase">
            MY PREDICTION SLIPS
          </h2>
          <p className="font-mono text-xs text-[#debfc2] tracking-wider uppercase">
            ACTIVE RECEIPTS, OUTCOME TRACKER &amp; REWARD REDEMPTIONS
          </p>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleTickets.map((ticket) => {
            const match = getMatchDetails(ticket.matchId);
            const displayStatus = computeActualTicketStatus(ticket, match);

            return (
              <div
                key={ticket.id}
                className="bg-[#220c14]/80 backdrop-blur-md border border-[#e9c349]/20 p-6 rounded-lg relative overflow-hidden flex flex-col justify-between"
              >
                {/* Decorative background slip design */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#e9c349] via-[#8a1538] to-[#ffb2bd]"></div>

                <div className="mb-6 space-y-4">
                  {/* Slip Header */}
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-[#debfc2] font-bold">SLIP ID: {ticket.id.toUpperCase()}</span>
                    <span className="text-[#debfc2]/60">{ticket.createdAt}</span>
                  </div>

                  {/* Match summary */}
                  {match ? (
                    <div className="bg-[#301821]/50 p-3 rounded border border-[#e9c349]/10">
                      <div className="flex justify-between items-center font-sans text-xs font-bold text-[#ffd9e3] mb-1">
                        <span>{match.teamA}</span>
                        <span className="text-[#e9c349]">
                          {match.status === 'FINISHED' || match.status === 'LIVE' ? `${match.scoreA} - ${match.scoreB}` : 'VS'}
                        </span>
                        <span>{match.teamB}</span>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-mono text-[#debfc2]/80 uppercase">
                        <span>{match.stage}</span>
                        <span>{match.status}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#301821]/50 p-3 rounded text-center text-xs text-[#debfc2]">
                      Match details unavailable
                    </div>
                  )}

                  {/* Prediction parameters */}
                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-[#e9c349]/10 text-xs">
                    <div>
                      <span className="block text-[8px] font-mono text-[#debfc2]/60 uppercase">PREDICTED SCORE</span>
                      <span className="font-mono text-sm font-black text-[#e9c349]">
                        {ticket.predictedScoreA} - {ticket.predictedScoreB}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-mono text-[#debfc2]/60 uppercase">OUTCOME</span>
                      <span className="font-sans font-extrabold text-[#ffb2bd] uppercase">
                        {getSelectionName(ticket.predictedOutcome, match)}
                      </span>
                    </div>
                  </div>

                  {/* Participant info on Slip */}
                  <div className="bg-[#1c070f] p-3 rounded border border-[#e9c349]/5 space-y-1.5 text-[11px]">
                    <span className="block text-[8px] font-mono text-[#e9c349]/80 uppercase tracking-widest font-black">PARTICIPANT DETAILS</span>
                    <div className="flex justify-between text-[#debfc2]">
                      <span className="font-mono text-[9px] uppercase">REGISTER NO:</span>
                      <span className="font-mono font-bold text-white uppercase">{ticket.registerNumber || '—'}</span>
                    </div>
                    <div className="flex justify-between text-[#debfc2]">
                      <span className="font-mono text-[9px] uppercase">NAME:</span>
                      <span className="font-bold text-white">{ticket.participantName || '—'}</span>
                    </div>
                    <div className="flex justify-between text-[#debfc2]">
                      <span className="font-mono text-[9px] uppercase">DEPARTMENT:</span>
                      <span className="text-white truncate max-w-[150px]" title={ticket.department || ''}>
                        {ticket.department || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#debfc2]">
                      <span className="font-mono text-[9px] uppercase">CLASS:</span>
                      <span className="text-white">{ticket.classWithYear || '—'}</span>
                    </div>
                    <div className="flex justify-between text-[#debfc2]">
                      <span className="font-mono text-[9px] uppercase">SUBMITTED:</span>
                      <span className="text-white uppercase text-[10px]">
                        {ticket.submittedAt ? new Date(ticket.submittedAt).toLocaleString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : ticket.createdAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status or Reward Actions */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-[#debfc2]/80">ODDS RATIO:</span>
                    <span className="font-mono font-bold text-[#e9c349] text-sm">
                      {ticket.odds.toFixed(2)}x
                    </span>
                  </div>

                  {displayStatus === 'WON' ? (
                    <div className="w-full py-2.5 bg-[#70db9d]/20 border border-[#70db9d] text-[#70db9d] font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 rounded">
                      <CheckCircle2 className="w-4 h-4 text-[#70db9d]" />
                      WON (+1 POINT)
                    </div>
                  ) : displayStatus === 'LOST' ? (
                    <div className="w-full py-2.5 bg-[#ff4a4a]/20 border border-[#ff4a4a] text-[#ff6b6b] font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 rounded">
                      <XCircle className="w-4 h-4 text-[#ff6b6b]" />
                      SETTLED (LOST)
                    </div>
                  ) : (
                    <div className="w-full py-2.5 bg-[#301821] border border-[#e9c349]/10 text-[#debfc2] font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 rounded">
                      <Clock className="w-4 h-4 text-[#e9c349]" />
                      AWAITING RESULT
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {visibleTickets.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-[#e9c349]/20 rounded-lg">
              <span className="block font-sans text-sm text-[#debfc2]/60 mb-2">
                {isAdmin
                  ? 'No prediction slips have been submitted yet.'
                  : currentUser
                    ? 'You have no predictions yet. Enter one on the live matches page.'
                    : 'Please place a prediction first so this page can show your personal slips.'}
              </span>
              <button onClick={() => window.location.hash = '#fixtures-section'} className="px-5 py-2.5 bg-[#e9c349] text-[#241a00] font-mono text-xs font-bold uppercase tracking-wider rounded">
                Browse Live Match Odds
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

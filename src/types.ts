export type MatchStatus = 'UPCOMING' | 'LIVE' | 'FINISHED';

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  flagA: string; // flag image url/placeholder
  flagB: string; // flag image url/placeholder
  time: string;  // e.g. "19:00" or "June 24, 19:00"
  date: string;  // e.g. "June 24"
  stage: string; // e.g. "GROUP STAGE" or "ROUND OF 16"
  scoreA: number;
  scoreB: number;
  oddsA: number;
  oddsDraw: number;
  oddsB: number;
  status: MatchStatus;
  liveMinute?: number;
  liveHalf?: string; // e.g., "1st half", "2nd half"
  communityPredictionA: number; // percentage
  communityPredictionB: number; // percentage
  predictionStartTime?: string; // e.g. "June 29, 12:00" or "2026-06-29T10:00"
  predictionEndTime?: string;   // e.g. "June 29, 18:00" or "2026-06-29T19:30"
}

export interface ParticipantInfo {
  registerNumber: string;
  participantName: string;
  department: string;
  classWithYear: string;
}

export interface Ticket {
  id: string;
  matchId: string;
  predictedOutcome: 'A' | 'DRAW' | 'B';
  predictedScoreA: number; // exact score for Team A
  predictedScoreB: number; // exact score for Team B
  stakeCoins: number;
  odds: number;
  potentialPayout: number;
  status: 'PENDING' | 'WON' | 'LOST';
  createdAt: string;
  submittedAt?: string;
  registerNumber?: string;
  participantName?: string;
  department?: string;
  classWithYear?: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  rank: number;
  points: number;
  level: number;
  accuracy: number; // percentage
  avatarUrl: string;
  isCurrentUser?: boolean;
  registerNumber?: string;
  department?: string;
  classWithYear?: string;
  firstPredictionAt?: number;
}

export interface Transaction {
  id: string;
  title: string;
  txnId: string;
  timeAgo: string;
  amount: string; // e.g. "+$49.99" or "-$250.00"
  type: 'CREDIT' | 'PAYOUT';
}

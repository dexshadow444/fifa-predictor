import { Match, Ticket } from '../types';

async function jsonFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

// --- Matches ---
export function fetchMatches(): Promise<{ matches: Match[] }> {
  return jsonFetch('/api/matches');
}

export function createMatch(match: Omit<Match, 'id'>): Promise<{ match: Match }> {
  return jsonFetch('/api/matches', { method: 'POST', body: JSON.stringify(match) });
}

export function updateMatch(id: string, updates: Partial<Match>): Promise<{ match: Match }> {
  return jsonFetch('/api/matches', { method: 'PUT', body: JSON.stringify({ id, ...updates }) });
}

// --- Tickets ---
export function fetchTickets(): Promise<{ tickets: Ticket[] }> {
  return jsonFetch('/api/tickets');
}

export interface SubmitTicketPayload {
  matchId: string;
  predictedOutcome: 'A' | 'DRAW' | 'B';
  predictedScoreA: number;
  predictedScoreB: number;
  registerNumber: string;
  participantName: string;
  department: string;
  classWithYear: string;
}

export function submitTicket(payload: SubmitTicketPayload): Promise<{ ticket: Ticket }> {
  return jsonFetch('/api/tickets', { method: 'POST', body: JSON.stringify(payload) });
}

// --- Auth ---
export function login(username: string, password: string): Promise<{ ok: true; username: string }> {
  return jsonFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function logout(): Promise<{ ok: true }> {
  return jsonFetch('/api/auth/logout', { method: 'POST' });
}

export function getSession(): Promise<{ isAdmin: boolean; username?: string }> {
  return jsonFetch('/api/auth/session');
}

export function changeCredentials(
  currentPassword: string,
  newUsername: string,
  newPassword: string
): Promise<{ ok: true }> {
  return jsonFetch('/api/admin/credentials', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newUsername, newPassword }),
  });
}

// --- Live score sync ---
export function syncScoresNow(): Promise<{ updated: number; checked: number; espnMatchesFound: number }> {
  return jsonFetch('/api/sync-scores', { method: 'POST' });
}

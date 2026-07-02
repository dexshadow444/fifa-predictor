import { getDb } from '../lib/firebaseAdmin.js';

function parseMaybeDate(s) {
  if (!s) return NaN;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  try {
    const t2 = Date.parse(`${s} ${new Date().getFullYear()}`);
    return t2;
  } catch {
    return NaN;
  }
}

export default async function handler(req, res) {
  const db = getDb();

  if (req.method === 'GET') {
    const snapshot = await db.collection('tickets').orderBy('submittedAt', 'desc').get();
    const tickets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ tickets });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const {
      matchId,
      predictedOutcome,
      predictedScoreA,
      predictedScoreB,
      registerNumber,
      participantName,
      department,
      classWithYear,
    } = body;

    if (!matchId || !registerNumber || !participantName || !department || !classWithYear) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }
    if (!['A', 'DRAW', 'B'].includes(predictedOutcome)) {
      return res.status(400).json({ error: 'Invalid predicted outcome.' });
    }
    const scoreA = Number(predictedScoreA);
    const scoreB = Number(predictedScoreB);
    if (
      !Number.isInteger(scoreA) ||
      !Number.isInteger(scoreB) ||
      scoreA < 0 ||
      scoreB < 0 ||
      scoreA > 20 ||
      scoreB > 20
    ) {
      return res.status(400).json({ error: 'Invalid predicted score.' });
    }

    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found.' });
    }
    const match = matchDoc.data();

    // Server-enforced prediction window - this used to only be checked in
    // the browser, so anyone could bypass it by calling the API directly.
    const now = Date.now();
    const start = parseMaybeDate(match.predictionStartTime);
    const end = parseMaybeDate(match.predictionEndTime);
    if (!Number.isNaN(start) && now < start) {
      return res.status(403).json({ error: 'Predictions for this match are not open yet.' });
    }
    if (!Number.isNaN(end) && now >= end) {
      return res.status(403).json({ error: 'Predictions for this match are closed.' });
    }
    if (match.status === 'FINISHED') {
      return res.status(403).json({ error: 'This match has already finished.' });
    }

    const reg = String(registerNumber).trim().toUpperCase();

    // Server-enforced duplicate prevention - this also used to only be
    // checked client-side against locally cached tickets, so clearing
    // localStorage (or just calling the old API directly) let anyone
    // submit unlimited predictions for the same match.
    const existing = await db
      .collection('tickets')
      .where('matchId', '==', matchId)
      .where('registerNumber', '==', reg)
      .limit(1)
      .get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'You have already submitted a prediction for this match.' });
    }

    let odds = match.oddsA;
    if (predictedOutcome === 'DRAW') odds = match.oddsDraw;
    else if (predictedOutcome === 'B') odds = match.oddsB;

    const nowDate = new Date();
    const ticket = {
      matchId,
      predictedOutcome,
      predictedScoreA: scoreA,
      predictedScoreB: scoreB,
      stakeCoins: 0,
      odds,
      potentialPayout: 0,
      status: 'PENDING',
      createdAt:
        nowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ', ' +
        nowDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      submittedAt: nowDate.toISOString(),
      registerNumber: reg,
      participantName: String(participantName).trim(),
      department: String(department).trim(),
      classWithYear: String(classWithYear).trim(),
    };

    const docRef = await db.collection('tickets').add(ticket);
    return res.status(201).json({ ticket: { id: docRef.id, ...ticket } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

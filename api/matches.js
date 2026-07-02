import { getDb } from '../lib/firebaseAdmin.js';
import { requireAdmin } from '../lib/auth.js';
import { throttledAutoSync } from '../lib/scoreSync.js';

const REQUIRED_FIELDS = ['teamA', 'teamB', 'stage', 'time', 'date'];

function sanitizeMatchInput(body) {
  const clean = { ...body };
  delete clean.id; // id is always server-assigned (Firestore doc id)
  return clean;
}

export default async function handler(req, res) {
  const db = getDb();

  if (req.method === 'GET') {
    // Opportunistic, throttled auto-sync with real World Cup scores from
    // ESPN's free public API. Runs at most once every ~45s regardless of
    // how many visitors are polling.
    await throttledAutoSync(db);

    const snapshot = await db.collection('matches').orderBy('createdAt', 'desc').get();
    const matches = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ matches });
  }

  if (req.method === 'POST') {
    const session = requireAdmin(req, res);
    if (!session) return;

    const body = sanitizeMatchInput(req.body || {});
    const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const match = {
      teamA: String(body.teamA).toUpperCase(),
      teamB: String(body.teamB).toUpperCase(),
      flagA: body.flagA || '',
      flagB: body.flagB || '',
      oddsA: Number(body.oddsA) || 2.0,
      oddsDraw: Number(body.oddsDraw) || 3.0,
      oddsB: Number(body.oddsB) || 2.0,
      scoreA: 0,
      scoreB: 0,
      status: 'UPCOMING',
      stage: body.stage,
      time: body.time,
      date: body.date,
      communityPredictionA: 50,
      communityPredictionB: 50,
      predictionStartTime: body.predictionStartTime || null,
      predictionEndTime: body.predictionEndTime || null,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection('matches').add(match);
    return res.status(201).json({ match: { id: docRef.id, ...match } });
  }

  if (req.method === 'PUT') {
    const session = requireAdmin(req, res);
    if (!session) return;

    const { id, ...rest } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Missing match id.' });
    }

    const updates = sanitizeMatchInput(rest);
    const ref = db.collection('matches').doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    await ref.set(updates, { merge: true });
    const updatedDoc = await ref.get();
    return res.status(200).json({ match: { id: updatedDoc.id, ...updatedDoc.data() } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

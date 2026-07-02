import { getDb } from '../lib/firebaseAdmin.js';
import { getSessionFromReq } from '../lib/auth.js';
import { syncMatchesWithFirestore } from '../lib/scoreSync.js';

function isAuthorized(req) {
  // Allow Vercel Cron (sends CRON_SECRET as a Bearer token automatically
  // when CRON_SECRET is set as an env var) as a once-a-day fallback sync.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization || '';
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  // Allow a logged-in admin to trigger a manual sync from the Admin Panel.
  const session = getSessionFromReq(req);
  return !!(session && session.isAdmin);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Not authorized to trigger a sync.' });
  }

  try {
    const db = getDb();
    const result = await syncMatchesWithFirestore(db);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Manual sync error:', err);
    return res.status(500).json({ error: 'Sync failed.' });
  }
}

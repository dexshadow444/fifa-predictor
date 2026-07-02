import { getDb } from '../../lib/firebaseAdmin.js';
import { hashPassword, verifyPassword, signSessionToken, setSessionCookie } from '../../lib/auth.js';

// Basic in-memory rate limiting per serverless instance, to slow down brute
// force attempts. Not a substitute for a real WAF, but meaningful for a
// student project with a small audience.
const attempts = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function tooManyAttempts(key) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return false;
  }
  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

async function getOrSeedAdminConfig(db) {
  const ref = db.collection('config').doc('admin');
  const doc = await ref.get();
  if (doc.exists) return { ref, data: doc.data() };

  // First run: seed the admin account from environment variables so there's
  // always a way in. Change the password from the Admin Panel immediately
  // after your first login.
  const seedUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  const seedPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  if (!seedPassword) {
    throw new Error(
      'No admin account exists yet and ADMIN_DEFAULT_PASSWORD is not set. Set it in your environment variables to bootstrap the first admin login, then remove it.'
    );
  }
  const passwordHash = await hashPassword(seedPassword);
  const data = { username: seedUsername, passwordHash, updatedAt: new Date().toISOString() };
  await ref.set(data);
  return { ref, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in a few minutes.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const db = getDb();
    const { data: adminConfig } = await getOrSeedAdminConfig(db);

    if (username !== adminConfig.username) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    const valid = await verifyPassword(password, adminConfig.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    const token = signSessionToken({ isAdmin: true, username: adminConfig.username });
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true, username: adminConfig.username });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
}

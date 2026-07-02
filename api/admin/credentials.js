import { getDb } from '../../lib/firebaseAdmin.js';
import { requireAdmin, hashPassword, verifyPassword, signSessionToken, setSessionCookie } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = requireAdmin(req, res);
  if (!session) return;

  const { currentPassword, newUsername, newPassword } = req.body || {};
  if (!currentPassword || !newUsername || !newPassword) {
    return res.status(400).json({ error: 'Current password, new username, and new password are all required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    const db = getDb();
    const ref = db.collection('config').doc('admin');
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(400).json({ error: 'Admin account not initialized yet.' });
    }

    const current = doc.data();
    const valid = await verifyPassword(currentPassword, current.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = await hashPassword(newPassword);
    await ref.set(
      { username: newUsername, passwordHash, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    // Re-issue the session cookie so the current tab stays logged in under
    // the new username without needing to log in again.
    const token = signSessionToken({ isAdmin: true, username: newUsername });
    setSessionCookie(res, token);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Change credentials error:', err);
    return res.status(500).json({ error: 'Failed to update credentials.' });
  }
}

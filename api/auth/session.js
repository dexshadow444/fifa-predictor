import { getSessionFromReq } from '../../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const session = getSessionFromReq(req);
  if (!session || !session.isAdmin) {
    return res.status(200).json({ isAdmin: false });
  }
  return res.status(200).json({ isAdmin: true, username: session.username });
}

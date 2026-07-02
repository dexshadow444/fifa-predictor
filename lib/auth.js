import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookie from 'cookie';

const COOKIE_NAME = 'fifa_admin_session';
const SESSION_HOURS = 12;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable. See README.md for setup steps.');
  }
  return secret;
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signSessionToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: `${SESSION_HOURS}h` });
}

export function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_HOURS * 60 * 60,
    })
  );
}

export function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(COOKIE_NAME, '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
}

export function getSessionFromReq(req) {
  const header = req.headers.cookie || '';
  const parsed = cookie.parse(header);
  const token = parsed[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

/**
 * Verifies the request carries a valid admin session.
 * If not, writes a 401 response and returns null.
 * Every write-capable admin endpoint MUST call this before doing anything.
 */
export function requireAdmin(req, res) {
  const session = getSessionFromReq(req);
  if (!session || !session.isAdmin) {
    res.status(401).json({ error: 'Not authenticated. Please log in as admin.' });
    return null;
  }
  return session;
}

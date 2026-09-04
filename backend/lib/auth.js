import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Read lazily, not at import time: ES module imports are hoisted above the
// dotenv.config() call in app.js, so process.env is not populated yet here.
function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set. Refusing to run with an unsigned auth layer.');
  return s;
}

const TOKEN_TTL = '12h';

// Role groups. Kept as plain arrays — spread them into requireAuth().
export const ADMINS = ['SUPER_ADMIN', 'ADMIN'];
export const FINANCE = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS'];
export const INTERNAL = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'STAFF'];

export const hashPassword = (plain) => bcrypt.hash(String(plain), 10);

// bcrypt.compare returns false (not throws) on a malformed hash, so a legacy
// plaintext row simply fails to log in rather than crashing the endpoint.
export const verifyPassword = (plain, hash) => bcrypt.compare(String(plain), String(hash || ''));

export function signToken(profile) {
  return jwt.sign(
    {
      profileId: profile.id,
      email: profile.email,
      role: profile.role,
      schoolId: profile.schoolId,
      studentId: profile.student?.id || null,
      staffId: profile.staff?.id || null,
    },
    secret(),
    { expiresIn: TOKEN_TTL }
  );
}

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

/**
 * Gate a route. `requireAuth()` = any signed-in user;
 * `requireAuth(...ADMINS)` = only those roles.
 * On success sets req.user from the *token*, never from the request body.
 */
export function requireAuth(...roles) {
  return (req, res, next) => {
    const token = readToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    let payload;
    try {
      payload = jwt.verify(token, secret());
    } catch {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    if (roles.length && !roles.includes(payload.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    req.user = payload;
    next();
  };
}

/** Sets req.user when a valid token is present, but never rejects. For mixed public/private handlers. */
export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, secret());
    } catch {
      /* ignore an invalid token on a public route */
    }
  }
  next();
}

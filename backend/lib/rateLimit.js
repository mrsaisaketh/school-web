import { db } from './db.js';
import { logAuditEvent } from './audit.js';

/**
 * Brute-force protection for sign-in, backed by the audit log so that every
 * instance of the API shares one count. Failed attempts are recorded as
 * LOGIN_FAILED audit events; the limiter counts those for the identifier being
 * tried inside a sliding window and refuses with 429 once the cap is hit.
 *
 * The count is keyed on the identifier alone, not IP + identifier. A client's
 * IP is not stable — in testing, one machine's requests arrived from two
 * addresses and a per-IP count split 7/3 and never tripped — and an attacker
 * rotating addresses is the normal case anyway. What is being guessed is the
 * account, so the account is what gets locked. The IP is still recorded on
 * each event for the audit trail. Trade-off: anyone can lock an identifier
 * they know for fifteen minutes by guessing wrong eight times.
 *
 * ponytail: one COUNT on AuditLog per sign-in attempt, unindexed on
 * (action, ipAddress, entityId, createdAt). Fine at a school's login volume;
 * add that index if the table grows into millions.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

const identifierOf = (req) => String(req.body?.email ?? '').trim().toLowerCase();

export async function loginLimiter(req, res, next) {
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const count = await db.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        entityId: identifierOf(req),
        createdAt: { gte: since },
      },
    });

    if (count >= MAX_FAILURES) {
      const oldest = await db.auditLog.findFirst({
        where: { action: 'LOGIN_FAILED', entityId: identifierOf(req), createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });
      const retryAfter = Math.max(60, Math.ceil((oldest.createdAt.getTime() + WINDOW_MS - Date.now()) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: `Too many sign-in attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      });
    }
  } catch (error) {
    // A limiter outage must not lock everyone out. Let the attempt through, loudly.
    console.error('Login limiter unavailable, allowing attempt:', error);
  }
  next();
}

/* For a failed sign-in there is no profile to point at, so entityId carries the
   identifier that was tried. The password is never recorded. */
export function recordFailure(req) {
  return logAuditEvent({
    userRole: 'ANONYMOUS',
    action: 'LOGIN_FAILED',
    entity: 'Profile',
    entityId: identifierOf(req),
    ipAddress: req.ip,
  });
}

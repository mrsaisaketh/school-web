import { db } from './db.js';
import { logAuditEvent } from './audit.js';

/**
 * Brute-force protection for sign-in, backed by the audit log so that every
 * instance of the API shares one count. Failed attempts are recorded as
 * LOGIN_FAILED audit events; the limiter counts those for this client IP and
 * identifier inside a sliding window and refuses with 429 once the cap is hit.
 *
 * An in-memory table was tried first and did not hold on Vercel: consecutive
 * requests land on different warm instances, each with its own count, so nine
 * straight failures never tripped it. Shared state is the only thing that works.
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
        ipAddress: req.ip,
        entityId: identifierOf(req),
        createdAt: { gte: since },
      },
    });

    if (count >= MAX_FAILURES) {
      const oldest = await db.auditLog.findFirst({
        where: { action: 'LOGIN_FAILED', ipAddress: req.ip, entityId: identifierOf(req), createdAt: { gte: since } },
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

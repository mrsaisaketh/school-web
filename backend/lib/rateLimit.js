/**
 * Brute-force protection for sign-in. Counts failed attempts per client IP and
 * identifier inside a sliding window; once the cap is reached, every further
 * attempt in the window — right password or not — is refused with a 429.
 *
 * ponytail: in-memory and per-process. On Vercel each warm instance has its own
 * table, so an attacker spread across instances gets somewhat more tries than the
 * cap suggests, and a cold start forgets everything. That still turns an unbounded
 * online guess into a handful per quarter hour per instance. If this matters more,
 * back the table with a shared store (a small Supabase table, or Upstash Redis).
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const MAX_KEYS = 10_000; // memory ceiling; beyond this we forget everyone.

const failures = new Map(); // key -> [timestamps of failures]

const keyFor = (req) =>
  `${req.ip}:${String(req.body?.email ?? '').trim().toLowerCase()}`;

function recent(key, now) {
  const list = (failures.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export function loginLimiter(req, res, next) {
  const now = Date.now();
  const list = recent(keyFor(req), now);
  if (list.length >= MAX_FAILURES) {
    const retryAfter = Math.ceil((list[0] + WINDOW_MS - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: `Too many sign-in attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
    });
  }
  next();
}

export function recordFailure(req) {
  if (failures.size >= MAX_KEYS) failures.clear();
  const key = keyFor(req);
  const list = recent(key, Date.now());
  list.push(Date.now());
  failures.set(key, list);
}

export function clearFailures(req) {
  failures.delete(keyFor(req));
}

import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { setSession } from '../lib/api';

/* Signing in is signing the register at the office door: a ruled line for who
   you are, a ruled line for your key, and a date stamp beside it. The desks
   are listed by the job people actually do, not by the role constant. */

const DESKS = [
  { id: 'SUPER_ADMIN', label: "Principal", detail: 'Whole-school records', email: 'superadmin@school.com' },
  { id: 'ADMIN', label: 'Registrar', detail: 'Admissions and staff', email: 'admin@school.com' },
  { id: 'ACCOUNTS', label: 'Accounts', detail: 'Fees and receipts', email: 'accounts@school.com' },
  { id: 'STAFF', label: 'Faculty', detail: 'Class attendance and work', email: 'staff@school.com' },
  { id: 'USER', label: 'Student', detail: 'Your own record', email: '' },
];

const DASHBOARD_FOR = {
  SUPER_ADMIN: '/dashboard/super-admin',
  ADMIN: '/dashboard/admin',
  ACCOUNTS: '/dashboard/accounts',
  STAFF: '/dashboard/staff',
  USER: '/dashboard/user',
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'SUPER_ADMIN';
  const expired = searchParams.get('expired') === '1';

  const [email, setEmail] = useState(() => DESKS.find((d) => d.id === initialRole)?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const desk = DESKS.find((d) => d.id === role) || DESKS[0];
  const isStudent = role === 'USER';

  /* Choosing a desk fills in the identifier only. Passwords are never
     prefilled — the field is always yours to complete. */
  const handleRoleSelect = (r) => {
    setRole(r);
    setPassword('');
    setError('');
    setEmail(DESKS.find((d) => d.id === r)?.email ?? '');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.user && data.token) {
        setSession(data.token, data.user);
        navigate(DASHBOARD_FOR[data.user.role] ?? '/login');
      } else {
        setError(data.error || 'Could not sign in. Check the ID and password and try again.');
      }
    } catch {
      setLoading(false);
      setError('Could not reach the school server. Check your connection and try again.');
    }
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.05fr_1fr]">
        {/* ── Cover of the register ─────────────────────────────────────── */}
        <aside className="relative hidden flex-col justify-between bg-ink px-10 py-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center border border-manila-deep/60 bg-manila font-mono text-xs font-semibold text-ink">
              SX
            </span>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-white/55">
              Established 1974
            </span>
          </div>

          <div>
            <h1 className="max-w-md font-display text-[2.75rem] font-semibold leading-[1.03] tracking-[-0.015em]">
              St. Xavier
              <br />
              International
              <br />
              School
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
              The office register: admissions, attendance, fees and staff records, kept in one
              place for the people who work them daily.
            </p>
          </div>

          {/* A date stamp, the way a register page is opened each morning. */}
          <dl className="flex divide-x divide-white/15 border-t border-white/15 pt-5 font-mono text-[0.625rem] uppercase tracking-wider">
            <div className="pr-6">
              <dt className="text-white/45">Register date</dt>
              <dd className="mt-1 text-sm normal-case tracking-normal text-white tnum">{today}</dd>
            </div>
            <div className="px-6">
              <dt className="text-white/45">Session</dt>
              <dd className="mt-1 text-sm normal-case tracking-normal text-white tnum">2026&ndash;27</dd>
            </div>
          </dl>
        </aside>

        {/* ── The sign-in page ──────────────────────────────────────────── */}
        <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
          <div className="mx-auto w-full max-w-sm">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-faint">
              Sign the register
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink">Sign in</h2>

            {/* Desk selector. Radios, because it is one choice among five. */}
            <fieldset className="mt-7">
              <legend className="font-mono text-[0.625rem] uppercase tracking-wider text-ink-soft">
                Your desk
              </legend>
              <div className="mt-2 border border-rule bg-sheet">
                {DESKS.map((d, i) => (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors ${
                      i > 0 ? 'border-t border-rule-soft' : ''
                    } ${role === d.id ? 'bg-manila/60' : 'hover:bg-manila/25'}`}
                  >
                    <input
                      type="radio"
                      name="desk"
                      value={d.id}
                      checked={role === d.id}
                      onChange={() => handleRoleSelect(d.id)}
                      className="h-3 w-3 shrink-0 accent-[color:var(--color-copy)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.8125rem] font-medium text-ink">{d.label}</span>
                      <span className="block text-[0.6875rem] text-ink-faint">{d.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {expired && !error && (
              <p className="mt-5 border-l-2 border-hold bg-hold-wash px-3 py-2 text-xs text-hold">
                Your session ended. Sign in again to continue.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="mt-5 border-l-2 border-due bg-due-wash px-3 py-2 text-xs text-due"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-1 block font-mono text-[0.625rem] uppercase tracking-wider text-ink-soft">
                  {isStudent ? 'Student ID' : 'Email address'}
                </span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isStudent ? 'STU_1001' : 'you@school.com'}
                  className="w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-copy focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-mono text-[0.625rem] uppercase tracking-wider text-ink-soft">
                  Password
                </span>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-copy focus:outline-none"
                />
                {isStudent && (
                  <span className="mt-1.5 block text-[0.6875rem] text-ink-faint">
                    Your date of birth, written as DD/MM/YYYY.
                  </span>
                )}
              </label>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex w-full items-center justify-center gap-2 border border-copy bg-copy px-4 py-2.5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-copy-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Signing in…' : `Open the ${desk.label.toLowerCase()} register`}
                {!loading && (
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            </form>

            <p className="mt-8 border-t border-rule pt-4 text-xs text-ink-soft">
              Looking for a job at the school?{' '}
              <Link to="/careers" className="text-copy underline decoration-copy/40 underline-offset-2 hover:decoration-copy">
                See current openings
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

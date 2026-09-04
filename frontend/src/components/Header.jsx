import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { clearSession } from '../lib/api';

/* The desk label. A thin ink bar with the school's mark on the left and who is
   signed in on the right — the two things a shared office machine must show. */

const ROLE_LABEL = {
  SUPER_ADMIN: 'Principal',
  ADMIN: 'Registrar',
  ACCOUNTS: 'Accounts',
  STAFF: 'Faculty',
  USER: 'Student',
};

export default function Header({ userRole, userName }) {
  const navigate = useNavigate();
  const signedIn = userRole && userRole !== 'GUEST';

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-ink/15 bg-ink px-5 text-white">
      <button
        onClick={() => navigate(signedIn ? '.' : '/login')}
        className="flex items-center gap-3 text-left"
      >
        {/* The school's initials, set like a stamp on a register cover. */}
        <span className="grid h-8 w-8 place-items-center border border-manila-deep/60 bg-manila font-mono text-[0.6875rem] font-semibold tracking-tight text-ink">
          SX
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[0.9375rem] font-semibold tracking-tight">
            St. Xavier International School
          </span>
          <span className="block font-mono text-[0.625rem] uppercase tracking-[0.12em] text-white/55">
            Office Register
          </span>
        </span>
      </button>

      {signedIn ? (
        <div className="flex items-center gap-4">
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-xs font-medium">{userName || ROLE_LABEL[userRole] || userRole}</span>
            <span className="block font-mono text-[0.625rem] uppercase tracking-[0.12em] text-white/55">
              {ROLE_LABEL[userRole] || userRole.replace('_', ' ')}
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 border border-white/25 px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-white/80 transition-colors hover:border-white/60 hover:text-white"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="border border-white/25 px-3 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-white/80 transition-colors hover:border-white/60 hover:text-white"
        >
          Sign in
        </button>
      )}
    </header>
  );
}

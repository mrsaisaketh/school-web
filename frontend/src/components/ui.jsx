import React from 'react';

/* Shared building blocks for the register. Every dashboard used to hand-roll
   its own card, table head and status pill; these keep them consistent. */

const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ── Sheet ──────────────────────────────────────────────────────────────────
   A page of the register. Square corners, a single hairline, no drop shadow:
   it reads as paper rather than as a floating card. */
export function Sheet({ className, children, ...rest }) {
  return (
    <section className={cx('bg-sheet border border-rule', className)} {...rest}>
      {children}
    </section>
  );
}

/* The head of a sheet: what this register is, and the action that adds to it.
   `count` prints in the corner the way a register states its extent. */
export function SheetHead({ title, note, count, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-5 py-3.5">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight text-ink">{title}</h2>
          {count != null && (
            <span className="font-mono text-[0.6875rem] text-ink-faint tnum">{count}</span>
          )}
        </div>
        {note && <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-ink-soft">{note}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SheetBody({ className, children }) {
  return <div className={cx('px-5 py-4', className)}>{children}</div>;
}

/* The foot rule — a ledger page totals at the bottom. */
export function SheetFoot({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-paper px-5 py-2 font-mono text-[0.6875rem] text-ink-soft tnum">
      {children}
    </div>
  );
}

/* ── Button ─────────────────────────────────────────────────────────────────
   Copying-ink purple for the one real action, quiet outline for the rest. */
const BUTTON_VARIANTS = {
  primary: 'bg-copy text-white border-copy hover:bg-copy-deep',
  quiet: 'bg-sheet text-ink border-rule hover:bg-manila/40',
  danger: 'bg-sheet text-due border-due/50 hover:bg-due-wash',
  ghost: 'bg-transparent text-ink-soft border-transparent hover:text-ink hover:bg-manila/40',
};

export function Button({ variant = 'quiet', size = 'md', className, icon: Icon, children, ...rest }) {
  const sizes = { sm: 'px-2.5 py-1 text-[0.6875rem]', md: 'px-3.5 py-1.5 text-xs' };
  return (
    <button
      className={cx(
        'inline-flex items-center gap-1.5 border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        sizes[size],
        BUTTON_VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

/* ── Form fields ────────────────────────────────────────────────────────────
   Underlined rather than boxed: a form on ruled paper is a line you write on. */
export function Field({ label, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block font-mono text-[0.625rem] uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[0.6875rem] text-ink-faint">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full border-0 border-b border-rule bg-transparent px-0 py-1.5 text-sm text-ink ' +
  'placeholder:text-ink-faint focus:border-copy focus:outline-none focus:ring-0';

export function Input({ className, ...rest }) {
  return <input className={cx(inputClass, className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={cx(inputClass, 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  );
}

/* ── Mark ───────────────────────────────────────────────────────────────────
   Status as a stamped mark. `tone` is chosen by meaning, so callers pass the
   domain status and the register decides how to ink it. */
const MARK_TONES = {
  paid: 'text-paid bg-paid-wash',
  due: 'text-due bg-due-wash',
  hold: 'text-hold bg-hold-wash',
  neutral: 'text-ink-soft bg-paper',
};

const STATUS_TONE = {
  PAID: 'paid', VERIFIED: 'paid', ACTIVE: 'paid', PRESENT: 'paid', APPROVED: 'paid',
  PUBLISHED: 'paid', OPEN: 'paid', COMPLETED: 'paid',
  OVERDUE: 'due', CANCELLED: 'due', REJECTED: 'due', ABSENT: 'due', LEFT: 'due',
  INACTIVE: 'due', SUSPENDED: 'due', FAILED: 'due',
  PENDING: 'hold', PENDING_APPROVAL: 'hold', PENDING_VERIFICATION: 'hold',
  PARTIALLY_PAID: 'hold', LATE: 'hold', ISSUED: 'hold', APPLIED: 'hold', INITIATED: 'hold',
};

export function Mark({ status, tone, children, className }) {
  const resolved = tone || STATUS_TONE[status] || 'neutral';
  return (
    <span className={cx('mark', MARK_TONES[resolved], className)}>
      {children ?? String(status ?? '').replace(/_/g, ' ')}
    </span>
  );
}

/* ── Facts ──────────────────────────────────────────────────────────────────
   Figures read as a line of facts across the top of the register, not as a
   row of identical tiles. The label sits under the figure, small and quiet. */
export function Facts({ items, className }) {
  return (
    <dl
      className={cx(
        'flex flex-wrap items-stretch divide-x divide-rule border border-rule bg-sheet',
        className
      )}
    >
      {items.map((it) => (
        <div key={it.label} className="min-w-[8.5rem] flex-1 px-5 py-3.5">
          <dd
            className={cx(
              'font-mono text-[1.375rem] leading-none font-medium tnum',
              it.tone === 'due' ? 'text-due' : it.tone === 'paid' ? 'text-paid' : 'text-ink'
            )}
          >
            {it.value}
          </dd>
          <dt className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-wider text-ink-faint">
            {it.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

/* ── Page heading ───────────────────────────────────────────────────────────
   An eyebrow naming which register you are in, then the page's own title. */
export function PageHead({ eyebrow, title, children }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-faint">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">{title}</h1>
      </div>
      {children}
    </header>
  );
}

/* An empty register invites the first entry rather than reporting a void. */
export function Empty({ children, colSpan }) {
  const body = <p className="py-10 text-center text-xs text-ink-faint">{children}</p>;
  return colSpan ? (
    <tr>
      <td colSpan={colSpan}>{body}</td>
    </tr>
  ) : (
    body
  );
}

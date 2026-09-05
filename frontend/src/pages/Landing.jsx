import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import { useReveal } from '../lib/useReveal';

/* The school's public face, in the same language as its office register.
   Everything on this page is read from the database — the school row, the
   class list, the subjects, the faculty — so it is never out of step with what
   the office actually holds. */

const today = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function Landing() {
  const [site, setSite] = useState(null);
  const [failed, setFailed] = useState(false);
  const pageRef = useRef(null);

  useEffect(() => {
    fetch('/api/public/site')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setSite)
      .catch(() => setFailed(true));
  }, []);

  // Re-run once data lands so the newly rendered rows are observed too.
  useReveal(pageRef, [site]);

  const school = site?.school;
  const figures = site?.figures;
  const name = school?.name || 'St. Xavier International School';
  const city = school?.address?.split(',')?.[1]?.trim();

  return (
    <div ref={pageRef} className="min-h-screen bg-paper text-ink">
      <Header userRole="GUEST" />

      {/* ── Notice board ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-10 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="rise font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-faint" style={{ '--i': 0 }}>
              {city ? `${city} · ` : ''}Session 2026&ndash;27
            </p>
            <h1
              className="rise mt-3 font-display text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.015em] text-ink sm:text-6xl"
              style={{ '--i': 1 }}
            >
              {name}
            </h1>
            <p className="rise mt-6 max-w-lg text-[0.9375rem] leading-relaxed text-ink-soft" style={{ '--i': 2 }}>
              {figures
                ? `Classes 1 to ${figures.classes}, ${figures.subjects} subjects, and the ${figures.faculty} people who teach them. `
                : 'Classes 1 to 12 and the people who teach them. '}
              This is the school&rsquo;s office register and its public notice board.
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ '--i': 3 }}>
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 border border-copy bg-copy px-4 py-2.5 text-[0.8125rem] font-medium text-white transition-colors hover:bg-copy-deep"
              >
                Sign in to the register
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/careers"
                className="inline-flex items-center gap-2 border border-rule bg-sheet px-4 py-2.5 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-manila/40"
              >
                Openings
                {figures?.openPositions > 0 && (
                  <span className="mark text-paid bg-paid-wash">{figures.openPositions}</span>
                )}
              </Link>
            </div>
          </div>

          {/* The day's stamp, as it would be written at the top of a fresh page. */}
          <dl
            className="rise grid grid-cols-2 gap-px border border-rule bg-rule font-mono text-[0.625rem] uppercase tracking-wider lg:grid-cols-1"
            style={{ '--i': 4 }}
          >
            {[
              ['Register date', today()],
              ['Session', '2026–27'],
              ['On roll', figures ? `${figures.students} students` : '—'],
              ['Faculty', figures ? `${figures.faculty} teaching` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="bg-sheet px-4 py-3">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="mt-1 text-sm normal-case tracking-normal text-ink tnum">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rule-draw mt-12 h-px w-full bg-ink" aria-hidden="true" />
      </section>

      {failed && (
        <p className="mx-auto max-w-6xl px-6 pb-8 text-xs text-due sm:px-10">
          The register could not be reached just now. The sign-in and openings pages still work.
        </p>
      )}

      {site && (
        <>
          {/* ── Classes ──────────────────────────────────────────────────── */}
          <Register
            eyebrow="Register I"
            title="Classes"
            note={`${site.classes.length} classes, each in two sections.`}
            head={['#', 'Class', 'Sections']}
            rows={site.classes.map((c, i) => [
              String(i + 1).padStart(2, '0'),
              c.name,
              c.sections.join(' · '),
            ])}
          />

          {/* ── Subjects ─────────────────────────────────────────────────── */}
          <section className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
            <SectionHead eyebrow="Register II" title="Subjects" note="Taught across all classes." />
            <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              {site.subjects.map((s, i) => (
                <li key={s.code} className="reveal flex items-baseline gap-2.5" style={{ '--i': i }}>
                  <span className="font-mono text-[0.6875rem] text-ink-faint">{s.code}</span>
                  <span className="text-[0.9375rem] text-ink">{s.name}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Faculty ──────────────────────────────────────────────────── */}
          <Register
            eyebrow="Register III"
            title="Faculty"
            note="Teaching staff currently on the roll."
            head={['#', 'Name', 'Designation', 'Department']}
            rows={site.faculty.map((f, i) => [
              String(i + 1).padStart(2, '0'),
              f.name,
              f.designation,
              f.department || '—',
            ])}
          />

          {/* ── Contact ──────────────────────────────────────────────────── */}
          <section className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
            <SectionHead eyebrow="Office" title="Find us" />
            <dl className="mt-5 grid gap-px border border-rule bg-rule sm:grid-cols-3">
              {[
                ['Address', school.address],
                ['Telephone', school.phone],
                ['Email', school.email],
              ].map(([k, v], i) => (
                <div key={k} className="reveal bg-sheet px-5 py-4" style={{ '--i': i }}>
                  <dt className="font-mono text-[0.625rem] uppercase tracking-wider text-ink-faint">{k}</dt>
                  <dd className="mt-1.5 text-sm text-ink tnum">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      <footer className="mx-auto max-w-6xl px-6 pb-10 pt-6 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4 font-mono text-[0.625rem] uppercase tracking-wider text-ink-faint">
          <span>{name}</span>
          <span className="flex gap-5">
            <Link to="/careers" className="hover:text-ink">Openings</Link>
            <Link to="/login" className="hover:text-ink">Sign in</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, note }) {
  return (
    <div className="reveal">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-faint">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h2>
      {note && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
    </div>
  );
}

/* A public register: ruled rows that fill in as they come into view. */
function Register({ eyebrow, title, note, head, rows }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
      <SectionHead eyebrow={eyebrow} title={title} note={note} />
      <div className="register-scroll mt-5 border border-rule bg-sheet">
        <table className="register">
          <thead>
            <tr>
              {head.map((h, i) => (
                <th key={h} className={i === 0 ? 'serial' : undefined}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="reveal" style={{ '--i': i }}>
                {r.map((cell, j) => (
                  <td key={j} className={j === 0 ? 'serial' : j === 1 ? 'font-medium text-ink' : 'text-ink-soft'}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

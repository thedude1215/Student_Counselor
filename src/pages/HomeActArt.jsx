/*
 * HomeActArt
 * The artwork for the four acts on the landing page.
 *
 * Each piece is a lightweight replica of a real product surface rather than an
 * invented mockup — the readiness card from Overview, the college rows from
 * CollegeList, the annotated draft from EssayReview, the task rows from Tasks.
 * A visitor sees the actual thing they will get.
 *
 * These deliberately use their own `ha-` classes instead of the workspace ones.
 * Reusing `ws-`/`erv-`/`dl-` here would quietly couple the marketing page to
 * workspace.css, and a refactor there would break this page with no warning.
 */

import { Check, CheckCircle2, Compass } from 'lucide-react';
import LogoTile from '../components/LogoTile';
import { getFeaturedUniversities } from '../api/catalog';

const LOGOS = Object.fromEntries(getFeaturedUniversities().map(u => [u.name, u]));

/* ── Act I · The Foundation — the readiness card from Overview ── */
export function ProfileArt() {
  const pct = 91;
  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <div className="ha-card ha-readiness">
      <div className="ha-readiness-top">
        <div>
          <span className="ha-label">Overall</span>
          <h3 className="ha-readiness-value">On track</h3>
        </div>
        <svg width="64" height="64" className="ha-ring" aria-hidden="true">
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(5,150,105,0.16)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={r} fill="none" stroke="var(--blue)" strokeWidth="5"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
            transform="rotate(-90 32 32)"
          />
          <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ha-ring-text">
            {pct}%
          </text>
        </svg>
      </div>

      <div className="ha-readiness-bar"><span style={{ width: `${pct}%` }} /></div>
      <div className="ha-readiness-scale"><span>Early</span><span>Ready</span></div>

      <p className="ha-readiness-summary">
        Strong progress. Balance your list across reach, match, and likely schools.
      </p>

      <div className="ha-tags">
        <span className="ha-tag">Class of 2031</span>
        <span className="ha-tag">Target: UK, United States</span>
        <span className="ha-tag">Electrical Engineering</span>
      </div>
    </div>
  );
}

/* ── Act II · The List — the college rows from CollegeList ── */
/* `label` is the short form the row shows — full names truncate at this width. */
const LIST_ROWS = [
  { name: 'New York University',     label: 'NYU Abu Dhabi',  city: 'Abu Dhabi, UAE',  rate: '8%',  fit: 'Strong fit', tier: 'reach'  },
  { name: 'University of Toronto',   label: 'U of Toronto',   city: 'Toronto, Canada', rate: '43%', fit: 'Good fit',   tier: 'match'  },
  { name: 'University of Edinburgh', label: 'U of Edinburgh', city: 'Edinburgh, UK',   rate: '52%', fit: 'Safe bet',   tier: 'likely' },
];

export function CollegeListArt() {
  return (
    <div className="ha-card ha-clist">
      <div className="ha-clist-head">
        <span>College</span>
        <span>Acc. rate</span>
        <span>Nova fit</span>
        <span>Your tier</span>
      </div>
      {LIST_ROWS.map(row => (
        <div key={row.name} className="ha-clist-row">
          <div className="ha-clist-name-col">
            {LOGOS[row.name] && <LogoTile item={LOGOS[row.name]} size={34} radius={9} />}
            <span className="ha-clist-name-wrap">
              <span className="ha-clist-name">{row.label}</span>
              <span className="ha-clist-city">{row.city}</span>
            </span>
          </div>
          <span className="ha-clist-rate">{row.rate}</span>
          <span className={`ha-fit-tag ha-fit-${row.tier}`}>{row.fit}</span>
          <span className={`ha-tier-pill ha-tier-${row.tier}`}>
            {row.tier[0].toUpperCase() + row.tier.slice(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Act III · The Story — the annotated draft from EssayReview ── */
export function EssayArt() {
  return (
    <div className="ha-card ha-essay">
      <div className="ha-essay-head">
        <span className="ha-essay-title">Personal statement</span>
        <span className="ha-essay-draft">Draft 3</span>
      </div>

      <p className="ha-essay-body">
        I redesigned my father&rsquo;s{' '}
        <mark className="ha-mark ha-mark-strength">
          monsoon water pump at twelve, using PVC pipe and a bicycle pump
        </mark>
        . It ran for three seasons before the valve gave out, and{' '}
        <mark className="ha-mark ha-mark-tighten">
          I learned a great deal from the experience
        </mark>
        .
      </p>

      <div className="ha-note ha-note-strength">
        <span className="ha-note-meta">
          <span className="ha-avatar ha-avatar-strength"><CheckCircle2 size={10} /></span>
          Nova · Essay review
        </span>
        <span className="ha-chip ha-chip-strength">Strength</span>
        <p>The detail does the work here. Keep it exactly as written.</p>
      </div>

      <div className="ha-note ha-note-tighten">
        <span className="ha-note-meta">
          <span className="ha-avatar ha-avatar-tighten"><Compass size={10} /></span>
          Nova · Essay review
        </span>
        <span className="ha-chip ha-chip-tighten">Tighten</span>
        <p>Name what you learned. Show it, don&rsquo;t summarise it.</p>
      </div>
    </div>
  );
}

/* ── Act IV · The Finish — the task rows from Tasks ── */
const TASK_ROWS = [
  { date: 'Oct 20', title: 'Ask Prof. Mehta for a rec letter', urgency: null,      prio: 'low',    done: true  },
  { date: 'Nov 1',  title: 'Finish the “Why NYUAD” essay',      urgency: 'In 3d',  prio: 'high',   done: false },
  { date: 'Nov 7',  title: 'SAT test date',                     urgency: null,      prio: 'medium', done: false },
  { date: 'Nov 15', title: 'Submit the CSS Profile',            urgency: null,      prio: 'high',   done: false },
];

const PRIO_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

export function TasksArt() {
  return (
    <div className="ha-card ha-tasks">
      <div className="ha-tasks-head">
        <span className="ha-label">November 2026</span>
        <span className="ha-tasks-count">4 open</span>
      </div>
      {TASK_ROWS.map(t => (
        <div key={t.title} className={`ha-task-row${t.done ? ' is-done' : ''}`}>
          <span className={`ha-check${t.done ? ' is-done' : ''}`}>
            <Check size={11} strokeWidth={3} />
          </span>
          <span className="ha-task-date">{t.date}</span>
          <span className="ha-task-title">{t.title}</span>
          {t.urgency && <span className="ha-urgency">{t.urgency}</span>}
          <span className={`ha-prio ha-prio-${t.prio}`}>{PRIO_LABEL[t.prio]}</span>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckSquare, Square, Plus, UserRound, GraduationCap, PenLine, Award, Sparkles, Flag } from 'lucide-react';
import LogoTile from '../../components/LogoTile';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCollegeList, fetchTasks, fetchEssays, fetchProfile, updateTask } from '../../api/workspace.js';
import { computeReadiness } from '../../lib/readiness.js';
import { computeJourney } from '../../lib/journey.js';
import { overviewCardStyle } from '../../lib/brandColors.js';
import './workspace.css';

/* Circular progress ring, Kollegio-style */
function ProgressRing({ percent, size = 62, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ws-ring" role="img" aria-label={`${percent}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#047857" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="ws-ring-text">
        {percent}%
      </text>
    </svg>
  );
}

export default function Overview() {
  const { user, profile } = useAuth();
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
  const [data, setData] = useState({ colleges: [], tasks: [], essays: [], profileRow: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchCollegeList(user.id), fetchTasks(user.id), fetchEssays(user.id), fetchProfile(user.id)])
      .then(([colleges, tasks, essays, profileRow]) => setData({ colleges, tasks, essays, profileRow }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const { colleges, tasks, essays, profileRow } = data;
  const readiness = computeReadiness({ profile: profileRow, collegeList: colleges, essays, tasks });
  const journey = computeJourney({ profile: profileRow, collegeList: colleges, essays, tasks });

  // Quick actions — suggest what's missing, Kollegio "New in" style
  const quickActions = [
    (!profileRow.gpa && !profileRow.sat_score) && {
      icon: <UserRound size={18} />, tone: 'green',
      title: 'Complete your profile',
      sub: 'Add academics so Nova can gauge your fit',
      to: '/dashboard/profile',
    },
    colleges.length < 4 && {
      icon: <GraduationCap size={18} />, tone: 'blue',
      title: 'Build your college list',
      sub: colleges.length === 0 ? 'Add your first schools to start tracking' : 'Aim for a balanced list of 4+ schools',
      to: '/dashboard/colleges',
    },
    {
      icon: <Sparkles size={18} />, tone: 'lime',
      title: 'Find out if you can get in',
      sub: 'Your odds at any college, based on your profile',
      to: '/nova',
      state: { prompt: 'Based on my profile, what are my chances at the schools on my college list?' },
    },
    {
      icon: <Award size={18} />, tone: 'pink',
      title: 'Find scholarships that fit you',
      sub: 'Curated for international students',
      to: '/dashboard/scholarships',
    },
    essays.length === 0 && {
      icon: <PenLine size={18} />, tone: 'gold',
      title: 'Start your first essay',
      sub: 'Nova reviews drafts line by line',
      to: '/dashboard/essays',
    },
  ].filter(Boolean).slice(0, 4);

  const open = tasks.filter(t => t.status !== 'done');
  const today = new Date(new Date().toDateString());
  const dueToday = open.filter(t => t.due_date && new Date(t.due_date + 'T00:00:00') <= today);
  const thisWeek = open.filter(t => {
    if (!t.due_date) return false;
    const days = (new Date(t.due_date + 'T00:00:00') - today) / 86_400_000;
    return days > 0 && days <= 7;
  });
  const todayStr = today.toLocaleDateString('en-CA');
  const firstDeadline = open.filter(t => t.due_date && t.due_date >= todayStr).map(t => t.due_date).sort()[0];
  const daysToDeadline = firstDeadline ? Math.round((new Date(firstDeadline + 'T00:00:00') - today) / 86_400_000) : null;

  async function toggle(task) {
    const next = task.status === 'done' ? 'todo' : 'done';
    await updateTask(task.id, { status: next });
    setData(d => ({ ...d, tasks: d.tasks.map(t => t.id === task.id ? { ...t, status: next } : t) }));
  }

  const tags = [
    profileRow.class_year,
    profileRow.target_countries?.length ? `Target: ${profileRow.target_countries.join(', ')}` : null,
    profileRow.intended_major ? `Intended major: ${profileRow.intended_major}` : null,
  ].filter(Boolean);

  if (loading) return <div className="ws-loading">Loading your workspace…</div>;

  return (
    <div className="ws-home">
      {/* ── Left column ── */}
      <div className="ws-home-main">
        <p className="ws-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="ws-greeting">{getGreeting()}, {name.split(' ')[0]}</h1>
        <p className="ws-subtitle ws-greeting-sub">
          {open.length} task{open.length === 1 ? '' : 's'} due this week
          {daysToDeadline != null && ` · your first deadline is in ${daysToDeadline} day${daysToDeadline === 1 ? '' : 's'}`}.
        </p>

        {/* Journey hero — gamified progress, Kollegio-style */}
        {!journey.complete && (
          <div className="ws-journey">
            <div className="ws-journey-body">
              <span className="ws-journey-act">Act {journey.num}: {journey.name}</span>
              <h2 className="ws-journey-headline">{journey.headline}</h2>
              <div className="ws-journey-progress">
                <div className="ws-journey-bar">
                  <span style={{ width: `${journey.percent}%` }} />
                </div>
                <span className="ws-journey-count"><Flag size={13} /> {journey.done}/{journey.total}</span>
              </div>
              <Link to={journey.to} className="ws-journey-btn">
                {journey.cta} <ArrowRight size={15} />
              </Link>
            </div>
            <div className="ws-journey-art" aria-hidden="true">
              <Sparkles size={54} strokeWidth={1.2} />
            </div>
          </div>
        )}

        {/* Status card */}
        <div className={`ws-status tone-${readiness.tone}`}>
          <div className="ws-status-top">
            <div>
              <span className="ws-status-label">Overall</span>
              <h2 className="ws-status-value">{readiness.label}</h2>
            </div>
            <ProgressRing percent={readiness.percent} />
          </div>
          <div className="ws-status-bar"><span style={{ width: `${readiness.percent}%` }} /></div>
          <div className="ws-status-scale"><span>Early</span><span>Ready</span></div>
          <p className="ws-status-summary">{readiness.summary}</p>
          {tags.length > 0 ? (
            <div className="ws-status-tags">{tags.map(t => <span key={t} className="ws-status-tag">{t}</span>)}</div>
          ) : (
            <Link to="/dashboard/profile" className="ws-status-cta">Complete your profile <ArrowRight size={13} /></Link>
          )}
        </div>

        {/* Your colleges */}
        <div className="ws-colleges-row">
          <span className="ws-colleges-label">Your colleges:</span>
          {colleges.length === 0 ? (
            <Link to="/universities" className="ws-colleges-add"><Plus size={14} /> Add schools</Link>
          ) : (
            <>
              <div className="ws-colleges-logos">
                {colleges.slice(0, 12).map(c => (
                  <LogoTile key={c.id} item={{ logoUrl: c.universities.logo_url, logoStyle: c.universities.logo_style, fallback: c.universities.fallback, name: c.universities.name }} size={38} radius={9} />
                ))}
                {colleges.length > 12 && <span className="ws-colleges-more">+{colleges.length - 12}</span>}
              </div>
              <Link to="/dashboard/colleges" className="ws-colleges-manage">Manage <ArrowRight size={12} /></Link>
            </>
          )}
        </div>

        {/* Quick actions */}
        {quickActions.length > 0 && (
          <div className="ws-home-section">
            <div className="ws-home-section-head"><h3>Suggested for you</h3></div>
            <div className="ws-qa-list">
              {quickActions.map((qa, i) => (
                <Link key={qa.title} to={qa.to} state={qa.state} className="ws-qa-row">
                  <span className={`ws-qa-icon tone-${qa.tone}`}>{qa.icon}</span>
                  <span className="ws-qa-text">
                    <span className="ws-qa-title">{qa.title}</span>
                    <span className="ws-qa-sub">{qa.sub}</span>
                  </span>
                  <span className={`ws-qa-arrow ${i % 2 === 0 ? 'dark' : 'light'}`}><ArrowRight size={15} /></span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Today */}
        <div className="ws-home-section">
          <div className="ws-home-section-head"><h3>Today</h3><Link to="/dashboard/tasks">Open tasks</Link></div>
          {dueToday.length === 0 ? <p className="ws-agenda-empty">Nothing due today. 🎉</p>
            : dueToday.map(t => <AgendaRow key={t.id} task={t} onToggle={toggle} />)}
        </div>

        {/* This week */}
        <div className="ws-home-section">
          <div className="ws-home-section-head"><h3>This week</h3><Link to="/dashboard/calendar">Calendar</Link></div>
          {thisWeek.length === 0 ? <p className="ws-agenda-empty">No deadlines in the next 7 days.</p>
            : thisWeek
                .slice()
                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                .map(t => <WeekRow key={t.id} task={t} />)}
        </div>
      </div>

      {/* ── Right rail: Essays in progress ── */}
      <aside className="ws-home-rail">
        <div className="ws-home-section-head"><h3>Essays in progress</h3><Link to="/dashboard/essays">All</Link></div>
        {essays.length === 0 ? (
          <Link to="/dashboard/essays" className="ws-rail-empty">
            <Plus size={16} /> Start your first essay
          </Link>
        ) : (
          essays.slice(0, 5).map((e) => {
            const cs = overviewCardStyle(e.universities);
            return (
              <Link
                key={e.id}
                to="/dashboard/essays"
                className="ws-essay-card"
                style={{ background: cs.background, borderColor: cs.borderColor, boxShadow: cs.boxShadow }}
              >
                {e.universities ? (
                  <LogoTile item={{ logoUrl: e.universities.logo_url, logoStyle: e.universities.logo_style, fallback: e.universities.fallback, name: e.universities.name }} size={32} radius={8} />
                ) : (
                  <LogoTile item={{ logoUrl: '/logos/common-app.png', logoStyle: { background: '#1273C4', padding: '0px' }, fallback: 'CA', name: 'Common App' }} size={32} radius={8} />
                )}
                <div className="ws-essay-card-body">
                  <div className="ws-essay-card-uni" style={{ color: cs.uniColor }}>
                    {e.universities ? (e.universities.short_name || e.universities.name) : 'Common App'}
                  </div>
                  <div className="ws-essay-card-title">{e.title || 'Untitled'}</div>
                  <div className="ws-essay-card-meta">{new Date(e.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {e.content ? `${e.content.trim().split(/\s+/).filter(Boolean).length} words` : 'Empty'}</div>
                </div>
              </Link>
            );
          })
        )}
      </aside>
    </div>
  );
}

function AgendaRow({ task, onToggle }) {
  const done = task.status === 'done';
  const source = task.category || (task.universities ? task.universities.name : 'Task');
  return (
    <div className={`ws-agenda-row ${done ? 'done' : ''}`}>
      <button className="ws-task-check" onClick={() => onToggle(task)}>
        {done ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>
      <span className="ws-agenda-title">{task.title}</span>
      <span className="ws-agenda-source">{source}</span>
    </div>
  );
}

function WeekRow({ task }) {
  const date = new Date(task.due_date + 'T00:00:00');
  const dow = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const day = date.getDate();
  const source = task.category || (task.universities ? task.universities.name : null);
  return (
    <div className="ws-week-row">
      <div className="ws-week-date">
        <span className="ws-week-dow">{dow}</span>
        <span className="ws-week-day">{day}</span>
      </div>
      <div className="ws-week-body">
        <div className="ws-week-title">{task.title}</div>
        {source && <div className="ws-week-meta">{source}</div>}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

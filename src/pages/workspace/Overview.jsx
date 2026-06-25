import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, AlertTriangle, Clock, Info, CheckCircle2, Circle, Plus, MessageCircle } from 'lucide-react';
import LogoTile from '../../components/LogoTile';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCollegeList, fetchTasks, fetchEssays, fetchProfile, updateTask } from '../../api/workspace.js';
import { computeNudges } from '../../lib/nudges.js';
import { computeReadiness } from '../../lib/readiness.js';
import './workspace.css';

const LEVEL_ICON = { high: AlertTriangle, medium: Clock, info: Info };

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
  const nudges = computeNudges({ tasks, essays, collegeList: colleges });
  const readiness = computeReadiness({ profile: profileRow, collegeList: colleges, essays, tasks });

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

        {/* Status card */}
        <div className={`ws-status tone-${readiness.tone}`}>
          <div className="ws-status-top">
            <div>
              <span className="ws-status-label">Overall</span>
              <h2 className="ws-status-value">{readiness.label}</h2>
            </div>
            <div className="ws-status-pct">{readiness.percent}%</div>
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

        {/* Nudges */}
        {nudges.length > 0 && (
          <div className="ws-nudges">
            <div className="ws-nudges-head"><Bell size={15} /><span>Nudges</span><span className="ws-nudges-count">{nudges.length}</span></div>
            {nudges.slice(0, 3).map(n => {
              const Icon = LEVEL_ICON[n.level] || Info;
              return (
                <Link key={n.id} to={n.to} className={`ws-nudge level-${n.level}`}>
                  <Icon size={17} />
                  <div className="ws-nudge-body">
                    <div className="ws-nudge-title">{n.title}</div>
                    {n.detail && <div className="ws-nudge-detail">{n.detail}</div>}
                  </div>
                  <span className="ws-nudge-action">{n.action} <ArrowRight size={12} /></span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Today */}
        <div className="ws-home-section">
          <div className="ws-home-section-head"><h3>Today</h3><Link to="/dashboard/tasks">Open tasks</Link></div>
          {dueToday.length === 0 ? <p className="ws-agenda-empty">Nothing due today. 🎉</p>
            : dueToday.map(t => <AgendaRow key={t.id} task={t} onToggle={toggle} overdueAware />)}
        </div>

        {/* This week */}
        <div className="ws-home-section">
          <div className="ws-home-section-head"><h3>This week</h3><Link to="/dashboard/calendar">Calendar</Link></div>
          {thisWeek.length === 0 ? <p className="ws-agenda-empty">No deadlines in the next 7 days.</p>
            : thisWeek.map(t => <AgendaRow key={t.id} task={t} onToggle={toggle} />)}
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
          essays.slice(0, 5).map((e, i) => (
            <Link key={e.id} to="/dashboard/essays" className={`ws-essay-card c${i % 4}`}>
              {e.universities ? (
                <LogoTile item={{ logoUrl: e.universities.logo_url, logoStyle: e.universities.logo_style, fallback: e.universities.fallback, name: e.universities.name }} size={30} radius={8} />
              ) : <div className="ws-essay-card-icon"><MessageCircle size={16} /></div>}
              <div className="ws-essay-card-body">
                <div className="ws-essay-card-title">{e.title || 'Untitled'}</div>
                <div className="ws-essay-card-meta">{new Date(e.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {e.content ? `${e.content.trim().split(/\s+/).filter(Boolean).length} words` : 'Empty'}</div>
              </div>
            </Link>
          ))
        )}
      </aside>
    </div>
  );
}

function AgendaRow({ task, onToggle, overdueAware }) {
  const today = new Date(new Date().toDateString());
  const overdue = overdueAware && task.due_date && new Date(task.due_date + 'T00:00:00') < today;
  const source = task.category || (task.universities ? task.universities.name : 'Task');
  return (
    <div className="ws-agenda-row">
      <button className="ws-task-check" onClick={() => onToggle(task)}>
        {task.status === 'done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>
      <span className="ws-agenda-title">{task.title}</span>
      <span className="ws-agenda-source">{source}</span>
      {task.due_date && (
        <span className={`ws-task-due ${overdue ? 'overdue' : ''}`}>
          {overdue ? 'Overdue' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

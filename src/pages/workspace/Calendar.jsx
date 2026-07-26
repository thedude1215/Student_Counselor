import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchTasks } from '../../api/workspace.js';
import NovaMascot from '../../components/NovaMascot.jsx';
import './workspace.css';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PRIO = {
  high:   { dot: '#EF4444', bg: '#FEE2E2', color: '#991B1B', label: 'High',   stripe: '#EF4444' },
  medium: { dot: '#F59E0B', bg: '#FEF3C7', color: '#92400E', label: 'Medium', stripe: '#F59E0B' },
  low:    { dot: '#6366F1', bg: '#EEF2FF', color: '#3730A3', label: 'Low',    stripe: '#6366F1' },
};

function daysUntil(dateStr, todayStr) {
  const diff = Math.round((new Date(dateStr + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86400000);
  if (diff === 0) return { label: 'Today',     color: '#EF4444' };
  if (diff === 1) return { label: 'Tomorrow',  color: '#F59E0B' };
  if (diff < 0)  return { label: `${Math.abs(diff)}d ago`, color: '#9CA3AF' };
  return { label: `${diff}d left`, color: '#6B7280' };
}

export default function Calendar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDs, setSelectedDs] = useState(null);

  const todayStr = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    if (!user) return;
    fetchTasks(user.id).then(setTasks).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const byDay = {};
  tasks.filter(t => t.due_date).forEach(t => { (byDay[t.due_date] ||= []).push(t); });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, ds, dow: (firstDow + d - 1) % 7, items: byDay[ds] || [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const upcoming = Object.entries(byDay)
    .filter(([ds]) => ds >= todayStr)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, items]) => items)
    .filter(t => t.status !== 'done')
    .slice(0, 8);

  const selectedItems = selectedDs ? (byDay[selectedDs] || []) : [];

  function topPrio(items) {
    if (items.find(t => t.priority === 'high')) return 'high';
    if (items.find(t => t.priority === 'medium')) return 'medium';
    return 'low';
  }

  if (loading) return <div className="ws-loading">Loading your calendar…</div>;

  // ── Calendar-at-a-glance stats ──
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonthCount = tasks.filter(t => t.due_date && t.due_date.startsWith(monthPrefix) && t.status !== 'done').length;
  const overdueCount = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr).length;
  const nextDue = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date >= todayStr).map(t => t.due_date).sort()[0];
  const nextDays = nextDue ? Math.round((new Date(nextDue + 'T00:00:00') - new Date(todayStr + 'T00:00:00')) / 86_400_000) : null;
  const calRead =
    thisMonthCount === 0 ? 'No deadlines this month — you\'re clear'
    : overdueCount > 0 ? `${overdueCount} overdue · ${thisMonthCount} due this month`
    : nextDays != null ? `Next deadline ${nextDays === 0 ? 'today' : `in ${nextDays} day${nextDays === 1 ? '' : 's'}`}`
    : `${thisMonthCount} deadline${thisMonthCount === 1 ? '' : 's'} this month`;

  return (
    <div className="ws-section ah-page">
      {/* ── Forest hero stat band ── */}
      <div className="ah-hero">
        <div className="ah-hero-main">
          <span className="ah-hero-eyebrow"><span className="ah-hero-dot" /> Your calendar</span>
          <h1 className="ah-hero-title">Calendar</h1>
          <p className="ah-hero-sub">{calRead}</p>
        </div>
        <div className="ah-hero-right cal-hero-right">
          <div className="ah-hero-mascot cl-hero-mascot"><NovaMascot size={38} idle /></div>
          <div className="cal-countdown">
            <span className="cal-cd-num">{nextDays != null ? (nextDays === 0 ? 'Today' : `${nextDays}d`) : '—'}</span>
            <span className="cal-cd-cap">until your next deadline</span>
            {upcoming[0] && <span className="cal-cd-title">{upcoming[0].title}</span>}
            <div className="cal-cd-chips">
              <span className="cal-cd-chip">{thisMonthCount} this month</span>
              {overdueCount > 0 && <span className="cal-cd-chip over">{overdueCount} overdue</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Month navigation bar ── */}
      <div className="cal-navbar">
        <span className="cal-month-label">
          <span className="cal-month-name">{MONTHS[month]}</span>
          <span className="cal-month-year">{year}</span>
        </span>
        <div className="cal-nav">
          <button
            className="cal-today-btn"
            onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDs(todayStr); }}
          >Today</button>
          <button className="ws-icon-btn" onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDs(null); }}>
            <ChevronLeft size={16} />
          </button>
          <button className="ws-icon-btn" onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDs(null); }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="cal-wrap">
        {/* Day-of-week header */}
        <div className="cal-dow-row">
          {DOW.map((d, i) => (
            <div key={d} className={`cal-dow-cell ${i === 0 || i === 6 ? 'weekend' : ''}`}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="cal-grid">
          {cells.map((c, i) => {
            if (!c) return <div key={i} className="cal-cell cal-empty" />;
            const isToday    = c.ds === todayStr;
            const isSelected = c.ds === selectedDs;
            const isWeekend  = c.dow === 0 || c.dow === 6;
            const isPast     = c.ds < todayStr && !isToday;
            const prio       = c.items.length ? topPrio(c.items) : null;
            return (
              <div
                key={c.ds}
                className={[
                  'cal-cell',
                  isToday    ? 'is-today'    : '',
                  isSelected ? 'is-selected' : '',
                  isWeekend  ? 'is-weekend'  : '',
                  isPast     ? 'is-past'     : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedDs(isSelected ? null : c.ds)}
              >
                <div className="cal-cell-top">
                  <span className="cal-day-num">{c.day}</span>
                  {isToday && <span className="cal-today-mascot"><NovaMascot size={22} idle /></span>}
                  {prio && !isToday && <span className="cal-dot" style={{ background: PRIO[prio].dot }} />}
                </div>
                <div className="cal-events">
                  {c.items.slice(0, 2).map(t => {
                    const p = PRIO[t.priority] || PRIO.low;
                    return (
                      <span
                        key={t.id}
                        className={`cal-pill ${t.status === 'done' ? 'is-done' : ''}`}
                        style={{ background: p.bg, color: p.color }}
                        title={t.title}
                      >{t.title}</span>
                    );
                  })}
                  {c.items.length > 2 && <span className="cal-overflow">+{c.items.length - 2}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Click-to-expand day detail */}
        {selectedDs && selectedItems.length > 0 && (
          <div className="cal-detail">
            <div className="cal-detail-head">
              <CalendarDays size={14} />
              <span>{new Date(selectedDs + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <button className="ws-icon-btn" onClick={() => setSelectedDs(null)}><X size={13} /></button>
            </div>
            {selectedItems.map(t => {
              const p = PRIO[t.priority] || PRIO.low;
              return (
                <div key={t.id} className={`cal-detail-row ${t.status === 'done' ? 'is-done' : ''}`}>
                  <span className="cal-detail-stripe" style={{ background: p.dot }} />
                  <span className="cal-detail-title">{t.title}</span>
                  <span className="cal-prio-pill" style={{ background: p.bg, color: p.color }}>{p.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="cal-upcoming">
        <div className="cal-upcoming-head">
          <CalendarDays size={15} />
          <span>Upcoming</span>
          {upcoming.length > 0 && <span className="cal-upcoming-count">{upcoming.length}</span>}
        </div>
        {upcoming.length === 0 ? (
          <div className="cal-upcoming-empty">No upcoming deadlines — add due dates in Tasks.</div>
        ) : upcoming.map(t => {
          const p  = PRIO[t.priority] || PRIO.low;
          const du = daysUntil(t.due_date, todayStr);
          return (
            <div key={t.id} className="cal-upcoming-row" style={{ '--stripe': p.dot }}>
              <div className="cal-upcoming-stripe" />
              <div className="cal-upcoming-body">
                <span className="cal-upcoming-title">{t.title}</span>
                <span className="cal-upcoming-date">
                  {new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <span className="cal-upcoming-rel" style={{ color: du.color }}>{du.label}</span>
              <span className="cal-prio-pill" style={{ background: p.bg, color: p.color }}>{p.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

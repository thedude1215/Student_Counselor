import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchTasks } from '../../api/workspace.js';
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

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Calendar</h1>
          <p className="ws-subtitle">Every deadline and test date in one view.</p>
        </div>
        <div className="cal-nav">
          <button
            className="cal-today-btn"
            onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDs(todayStr); }}
          >Today</button>
          <button className="ws-icon-btn" onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDs(null); }}>
            <ChevronLeft size={16} />
          </button>
          <span className="cal-month-label">
            <span className="cal-month-name">{MONTHS[month]}</span>
            <span className="cal-month-year">{year}</span>
          </span>
          <button className="ws-icon-btn" onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDs(null); }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

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
                  {prio && <span className="cal-dot" style={{ background: PRIO[prio].dot }} />}
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

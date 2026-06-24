import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchTasks } from '../../api/workspace.js';
import './workspace.css';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIO_CLASS = { high: 'prio-high', medium: 'prio-medium', low: 'prio-low' };

export default function Calendar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    if (!user) return;
    fetchTasks(user.id).then(setTasks).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  const dated = tasks.filter(t => t.due_date);
  const byDay = {};
  dated.forEach(t => { (byDay[t.due_date] ||= []).push(t); });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, ds, items: byDay[ds] || [] });
  }

  const upcoming = dated
    .filter(t => t.due_date >= todayStr && t.status !== 'done')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 8);

  if (loading) return <div className="ws-loading">Loading your calendar…</div>;

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Calendar</h1>
          <p className="ws-subtitle">Every deadline and test date in one view.</p>
        </div>
        <div className="ws-cal-nav">
          <button className="ws-icon-btn" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={18} /></button>
          <span className="ws-cal-month">{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button className="ws-icon-btn" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={18} /></button>
        </div>
      </header>

      <div className="ws-cal-grid">
        {DOW.map(d => <div key={d} className="ws-cal-dow">{d}</div>)}
        {cells.map((c, i) => (
          <div key={i} className={`ws-cal-cell ${!c ? 'empty' : ''} ${c && c.ds === todayStr ? 'today' : ''}`}>
            {c && (
              <>
                <span className="ws-cal-day">{c.day}</span>
                <div className="ws-cal-items">
                  {c.items.slice(0, 3).map(t => (
                    <span key={t.id} className={`ws-cal-pill ${PRIO_CLASS[t.priority] || 'prio-low'} ${t.status === 'done' ? 'done' : ''}`} title={t.title}>
                      {t.title}
                    </span>
                  ))}
                  {c.items.length > 3 && <span className="ws-cal-more">+{c.items.length - 3} more</span>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="ws-cal-upcoming">
        <div className="ws-agenda-head"><CalendarDays size={15} /> Upcoming</div>
        {upcoming.length === 0 ? (
          <p className="ws-agenda-empty">No upcoming dated tasks. Add due dates in Tasks.</p>
        ) : upcoming.map(t => (
          <div key={t.id} className="ws-agenda-row">
            <span className={`ws-prio ${PRIO_CLASS[t.priority] || 'prio-low'}`}>{t.priority}</span>
            <span className="ws-agenda-title">{t.title}</span>
            <span className="ws-task-due">{new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

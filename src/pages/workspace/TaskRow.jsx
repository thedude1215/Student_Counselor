import { useState } from 'react';
import { Circle, CircleDotDashed, CheckCircle2, Trash2 } from 'lucide-react';
import LogoTile from '../../components/LogoTile.jsx';

const STATUSES = [
  { key: 'todo', label: 'To do', Icon: Circle },
  { key: 'in_progress', label: 'In review', Icon: CircleDotDashed },
  { key: 'done', label: 'Done', Icon: CheckCircle2 },
];

const PRIO_LABEL = { high: 'High', medium: 'Med', low: 'Low' };

/* Map category name → CSS modifier */
const CAT_CLASS = {
  'Essays':           'cat-essays',
  'Extracurriculars': 'cat-ec',
  'Testing':          'cat-testing',
  'Documents':        'cat-documents',
  'Recommendations':  'cat-recs',
  'Interviews':       'cat-interviews',
  'Financial Aid':    'cat-finaid',
  'College Search':   'cat-search',
  'Scholarships':     'cat-scholarships',
  'Campus Visits':    'cat-visits',
  'Housing':          'cat-housing',
  'General':          'cat-general',
};

export default function TaskRow({ task, onMove, onDelete, draggable, onDragStart, onDragEnd, isDragging }) {
  const [popOpen, setPopOpen] = useState(false);
  const current = STATUSES.find(s => s.key === task.status) || STATUSES[0];
  const GlyphIcon = current.Icon;

  const overdue = task.due_date && task.status !== 'done' &&
    new Date(task.due_date + 'T00:00:00') < new Date(new Date().toDateString());

  const uni = task.universities;

  function pick(status) {
    setPopOpen(false);
    onMove(task, status);
  }

  return (
    <div
      className={`ws-row ${task.status === 'done' ? 'done' : ''} ${isDragging ? 'dragging' : ''} ${task.priority === 'high' && task.status !== 'done' ? 'prio-high-row' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div style={{ position: 'relative' }}>
        <button
          className={`ws-row-status s-${task.status}`}
          title="Change status"
          onClick={() => setPopOpen(o => !o)}
        >
          <GlyphIcon size={17} />
        </button>
        {popOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 25 }} onClick={() => setPopOpen(false)} />
            <div className="ws-status-pop">
              {STATUSES.map(({ key, label, Icon }) => (
                <button key={key} className={key === task.status ? 'current' : ''} onClick={() => pick(key)}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <span className="ws-row-title" title={task.title}>{task.title}</span>

      <div className="ws-row-meta">
        {uni && (
          <LogoTile
            item={{ name: uni.name, short_name: uni.short_name, logoUrl: uni.logo_url, logoStyle: uni.logo_style, fallback: uni.fallback }}
            size={22}
            radius={5}
          />
        )}
        {task.category && (
          <span className={`ws-row-cat ${CAT_CLASS[task.category] || 'cat-general'}`}>{task.category}</span>
        )}
        <span className="ws-row-prio" title={`${PRIO_LABEL[task.priority] || task.priority} priority`}>
          <span className={`ws-prio-dot prio-${task.priority}`} />
          {task.priority === 'high' && <span className="ws-prio-label">High</span>}
        </span>
        {task.due_date && (
          <span className={`ws-row-due ${overdue ? 'overdue' : ''}`}>
            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      <div className="ws-row-actions">
        <button className="ws-icon-sm danger" title="Delete" onClick={() => onDelete(task.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

import { CalendarDays, X } from 'lucide-react';
import LogoTile from '../../components/LogoTile.jsx';

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

function friendlyDue(dateStr) {
  if (!dateStr) return { label: 'No due date', cls: 'muted' };
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date(new Date().toDateString());
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0)  return { label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, cls: 'overdue' };
  if (diff === 0) return { label: 'Due today', cls: 'today' };
  if (diff === 1) return { label: 'Due tomorrow', cls: '' };
  return { label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, cls: '' };
}

export default function TaskCard({ task, onDelete, draggable, onDragStart, onDragEnd, isDragging }) {
  const uni = task.universities;
  const { label: dueLabel, cls: dueCls } = friendlyDue(task.due_date);
  const isDone = task.status === 'done';

  return (
    <div
      className={`ws-card2 ${isDone ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Hover delete — absolute top-right */}
      <button className="ws-card2-del ws-icon-sm danger" title="Delete" onClick={() => onDelete(task.id)}>
        <X size={14} />
      </button>

      {/* Top: title + category chip */}
      <div className="ws-card2-top">
        <span className="ws-card2-title">{task.title}</span>
        {task.category && (
          <span className={`ws-row-cat ${CAT_CLASS[task.category] || 'cat-general'} ws-card2-chip`}>
            {task.category}
          </span>
        )}
      </div>

      {/* Bottom: due date + logo */}
      <div className="ws-card2-bottom">
        <span className={`ws-card2-due ${dueCls}`}>
          <CalendarDays size={13} />
          {dueLabel}
        </span>
        {uni && (
          <LogoTile
            item={{ name: uni.name, short_name: uni.short_name, logoUrl: uni.logo_url, logoStyle: uni.logo_style, fallback: uni.fallback }}
            size={24}
            radius={6}
          />
        )}
      </div>
    </div>
  );
}

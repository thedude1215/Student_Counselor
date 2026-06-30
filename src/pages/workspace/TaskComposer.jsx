import { useState } from 'react';
import { CalendarDays, Tag, AlertCircle, X, Plus } from 'lucide-react';

const CATEGORIES = [
  'General', 'Essays', 'Extracurriculars', 'Testing', 'Documents',
  'Recommendations', 'Interviews', 'College Search', 'Financial Aid',
  'Scholarships', 'Campus Visits', 'Housing',
];
const PRIORITIES = ['low', 'medium', 'high'];

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

/*
 * Card-shaped inline task composer — appears as the first card in the To do column.
 * Has its own local state; calls onAdd({ title, due_date, category, priority }) on submit.
 */
export default function TaskComposer({ onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('medium');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), due_date: dueDate || null, category, priority });
    setTitle(''); setDueDate(''); setCategory('General'); setPriority('medium');
  }

  function handleKey(e) {
    if (e.key === 'Escape') onCancel();
  }

  const prioCls = { low: '', medium: 'cat-general', high: 'cat-essays' };

  return (
    <form className="ws-composer-card" onSubmit={handleSubmit} onKeyDown={handleKey}>
      <input
        className="ws-composer-title"
        placeholder="What do you need to do?"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
      />

      <div className="ws-composer-divider" />

      <div className="ws-composer-controls">
        {/* Date */}
        <label className="ws-composer-field">
          <CalendarDays size={13} className="ws-composer-field-icon" />
          <input
            type="date"
            className="ws-composer-date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </label>

        {/* Category */}
        <label className="ws-composer-field">
          <Tag size={13} className="ws-composer-field-icon" />
          <select
            className={`ws-composer-select ws-row-cat ${CAT_CLASS[category] || 'cat-general'}`}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        {/* Priority */}
        <label className="ws-composer-field">
          <AlertCircle size={13} className="ws-composer-field-icon" />
          <select
            className="ws-composer-select ws-composer-prio"
            data-prio={priority}
            value={priority}
            onChange={e => setPriority(e.target.value)}
          >
            {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
          </select>
        </label>

        <div className="ws-composer-actions">
          <button type="button" className="ws-composer-cancel" onClick={onCancel}>
            <X size={14} /> Cancel
          </button>
          <button type="submit" className="ws-btn ws-btn-primary ws-composer-submit" disabled={!title.trim()}>
            <Plus size={15} /> Add
          </button>
        </div>
      </div>
    </form>
  );
}

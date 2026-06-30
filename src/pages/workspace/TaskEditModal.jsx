import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarDays } from 'lucide-react';

const CATEGORIES = [
  'General', 'Essays', 'Extracurriculars', 'Testing', 'Documents',
  'Recommendations', 'Interviews', 'College Search', 'Financial Aid',
  'Scholarships', 'Campus Visits', 'Housing',
];

export default function TaskEditModal({ task, onSave, onClose }) {
  const [title, setTitle]       = useState(task.title || '');
  const [dueDate, setDueDate]   = useState(task.due_date || '');
  const [category, setCategory] = useState(task.category || 'General');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [saving, setSaving]     = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(task.id, {
      title: title.trim(),
      due_date: dueDate || null,
      category: category === 'General' ? null : category,
      priority,
    });
    setSaving(false);
  }

  return createPortal(
    <div className="tedit-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tedit-modal">
        <div className="tedit-header">
          <span className="tedit-title">Edit task</span>
          <button className="ws-icon-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="tedit-body">
          <label className="tedit-label">Title</label>
          <input
            className="tedit-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />

          <label className="tedit-label">Due date</label>
          <div className="tedit-date-wrap">
            <CalendarDays size={14} className="tedit-date-icon" />
            <input
              className="tedit-input tedit-date"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            {dueDate && (
              <button className="tedit-date-clear ws-icon-sm" onClick={() => setDueDate('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="tedit-row-2">
            <div className="tedit-field">
              <label className="tedit-label">Category</label>
              <select className="tedit-select" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="tedit-field">
              <label className="tedit-label">Priority</label>
              <select className="tedit-select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        <div className="tedit-footer">
          <button className="ws-btn" onClick={onClose}>Cancel</button>
          <button className="ws-btn ws-btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

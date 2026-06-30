import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ListChecks } from 'lucide-react';
import { calcPriority } from '../../lib/taskPriority.js';

const CATEGORIES = ['General', 'Essays', 'Extracurriculars', 'Testing', 'Documents', 'Financial Aid', 'Interviews', 'Other'];

export default function NewTaskModal({ colleges = [], onConfirm, onClose }) {
  const [title,        setTitle]        = useState('');
  const [dueDate,      setDueDate]      = useState('');
  const [category,     setCategory]     = useState('General');
  const [universityId, setUniversityId] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm({
      title:         title.trim(),
      due_date:      dueDate || null,
      category:      category === 'General' ? null : category,
      priority:      calcPriority(title, dueDate || null),
      university_id: universityId || null,
    });
    onClose();
  }

  return createPortal(
    <div className="ws-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-modal">
        <div className="ws-modal-header">
          <div className="ws-modal-icon"><ListChecks size={18} /></div>
          <div>
            <h2 className="ws-modal-title">New task</h2>
            <p className="ws-modal-sub">Add a deadline, supplement, or to-do</p>
          </div>
          <button className="ws-icon-btn ws-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form className="ws-modal-body" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="ws-modal-field">
            <label className="ws-modal-label">Task title</label>
            <input
              className="ws-modal-input"
              placeholder="e.g. Submit Yale supplement"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* University */}
          <div className="ws-modal-field">
            <label className="ws-modal-label">For which school? <span className="ws-modal-optional">optional</span></label>
            <select
              className="ws-modal-select"
              value={universityId}
              onChange={e => setUniversityId(e.target.value)}
            >
              <option value="">None / General</option>
              {colleges.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Due date + Category side by side */}
          <div className="ws-modal-row">
            <div className="ws-modal-field">
              <label className="ws-modal-label">Due date <span className="ws-modal-optional">optional</span></label>
              <input
                className="ws-modal-input"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
            <div className="ws-modal-field">
              <label className="ws-modal-label">Category</label>
              <select
                className="ws-modal-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="ws-modal-footer">
            <button type="button" className="ws-btn ws-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="ws-btn ws-btn-primary" disabled={!title.trim()}>
              Add task
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

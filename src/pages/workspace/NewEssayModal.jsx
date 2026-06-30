import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, PenLine } from 'lucide-react';

const WORD_LIMITS = [650, 500, 350, 250, 150];
const GENERAL_ID = '';

export default function NewEssayModal({ colleges, onConfirm, onClose }) {
  const [title, setTitle] = useState('');
  const [universityId, setUniversityId] = useState(GENERAL_ID);
  const [prompt, setPrompt] = useState('');
  const [wordLimit, setWordLimit] = useState(650);
  const [customLimit, setCustomLimit] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const resolvedLimit = useCustom ? (parseInt(customLimit) || 650) : wordLimit;

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm({
      title: title.trim(),
      university_id: universityId || null,
      prompt: prompt.trim(),
      word_limit: resolvedLimit,
      content: '',
    });
  }

  return createPortal(
    <div className="ws-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-modal">
        <div className="ws-modal-header">
          <div className="ws-modal-icon"><PenLine size={18} /></div>
          <div>
            <h2 className="ws-modal-title">New essay</h2>
            <p className="ws-modal-sub">Set up your draft before you start writing</p>
          </div>
          <button className="ws-icon-btn ws-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form className="ws-modal-body" onSubmit={handleSubmit}>
          {/* Essay title */}
          <div className="ws-modal-field">
            <label className="ws-modal-label">Essay title</label>
            <input
              className="ws-modal-input"
              placeholder="e.g. Why Computer Science?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* University */}
          <div className="ws-modal-field">
            <label className="ws-modal-label">For which school?</label>
            <select
              className="ws-modal-select"
              value={universityId}
              onChange={e => setUniversityId(e.target.value)}
            >
              <option value="">Common App / General</option>
              {colleges.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Prompt */}
          <div className="ws-modal-field">
            <label className="ws-modal-label">Prompt <span className="ws-modal-optional">optional</span></label>
            <input
              className="ws-modal-input"
              placeholder="Paste the essay prompt here…"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>

          {/* Word limit */}
          <div className="ws-modal-field">
            <label className="ws-modal-label">Word limit</label>
            <div className="ws-modal-word-limits">
              {WORD_LIMITS.map(w => (
                <button
                  key={w}
                  type="button"
                  className={`ws-modal-wl-btn ${!useCustom && wordLimit === w ? 'active' : ''}`}
                  onClick={() => { setWordLimit(w); setUseCustom(false); }}
                >
                  {w}
                </button>
              ))}
              <button
                type="button"
                className={`ws-modal-wl-btn ${useCustom ? 'active' : ''}`}
                onClick={() => setUseCustom(true)}
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <input
                className="ws-modal-input"
                style={{ marginTop: '0.5rem' }}
                type="number"
                min="50"
                max="5000"
                placeholder="Enter word limit (e.g. 400)"
                value={customLimit}
                onChange={e => setCustomLimit(e.target.value)}
              />
            )}
          </div>

          <div className="ws-modal-footer">
            <button type="button" className="ws-btn ws-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="ws-btn ws-btn-primary" disabled={!title.trim()}>
              Create essay
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

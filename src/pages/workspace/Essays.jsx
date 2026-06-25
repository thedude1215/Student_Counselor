import { useState, useEffect } from 'react';
import { Plus, Trash2, PenLine, Save, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchEssays, addEssay, updateEssay, deleteEssay } from '../../api/workspace.js';
import { reviewEssay } from '../../api/nova.js';
import './workspace.css';

export default function Essays() {
  const { user } = useAuth();
  const [essays, setEssays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ title: '', prompt: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchEssays(user.id).then(list => {
      setEssays(list);
      if (list.length) selectEssay(list[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  function selectEssay(essay) {
    setSelectedId(essay.id);
    setDraft({ title: essay.title, prompt: essay.prompt || '', content: essay.content || '' });
    setSavedAt(null);
    setFeedback(essay.ai_feedback || null);
    setShowFeedback(false);
  }

  async function getAiFeedback() {
    if (!selectedId || wordCount < 20) return;
    setReviewing(true);
    try {
      const { feedback: text } = await reviewEssay({
        essayId: selectedId,
        essayContent: draft.content,
        essayPrompt: draft.prompt,
        essayTitle: draft.title,
      });
      setFeedback(text);
      setShowFeedback(true);
    } catch (err) {
      setFeedback(`Failed to get feedback: ${err.message}`);
      setShowFeedback(true);
    } finally {
      setReviewing(false);
    }
  }

  async function createEssay() {
    const essay = await addEssay(user.id, { title: 'Untitled essay', prompt: '', content: '' });
    setEssays([essay, ...essays]);
    selectEssay(essay);
  }

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    const updated = await updateEssay(selectedId, draft);
    setEssays(essays.map(e => (e.id === selectedId ? updated : e)));
    setSaving(false);
    setSavedAt(new Date());
  }

  async function remove(id) {
    await deleteEssay(id);
    const rest = essays.filter(e => e.id !== id);
    setEssays(rest);
    if (selectedId === id) {
      if (rest.length) selectEssay(rest[0]);
      else { setSelectedId(null); setDraft({ title: '', prompt: '', content: '' }); }
    }
  }

  const wordCount = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;

  if (loading) return <div className="ws-loading">Loading your essays…</div>;

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Essays</h1>
          <p className="ws-subtitle">{essays.length} draft{essays.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="ws-btn ws-btn-primary" onClick={createEssay}><Plus size={16} /> New essay</button>
      </header>

      {essays.length === 0 ? (
        <div className="ws-empty">
          <PenLine size={40} />
          <h3>No essays yet</h3>
          <p>Start a draft and refine it over time.</p>
          <button className="ws-btn ws-btn-primary" onClick={createEssay}>Start writing</button>
        </div>
      ) : (
        <div className="ws-essay-layout">
          <div className="ws-essay-list">
            {essays.map(e => (
              <button
                key={e.id}
                className={`ws-essay-item ${selectedId === e.id ? 'active' : ''}`}
                onClick={() => selectEssay(e)}
              >
                <span className="ws-essay-item-title">{e.title || 'Untitled'}</span>
                <span className="ws-essay-item-meta">
                  {e.content ? `${e.content.trim().split(/\s+/).filter(Boolean).length} words` : 'Empty'}
                </span>
              </button>
            ))}
          </div>

          {selectedId && (
            <div className="ws-essay-editor">
              <input
                className="ws-essay-title-input"
                placeholder="Essay title"
                value={draft.title}
                onChange={e => setDraft({ ...draft, title: e.target.value })}
              />
              <input
                className="ws-essay-prompt-input"
                placeholder="Prompt (e.g. Why this university? — 250 words)"
                value={draft.prompt}
                onChange={e => setDraft({ ...draft, prompt: e.target.value })}
              />
              <textarea
                className="ws-essay-textarea"
                placeholder="Start writing your essay here…"
                value={draft.content}
                onChange={e => setDraft({ ...draft, content: e.target.value })}
              />
              <div className="ws-essay-footer">
                <span className="ws-essay-words">{wordCount} words</span>
                <div className="ws-essay-actions">
                  {savedAt && <span className="ws-essay-saved">Saved</span>}
                  <button
                    className="ws-btn ws-btn-ai"
                    onClick={getAiFeedback}
                    disabled={reviewing || wordCount < 20}
                    title={wordCount < 20 ? 'Write at least 20 words first' : 'Get AI feedback'}
                  >
                    <Sparkles size={15} /> {reviewing ? 'Reviewing…' : 'AI Feedback'}
                  </button>
                  <button className="ws-icon-btn danger" onClick={() => remove(selectedId)} title="Delete essay">
                    <Trash2 size={16} />
                  </button>
                  <button className="ws-btn ws-btn-primary" onClick={save} disabled={saving}>
                    <Save size={15} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {showFeedback && feedback && (
                <div className="ws-feedback-panel">
                  <div className="ws-feedback-header">
                    <span><Sparkles size={14} /> Nova's Feedback</span>
                    <button className="ws-icon-btn" onClick={() => setShowFeedback(false)}><X size={14} /></button>
                  </div>
                  <div className="ws-feedback-body">{feedback}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

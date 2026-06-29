import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, PenLine, Sparkles, X, CheckCircle2 } from 'lucide-react';
import LogoTile from '../../components/LogoTile';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchEssays, addEssay, updateEssay, deleteEssay, fetchCollegeList } from '../../api/workspace.js';
import { reviewEssay } from '../../api/nova.js';
import './workspace.css';

const WORD_LIMIT = 650;
const GENERAL = { id: '', name: 'Common App / General' };

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default function Essays() {
  const { user } = useAuth();
  const [essays, setEssays] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ title: '', prompt: '', content: '', university_id: '' });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchEssays(user.id), fetchCollegeList(user.id)]).then(([list, cl]) => {
      setEssays(list);
      setColleges(cl.map(i => i.universities).filter(Boolean));
      if (list.length) selectEssay(list[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  function selectEssay(essay) {
    setSelectedId(essay.id);
    setDraft({ title: essay.title, prompt: essay.prompt || '', content: essay.content || '', university_id: essay.university_id || '' });
    setSavedAt(null);
    setFeedback(essay.ai_feedback || null);
    setShowFeedback(false);
  }

  async function getAiFeedback() {
    if (!selectedId || wc < 20) return;
    setReviewing(true);
    try {
      const { feedback: text } = await reviewEssay({ essayId: selectedId, essayContent: draft.content, essayPrompt: draft.prompt, essayTitle: draft.title });
      setFeedback(text); setShowFeedback(true);
    } catch (err) {
      setFeedback(`Failed to get feedback: ${err.message}`); setShowFeedback(true);
    } finally { setReviewing(false); }
  }

  async function createEssay() {
    const essay = await addEssay(user.id, { title: 'Untitled essay', prompt: '', content: '' });
    setEssays([essay, ...essays]);
    selectEssay(essay);
  }

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    const updated = await updateEssay(selectedId, { ...draft, university_id: draft.university_id || null });
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

  const wc = wordCount(draft.content);
  const pct = Math.min(100, Math.round((wc / WORD_LIMIT) * 100));
  const overLimit = wc > WORD_LIMIT;
  const selectedEssay = essays.find(e => e.id === selectedId);

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

          {/* ── Left: essay list ── */}
          <div className="ws-essay-list">
            {essays.map(e => {
              const wc2 = wordCount(e.content || '');
              const pct2 = Math.min(100, Math.round((wc2 / WORD_LIMIT) * 100));
              const uni = e.universities;
              return (
                <button
                  key={e.id}
                  className={`ws-essay-item ${selectedId === e.id ? 'active' : ''}`}
                  onClick={() => selectEssay(e)}
                >
                  <div className="ws-essay-item-logo">
                    {uni ? (
                      <LogoTile item={{ logoUrl: uni.logo_url, logoStyle: uni.logo_style, fallback: uni.fallback, name: uni.name }} size={32} radius={8} />
                    ) : (
                      <LogoTile item={{ logoUrl: '/logos/common-app.png', logoStyle: { background: '#1273C4', padding: '0px' }, fallback: 'CA', name: 'Common App' }} size={32} radius={8} />
                    )}
                  </div>
                  <div className="ws-essay-item-body">
                    <div className="ws-essay-item-title">{e.title || 'Untitled'}</div>
                    <div className="ws-essay-item-meta">
                      {uni ? (uni.short_name || uni.name) : 'Common App'} · {wc2} words
                    </div>
                    <div className="ws-essay-item-bar">
                      <div className="ws-essay-item-bar-fill" style={{ width: `${pct2}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Right: editor ── */}
          {selectedId && (
            <div className="ws-essay-editor">
              {/* Editor header: school + prompt */}
              <div className="ws-essay-editor-top">
                <div className="ws-essay-meta-row">
                  <select
                    className="ws-essay-uni-select"
                    value={draft.university_id}
                    onChange={e => setDraft({ ...draft, university_id: e.target.value })}
                  >
                    <option value={GENERAL.id}>{GENERAL.name}</option>
                    {colleges.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <input
                  className="ws-essay-title-input"
                  placeholder="Essay title"
                  value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                />
                <input
                  className="ws-essay-prompt-input"
                  placeholder="Paste your prompt here (e.g. Describe a challenge you've overcome…)"
                  value={draft.prompt}
                  onChange={e => setDraft({ ...draft, prompt: e.target.value })}
                />
              </div>

              {/* Writing area */}
              <textarea
                className="ws-essay-textarea"
                placeholder="Start writing… your story matters."
                value={draft.content}
                onChange={e => setDraft({ ...draft, content: e.target.value })}
              />

              {/* Word count progress */}
              <div className="ws-essay-progress">
                <div className="ws-essay-progress-bar">
                  <div
                    className={`ws-essay-progress-fill ${overLimit ? 'over' : pct >= 80 ? 'near' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`ws-essay-words ${overLimit ? 'over' : ''}`}>
                  {wc} / {WORD_LIMIT} words {overLimit ? '— over limit' : pct >= 80 ? '— almost there' : ''}
                </span>
              </div>

              {/* Footer actions */}
              <div className="ws-essay-footer">
                <div className="ws-essay-saved-state">
                  {savedAt && (
                    <span className="ws-essay-saved"><CheckCircle2 size={13} /> Saved</span>
                  )}
                </div>
                <div className="ws-essay-actions">
                  <button
                    className="ws-btn ws-btn-ai"
                    onClick={getAiFeedback}
                    disabled={reviewing || wc < 20}
                    title={wc < 20 ? 'Write at least 20 words first' : 'Get Nova feedback'}
                  >
                    <Sparkles size={15} /> {reviewing ? 'Reviewing…' : 'AI Feedback'}
                  </button>
                  <button className="ws-icon-btn danger" onClick={() => remove(selectedId)} title="Delete essay">
                    <Trash2 size={16} />
                  </button>
                  <button className="ws-btn ws-btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Nova feedback panel */}
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

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, PenLine, Sparkles, CheckCircle2 } from 'lucide-react';
import LogoTile from '../../components/LogoTile';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchEssays, addEssay, updateEssay, deleteEssay, fetchCollegeList } from '../../api/workspace.js';
import { reviewEssay } from '../../api/nova.js';
import NewEssayModal from './NewEssayModal.jsx';
import EssayReview from './EssayReview.jsx';
import { essayCardStyle } from '../../lib/brandColors.js';
import './workspace.css';

/* ai_feedback may be new structured JSON, legacy {feedback:"markdown"}, or a plain string. */
function parseReview(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return null;
  const str = raw.trim();
  if (!str) return null;
  try {
    const obj = JSON.parse(str);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      // New format: has overall or suggestions
      if ('suggestions' in obj || 'overall' in obj) return obj;
      // Legacy format: {feedback: "markdown text"}
      if ('feedback' in obj) {
        const text = (obj.feedback || '').trim();
        return text ? { overall: text, score: 0, strengths: [], suggestions: [] } : null;
      }
    }
  } catch { /* not JSON — treat as plain text */ }
  return { overall: str, score: 0, strengths: [], suggestions: [] };
}

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
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'pending' | 'saving' | 'saved'
  const autoSaveTimer = useRef(null);
  const textareaRef   = useRef(null);
  const [feedback, setFeedback] = useState(null);
  const [reviewedContent, setReviewedContent] = useState(''); // content snapshot at review time
  const [reviewing, setReviewing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // essay id pending deletion

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
    const content = essay.content || '';
    setDraft({ title: essay.title, prompt: essay.prompt || '', content, university_id: essay.university_id || '' });
    setReviewedContent(content); // seed so saved reviews also show essay text
    setSaveState('idle');
    setFeedback(parseReview(essay.ai_feedback));
    setShowFeedback(false);
  }

  // Show saved review instantly if one exists; otherwise run the API
  function openFeedback() {
    if (feedback) { setShowFeedback(true); return; }
    runReview();
  }

  async function runReview() {
    if (!selectedId || wc < 20) return;
    const contentSnap = draft.content;
    setReviewing(true);
    try {
      const uni = colleges.find(u => u.id === draft.university_id);
      const result = await reviewEssay({
        essayId: selectedId,
        essayContent: contentSnap,
        essayPrompt: draft.prompt,
        essayTitle: draft.title,
        universityName: uni?.name || null,
      });
      const parsed = result.review
        ? result.review
        : parseReview(typeof result.feedback === 'string' ? result.feedback : null);
      setReviewedContent(contentSnap);
      setFeedback(parsed || { overall: 'Feedback received but could not be parsed.', score: 0, strengths: [], suggestions: [] });
      setShowFeedback(true);
    } catch (err) {
      setReviewedContent(contentSnap);
      setFeedback({ overall: `Failed to get feedback: ${err.message}`, score: 0, strengths: [], suggestions: [] });
      setShowFeedback(true);
    } finally { setReviewing(false); }
  }

  async function createEssay({ title, university_id, prompt, word_limit, content }) {
    try {
      const essay = await addEssay(user.id, { title, university_id: university_id || null, prompt, word_limit, content });
      setEssays([essay, ...essays]);
      selectEssay(essay);
      setShowNewModal(false);
    } catch (err) {
      console.error('Failed to create essay:', err);
      alert('Could not create essay: ' + (err.message || 'Unknown error'));
    }
  }

  // Auto-resize textarea so the page scrolls, not the textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [draft.content]);

  // Auto-save: debounce 1.2s after any draft change
  useEffect(() => {
    if (!selectedId) return;
    setSaveState('pending');
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        const updated = await updateEssay(selectedId, { ...draft, university_id: draft.university_id || null });
        setEssays(prev => prev.map(e => (e.id === selectedId ? updated : e)));
        setSaveState('saved');
      } catch {
        setSaveState('idle');
      }
    }, 1200);
    return () => clearTimeout(autoSaveTimer.current);
  }, [draft, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id) {
    await deleteEssay(id);
    const rest = essays.filter(e => e.id !== id);
    setEssays(rest);
    if (selectedId === id) {
      if (rest.length) selectEssay(rest[0]);
      else { setSelectedId(null); setDraft({ title: '', prompt: '', content: '' }); }
    }
  }

  const activeEssay = essays.find(e => e.id === selectedId);
  const essayLimit = activeEssay?.word_limit || WORD_LIMIT;
  const wc = wordCount(draft.content);
  const pct = Math.min(100, Math.round((wc / essayLimit) * 100));
  const overLimit = wc > essayLimit;

  if (loading) return <div className="ws-loading">Loading your essays…</div>;

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Essays</h1>
          <p className="ws-subtitle">{essays.length} draft{essays.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="ws-btn ws-btn-primary" onClick={() => setShowNewModal(true)}><Plus size={16} /> New essay</button>
      </header>

      {essays.length === 0 ? (
        <div className="ws-empty">
          <PenLine size={40} />
          <h3>No essays yet</h3>
          <p>Start a draft and refine it over time.</p>
          <button className="ws-btn ws-btn-primary" onClick={() => setShowNewModal(true)}>Start writing</button>
        </div>
      ) : (
        <div className="ws-essay-layout">

          {/* ── Left: essay list ── */}
          <div className="ws-essay-list">
            {essays.map(e => {
              const wc2 = wordCount(e.content || '');
              const pct2 = Math.min(100, Math.round((wc2 / WORD_LIMIT) * 100));
              const uni = e.universities;
              const isActive = selectedId === e.id;
              const cs = essayCardStyle(uni, isActive);
              return (
                <div
                  key={e.id}
                  className={`ws-essay-item ${isActive ? 'active' : ''}`}
                  style={{ background: cs.background, borderColor: cs.borderColor, boxShadow: cs.boxShadow }}
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
                      <div className="ws-essay-item-bar-fill" style={{ width: `${pct2}%`, background: cs._color }} />
                    </div>
                  </div>
                  {confirmDelete === e.id ? (
                    <div className="ws-essay-item-confirm" onClick={ev => ev.stopPropagation()}>
                      <button className="ws-confirm-yes" onClick={ev => { ev.stopPropagation(); setConfirmDelete(null); remove(e.id); }}>Delete</button>
                      <button className="ws-confirm-no"  onClick={ev => { ev.stopPropagation(); setConfirmDelete(null); }}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="ws-essay-item-delete"
                      onClick={ev => { ev.stopPropagation(); setConfirmDelete(e.id); }}
                      title="Delete essay"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
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
                ref={textareaRef}
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
                  {wc} / {essayLimit} words {overLimit ? '— over limit' : pct >= 80 ? '— almost there' : ''}
                </span>
              </div>

              {/* Footer actions */}
              <div className="ws-essay-footer">
                <div className="ws-essay-saved-state">
                  {saveState === 'saving' && (
                    <span className="ws-essay-saving">Saving…</span>
                  )}
                  {saveState === 'saved' && (
                    <span className="ws-essay-saved"><CheckCircle2 size={13} /> Saved</span>
                  )}
                </div>
                <div className="ws-essay-actions">
                  <button
                    className="ws-btn ws-btn-ai"
                    onClick={openFeedback}
                    disabled={reviewing || wc < 20}
                    title={wc < 20 ? 'Write at least 20 words first' : feedback ? 'View saved review' : 'Get Nova feedback'}
                  >
                    <Sparkles size={15} /> {reviewing ? 'Reviewing…' : feedback ? 'View Review' : 'AI Feedback'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Nova essay review — highlighted essay + suggestions */}
      {showFeedback && feedback && (
        <EssayReview
          review={feedback}
          content={reviewedContent}
          title={draft.title}
          university={colleges.find(u => u.id === draft.university_id)?.name || (draft.university_id ? '' : 'Common App')}
          prompt={draft.prompt || ''}
          reviewing={reviewing}
          onClose={() => setShowFeedback(false)}
          onReanalyze={() => { setShowFeedback(false); runReview(); }}
        />
      )}

      {showNewModal && (
        <NewEssayModal
          colleges={colleges}
          onConfirm={createEssay}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}

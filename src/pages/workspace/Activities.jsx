import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Trash2, Award, Users, Star, GripVertical,
  ChevronDown, Pencil, X, Upload, Loader2,
  BookOpen, Palette, Trophy, Heart, Code2, FlaskConical,
  Music, MessageSquare, Newspaper, Flag, Briefcase,
  Compass, Leaf, Globe, Mic, Calculator, Dumbbell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchActivities, addActivity, updateActivity, deleteActivity,
  fetchHonors, addHonor, updateHonor, deleteHonor,
  parsePdf,
} from '../../api/workspace.js';
import { reviewActivity } from '../../api/nova.js';
import { gradeTitle, gradeDescription, gradesFromReview, gradeColor, gradeBg, bestGrade, isLeadershipRole } from '../../lib/activityGrades.js';
import NovaMascot from '../../components/NovaMascot.jsx';
import Confetti from './Confetti.jsx';
import './workspace.css';

const ACTIVITY_TYPES = [
  'Academic',
  'Arts',
  'Athletics: Club',
  'Athletics: JV/Varsity',
  'Career Oriented',
  'Community Service',
  'Computer / Technology',
  'Cultural',
  'Dance',
  'Debate / Speech',
  'Environmental',
  'Family Responsibilities',
  'Journalism / Publication',
  'Music: Instrumental',
  'Music: Vocal',
  'Religious',
  'Research',
  'Robotics',
  'Science / Math',
  'Student Government',
  'Theater / Drama',
  'Work (Paid)',
  'Other',
];

const HONOR_LEVELS = ['International', 'National', 'State / Regional', 'School', 'Other'];

const TYPE_ICON_MAP = {
  'Academic':               { Icon: BookOpen,    color: '#6366f1', bg: '#EEF2FF' },
  'Arts':                   { Icon: Palette,     color: '#ec4899', bg: '#FDF2F8' },
  'Athletics: Club':        { Icon: Dumbbell,    color: '#10b981', bg: '#ECFDF5' },
  'Athletics: JV/Varsity':  { Icon: Trophy,      color: '#10b981', bg: '#ECFDF5' },
  'Career Oriented':        { Icon: Briefcase,   color: '#f59e0b', bg: '#FFFBEB' },
  'Community Service':      { Icon: Heart,       color: '#ef4444', bg: '#FEF2F2' },
  'Computer / Technology':  { Icon: Code2,       color: '#0ea5e9', bg: '#F0F9FF' },
  'Cultural':               { Icon: Globe,       color: '#8b5cf6', bg: '#F5F3FF' },
  'Dance':                  { Icon: Music,       color: '#ec4899', bg: '#FDF2F8' },
  'Debate / Speech':        { Icon: MessageSquare, color: '#0ea5e9', bg: '#F0F9FF' },
  'Environmental':          { Icon: Leaf,        color: '#10b981', bg: '#ECFDF5' },
  'Family Responsibilities':{ Icon: Heart,       color: '#ef4444', bg: '#FEF2F2' },
  'Journalism / Publication':{ Icon: Newspaper,  color: '#6366f1', bg: '#EEF2FF' },
  'Music: Instrumental':    { Icon: Music,       color: '#f59e0b', bg: '#FFFBEB' },
  'Music: Vocal':           { Icon: Mic,         color: '#f59e0b', bg: '#FFFBEB' },
  'Religious':              { Icon: Star,        color: '#8b5cf6', bg: '#F5F3FF' },
  'Research':               { Icon: FlaskConical,color: '#0ea5e9', bg: '#F0F9FF' },
  'Robotics':               { Icon: Code2,       color: '#6366f1', bg: '#EEF2FF' },
  'Science / Math':         { Icon: Calculator,  color: '#6366f1', bg: '#EEF2FF' },
  'Student Government':     { Icon: Flag,        color: '#ef4444', bg: '#FEF2F2' },
  'Theater / Drama':        { Icon: Users,       color: '#ec4899', bg: '#FDF2F8' },
  'Work (Paid)':            { Icon: Briefcase,   color: '#f59e0b', bg: '#FFFBEB' },
  'Other':                  { Icon: Compass,    color: '#8b5cf6', bg: '#F5F3FF' },
};

const DEFAULT_ICON = { Icon: Compass, color: '#8b5cf6', bg: '#F5F3FF' };

function getTypeIcon(type) {
  return TYPE_ICON_MAP[type] || DEFAULT_ICON;
}

function getLevelStyle(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('intern') || l.includes('world'))
    return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
  if (l.includes('nation'))
    return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
  if (l.includes('state') || l.includes('region'))
    return { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' };
  return { bg: '#F9FAFB', color: '#4B5563', border: '#E5E7EB' };
}

const DESC_LIMIT = 150;

/* ── Activity Modal ── */
function ActivityModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const blank = { activity_type: '', title: '', role: '', organization: '', description: '', hours_per_week: '', weeks_per_year: '' };
  const [form, setForm] = useState(initial ? {
    activity_type: initial.activity_type || '',
    title: initial.title || '',
    role: initial.role || '',
    organization: initial.organization || '',
    description: initial.description || '',
    hours_per_week: initial.hours_per_week ?? '',
    weeks_per_year: initial.weeks_per_year ?? '',
  } : blank);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const descLen = (form.description || '').length;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      hours_per_week: form.hours_per_week !== '' ? Number(form.hours_per_week) : null,
      weeks_per_year: form.weeks_per_year !== '' ? Number(form.weeks_per_year) : null,
    });
  }

  return createPortal(
    <div className="ws-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-modal ws-modal-wide">
        <div className="ws-modal-header">
          <div className="ws-modal-icon"><Users size={18} /></div>
          <div>
            <h2 className="ws-modal-title">{isEdit ? 'Edit activity' : 'Add activity'}</h2>
            <p className="ws-modal-sub">Common App tracks up to 10 activities</p>
          </div>
          <button className="ws-icon-btn ws-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="ws-modal-body" onSubmit={handleSubmit}>
          <div className="ws-modal-field">
            <label className="ws-modal-label">Activity type</label>
            <select className="ws-modal-select" value={form.activity_type} onChange={e => set('activity_type', e.target.value)}>
              <option value="">— Select type —</option>
              {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="ws-modal-row">
            <div className="ws-modal-field">
              <label className="ws-modal-label">Activity name *</label>
              <input className="ws-modal-input" placeholder="e.g. Robotics Club, Model UN" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
            </div>
            <div className="ws-modal-field">
              <label className="ws-modal-label">Your role / position</label>
              <input className="ws-modal-input" placeholder="e.g. President, Captain" value={form.role} onChange={e => set('role', e.target.value)} />
            </div>
          </div>

          <div className="ws-modal-field">
            <label className="ws-modal-label">Organization / school</label>
            <input className="ws-modal-input" placeholder="e.g. Westfield High School, UNICEF Club" value={form.organization} onChange={e => set('organization', e.target.value)} />
          </div>

          <div className="ws-modal-row">
            <div className="ws-modal-field">
              <label className="ws-modal-label">Hours per week</label>
              <input className="ws-modal-input" type="number" min="0" max="168" placeholder="e.g. 5" value={form.hours_per_week} onChange={e => set('hours_per_week', e.target.value)} />
            </div>
            <div className="ws-modal-field">
              <label className="ws-modal-label">Weeks per year</label>
              <input className="ws-modal-input" type="number" min="0" max="52" placeholder="e.g. 40" value={form.weeks_per_year} onChange={e => set('weeks_per_year', e.target.value)} />
            </div>
          </div>

          <div className="ws-modal-field">
            <label className="ws-modal-label">
              Description / impact
              <span className={`ah-char-count ${descLen > DESC_LIMIT ? 'ah-char-over' : descLen > DESC_LIMIT * 0.85 ? 'ah-char-warn' : descLen >= DESC_LIMIT * 0.6 ? 'ah-char-good' : ''}`}>
                {descLen}/{DESC_LIMIT}
              </span>
            </label>
            <textarea
              className="ws-modal-input ah-textarea"
              placeholder="What did you do and what was the impact? (Common App limit: 150 chars)"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              maxLength={DESC_LIMIT}
            />
          </div>

          <div className="ws-modal-footer">
            <button type="button" className="ws-btn ws-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="ws-btn ws-btn-primary" disabled={!form.title.trim()}>
              {isEdit ? 'Save changes' : 'Add activity'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ── Honor Modal ── */
function HonorModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const blank = { title: '', level: '', year: '', description: '' };
  const [form, setForm] = useState(initial ? {
    title: initial.title || '',
    level: initial.level || '',
    year: initial.year || '',
    description: initial.description || '',
  } : blank);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const descLen = (form.description || '').length;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  }

  return createPortal(
    <div className="ws-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-modal">
        <div className="ws-modal-header">
          <div className="ws-modal-icon" style={{ background: '#FFFBEB', color: '#D97706' }}><Award size={18} /></div>
          <div>
            <h2 className="ws-modal-title">{isEdit ? 'Edit honor' : 'Add honor'}</h2>
            <p className="ws-modal-sub">Olympiads, competitions, academic awards</p>
          </div>
          <button className="ws-icon-btn ws-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="ws-modal-body" onSubmit={handleSubmit}>
          <div className="ws-modal-field">
            <label className="ws-modal-label">Award / honor name *</label>
            <input className="ws-modal-input" placeholder="e.g. National Math Olympiad Silver Medal" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
          </div>

          <div className="ws-modal-row">
            <div className="ws-modal-field">
              <label className="ws-modal-label">Level</label>
              <select className="ws-modal-select" value={form.level} onChange={e => set('level', e.target.value)}>
                <option value="">— Select level —</option>
                {HONOR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="ws-modal-field">
              <label className="ws-modal-label">Year</label>
              <input className="ws-modal-input" placeholder="e.g. 2024" value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
          </div>

          <div className="ws-modal-field">
            <label className="ws-modal-label">
              Description
              <span className={`ah-char-count ${descLen > DESC_LIMIT ? 'ah-char-over' : descLen > DESC_LIMIT * 0.85 ? 'ah-char-warn' : ''}`}>
                {descLen}/{DESC_LIMIT}
              </span>
            </label>
            <textarea
              className="ws-modal-input ah-textarea"
              placeholder="Brief context — placement, scope, significance"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              maxLength={DESC_LIMIT}
            />
          </div>

          <div className="ws-modal-footer">
            <button type="button" className="ws-btn ws-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="ws-btn ws-btn-primary" disabled={!form.title.trim()}>
              {isEdit ? 'Save changes' : 'Add honor'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ── Import PDF Modal ── */
function ImportModal({ onImport, onClose }) {
  const [stage, setStage] = useState('drop'); // 'drop' | 'parsing' | 'preview' | 'error'
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState(null); // { activities, honors }
  const [checked, setChecked] = useState({ activities: {}, honors: {} });
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      setStage('error');
      return;
    }
    setStage('parsing');
    setError('');
    try {
      const result = await parsePdf(file);
      if (!result.activities.length && !result.honors.length) {
        setError('No activities or honors found in this PDF. Make sure you downloaded the full application PDF from Common App.');
        setStage('error');
        return;
      }
      setParsed(result);
      setChecked({
        activities: Object.fromEntries(result.activities.map((_, i) => [i, true])),
        honors:     Object.fromEntries(result.honors.map((_, i) => [i, true])),
      });
      setStage('preview');
    } catch (err) {
      setError(err.message || 'Could not read this PDF.');
      setStage('error');
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function toggleActivity(i) {
    setChecked(c => ({ ...c, activities: { ...c.activities, [i]: !c.activities[i] } }));
  }
  function toggleHonor(i) {
    setChecked(c => ({ ...c, honors: { ...c.honors, [i]: !c.honors[i] } }));
  }

  const selectedActs = parsed?.activities.filter((_, i) => checked.activities[i]) || [];
  const selectedHons = parsed?.honors.filter((_, i) => checked.honors[i]) || [];
  const totalSelected = selectedActs.length + selectedHons.length;

  function confirmImport() {
    onImport(selectedActs, selectedHons);
    onClose();
  }

  return createPortal(
    <div className="ws-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ws-modal ws-modal-wide">
        <div className="ws-modal-header">
          <div className="ws-modal-icon"><Upload size={18} /></div>
          <div>
            <h2 className="ws-modal-title">Import from Common App PDF</h2>
            <p className="ws-modal-sub">Drop your downloaded application PDF to auto-fill activities & honors</p>
          </div>
          <button className="ws-icon-btn ws-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ws-modal-body">
          {/* Drop zone */}
          {stage === 'drop' && (
            <div
              className={`ah-import-drop ${dragOver ? 'ah-import-drop-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} strokeWidth={1.5} />
              <p className="ah-import-drop-title">Drop your Common App PDF here</p>
              <p className="ah-import-drop-sub">or click to browse — PDF only, max 10 MB</p>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </div>
          )}

          {/* Parsing spinner */}
          {stage === 'parsing' && (
            <div className="ah-import-parsing">
              <Loader2 size={28} className="ah-import-spin" />
              <p className="ah-import-parsing-text">Analyzing your PDF…</p>
              <p className="ah-import-parsing-sub">Nova is reading your activities and honors</p>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="ah-import-error">
              <p className="ah-import-error-msg">{error}</p>
              <button className="ws-btn ws-btn-primary" onClick={() => { setStage('drop'); setError(''); }}>Try again</button>
            </div>
          )}

          {/* Preview */}
          {stage === 'preview' && parsed && (
            <div className="ah-import-preview">
              <p className="ah-import-preview-note">
                Review what Nova found — uncheck anything you don't want to import.
              </p>

              {parsed.activities.length > 0 && (
                <div className="ah-import-section">
                  <div className="ah-import-section-label"><Users size={13} /> Activities ({parsed.activities.length})</div>
                  <div className="ah-import-list">
                    {parsed.activities.map((a, i) => {
                      const { Icon, color, bg } = getTypeIcon(a.activity_type);
                      return (
                        <label key={i} className="ah-import-item">
                          <input type="checkbox" className="ah-import-check" checked={!!checked.activities[i]} onChange={() => toggleActivity(i)} />
                          <div className="ah-import-item-icon" style={{ background: bg, color }}><Icon size={14} /></div>
                          <div className="ah-import-item-body">
                            <span className="ah-import-item-title">{a.title}</span>
                            {a.role && <span className="ah-import-item-meta">{a.role}</span>}
                            {a.activity_type && <span className="ah-type-pill">{a.activity_type}</span>}
                            {(a.hours_per_week || a.weeks_per_year) && (
                              <span className="ah-import-item-meta">
                                {[a.hours_per_week && `${a.hours_per_week} hrs/wk`, a.weeks_per_year && `${a.weeks_per_year} wks/yr`].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {parsed.honors.length > 0 && (
                <div className="ah-import-section">
                  <div className="ah-import-section-label"><Award size={13} /> Honors & Awards ({parsed.honors.length})</div>
                  <div className="ah-import-list">
                    {parsed.honors.map((h, i) => {
                      const lvl = getLevelStyle(h.level);
                      return (
                        <label key={i} className="ah-import-item">
                          <input type="checkbox" className="ah-import-check" checked={!!checked.honors[i]} onChange={() => toggleHonor(i)} />
                          <div className="ah-import-item-icon" style={{ background: lvl.bg, color: lvl.color }}><Award size={14} /></div>
                          <div className="ah-import-item-body">
                            <span className="ah-import-item-title">{h.title}</span>
                            {h.level && <span className="ah-import-item-meta">{h.level}{h.year ? ` · ${h.year}` : ''}</span>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="ws-modal-footer">
                <button className="ws-btn ws-btn-ghost" onClick={onClose}>Cancel</button>
                <button
                  className="ws-btn ws-btn-primary"
                  disabled={totalSelected === 0}
                  onClick={confirmImport}
                >
                  Import {totalSelected} item{totalSelected !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Activities() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [honors, setHonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actModal, setActModal] = useState(null);  // null | 'new' | activity object
  const [honModal, setHonModal] = useState(null);  // null | 'new' | honor object
  const [actDrag, setActDrag] = useState(null);    // index being dragged
  const [actDragOver, setActDragOver] = useState(null);
  const [honDrag, setHonDrag] = useState(null);
  const [honDragOver, setHonDragOver] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [novaOpenId, setNovaOpenId] = useState(null);      // activity id with panel open
  const [novaLoadingId, setNovaLoadingId] = useState(null);
  const [novaReviews, setNovaReviews] = useState({});      // activity id → review | { error }
  const [celebrate, setCelebrate] = useState(false);       // confetti when Nova returns an A

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchActivities(user.id), fetchHonors(user.id)])
      .then(([a, h]) => { setActivities(a); setHonors(h); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  /* ── Activity CRUD ── */
  async function saveActivity(form) {
    if (actModal?.id) {
      const updated = await updateActivity(actModal.id, form);
      setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
    } else {
      const sortOrder = activities.length;
      const row = await addActivity(user.id, { ...form, sort_order: sortOrder });
      setActivities(prev => [...prev, row]);
    }
    setActModal(null);
  }

  async function delAct(id) {
    await deleteActivity(id);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  async function reorderAct(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const arr = [...activities];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    setActivities(arr);
    await Promise.all(arr.map((a, i) => updateActivity(a.id, { sort_order: i })));
  }

  /* ── Honors CRUD ── */
  async function saveHonor(form) {
    if (honModal?.id) {
      const updated = await updateHonor(honModal.id, form);
      setHonors(prev => prev.map(h => h.id === updated.id ? updated : h));
    } else {
      const sortOrder = honors.length;
      const row = await addHonor(user.id, { ...form, sort_order: sortOrder });
      setHonors(prev => [...prev, row]);
    }
    setHonModal(null);
  }

  async function delHon(id) {
    await deleteHonor(id);
    setHonors(prev => prev.filter(h => h.id !== id));
  }

  async function reorderHon(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const arr = [...honors];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    setHonors(arr);
    await Promise.all(arr.map((h, i) => updateHonor(h.id, { sort_order: i })));
  }

  /* ── Nova activity review ── */
  async function runNovaReview(a, { force = false } = {}) {
    if (!a.description?.trim()) {
      setNovaReviews(prev => ({ ...prev, [a.id]: { error: 'Add a description first — Nova reviews the 150-character description.' } }));
      setNovaOpenId(a.id);
      return;
    }
    if (!force && novaReviews[a.id] && !novaReviews[a.id].error) {
      setNovaOpenId(novaOpenId === a.id ? null : a.id);
      return;
    }
    setNovaLoadingId(a.id);
    try {
      const review = await reviewActivity({
        title: a.title,
        type: a.activity_type,
        role: a.role,
        description: a.description,
        hoursPerWeek: a.hours_per_week,
        weeksPerYear: a.weeks_per_year,
      });
      setNovaReviews(prev => ({ ...prev, [a.id]: review }));
      setNovaOpenId(a.id);
      if (review.rating === 'strong') setCelebrate(true);   // grade A → celebrate
    } catch (err) {
      setNovaReviews(prev => ({ ...prev, [a.id]: { error: err.message } }));
      setNovaOpenId(a.id);
    } finally {
      setNovaLoadingId(null);
    }
  }

  async function handleImport(newActs, newHons) {
    const actOffset = activities.length;
    const honOffset = honors.length;
    const addedActs = await Promise.all(
      newActs.map((a, i) => addActivity(user.id, { ...a, sort_order: actOffset + i }))
    );
    const addedHons = await Promise.all(
      newHons.map((h, i) => addHonor(user.id, { ...h, sort_order: honOffset + i }))
    );
    if (addedActs.length) setActivities(prev => [...prev, ...addedActs]);
    if (addedHons.length) setHonors(prev => [...prev, ...addedHons]);
  }

  if (loading) return <div className="ws-loading">Loading…</div>;

  // ── Profile-at-a-glance stats for the hero band ──
  const totalHours = activities.reduce((s, a) => s + (Number(a.hours_per_week) || 0), 0);
  const leadershipCount = activities.filter(a => isLeadershipRole(a.role)).length;
  const topGrade = bestGrade(activities.map(a => {
    const rg = gradesFromReview(novaReviews[a.id]);
    return bestGrade([rg?.title ?? gradeTitle(a), rg?.description ?? gradeDescription(a)]);
  }));

  return (
    <div className="ws-section ah-page">
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      {/* ── Forest hero stat band ── */}
      <div className="ah-hero">
        <div className="ah-hero-main">
          <span className="ah-hero-eyebrow"><span className="ah-hero-dot" /> Your extracurricular profile</span>
          <h1 className="ah-hero-title">Activities &amp; Honors</h1>
          <p className="ah-hero-sub">The extracurriculars and awards that make your application stand out.</p>
          <button className="ah-hero-import" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Import from PDF
          </button>
        </div>
        <div className="ah-hero-right">
          <div className="ah-hero-mascot"><NovaMascot size={46} idle /></div>
          <div className="ah-hero-stats">
            <div className="ah-stat-sticker st-cream">
              <span className="ah-stat-big">{activities.length}</span>
              <span className="ah-stat-cap">of 10 activities</span>
            </div>
            <div className="ah-stat-sticker st-yellow">
              <span className="ah-stat-big">{totalHours}</span>
              <span className="ah-stat-cap">hrs / week</span>
            </div>
            <div className="ah-stat-sticker st-mint">
              <span className="ah-stat-big">{leadershipCount}</span>
              <span className="ah-stat-cap">leadership roles</span>
            </div>
            <div className="ah-stat-sticker st-white">
              <span className="ah-stat-big">{topGrade || '—'}</span>
              <span className="ah-stat-cap">top grade</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Activities ── */}
      <section className="ah-section">
        <div className="ah-section-head">
          <div className="ah-section-label">
            <Users size={15} />
            <span>Activities</span>
            {activities.length > 0 && <span className="ah-count">{activities.length}/10</span>}
          </div>
          <button className="ah-add-btn" onClick={() => setActModal('new')}>
            <Plus size={14} /> Add
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-icon"><Users size={30} /></div>
            <p className="ah-empty-title">No activities yet</p>
            <p className="ah-empty-sub">Add clubs, sports, volunteering, research — anything you do outside class.</p>
            <button className="ws-btn ws-btn-primary" onClick={() => setActModal('new')}><Plus size={14} /> Add your first activity</button>
          </div>
        ) : (
          <div className="ah-cards">
            {activities.map((a, i) => {
              const { color, bg, Icon: TypeIcon } = getTypeIcon(a.activity_type);
              const review = novaReviews[a.id];
              const panelOpen = novaOpenId === a.id && !!review;
              const reviewGrades = gradesFromReview(review);
              const tGrade = reviewGrades?.title ?? gradeTitle(a);
              const dGrade = reviewGrades?.description ?? gradeDescription(a);
              // Chip shows the weaker of the two grades (A sorts first, F last)
              const chipGrade = [tGrade, dGrade].filter(Boolean).sort().pop() || null;
              return (
                <Fragment key={a.id}>
                <div
                  className={`ah-card ah-card-v2${actDragOver === i && actDrag !== i ? ' ah-drag-over' : ''}`}
                  draggable
                  onDragStart={() => setActDrag(i)}
                  onDragOver={e => { e.preventDefault(); setActDragOver(i); }}
                  onDragLeave={() => setActDragOver(null)}
                  onDrop={() => { reorderAct(actDrag, i); setActDrag(null); setActDragOver(null); }}
                  onDragEnd={() => { setActDrag(null); setActDragOver(null); }}
                  style={{ opacity: actDrag === i ? 0.4 : 1 }}
                >
                  <GripVertical size={13} className="ah-grip" />
                  <span className="ah-rank-num">{i + 1}</span>
                  <span className="ah-icon-tile" style={{ background: bg, color }} aria-hidden="true">
                    <TypeIcon size={18} />
                  </span>

                  {/* Body */}
                  <div className="ah-card-body" onClick={() => setActModal(a)} style={{ cursor: 'pointer' }}>
                    <div className="ah-card-top">
                      <span className="ah-card-name">{a.title}</span>
                      {a.activity_type && (
                        <span className="ah-type-pill" style={{ background: bg, color, border: `1px solid ${color}28` }}>
                          {a.activity_type}
                        </span>
                      )}
                      {chipGrade && (
                        <span
                          className="ah-grade-sticker"
                          style={{ color: gradeColor(chipGrade), background: gradeBg(chipGrade) }}
                          title={`Title: ${tGrade || '—'} · Description: ${dGrade || '—'}${reviewGrades ? ' (Nova-reviewed)' : ''}`}
                        >
                          {chipGrade}
                        </span>
                      )}
                      <ChevronDown size={13} className="ah-expand-hint" />
                    </div>
                    {a.role && <div className="ah-card-meta"><span className="ah-meta-role">{a.role}</span></div>}

                    {/* Inline expand on hover — Kollegio-style stat grid */}
                    <div className="ah-card-extra">
                      <div className="ah-stat-grid">
                        <div className="ah-stat">
                          <span className="ah-stat-label">Hours per Week</span>
                          <span className="ah-stat-value">{a.hours_per_week ?? '—'}</span>
                        </div>
                        <div className="ah-stat">
                          <span className="ah-stat-label">Weeks per Year</span>
                          <span className="ah-stat-value">{a.weeks_per_year ?? '—'}</span>
                        </div>
                        <div className="ah-stat">
                          <span className="ah-stat-label">Title</span>
                          <span className="ah-stat-value" style={{ color: tGrade ? gradeColor(tGrade) : undefined }}>{tGrade || '—'}</span>
                        </div>
                        <div className="ah-stat">
                          <span className="ah-stat-label">Description</span>
                          <span className="ah-stat-value" style={{ color: dGrade ? gradeColor(dGrade) : undefined }}>{dGrade || '—'}</span>
                        </div>
                      </div>
                      {a.description && <p className="ah-preview-desc">{a.description}</p>}
                    </div>
                  </div>

                  {/* Review with Nova — always visible */}
                  <button
                    className={`ah-nova-btn${panelOpen ? ' open' : ''}`}
                    onClick={() => runNovaReview(a)}
                    disabled={novaLoadingId === a.id}
                    title="Review this activity with Nova"
                  >
                    {novaLoadingId === a.id
                      ? <Loader2 size={12} className="ah-nova-spin" />
                      : <NovaMascot size={15} />}
                    <span>Nova</span>
                  </button>

                  {/* Actions */}
                  <div className="ah-card-actions">
                    <button className="ah-action-btn" onClick={() => setActModal(a)} title="Edit"><Pencil size={13} /></button>
                    <button className="ah-action-btn ah-action-del" onClick={() => delAct(a.id)} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Nova feedback panel — inline expansion below the card */}
                <div className={`ah-nova-panel${panelOpen ? ' open' : ''}`}>
                  {review && (
                    <div className="ah-nova-panel-inner">
                      <div className="ah-nova-panel-head">
                        <span className="ah-nova-byline"><NovaMascot size={15} /> Nova's take</span>
                        <div className="ah-nova-head-actions">
                          {!review.error && (
                            <button
                              className="ah-nova-rerun"
                              onClick={() => runNovaReview(a, { force: true })}
                              disabled={novaLoadingId === a.id}
                            >
                              {novaLoadingId === a.id ? 'Reviewing…' : 'Re-review'}
                            </button>
                          )}
                          <button className="ah-nova-close" onClick={() => setNovaOpenId(null)} title="Close"><X size={13} /></button>
                        </div>
                      </div>

                      {review.error ? (
                        <p className="ah-nova-panel-feedback">{review.error}</p>
                      ) : (
                        <>
                          <div className={`ah-nova-panel-rating rating-${review.rating}`}>
                            <span className="ah-nova-dot" />
                            {review.rating === 'strong' ? 'Strong' : review.rating === 'good' ? 'Good' : 'Needs work'}
                          </div>
                          <p className="ah-nova-panel-feedback">{review.feedback}</p>
                          {review.rewrite_example && (
                            <div className="ah-nova-panel-rewrite">
                              <div className="ah-nova-rewrite-label">
                                Suggested rewrite
                                <span className="ah-nova-charcount">{review.rewrite_example.length}/150</span>
                              </div>
                              <p className="ah-nova-rewrite-text">{review.rewrite_example}</p>
                              <button
                                className="ah-nova-use-btn"
                                onClick={async () => {
                                  await updateActivity(a.id, { description: review.rewrite_example });
                                  setNovaOpenId(null);
                                }}
                              >
                                Use this
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Honors & Awards ── */}
      <section className="ah-section">
        <div className="ah-section-head">
          <div className="ah-section-label">
            <Award size={15} />
            <span>Honors &amp; Awards</span>
            {honors.length > 0 && <span className="ah-count">{honors.length}</span>}
          </div>
          <button className="ah-add-btn" onClick={() => setHonModal('new')}>
            <Plus size={14} /> Add
          </button>
        </div>

        {honors.length === 0 ? (
          <div className="ah-empty">
            <div className="ah-empty-icon ah-empty-icon-gold"><Award size={30} /></div>
            <p className="ah-empty-title">No honors yet</p>
            <p className="ah-empty-sub">Add olympiad medals, competitions, academic awards, or recognitions.</p>
            <button className="ws-btn ws-btn-primary" onClick={() => setHonModal('new')}><Plus size={14} /> Add your first honor</button>
          </div>
        ) : (
          <div className="ah-cards">
            {honors.map((h, i) => {
              return (
                <div
                  className={`ah-honor-card ah-card-v2${honDragOver === i && honDrag !== i ? ' ah-drag-over' : ''}`}
                  key={h.id}
                  draggable
                  onDragStart={() => setHonDrag(i)}
                  onDragOver={e => { e.preventDefault(); setHonDragOver(i); }}
                  onDragLeave={() => setHonDragOver(null)}
                  onDrop={() => { reorderHon(honDrag, i); setHonDrag(null); setHonDragOver(null); }}
                  onDragEnd={() => { setHonDrag(null); setHonDragOver(null); }}
                  style={{ opacity: honDrag === i ? 0.4 : 1 }}
                >
                  <GripVertical size={13} className="ah-grip" />
                  <span className="ah-rank-num">{i + 1}</span>
                  {/* Body */}
                  <div className="ah-card-body" onClick={() => setHonModal(h)} style={{ cursor: 'pointer' }}>
                    <div className="ah-card-top">
                      <span className="ah-card-name">{h.title}</span>
                      {h.year && <span className="ah-year-badge">{h.year}</span>}
                      {h.level && (
                        <span className="ah-type-pill" style={{ background: getLevelStyle(h.level).bg, color: getLevelStyle(h.level).color, border: `1px solid ${getLevelStyle(h.level).color}28` }}>
                          {h.level}
                        </span>
                      )}
                      <ChevronDown size={13} className="ah-expand-hint" />
                    </div>

                    {/* Inline expand on hover */}
                    {h.description && (
                      <div className="ah-card-extra">
                        <p className="ah-preview-desc">{h.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ah-card-actions">
                    <button className="ah-action-btn" onClick={() => setHonModal(h)} title="Edit"><Pencil size={13} /></button>
                    <button className="ah-action-btn ah-action-del" onClick={() => delHon(h.id)} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Modals ── */}
      {actModal && (
        <ActivityModal
          initial={actModal === 'new' ? null : actModal}
          onSave={saveActivity}
          onClose={() => setActModal(null)}
        />
      )}
      {honModal && (
        <HonorModal
          initial={honModal === 'new' ? null : honModal}
          onSave={saveHonor}
          onClose={() => setHonModal(null)}
        />
      )}
      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

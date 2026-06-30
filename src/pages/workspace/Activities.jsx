import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Award, Users, Star, Building,
  ChevronUp, ChevronDown, Pencil, X, Upload, Loader2,
  BookOpen, Palette, Trophy, Heart, Code2, FlaskConical,
  Music, MessageSquare, Newspaper, Flag, Briefcase,
  Sparkles, Leaf, Globe, Mic, Calculator, Dumbbell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchActivities, addActivity, updateActivity, deleteActivity,
  fetchHonors, addHonor, updateHonor, deleteHonor,
  parsePdf,
} from '../../api/workspace.js';
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
  'Other':                  { Icon: Sparkles,    color: '#8b5cf6', bg: '#F5F3FF' },
};

const DEFAULT_ICON = { Icon: Sparkles, color: '#8b5cf6', bg: '#F5F3FF' };

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
              <span className={`ah-char-count ${descLen > DESC_LIMIT ? 'ah-char-over' : descLen > DESC_LIMIT * 0.85 ? 'ah-char-warn' : ''}`}>
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
function ImportModal({ existingActCount, existingHonCount, onImport, onClose }) {
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
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [honors, setHonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actModal, setActModal] = useState(null);  // null | 'new' | activity object
  const [honModal, setHonModal] = useState(null);  // null | 'new' | honor object
  const [showImport, setShowImport] = useState(false);

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

  async function moveAct(idx, dir) {
    const next = idx + dir;
    if (next < 0 || next >= activities.length) return;
    const arr = [...activities];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setActivities(arr);
    await Promise.all([
      updateActivity(arr[idx].id, { sort_order: idx }),
      updateActivity(arr[next].id, { sort_order: next }),
    ]);
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

  async function moveHon(idx, dir) {
    const next = idx + dir;
    if (next < 0 || next >= honors.length) return;
    const arr = [...honors];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setHonors(arr);
    await Promise.all([
      updateHonor(arr[idx].id, { sort_order: idx }),
      updateHonor(arr[next].id, { sort_order: next }),
    ]);
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

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Activities &amp; Honors</h1>
          <p className="ws-subtitle">The extracurriculars and awards that make your application stand out.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="ws-btn ws-btn-import" onClick={() => setShowImport(true)}>
            <Upload size={14} /> Import PDF
          </button>
          <button className="ws-btn ws-btn-nova" onClick={() => navigate('/nova')}>
            <Sparkles size={14} /> Review with Nova
          </button>
        </div>
      </header>

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
              const { Icon, color, bg } = getTypeIcon(a.activity_type);
              return (
                <div className="ah-card ah-card-v2" key={a.id}>
                  {/* Type icon with rank overlay */}
                  <div className="ah-type-icon" style={{ background: bg, color }}>
                    <Icon size={17} />
                    <span className="ah-tile-rank">{i + 1}</span>
                  </div>

                  {/* Body */}
                  <div className="ah-card-body" onClick={() => setActModal(a)} style={{ cursor: 'pointer' }}>
                    <div className="ah-card-top">
                      <span className="ah-card-name">{a.title}</span>
                      {a.role && <span className="ah-role-pill" style={{ color, background: bg, borderColor: color + '44' }}>{a.role}</span>}
                      {a.activity_type && <span className="ah-type-pill">{a.activity_type}</span>}
                    </div>
                    {a.organization && (
                      <div className="ah-card-org"><Building size={11} /> {a.organization}</div>
                    )}
                    {(a.hours_per_week || a.weeks_per_year) && (
                      <div className="ah-card-time">
                        {a.hours_per_week && <span>{a.hours_per_week} hrs/wk</span>}
                        {a.hours_per_week && a.weeks_per_year && <span className="ah-time-sep">·</span>}
                        {a.weeks_per_year && <span>{a.weeks_per_year} wks/yr</span>}
                      </div>
                    )}
                    {a.description && <div className="ah-card-desc">{a.description}</div>}
                  </div>

                  {/* Actions: reorder + edit + delete */}
                  <div className="ah-card-actions">
                    <button className="ah-arrow-btn" disabled={i === 0} onClick={() => moveAct(i, -1)} title="Move up"><ChevronUp size={13} /></button>
                    <button className="ah-arrow-btn" disabled={i === activities.length - 1} onClick={() => moveAct(i, 1)} title="Move down"><ChevronDown size={13} /></button>
                    <div className="ah-actions-sep" />
                    <button className="ah-action-btn" onClick={() => setActModal(a)} title="Edit"><Pencil size={13} /></button>
                    <button className="ah-action-btn ah-action-del" onClick={() => delAct(a.id)} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
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
              const lvl = getLevelStyle(h.level);
              return (
                <div className="ah-honor-card ah-card-v2" key={h.id}>
                  {/* Medal tile with rank overlay */}
                  <div className="ah-medal" style={{ background: lvl.bg, color: lvl.color, borderColor: lvl.border }}>
                    <Award size={17} />
                    <span className="ah-tile-rank">{i + 1}</span>
                  </div>

                  {/* Body */}
                  <div className="ah-card-body" onClick={() => setHonModal(h)} style={{ cursor: 'pointer' }}>
                    <div className="ah-card-top">
                      <span className="ah-card-name">{h.title}</span>
                      {h.year && <span className="ah-year-badge">{h.year}</span>}
                    </div>
                    <div className="ah-honor-meta">
                      {h.level && (
                        <span className="ah-level-badge" style={{ background: lvl.bg, color: lvl.color, borderColor: lvl.border }}>
                          {h.level}
                        </span>
                      )}
                      {h.description && <span className="ah-card-desc">{h.description}</span>}
                    </div>
                  </div>

                  {/* Actions: reorder + edit + delete */}
                  <div className="ah-card-actions">
                    <button className="ah-arrow-btn" disabled={i === 0} onClick={() => moveHon(i, -1)} title="Move up"><ChevronUp size={13} /></button>
                    <button className="ah-arrow-btn" disabled={i === honors.length - 1} onClick={() => moveHon(i, 1)} title="Move down"><ChevronDown size={13} /></button>
                    <div className="ah-actions-sep" />
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
          existingActCount={activities.length}
          existingHonCount={honors.length}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

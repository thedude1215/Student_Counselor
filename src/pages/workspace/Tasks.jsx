import { useState, useEffect } from 'react';
import { Plus, ListChecks, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import NewTaskModal from './NewTaskModal.jsx';
import {
  fetchTasks, addTask, updateTask, deleteTask,
  fetchCollegeList, fetchTaskSuggestions, dismissSuggestion, markSuggestionAdded,
} from '../../api/workspace.js';
import { suggestTasks } from '../../api/nova.js';
import KanbanColumn from './KanbanColumn.jsx';
import LogoTile from '../../components/LogoTile.jsx';
import TaskEditModal from './TaskEditModal.jsx';
import Confetti from './Confetti.jsx';
import NovaMascot from '../../components/NovaMascot.jsx';
import { ProgressArc } from './HeroRings.jsx';
import './workspace.css';

const COLUMNS = [
  { key: 'todo',        label: 'To do' },
  { key: 'in_progress', label: 'In review' },
  { key: 'done',        label: 'Done' },
];

const PRIO_MAP = {
  high:   { label: 'High', cls: 'dl-prio-1' },
  medium: { label: 'Medium', cls: 'dl-prio-2' },
  low:    { label: 'Low', cls: 'dl-prio-3' },
};

/* Known service/test keywords → tile config (logoUrl takes priority over bg/label) */
const SERVICE_TILES = [
  {
    keywords: ['css profile', 'css financial', 'college board'],
    logoUrl: '/logos/collegeboard.png', logoStyle: { background: '#000', padding: '0px' },
    bg: '#000', color: '#fff', label: 'CB',
  },
  {
    keywords: ['sat'],
    logoUrl: '/logos/sat-logo.webp', logoStyle: { background: '#009FDA', padding: '0px' },
    bg: '#009FDA', color: '#fff', label: 'SAT',
  },
  {
    keywords: ['act'],
    logoUrl: '/logos/act-logo.svg', logoStyle: { background: '#D92228', padding: '0px' },
    bg: '#D92228', color: '#fff', label: 'ACT',
  },
  {
    keywords: ['common app', 'commonapp'],
    logoUrl: '/logos/commonapp.svg', logoStyle: { background: '#2C5F8A', padding: '0px' },
    bg: '#2C5F8A', color: '#fff', label: 'CA',
  },
  {
    keywords: ['coalition app'],
    bg: '#111827', color: '#fff', label: 'C',
  },
  {
    keywords: ['fafsa'],
    bg: '#003087', color: '#fff', label: 'FA',
  },
  {
    keywords: ['toefl'],
    bg: '#0F766E', color: '#fff', label: 'TOE',
  },
  {
    keywords: ['ielts'],
    bg: '#7C3AED', color: '#fff', label: 'IEL',
  },
];

/* Detect a logo source for a task: service keywords checked first, then linked uni, then name match */
function detectTaskLogo(task, colleges) {
  const lower = task.title.toLowerCase();

  /* 1. Service keywords take top priority (SAT/ACT/CSS don't have a university_id) */
  for (const svc of SERVICE_TILES) {
    if (svc.keywords.some(kw => {
      /* Whole-word match: keyword must not be immediately preceded/followed by a letter */
      const idx = lower.indexOf(kw);
      if (idx === -1) return false;
      const before = idx === 0 ? '' : lower[idx - 1];
      const after  = lower[idx + kw.length] || '';
      return !/[a-z]/.test(before) && !/[a-z]/.test(after);
    })) {
      return { type: 'service', ...svc };
    }
  }

  /* 2. Task has a linked university */
  if (task.universities) return { type: 'uni', uni: task.universities };

  /* 3. Match against user's college list by name / short_name */
  for (const c of colleges) {
    const u = c.universities;
    if (!u) continue;
    const name  = (u.name       || '').toLowerCase();
    const short = (u.short_name || '').toLowerCase();
    if (name.length  >= 4 && lower.includes(name))  return { type: 'uni', uni: u };
    if (short.length >= 4 && lower.includes(short)) return { type: 'uni', uni: u };
    const words = name.split(' ');
    for (const word of words) {
      if (word.length >= 4 && lower.includes(word)) return { type: 'uni', uni: u };
    }
  }

  return null;
}

function ServiceTile({ bg, color, label, logoUrl, size = 38, radius = 10 }) {
  if (logoUrl) {
    const isLight = bg === '#fff' || bg === 'white' || bg === '#ffffff';
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: bg, overflow: 'hidden', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: isLight ? '1.5px solid #E5E7EB' : 'none',
        boxSizing: 'border-box',
      }}>
        <img src={logoUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.28, letterSpacing: '-0.02em',
      flexShrink: 0, userSelect: 'none',
    }}>
      {label}
    </div>
  );
}

function groupByMonth(tasks) {
  const withDue = tasks
    .filter(t => t.due_date && t.status !== 'done')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const groups = new Map();
  for (const t of withDue) {
    const d = new Date(t.due_date + 'T00:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, { label, tasks: [] });
    groups.get(key).tasks.push(t);
  }
  return [...groups.values()];
}

function DeadlinesPanel({ tasks, colleges, onPriorityChange, onComplete, completingId }) {
  const groups = groupByMonth(tasks);
  if (groups.length === 0) return null;
  const today0 = new Date(new Date().toDateString());

  return (
    <div className="dl-panel">
      {groups.map(({ label, tasks: monthTasks }, gi) => (
        <div key={label} className="dl-month">
          <div className="dl-month-head">
            <span className="dl-month-label">{label}</span>
            {gi === 0 && (
              <span className="dl-nova-badge">
                <Check size={12} strokeWidth={2.5} />
                Organized by Nova
              </span>
            )}
          </div>

          <div className="dl-table">
            {monthTasks.map(t => {
              const d = new Date(t.due_date + 'T00:00:00');
              const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const logo = detectTaskLogo(t, colleges);
              const prio = PRIO_MAP[t.priority] || PRIO_MAP.medium;
              const days = Math.round((d - today0) / 86_400_000);
              const urgency =
                days < 0 ? { label: 'Overdue', cls: 'over' }
                : days === 0 ? { label: 'Today', cls: 'today' }
                : days <= 3 ? { label: `In ${days}d`, cls: 'soon' }
                : null;

              return (
                <div key={t.id} className={`dl-row ${completingId === t.id ? 'dl-row-completing' : ''}`}>
                  <button className="dl-check" onClick={() => onComplete(t)} title="Mark done" aria-label="Mark done">
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <span className="dl-date">{dateLabel}</span>
                  <span className="dl-item">
                    {logo?.type === 'uni' && (
                      <LogoTile
                        item={{
                          name: logo.uni.name,
                          short_name: logo.uni.short_name,
                          logoUrl: logo.uni.logo_url,
                          logoStyle: logo.uni.logo_style,
                          fallback: logo.uni.fallback,
                        }}
                        size={38}
                        radius={10}
                      />
                    )}
                    {logo?.type === 'service' && (
                      <ServiceTile bg={logo.bg} color={logo.color} label={logo.label} logoUrl={logo.logoUrl} />
                    )}
                    <span className="dl-item-text">
                      <span className="dl-item-name">{t.title}</span>
                      {logo?.type === 'uni' && <span className="dl-item-school">{logo.uni.name}</span>}
                    </span>
                  </span>
                  {urgency && <span className={`dl-urgency dl-urgency-${urgency.cls}`}>{urgency.label}</span>}
                  <select
                    className={`dl-prio dl-prio-select ${prio.cls}`}
                    value={t.priority || 'medium'}
                    onClick={e => e.stopPropagation()}
                    onChange={e => onPriorityChange(t.id, e.target.value)}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [generatedIds, setGeneratedIds] = useState(new Set());
  const [generatingId, setGeneratingId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [celebrate, setCelebrate] = useState(false);   // confetti when the last task is cleared
  const [completingId, setCompletingId] = useState(null);   // row currently animating out

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchTasks(user.id),
      fetchCollegeList(user.id),
      fetchTaskSuggestions(user.id),
    ])
      .then(([tasksData, collegesData, suggestionsData]) => {
        setTasks(tasksData);
        setColleges(collegesData);
        setSuggestions(suggestionsData);
        setGeneratedIds(new Set(suggestionsData.map(s => s.university_id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  async function generateSuggestions(college) {
    const uniId = college.university_id;
    setGeneratingId(uniId);
    try {
      const { suggestions: generated } = await suggestTasks(uniId, college.universities?.name || '');
      setSuggestions(prev => [...prev, ...(generated || [])]);
      setGeneratedIds(prev => new Set(prev).add(uniId));
    } catch (err) {
      console.error('Suggestion generation failed:', err);
    } finally {
      setGeneratingId(null);
    }
  }

  async function acceptSuggestion(s) {
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
    const task = await addTask(user.id, {
      title: s.title,
      category: s.category || null,
      priority: s.priority || 'medium',
      university_id: s.university_id || null,
      status: 'todo',
    });
    setTasks(prev => [...prev, task]);
    await markSuggestionAdded(s.id);
  }

  async function dismiss(id) {
    setSuggestions(prev => prev.filter(x => x.id !== id));
    await dismissSuggestion(id);
  }

  async function handleAdd({ title, due_date, category, priority, university_id }) {
    const task = await addTask(user.id, {
      title, due_date: due_date || null, priority,
      category: category === 'General' ? null : category,
      university_id: university_id || null,
      status: 'todo',
    });
    setTasks(prev => [...prev, task]);
  }

  async function moveTo(task, status) {
    if (task.status === status) return;
    const next = tasks.map(t => t.id === task.id ? { ...t, status } : t);
    setTasks(next);
    await updateTask(task.id, { status });
    // Cleared the board — every task is done.
    if (status === 'done' && next.length > 0 && next.every(t => t.status === 'done')) setCelebrate(true);
  }

  async function remove(id) {
    await deleteTask(id);
    setTasks(tasks.filter(t => t.id !== id));
  }

  async function handleEdit(id, updates) {
    const updated = await updateTask(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    setEditingTask(null);
  }

  // Inline check-off with a brief "completing" animation before the row leaves.
  function completeTask(t) {
    if (completingId) return;
    setCompletingId(t.id);
    setTimeout(() => {
      moveTo(t, 'done');
      setCompletingId(null);
    }, 380);
  }

  if (loading) return <div className="ws-loading">Loading your board…</div>;

  const open = tasks.filter(t => t.status !== 'done').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const isEmpty = tasks.length === 0 && suggestions.length === 0;

  // ── Board-at-a-glance stats ──
  const todayStr = new Date().toLocaleDateString('en-CA');
  const today0 = new Date(new Date().toDateString());
  const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < todayStr).length;
  const dueThisWeek = tasks.filter(t => {
    if (t.status === 'done' || !t.due_date) return false;
    const days = (new Date(t.due_date + 'T00:00:00') - today0) / 86_400_000;
    return days >= 0 && days <= 7;
  }).length;
  const totalTasks = tasks.length;
  const donePct = totalTasks ? Math.round((done / totalTasks) * 100) : 0;
  const boardRead =
    totalTasks === 0 ? 'Add your deadlines and to-dos'
    : open === 0 ? 'Board clear — every task done ✓'
    : overdue > 0 ? `${overdue} overdue — tackle these first`
    : dueThisWeek > 0 ? `${dueThisWeek} due this week`
    : 'On top of your deadlines';

  function reorderInColumn(statusKey, draggedId, insertBeforeId) {
    setTasks(prev => {
      const col = prev.filter(t => t.status === statusKey);
      const others = prev.filter(t => t.status !== statusKey);
      const dragged = col.find(t => t.id === draggedId);
      if (!dragged) return prev;
      const rest = col.filter(t => t.id !== draggedId);
      let newCol;
      if (insertBeforeId === null) {
        newCol = [...rest, dragged];
      } else {
        const idx = rest.findIndex(t => t.id === insertBeforeId);
        newCol = idx === -1 ? [...rest, dragged] : [...rest.slice(0, idx), dragged, ...rest.slice(idx)];
      }
      return [...others, ...newCol];
    });
  }

  const dnd = {
    dragId,
    onDragStart: setDragId,
    onDragEnd: () => setDragId(null),
    // Moving between columns only — position within the target column is
    // handled by onReorder below, which is where insertBeforeId is consumed.
    onDrop: (statusKey, draggedId) => {
      const id = draggedId ?? dragId;
      const t = tasks.find(x => x.id === id);
      if (t) moveTo(t, statusKey);
      setDragId(null);
    },
    onReorder: (statusKey, draggedId, insertBeforeId) => {
      reorderInColumn(statusKey, draggedId, insertBeforeId);
      setDragId(null);
    },
  };

  return (
    <div className="ws-section ah-page">
      {celebrate && <Confetti count={70} onDone={() => setCelebrate(false)} />}

      {/* ── Forest hero stat band ── */}
      <div className="ah-hero">
        <div className="ah-hero-main">
          <span className="ah-hero-eyebrow"><span className="ah-hero-dot" /> Your board</span>
          <h1 className="ah-hero-title">Tasks &amp; Deadlines</h1>
          <p className="ah-hero-sub">{boardRead}</p>

          <div className="ah-hero-actions">
            <button className="ah-hero-btn solid" onClick={() => setShowNewModal(true)}>
              <Plus size={15} /> Add task
            </button>
          </div>
        </div>
        <div className="ah-hero-right cl-hero-right">
          <div className="ah-hero-mascot cl-hero-mascot"><NovaMascot size={38} idle /></div>
          <div className="cl-donut-wrap">
            <ProgressArc percent={donePct} centerBig={`${donePct}%`} centerCap="DONE" />
            <div className="cl-donut-legend">
              <span className="cl-leg"><span className="cl-leg-dot" style={{ background: 'rgba(255,255,255,0.55)' }} />{open} open</span>
              <span className="cl-leg"><span className="cl-leg-dot" style={{ background: '#4ADE80' }} />{done} done</span>
              <span className="cl-leg"><span className="cl-leg-dot" style={{ background: '#F87171' }} />{overdue} overdue</span>
            </div>
          </div>
        </div>
      </div>

      <DeadlinesPanel
        tasks={tasks}
        colleges={colleges}
        onComplete={completeTask}
        completingId={completingId}
        onPriorityChange={async (id, priority) => {
          setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
          await updateTask(id, { priority });
        }}
      />

      {showNewModal && (
        <NewTaskModal
          colleges={colleges}
          onConfirm={handleAdd}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={handleEdit}
          onClose={() => setEditingTask(null)}
        />
      )}

      {isEmpty ? (
        <div className="ws-empty">
          <ListChecks size={40} />
          <h3>No tasks yet</h3>
          <p>Add deadlines, supplements, and to-dos to fill your board.</p>
        </div>
      ) : (
        <>
          <h2 className="dl-board-title">Board</h2>
          <div className="ws-kanban">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.key}
                status={col.key}
                label={col.label}
                tasks={tasks.filter(t => t.status === col.key)}
                suggestions={col.key === 'todo' ? suggestions : []}
                nova={col.key === 'todo' ? { colleges, generatedIds, generatingId, onGenerate: generateSuggestions } : {}}
                onAdd={handleAdd}
                onDelete={remove}
                onEdit={setEditingTask}
                onAccept={acceptSuggestion}
                onDismiss={dismiss}
                dnd={dnd}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

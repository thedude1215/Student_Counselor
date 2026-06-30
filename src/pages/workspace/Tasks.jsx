import { useState, useEffect } from 'react';
import { Plus, ListChecks, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchTasks, addTask, updateTask, deleteTask,
  fetchCollegeList, fetchTaskSuggestions, dismissSuggestion, markSuggestionAdded,
} from '../../api/workspace.js';
import { suggestTasks } from '../../api/nova.js';
import KanbanColumn from './KanbanColumn.jsx';
import LogoTile from '../../components/LogoTile.jsx';
import TaskEditModal from './TaskEditModal.jsx';
import './workspace.css';

const COLUMNS = [
  { key: 'todo',        label: 'To do' },
  { key: 'in_progress', label: 'In review' },
  { key: 'done',        label: 'Done' },
];

const PRIO_MAP = {
  high:   { label: 'Priority 1', cls: 'dl-prio-1' },
  medium: { label: 'Priority 2', cls: 'dl-prio-2' },
  low:    { label: 'Priority 3', cls: 'dl-prio-3' },
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
    .filter(t => t.due_date)
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

function DeadlinesPanel({ tasks, colleges }) {
  const groups = groupByMonth(tasks);
  if (groups.length === 0) return null;

  return (
    <div className="dl-panel">
      {groups.map(({ label, tasks: monthTasks }) => (
        <div key={label} className="dl-month">
          <div className="dl-month-head">
            <span className="dl-month-label">{label}</span>
            <span className="dl-nova-badge">
              <Check size={12} strokeWidth={2.5} />
              Organized by Nova
            </span>
          </div>

          <div className="dl-table">
            <div className="dl-table-head">
              <span>DATE</span>
              <span>ITEM</span>
              <span>PRIORITY</span>
            </div>

            {monthTasks.map(t => {
              const d = new Date(t.due_date + 'T00:00:00');
              const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              const logo = detectTaskLogo(t, colleges);
              const prio = PRIO_MAP[t.priority] || PRIO_MAP.medium;

              return (
                <div key={t.id} className="dl-row">
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
                  <span className={`dl-prio ${prio.cls}`}>{prio.label}</span>
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [generatedIds, setGeneratedIds] = useState(new Set());
  const [generatingId, setGeneratingId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

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

  async function handleAdd({ title, due_date, category, priority }) {
    const task = await addTask(user.id, {
      title, due_date: due_date || null, priority,
      category: category === 'General' ? null : category, status: 'todo',
    });
    setTasks(prev => [...prev, task]);
    setComposerOpen(false);
  }

  async function moveTo(task, status) {
    if (task.status === status) return;
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status } : t));
    await updateTask(task.id, { status });
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

  if (loading) return <div className="ws-loading">Loading your board…</div>;

  const open = tasks.filter(t => t.status !== 'done').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const isEmpty = tasks.length === 0 && suggestions.length === 0;

  const dnd = {
    dragId,
    onDragStart: setDragId,
    onDragEnd: () => setDragId(null),
    onDrop: (statusKey) => {
      const t = tasks.find(x => x.id === dragId);
      if (t) moveTo(t, statusKey);
      setDragId(null);
    },
  };

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Tasks &amp; Deadlines</h1>
          <p className="ws-subtitle">{open} open · {done} done</p>
        </div>
        <button className="ws-btn ws-btn-primary" onClick={() => setComposerOpen(true)}>
          <Plus size={16} /> Add task
        </button>
      </header>

      <DeadlinesPanel tasks={tasks} colleges={colleges} />

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
                composerOpen={col.key === 'todo' && composerOpen}
                onAdd={handleAdd}
                onComposerClose={() => setComposerOpen(false)}
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

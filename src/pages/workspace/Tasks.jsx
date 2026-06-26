import { useState, useEffect } from 'react';
import { Plus, Trash2, ListChecks, GripVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchTasks, addTask, updateTask, deleteTask,
  fetchCollegeList, fetchTaskSuggestions, dismissSuggestion, markSuggestionAdded,
} from '../../api/workspace.js';
import { suggestTasks } from '../../api/nova.js';
import SuggestionInbox from './SuggestionInbox.jsx';
import './workspace.css';

const COLUMNS = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In review' },
  { key: 'done', label: 'Done' },
];
const CATEGORIES = ['General', 'Essays', 'Testing', 'Documents', 'Recommendations', 'College Search', 'Financial Aid'];

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('General');
  const [dragId, setDragId] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [generatedIds, setGeneratedIds] = useState(new Set());
  const [generatingId, setGeneratingId] = useState(null);

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
        // A college is "already generated" if it has any suggestion rows we know
        // of (i.e. currently-pending ones). The Express cache prevents re-spend
        // even after dismiss-all, so this also avoids showing the button again.
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

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const task = await addTask(user.id, {
      title: title.trim(), due_date: dueDate || null, priority,
      category: category === 'General' ? null : category, status: 'todo',
    });
    setTasks([...tasks, task]);
    setTitle(''); setDueDate(''); setPriority('medium'); setCategory('General');
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

  if (loading) return <div className="ws-loading">Loading your board…</div>;

  const open = tasks.filter(t => t.status !== 'done').length;
  const done = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Tasks &amp; Deadlines</h1>
          <p className="ws-subtitle">{open} to do · {done} done · drag cards between columns</p>
        </div>
      </header>

      <SuggestionInbox
        colleges={colleges}
        suggestions={suggestions}
        generatedIds={generatedIds}
        generatingId={generatingId}
        onGenerate={generateSuggestions}
        onAccept={acceptSuggestion}
        onDismiss={dismiss}
      />

      <form className="ws-task-form" onSubmit={handleAdd}>
        <input className="ws-input" placeholder="Add a task… (e.g. Finish Yale supplement)" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="ws-input ws-input-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <select className="ws-input ws-input-select" value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="ws-input ws-input-select" value={priority} onChange={e => setPriority(e.target.value)}>
          {['low', 'medium', 'high'].map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
        </select>
        <button type="submit" className="ws-btn ws-btn-primary"><Plus size={16} /> Add</button>
      </form>

      {tasks.length === 0 ? (
        <div className="ws-empty">
          <ListChecks size={40} />
          <h3>No tasks yet</h3>
          <p>Add deadlines, supplements, and to-dos to fill your board.</p>
        </div>
      ) : (
        <div className="ws-board">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div
                key={col.key}
                className={`ws-board-col ${dragId ? 'droppable' : ''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { const t = tasks.find(x => x.id === dragId); if (t) moveTo(t, col.key); setDragId(null); }}
              >
                <div className="ws-board-head">
                  <span>{col.label}</span>
                  <span className="ws-board-count">{colTasks.length}</span>
                </div>
                <div className="ws-board-cards">
                  {colTasks.map(t => (
                    <div
                      key={t.id}
                      className={`ws-card ${t.status === 'done' ? 'done' : ''}`}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                    >
                      <div className="ws-card-top">
                        <GripVertical size={14} className="ws-card-grip" />
                        <span className="ws-card-title">{t.title}</span>
                        <button className="ws-icon-btn" onClick={() => remove(t.id)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                      <div className="ws-card-meta">
                        {t.category && <span className="ws-card-tag">{t.category}</span>}
                        <span className={`ws-prio prio-${t.priority}`}>{t.priority}</span>
                        {t.due_date && <span className="ws-card-due">{new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && <p className="ws-board-empty">Drop tasks here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

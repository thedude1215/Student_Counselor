import { useState, useEffect } from 'react';
import { Plus, ListChecks } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchTasks, addTask, updateTask, deleteTask,
  fetchCollegeList, fetchTaskSuggestions, dismissSuggestion, markSuggestionAdded,
} from '../../api/workspace.js';
import { suggestTasks } from '../../api/nova.js';
import KanbanColumn from './KanbanColumn.jsx';
import './workspace.css';

const COLUMNS = [
  { key: 'todo',        label: 'To do' },
  { key: 'in_progress', label: 'In review' },
  { key: 'done',        label: 'Done' },
];

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

      {isEmpty ? (
        <div className="ws-empty">
          <ListChecks size={40} />
          <h3>No tasks yet</h3>
          <p>Add deadlines, supplements, and to-dos to fill your board.</p>
        </div>
      ) : (
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
              onAccept={acceptSuggestion}
              onDismiss={dismiss}
              dnd={dnd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

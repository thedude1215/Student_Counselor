import { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchProfile, updateProfile } from '../../api/workspace.js';
import './workspace.css';

const FIELDS = [
  { key: 'full_name', label: 'Full name', type: 'text', ph: 'Your name' },
  { key: 'country', label: 'Home country', type: 'text', ph: 'e.g. India' },
  { key: 'grade_level', label: 'Current grade', type: 'text', ph: 'e.g. Grade 11' },
  { key: 'class_year', label: 'Graduating class', type: 'text', ph: 'e.g. Class of 2027' },
  { key: 'intended_major', label: 'Intended major', type: 'text', ph: 'e.g. Computer Science' },
  { key: 'gpa', label: 'GPA / Average', type: 'text', ph: 'e.g. 3.9 / 95%' },
  { key: 'sat_score', label: 'SAT / ACT', type: 'text', ph: 'e.g. 1480 or planning' },
  { key: 'ielts_score', label: 'IELTS / TOEFL', type: 'text', ph: 'e.g. 7.5 or planning' },
  { key: 'budget', label: 'Budget / aid need', type: 'text', ph: 'e.g. Need full aid' },
  { key: 'target_countries', label: 'Target countries', type: 'list', ph: 'US, UK, Canada' },
  { key: 'interests', label: 'Interests', type: 'list', ph: 'AI, Robotics, Debate' },
  { key: 'goals', label: 'Goals & notes', type: 'textarea', ph: 'What are you aiming for?' },
];

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then(p => {
      setForm({
        ...p,
        target_countries: (p.target_countries || []).join(', '),
        interests: (p.interests || []).join(', '),
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const toList = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
    const updates = {};
    FIELDS.forEach(f => {
      if (f.type === 'list') updates[f.key] = toList(form[f.key]);
      else updates[f.key] = form[f.key] || null;
    });
    try {
      await updateProfile(user.id, updates);
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ws-loading">Loading your profile…</div>;

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Your Profile</h1>
          <p className="ws-subtitle">This powers your readiness assessment and Nova's advice.</p>
        </div>
        <button className="ws-btn ws-btn-primary" onClick={save} disabled={saving}>
          {saved ? <Check size={16} /> : <Save size={15} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </header>

      <div className="ws-profile-grid">
        {FIELDS.map(f => (
          <label key={f.key} className={`ws-profile-field ${f.type === 'textarea' ? 'span-2' : ''}`}>
            <span className="ws-profile-label">{f.label}</span>
            {f.type === 'textarea' ? (
              <textarea className="ws-input ws-profile-textarea" placeholder={f.ph}
                value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
            ) : (
              <input className="ws-input" type="text" placeholder={f.ph}
                value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
            )}
            {f.type === 'list' && <span className="ws-profile-hint">Comma-separated</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

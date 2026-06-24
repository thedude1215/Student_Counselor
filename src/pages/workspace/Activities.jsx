import { useState, useEffect } from 'react';
import { Plus, Trash2, Award, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchActivities, addActivity, deleteActivity,
  fetchHonors, addHonor, deleteHonor,
} from '../../api/workspace.js';
import './workspace.css';

export default function Activities() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [honors, setHonors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [act, setAct] = useState({ title: '', role: '', organization: '', description: '' });
  const [hon, setHon] = useState({ title: '', level: '', year: '', description: '' });

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchActivities(user.id), fetchHonors(user.id)])
      .then(([a, h]) => { setActivities(a); setHonors(h); })
      .catch(console.error).finally(() => setLoading(false));
  }, [user]);

  async function addAct(e) {
    e.preventDefault();
    if (!act.title.trim()) return;
    const row = await addActivity(user.id, act);
    setActivities([...activities, row]);
    setAct({ title: '', role: '', organization: '', description: '' });
  }
  async function addHon(e) {
    e.preventDefault();
    if (!hon.title.trim()) return;
    const row = await addHonor(user.id, hon);
    setHonors([...honors, row]);
    setHon({ title: '', level: '', year: '', description: '' });
  }
  async function delAct(id) { await deleteActivity(id); setActivities(activities.filter(a => a.id !== id)); }
  async function delHon(id) { await deleteHonor(id); setHonors(honors.filter(h => h.id !== id)); }

  if (loading) return <div className="ws-loading">Loading…</div>;

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Activities &amp; Honors</h1>
          <p className="ws-subtitle">The extracurriculars and awards that make your application stand out.</p>
        </div>
      </header>

      {/* Activities */}
      <h3 className="ws-block-title"><Users size={16} /> Activities</h3>
      <form className="ws-stack-form" onSubmit={addAct}>
        <div className="ws-stack-row">
          <input className="ws-input" placeholder="Activity (e.g. Robotics Club)" value={act.title} onChange={e => setAct({ ...act, title: e.target.value })} />
          <input className="ws-input" placeholder="Role (e.g. Captain)" value={act.role} onChange={e => setAct({ ...act, role: e.target.value })} />
          <input className="ws-input" placeholder="Organization" value={act.organization} onChange={e => setAct({ ...act, organization: e.target.value })} />
        </div>
        <div className="ws-stack-row">
          <input className="ws-input ws-stack-grow" placeholder="What did you do / impact?" value={act.description} onChange={e => setAct({ ...act, description: e.target.value })} />
          <button type="submit" className="ws-btn ws-btn-primary"><Plus size={16} /> Add</button>
        </div>
      </form>
      {activities.length === 0 ? (
        <p className="ws-tier-empty">No activities yet.</p>
      ) : (
        <div className="ws-college-rows">
          {activities.map(a => (
            <div key={a.id} className="ws-college-row">
              <div className="ws-college-info">
                <div className="ws-college-name">{a.title}{a.role ? ` · ${a.role}` : ''}</div>
                <div className="ws-college-meta">{[a.organization, a.description].filter(Boolean).join(' — ')}</div>
              </div>
              <button className="ws-icon-btn" onClick={() => delAct(a.id)} title="Remove"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Honors */}
      <h3 className="ws-block-title" style={{ marginTop: '2rem' }}><Award size={16} /> Honors &amp; Awards</h3>
      <form className="ws-stack-form" onSubmit={addHon}>
        <div className="ws-stack-row">
          <input className="ws-input ws-stack-grow" placeholder="Award (e.g. National Math Olympiad)" value={hon.title} onChange={e => setHon({ ...hon, title: e.target.value })} />
          <input className="ws-input" placeholder="Level (e.g. National)" value={hon.level} onChange={e => setHon({ ...hon, level: e.target.value })} />
          <input className="ws-input ws-input-date" placeholder="Year" value={hon.year} onChange={e => setHon({ ...hon, year: e.target.value })} />
          <button type="submit" className="ws-btn ws-btn-primary"><Plus size={16} /> Add</button>
        </div>
      </form>
      {honors.length === 0 ? (
        <p className="ws-tier-empty">No honors yet.</p>
      ) : (
        <div className="ws-college-rows">
          {honors.map(h => (
            <div key={h.id} className="ws-college-row">
              <div className="ws-college-info">
                <div className="ws-college-name">{h.title}</div>
                <div className="ws-college-meta">{[h.level, h.year, h.description].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="ws-icon-btn" onClick={() => delHon(h.id)} title="Remove"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

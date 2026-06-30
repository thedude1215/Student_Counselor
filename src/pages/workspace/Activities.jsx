import { useState, useEffect } from 'react';
import { Plus, Trash2, Award, Users, Star, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchActivities, addActivity, deleteActivity,
  fetchHonors, addHonor, deleteHonor,
} from '../../api/workspace.js';
import './workspace.css';

const ACT_ACCENTS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#ef4444','#14b8a6'];

function getLevelStyle(level) {
  const l = (level || '').toLowerCase();
  if (l.includes('intern') || l.includes('world')) return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
  if (l.includes('nation')) return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
  if (l.includes('state') || l.includes('region')) return { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' };
  return { bg: '#F9FAFB', color: '#4B5563', border: '#E5E7EB' };
}

export default function Activities() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [honors, setHonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActForm, setShowActForm] = useState(false);
  const [showHonForm, setShowHonForm] = useState(false);
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
    setShowActForm(false);
  }

  async function addHon(e) {
    e.preventDefault();
    if (!hon.title.trim()) return;
    const row = await addHonor(user.id, hon);
    setHonors([...honors, row]);
    setHon({ title: '', level: '', year: '', description: '' });
    setShowHonForm(false);
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

      {/* ── Activities ── */}
      <section className="ah-section">
        <div className="ah-section-head">
          <div className="ah-section-label">
            <Users size={15} />
            <span>Activities</span>
            {activities.length > 0 && <span className="ah-count">{activities.length}</span>}
          </div>
          <button className="ah-add-btn" onClick={() => { setShowActForm(v => !v); setShowHonForm(false); }}>
            <Plus size={14} /> Add
          </button>
        </div>

        {showActForm && (
          <form className="ah-form-card" onSubmit={addAct}>
            <div className="ah-form-grid">
              <div className="ah-form-field">
                <label>Activity name *</label>
                <input className="ws-input" placeholder="e.g. Model UN, Robotics Club" value={act.title} onChange={e => setAct({ ...act, title: e.target.value })} autoFocus />
              </div>
              <div className="ah-form-field">
                <label>Your role</label>
                <input className="ws-input" placeholder="e.g. President, Captain" value={act.role} onChange={e => setAct({ ...act, role: e.target.value })} />
              </div>
              <div className="ah-form-field">
                <label>Organization</label>
                <input className="ws-input" placeholder="e.g. School, NGO name" value={act.organization} onChange={e => setAct({ ...act, organization: e.target.value })} />
              </div>
            </div>
            <div className="ah-form-field">
              <label>Impact / Description</label>
              <input className="ws-input" placeholder="What did you do and what was the impact?" value={act.description} onChange={e => setAct({ ...act, description: e.target.value })} />
            </div>
            <div className="ah-form-actions">
              <button type="button" className="ws-btn" onClick={() => setShowActForm(false)}>Cancel</button>
              <button type="submit" className="ws-btn ws-btn-primary"><Plus size={14} /> Add Activity</button>
            </div>
          </form>
        )}

        {activities.length === 0 && !showActForm ? (
          <div className="ah-empty">
            <div className="ah-empty-icon"><Users size={30} /></div>
            <p className="ah-empty-title">No activities yet</p>
            <p className="ah-empty-sub">Add clubs, sports, volunteering, research — anything you do outside class.</p>
            <button className="ws-btn ws-btn-primary" onClick={() => setShowActForm(true)}><Plus size={14} /> Add your first activity</button>
          </div>
        ) : (
          <div className="ah-cards">
            {activities.map((a, i) => (
              <div className="ah-card" key={a.id} style={{ '--ah-accent': ACT_ACCENTS[i % ACT_ACCENTS.length] }}>
                <div className="ah-card-stripe" />
                <div className="ah-card-body">
                  <div className="ah-card-top">
                    <span className="ah-card-name">{a.title}</span>
                    {a.role && <span className="ah-role-pill">{a.role}</span>}
                  </div>
                  {a.organization && (
                    <div className="ah-card-org"><Building size={11} /> {a.organization}</div>
                  )}
                  {a.description && <div className="ah-card-desc">{a.description}</div>}
                </div>
                <button className="ah-card-delete" onClick={() => delAct(a.id)} title="Remove">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
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
          <button className="ah-add-btn" onClick={() => { setShowHonForm(v => !v); setShowActForm(false); }}>
            <Plus size={14} /> Add
          </button>
        </div>

        {showHonForm && (
          <form className="ah-form-card" onSubmit={addHon}>
            <div className="ah-form-grid">
              <div className="ah-form-field ah-form-field-wide">
                <label>Award name *</label>
                <input className="ws-input" placeholder="e.g. National Math Olympiad, Best Debater" value={hon.title} onChange={e => setHon({ ...hon, title: e.target.value })} autoFocus />
              </div>
              <div className="ah-form-field">
                <label>Level</label>
                <input className="ws-input" placeholder="e.g. National, International" value={hon.level} onChange={e => setHon({ ...hon, level: e.target.value })} />
              </div>
              <div className="ah-form-field">
                <label>Year</label>
                <input className="ws-input" placeholder="e.g. 2024" value={hon.year} onChange={e => setHon({ ...hon, year: e.target.value })} />
              </div>
            </div>
            <div className="ah-form-field">
              <label>Description (optional)</label>
              <input className="ws-input" placeholder="Brief context about the award" value={hon.description} onChange={e => setHon({ ...hon, description: e.target.value })} />
            </div>
            <div className="ah-form-actions">
              <button type="button" className="ws-btn" onClick={() => setShowHonForm(false)}>Cancel</button>
              <button type="submit" className="ws-btn ws-btn-primary"><Plus size={14} /> Add Honor</button>
            </div>
          </form>
        )}

        {honors.length === 0 && !showHonForm ? (
          <div className="ah-empty">
            <div className="ah-empty-icon ah-empty-icon-gold"><Award size={30} /></div>
            <p className="ah-empty-title">No honors yet</p>
            <p className="ah-empty-sub">Add olympiad medals, competitions, academic awards, or recognitions.</p>
            <button className="ws-btn ws-btn-primary" onClick={() => setShowHonForm(true)}><Plus size={14} /> Add your first honor</button>
          </div>
        ) : (
          <div className="ah-cards">
            {honors.map(h => {
              const lvl = getLevelStyle(h.level);
              return (
                <div className="ah-honor-card" key={h.id}>
                  <div className="ah-honor-icon"><Star size={15} /></div>
                  <div className="ah-card-body">
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
                  <button className="ah-card-delete" onClick={() => delHon(h.id)} title="Remove">
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

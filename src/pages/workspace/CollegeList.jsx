import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, GraduationCap, Sparkles, X } from 'lucide-react';
import LogoTile from '../../components/LogoTile';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCollegeList, updateCollegeListItem, removeFromCollegeList } from '../../api/workspace.js';
import { getRecommendations } from '../../api/nova.js';
import './workspace.css';

const TIERS = [
  { key: 'reach',  label: 'Reach',  hint: 'Dream schools, a stretch to get in' },
  { key: 'match',  label: 'Match',  hint: 'Solid fit for your profile' },
  { key: 'likely', label: 'Likely', hint: 'Strong chance of admission' },
];

export default function CollegeList() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showRecs, setShowRecs] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCollegeList(user.id).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  async function changeTier(id, tier) {
    const updated = await updateCollegeListItem(id, { tier });
    setItems(items.map(i => (i.id === id ? updated : i)));
  }

  async function remove(id) {
    await removeFromCollegeList(id);
    setItems(items.filter(i => i.id !== id));
  }

  async function fetchRecs() {
    setLoadingRecs(true);
    try {
      const { recommendations: text } = await getRecommendations();
      setRecs(text);
      setShowRecs(true);
    } catch (err) {
      setRecs(`Failed to get recommendations: ${err.message}`);
      setShowRecs(true);
    } finally {
      setLoadingRecs(false);
    }
  }

  if (loading) return <div className="ws-loading">Loading your list…</div>;

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">College List</h1>
          <p className="ws-subtitle">{items.length} school{items.length !== 1 ? 's' : ''} on your list</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ws-btn ws-btn-ai" onClick={fetchRecs} disabled={loadingRecs}>
            <Sparkles size={15} /> {loadingRecs ? 'Thinking…' : 'AI Suggestions'}
          </button>
          <Link to="/dashboard/add-schools" className="ws-btn ws-btn-primary">
            <Plus size={16} /> Add schools
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="ws-empty">
          <GraduationCap size={40} />
          <h3>Your college list is empty</h3>
          <p>Browse universities and add them to your list to start tracking.</p>
          <Link to="/dashboard/add-schools" className="ws-btn ws-btn-primary">Browse universities</Link>
        </div>
      ) : (
        <div className="ws-tiers">
          {TIERS.map(tier => {
            const tierItems = items.filter(i => i.tier === tier.key);
            return (
              <div key={tier.key} className="ws-tier">
                <div className="ws-tier-head">
                  <span className={`ws-tier-badge tier-${tier.key}`}>{tier.label}</span>
                  <span className="ws-tier-hint">{tier.hint}</span>
                  <span className="ws-tier-count">{tierItems.length}</span>
                </div>
                {tierItems.length === 0 ? (
                  <p className="ws-tier-empty">No schools here yet.</p>
                ) : (
                  <div className="ws-college-rows">
                    {tierItems.map(item => {
                      const u = item.universities;
                      return (
                        <div key={item.id} className="ws-college-row">
                          <LogoTile item={{
                            logoUrl: u.logo_url, logoStyle: u.logo_style, fallback: u.fallback, name: u.name,
                          }} size={40} radius={10} />
                          <div className="ws-college-info">
                            <div className="ws-college-name">{u.name}</div>
                            <div className="ws-college-meta">{u.location} · {u.acceptance_rate}% acceptance</div>
                          </div>
                          <select
                            className="ws-tier-select"
                            value={item.tier}
                            onChange={e => changeTier(item.id, e.target.value)}
                          >
                            {TIERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                          </select>
                          <button className="ws-icon-btn" onClick={() => remove(item.id)} title="Remove">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showRecs && recs && (
        <div className="ws-feedback-panel" style={{ marginTop: '1.5rem' }}>
          <div className="ws-feedback-header">
            <span><Sparkles size={14} /> Nova's Recommendations</span>
            <button className="ws-icon-btn" onClick={() => setShowRecs(false)}><X size={14} /></button>
          </div>
          <div className="ws-feedback-body">{recs}</div>
        </div>
      )}
    </div>
  );
}

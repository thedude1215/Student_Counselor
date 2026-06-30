import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, GraduationCap, Sparkles, X, ArrowUpDown } from 'lucide-react';
import LogoTile from '../../components/LogoTile';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCollegeList, updateCollegeListItem, removeFromCollegeList } from '../../api/workspace.js';
import { getRecommendations } from '../../api/nova.js';
import './workspace.css';

const TIERS = [
  { key: 'reach',  label: 'Reach' },
  { key: 'match',  label: 'Match' },
  { key: 'likely', label: 'Likely' },
];

export default function CollegeList() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [showRecs, setShowRecs] = useState(false);
  const [sortKey, setSortKey] = useState('tier');

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
      setRecs(text); setShowRecs(true);
    } catch (err) {
      setRecs(`Failed to get recommendations: ${err.message}`); setShowRecs(true);
    } finally { setLoadingRecs(false); }
  }

  const TIER_ORDER = { reach: 0, match: 1, likely: 2 };
  const sorted = [...items].sort((a, b) => {
    if (sortKey === 'tier') return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (sortKey === 'name') return (a.universities?.name || '').localeCompare(b.universities?.name || '');
    if (sortKey === 'rate') return (a.universities?.acceptance_rate || 0) - (b.universities?.acceptance_rate || 0);
    return 0;
  });

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
        <div className="ws-clist-table">
          {/* Column headers */}
          <div className="ws-clist-head">
            <button className="ws-clist-th" onClick={() => setSortKey('name')}>
              College <ArrowUpDown size={12} />
            </button>
            <button className="ws-clist-th" onClick={() => setSortKey('rate')}>
              Acc. rate <ArrowUpDown size={12} />
            </button>
            <button className="ws-clist-th" onClick={() => setSortKey('tier')}>
              Category <ArrowUpDown size={12} />
            </button>
            <div className="ws-clist-th" />
          </div>

          {/* Rows */}
          {sorted.map(item => {
            const u = item.universities;
            return (
              <div key={item.id} className="ws-clist-row">
                {/* College name + logo */}
                <div className="ws-clist-col-name">
                  <LogoTile
                    item={{ logoUrl: u.logo_url, logoStyle: u.logo_style, fallback: u.fallback, name: u.name, short_name: u.short_name }}
                    size={40} radius={10}
                  />
                  <div>
                    <div className="ws-clist-name">{u.name}</div>
                    <div className="ws-clist-city">{u.location}</div>
                  </div>
                </div>

                {/* Acceptance rate */}
                <div className="ws-clist-col-rate">
                  {u.acceptance_rate != null ? `${u.acceptance_rate}%` : '—'}
                </div>

                {/* Tier select styled as pill */}
                <div className="ws-clist-col-tier">
                  <select
                    className={`ws-tier-pill tier-${item.tier}`}
                    value={item.tier}
                    onChange={e => changeTier(item.id, e.target.value)}
                  >
                    {TIERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>

                {/* Delete */}
                <div className="ws-clist-col-actions">
                  <button className="ws-icon-btn" onClick={() => remove(item.id)} title="Remove">
                    <Trash2 size={15} />
                  </button>
                </div>
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

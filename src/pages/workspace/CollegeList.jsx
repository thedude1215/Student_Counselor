import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, GraduationCap, Compass, X, ArrowUpDown, UserRound, Check, Loader2, ArrowRight } from 'lucide-react';
import LogoTile from '../../components/LogoTile';
import UniversitySearchGrid from '../../components/UniversitySearchGrid';
import NovaMascot from '../../components/NovaMascot.jsx';
import Confetti from './Confetti.jsx';
import { SegmentDonut } from './HeroRings.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCollegeList, updateCollegeListItem, removeFromCollegeList, addToCollegeList } from '../../api/workspace.js';
import { getUniversitySuggestions } from '../../api/nova.js';
import { computeFit } from '../../lib/collegeFit.js';
import '../Universities.css';
import './workspace.css';

const TIERS = [
  { key: 'reach',  label: 'Reach' },
  { key: 'match',  label: 'Match' },
  { key: 'likely', label: 'Likely' },
];

// A list is "balanced" once it has at least one of each tier and 4+ schools.
function isListBalanced(list) {
  const r = list.filter(i => i.tier === 'reach').length;
  const m = list.filter(i => i.tier === 'match').length;
  const l = list.filter(i => i.tier === 'likely').length;
  return r >= 1 && m >= 1 && l >= 1 && list.length >= 4;
}

const TABS = [
  { key: 'list',     label: 'Your List' },
  { key: 'discover', label: 'Discover' },
  { key: 'browse',   label: 'Browse All' },
];

export default function CollegeList() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState(null);          // { suggestions, missing_info } | { error }
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [sortKey, setSortKey] = useState('tier');
  const [tab, setTab] = useState('list');
  const [celebrate, setCelebrate] = useState(false);   // confetti when list becomes balanced

  useEffect(() => {
    if (!user) return;
    fetchCollegeList(user.id).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  async function changeTier(id, tier) {
    const wasBalanced = isListBalanced(items);
    const updated = await updateCollegeListItem(id, { tier });
    const next = items.map(i => (i.id === id ? updated : i));
    setItems(next);
    if (!wasBalanced && isListBalanced(next)) setCelebrate(true);
  }

  async function remove(id) {
    await removeFromCollegeList(id);
    setItems(items.filter(i => i.id !== id));
  }

  async function fetchRecs() {
    if (recs && !recs.error) return; // already loaded
    setLoadingRecs(true);
    try {
      const data = await getUniversitySuggestions();
      setRecs(data);
    } catch (err) {
      setRecs({ error: err.message });
    } finally { setLoadingRecs(false); }
  }

  // Load Nova suggestions when opening the Discover tab;
  // refresh the list when returning (Browse All can add schools)
  useEffect(() => {
    if (tab === 'discover' && !recs && !loadingRecs) fetchRecs();
    if (tab === 'list' && user) fetchCollegeList(user.id).then(setItems).catch(console.error);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addSuggestion(s) {
    if (!s.university_id || addedIds.has(s.university_id)) return;
    setAddingId(s.university_id);
    try {
      const item = await addToCollegeList(user.id, s.university_id, s.tier);
      setItems(prev => [...prev, item]);
      setAddedIds(prev => new Set(prev).add(s.university_id));
    } catch (err) {
      console.error('Failed to add suggestion:', err);
    } finally { setAddingId(null); }
  }

  const TIER_ORDER = { reach: 0, match: 1, likely: 2 };
  const sorted = [...items].sort((a, b) => {
    if (sortKey === 'tier') return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (sortKey === 'name') return (a.universities?.name || '').localeCompare(b.universities?.name || '');
    if (sortKey === 'rate') return (a.universities?.acceptance_rate || 0) - (b.universities?.acceptance_rate || 0);
    return 0;
  });

  if (loading) return <div className="ws-loading">Loading your list…</div>;

  const suggestions = recs?.suggestions || [];
  const missingInfo = recs?.missing_info || [];
  const listAnalysis = recs?.list_analysis || null;

  // ── List-at-a-glance stats ──
  const reachCount  = items.filter(i => i.tier === 'reach').length;
  const matchCount  = items.filter(i => i.tier === 'match').length;
  const likelyCount = items.filter(i => i.tier === 'likely').length;
  const total = items.length;
  const balanced = isListBalanced(items);
  const balanceRead =
    total === 0                                   ? 'Add schools to start building a balanced list'
    : balanced                                    ? 'Well-balanced across reach, match & likely'
    : likelyCount === 0                           ? 'No likely schools yet — add a safe bet'
    : matchCount === 0                            ? 'Add a few match schools to anchor your list'
    : reachCount > matchCount + likelyCount       ? 'Reach-heavy — balance with matches & likelies'
    : 'Keep balancing across reach, match & likely';

  return (
    <div className="ws-section ah-page">
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      {/* ── Forest hero stat band ── */}
      <div className="ah-hero">
        <div className="ah-hero-main">
          <span className="ah-hero-eyebrow"><span className="ah-hero-dot" /> Your college list</span>
          <h1 className="ah-hero-title">College List</h1>
          <p className="ah-hero-sub">{total} school{total !== 1 ? 's' : ''} · {balanceRead}{balanced ? ' ✓' : ''}</p>

          <div className="ah-hero-actions">
            <button className="ah-hero-btn ghost" onClick={() => setTab('discover')} disabled={loadingRecs}>
              {loadingRecs ? <Loader2 size={15} className="ws-spin" /> : <NovaMascot size={16} />}
              {loadingRecs ? 'Thinking…' : 'AI Suggestions'}
            </button>
            <button className="ah-hero-btn solid" onClick={() => setTab('browse')}>
              <Plus size={15} /> Add schools
            </button>
          </div>
        </div>
        <div className="ah-hero-right cl-hero-right">
          <div className="ah-hero-mascot cl-hero-mascot"><NovaMascot size={38} idle /></div>
          <div className="cl-donut-wrap">
            <SegmentDonut
              segments={[
                { value: reachCount, color: '#F87171' },
                { value: matchCount, color: '#FBBF24' },
                { value: likelyCount, color: '#4ADE80' },
              ]}
              total={total}
              centerBig={total}
              centerCap="SCHOOLS"
            />
            <div className="cl-donut-legend">
              <span className="cl-leg"><span className="cl-leg-dot" style={{ background: '#F87171' }} />{reachCount} reach</span>
              <span className="cl-leg"><span className="cl-leg-dot" style={{ background: '#FBBF24' }} />{matchCount} match</span>
              <span className="cl-leg"><span className="cl-leg-dot" style={{ background: '#4ADE80' }} />{likelyCount} likely</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ws-clist-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`ws-clist-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'list' && items.length > 0 && <span className="ws-clist-tab-count">{items.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Nova suggestions panel (Discover tab) ── */}
      {tab === 'discover' && loadingRecs && (
        <div className="ws-loading"><Loader2 size={18} className="ws-spin" /> Nova is analyzing your profile…</div>
      )}
      {tab === 'discover' && recs && !loadingRecs && (
        <div className="ws-feedback-panel ws-recs-panel">
          <div className="ws-feedback-header">
            <span><NovaMascot size={16} /> Nova's Suggestions</span>
            <button className="ws-icon-btn" onClick={() => setTab('list')}><X size={14} /></button>
          </div>

          {recs.error && (
            <div className="ws-feedback-body">Failed to get suggestions: {recs.error}</div>
          )}

          {!recs.error && missingInfo.length > 0 && (
            <div className="ws-recs-missing">
              <div className="ws-recs-missing-head">
                <UserRound size={14} />
                {suggestions.length
                  ? 'These will get sharper once Nova knows more about you:'
                  : 'To give you accurate tier placements, Nova needs a bit more from your profile:'}
              </div>
              <ul>
                {missingInfo.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
              <Link to="/dashboard/profile" className="ws-btn ws-btn-primary ws-recs-profile-btn">
                Complete your profile
              </Link>
            </div>
          )}

          {!recs.error && listAnalysis && (
            <div className="ws-recs-list-analysis">
              <div className="ws-recs-list-analysis-head">
                <span className="ws-recs-list-analysis-title">Your List · Nova's Take</span>
                <div className="ws-recs-tier-counts">
                  <span className="ws-recs-tier-count tier-reach">{listAnalysis.reach_count} reach</span>
                  <span className="ws-recs-tier-count tier-match">{listAnalysis.match_count} match</span>
                  <span className="ws-recs-tier-count tier-likely">{listAnalysis.likely_count} likely</span>
                </div>
              </div>
              <p className="ws-recs-list-advice">{listAnalysis.overall_advice}</p>
              {listAnalysis.tier_flags?.length > 0 && (
                <div className="ws-recs-tier-flags">
                  {listAnalysis.tier_flags.map((f, i) => (
                    <div key={i} className="ws-recs-tier-flag">
                      <span className="ws-recs-tier-flag-name">{f.name}</span>
                      <span className={`ws-tier-pill tier-${f.current_tier}`}>{f.current_tier}</span>
                      {f.suggested_tier && f.suggested_tier !== f.current_tier && (
                        <>
                          <span className="ws-recs-tier-flag-arrow">→</span>
                          <span className={`ws-tier-pill tier-${f.suggested_tier}`}>{f.suggested_tier}</span>
                        </>
                      )}
                      <span className="ws-recs-tier-flag-note">{f.note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!recs.error && suggestions.length > 0 && (
            <div className="ws-recs-cards">
              {suggestions.map((s, i) => {
                const added = addedIds.has(s.university_id);
                return (
                  <div key={s.university_id || i} className="ws-recs-card" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="ws-recs-card-head">
                      <span className="ws-recs-name">{s.name}</span>
                      <div className="ws-recs-card-head-right">
                        <span className={`ws-tier-pill tier-${s.tier}`}>{s.tier.charAt(0).toUpperCase() + s.tier.slice(1)}</span>
                        <button
                          className={`ws-recs-add-btn ${added ? 'added' : addingId === s.university_id ? 'loading' : ''}`}
                          onClick={() => addSuggestion(s)}
                          disabled={added || addingId === s.university_id}
                          title={added ? 'On your list' : 'Add to list'}
                        >
                          {added
                            ? <><Check size={12} /> Added</>
                            : addingId === s.university_id
                              ? <Loader2 size={13} className="ws-spin" />
                              : <Plus size={14} />}
                        </button>
                      </div>
                    </div>
                    <p className="ws-recs-rationale">{s.rationale}</p>
                    {s.fit_highlights?.length > 0 && (
                      <ul className="ws-recs-highlights">
                        {s.fit_highlights.map((h, j) => <li key={j}>{h}</li>)}
                      </ul>
                    )}
                    {s.strategy_note && (
                      <p className="ws-recs-strategy"><Compass size={11} /> {s.strategy_note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Browse All tab — embedded university search ── */}
      {tab === 'browse' && (
        <div className="ws-browse-embed">
          <UniversitySearchGrid />
        </div>
      )}

      {/* ── Your List tab ── */}
      {tab === 'list' && (items.length === 0 ? (
        <div className="ws-empty">
          <GraduationCap size={40} />
          <h3>Your college list is empty</h3>
          <p>Browse universities and add them to your list to start tracking.</p>
          <button className="ws-btn ws-btn-primary" onClick={() => setTab('browse')}>Browse universities</button>
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
            <div className="ws-clist-th ws-clist-th-static">Nova fit</div>
            <button className="ws-clist-th" onClick={() => setSortKey('tier')}>
              Your tier <ArrowUpDown size={12} />
            </button>
            <div className="ws-clist-th" />
          </div>

          {/* Rows */}
          {sorted.map(item => {
            const u = item.universities;
            const fit = computeFit(u, profile);
            return (
              <div key={item.id} className="ws-clist-row">
                {/* College name + logo */}
                <div className="ws-clist-col-name">
                  <LogoTile
                    item={{ logoUrl: u.logo_url, logoStyle: u.logo_style, fallback: u.fallback, name: u.name, short_name: u.short_name }}
                    size={40} radius={10}
                  />
                  <div className="ws-clist-name-wrap">
                    <div className="ws-clist-name">{u.name}</div>
                    <div className="ws-clist-city">{u.location}</div>
                    <Link
                      to="/nova"
                      state={{ prompt: `What are my chances of getting into ${u.name}? Be honest about my profile's strengths and gaps.` }}
                      className="ws-clist-chances"
                    >
                      <NovaMascot size={13} /> See my chances <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>

                {/* Acceptance rate */}
                <div className="ws-clist-col-rate">
                  {u.acceptance_rate != null ? `${u.acceptance_rate}%` : '—'}
                </div>

                {/* Computed fit tag */}
                <div className="ws-clist-col-fit">
                  {fit ? (
                    <span
                      className="ws-fit-tag"
                      style={{ color: fit.color, background: fit.bg, borderColor: fit.border }}
                      title="Nova's computed fit from your GPA/SAT vs. admission rate"
                    >
                      {fit.label}
                    </span>
                  ) : <span className="ws-clist-col-rate">—</span>}
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
      ))}
    </div>
  );
}

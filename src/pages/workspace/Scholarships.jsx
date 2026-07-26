import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Globe, ExternalLink, Search, ArrowRight, Bookmark, Check, Sparkle, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchTasks, addTask, fetchScholarships } from '../../api/workspace.js';
import { getScholarshipMatches } from '../../api/nova.js';
import NovaMascot from '../../components/NovaMascot.jsx';
import Confetti from './Confetti.jsx';
import { SCHOLARSHIP_TYPES } from '../../data/scholarships.js';
import './workspace.css';

function fmtAmount(s) {
  const k = v => v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;
  if (s.amountMin && s.amountMax) return `${k(s.amountMin)} – ${k(s.amountMax)}`;
  if (s.amountMin) return `${k(s.amountMin)}+`;
  return s.amountText;
}

function fmtDeadline(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso) {
  return Math.round((new Date(iso + 'T00:00:00') - new Date(new Date().toDateString())) / 86_400_000);
}

const TYPE_TONE = {
  'Full Ride':        { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  'Merit':            { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'Need-Based':       { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  'Fellowship':       { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  'Country-Specific': { bg: '#FDF2F8', color: '#BE185D', border: '#FBCFE8' },
};

const TIER_GROUPS = [
  { key: 'strong',   label: 'Strong matches',  sub: "You're competitive — prioritize these." },
  { key: 'possible', label: 'Possible matches', sub: 'Realistic targets worth a real look.' },
  { key: 'stretch',  label: 'Worth a shot',     sub: 'A high bar, but not out of reach.' },
];

const taskTitle = (s) => `Apply: ${s.name}`;

export default function Scholarships() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);

  const [matchMap, setMatchMap] = useState({});     // id -> { match_score, tier, rationale, why_fits }
  const [ineligible, setIneligible] = useState(new Set());
  const [missingInfo, setMissingInfo] = useState([]);
  const [ranking, setRanking] = useState(false);
  const [rankError, setRankError] = useState('');
  const [hasRanked, setHasRanked] = useState(false);
  const [celebrate, setCelebrate] = useState(false);   // confetti when a fresh rank finds a strong match

  const [savedNames, setSavedNames] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [type, setType] = useState('All');
  const [query, setQuery] = useState('');

  const rank = useCallback(async (force) => {
    setRanking(true);
    setRankError('');
    try {
      const data = await getScholarshipMatches({ force });
      const map = {};
      for (const m of data.matches || []) map[m.scholarship_id] = m;
      setMatchMap(map);
      setIneligible(new Set(data.ineligible_ids || []));
      setMissingInfo(data.missing_info || []);
      setHasRanked((data.matches || []).length > 0);
      // Celebrate a freshly-computed ranking that surfaced a strong match.
      if (!data.cached && (data.matches || []).some(m => m.tier === 'strong')) setCelebrate(true);
    } catch {
      // Scoring is temporarily unavailable (e.g. LLM quota). Degrade gracefully:
      // the full catalog still renders unranked, with a calm note.
      setRankError('Nova is ranking-busy right now — showing all scholarships. Try “Rank my matches” again in a bit.');
    } finally {
      setRanking(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchScholarships(), fetchTasks(user.id)])
      .then(([list, tasks]) => {
        setScholarships(list);
        setSavedNames(new Set(tasks.map(t => t.title)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    rank(false);
  }, [user, rank]);

  async function save(e, s) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || savedNames.has(taskTitle(s))) return;
    setSavingId(s.id);
    try {
      await addTask(user.id, {
        title: taskTitle(s),
        due_date: s.deadline,
        category: 'Financial Aid',
        priority: 'high',
      });
      setSavedNames(prev => new Set([...prev, taskTitle(s)]));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  const todayStr = new Date().toLocaleDateString('en-CA');
  const closingSoon = [...scholarships]
    .filter(s => s.deadline && s.deadline >= todayStr && !ineligible.has(s.id))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);

  // Eligible catalog after the deterministic gate, with the text/type filters applied.
  const visible = scholarships
    .filter(s => !ineligible.has(s.id))
    .filter(s => type === 'All' || s.type === type)
    .filter(s => {
      if (!query) return true;
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.org.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    });

  const ineligibleCount = scholarships.filter(s => ineligible.has(s.id)).length;

  const renderCard = (s) => {
    const tone = TYPE_TONE[s.type] || TYPE_TONE['Merit'];
    const days = daysUntil(s.deadline);
    const closing = days >= 0 && days <= 45;
    const saved = savedNames.has(taskTitle(s));
    const match = matchMap[s.id];
    return (
      <a key={s.id} href={s.link} target="_blank" rel="noreferrer" className="ws-sch-card">
        <div className="ws-sch-card-head">
          <div className="ws-sch-card-titles">
            <span className="ws-sch-card-name">{s.name}</span>
            <span className="ws-sch-card-org">{s.org}</span>
          </div>
          <div className="ws-sch-card-actions">
            {match && <span className={`ws-sch-score tier-${match.tier}`}>{match.match_score}% fit</span>}
            <button
              className={`ws-sch-save ${saved ? 'saved' : ''}`}
              onClick={(e) => save(e, s)}
              disabled={saved || savingId === s.id}
              title={saved ? 'Deadline tracked in Tasks' : 'Track deadline in Tasks'}
            >
              {saved ? <Check size={14} /> : <Bookmark size={14} />}
              {saved ? 'Tracked' : savingId === s.id ? 'Saving…' : 'Track'}
            </button>
            <ExternalLink size={14} className="ws-sch-card-ext" />
          </div>
        </div>

        <div className="ws-sch-card-tags">
          <span className="ws-sch-type-tag" style={{ background: tone.bg, color: tone.color, borderColor: tone.border }}>
            {s.type.toUpperCase()}
          </span>
          {s.essayRequired && <span className="ws-sch-req" title="Essay required"><PenLine size={12} /> Essay</span>}
          <span className="ws-sch-req" title="Open to international students"><Globe size={12} /> International</span>
        </div>

        <p className="ws-sch-card-desc">{s.description}</p>

        {match?.rationale && (
          <div className="ws-sch-rationale">
            <NovaMascot size={16} />
            <span>{match.rationale}</span>
          </div>
        )}

        <div className="ws-sch-card-foot">
          <span className="ws-sch-amount">{fmtAmount(s)}</span>
          <span className="ws-sch-sep">|</span>
          <span className={`ws-sch-deadline ${closing ? 'closing' : ''}`}>
            {fmtDeadline(s.deadline)}
            {closing && ` · ${days}d left`}
          </span>
          {match?.why_fits && <span className="ws-sch-why">{match.why_fits}</span>}
        </div>
      </a>
    );
  };

  // Group the visible set by match tier when we have a ranking; else a flat list.
  const grouped = TIER_GROUPS.map(g => ({
    ...g,
    items: visible
      .filter(s => matchMap[s.id]?.tier === g.key)
      .sort((a, b) => (matchMap[b.id].match_score) - (matchMap[a.id].match_score)),
  })).filter(g => g.items.length);

  return (
    <div className="ws-section">
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}
      {/* Hero */}
      <div className="ws-sch-hero">
        <div className="ws-sch-hero-body">
          <span className="ws-sch-ai-badge"><NovaMascot size={16} /> Nova-matched</span>
          <h1 className="ws-sch-hero-title">Scholarships ranked for you</h1>
          <p className="ws-sch-hero-sub">Nova scores every award against your profile, activities, and honors — then filters out anything you're not eligible for.</p>
          <button className="ws-btn ws-btn-primary ws-sch-hero-cta" onClick={() => rank(true)} disabled={ranking}>
            {ranking
              ? <><Loader2 size={15} className="ws-spin" /> Ranking…</>
              : hasRanked
                ? <><RefreshCw size={15} /> Re-rank my matches</>
                : <><Sparkle size={15} /> Rank my matches</>}
          </button>
        </div>
        <div className="ws-sch-hero-art" aria-hidden="true">
          <NovaMascot size={84} animated={ranking} />
          <span className="ws-sch-hero-sticker">Full rides inside</span>
        </div>
      </div>

      {/* Profile-too-thin nudge */}
      {missingInfo.length > 0 && (
        <div className="ws-sch-missing">
          <strong>Complete your profile to unlock ranked matches.</strong>
          <ul>{missingInfo.map((m, i) => <li key={i}>{m}</li>)}</ul>
          <Link to="/dashboard/profile" className="ws-btn ws-btn-primary">Complete profile <ArrowRight size={15} /></Link>
        </div>
      )}

      {rankError && <div className="ws-sch-rank-error">{rankError}</div>}

      {/* Closing soon */}
      {closingSoon.length > 0 && (
        <div className="ws-sch-closing">
          <div className="ws-sch-closing-head">Closing soon</div>
          <div className="ws-sch-closing-row">
            {closingSoon.map(s => {
              const days = daysUntil(s.deadline);
              const saved = savedNames.has(taskTitle(s));
              return (
                <a key={s.id} href={s.link} target="_blank" rel="noreferrer" className="ws-sch-closing-card">
                  <span className="ws-sch-closing-days">{days}d</span>
                  <div className="ws-sch-closing-body">
                    <span className="ws-sch-closing-name">{s.name}</span>
                    <span className="ws-sch-closing-meta">{fmtAmount(s)} · {fmtDeadline(s.deadline)}</span>
                  </div>
                  <button
                    className={`ws-sch-save ${saved ? 'saved' : ''}`}
                    onClick={(e) => save(e, s)}
                    disabled={saved || savingId === s.id}
                    title={saved ? 'Deadline tracked in Tasks' : 'Track deadline in Tasks'}
                  >
                    {saved ? <Check size={14} /> : <Bookmark size={14} />}
                  </button>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="ws-sch-filters">
        <div className="ws-sch-search">
          <Search size={15} />
          <input
            placeholder="Search scholarships…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="ws-sch-chips">
          {SCHOLARSHIP_TYPES.map(t => (
            <button key={t} className={`ws-sch-chip ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="ws-loading">Loading scholarships…</div>
      ) : visible.length === 0 ? (
        <div className="ws-empty">
          <NovaMascot size={48} />
          <h3>No scholarships match</h3>
          <p>Try a different type or clear your search.</p>
        </div>
      ) : hasRanked ? (
        grouped.map(g => (
          <div key={g.key} className="ws-sch-tier-group">
            <div className="ws-sch-tier-head">
              <h2 className={`ws-sch-tier-title tier-${g.key}`}>{g.label}</h2>
              <span className="ws-sch-tier-sub">{g.sub}</span>
            </div>
            <div className="ws-sch-grid">{g.items.map(renderCard)}</div>
          </div>
        ))
      ) : (
        <div className="ws-sch-grid">{visible.map(renderCard)}</div>
      )}

      {ineligibleCount > 0 && (
        <p className="ws-sch-filtered-note">
          {ineligibleCount} award{ineligibleCount === 1 ? '' : 's'} hidden — graduate-level or not open to your profile.
        </p>
      )}
    </div>
  );
}

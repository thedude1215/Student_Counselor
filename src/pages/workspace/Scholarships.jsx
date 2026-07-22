import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, PenLine, Globe, ExternalLink, Search, ArrowRight } from 'lucide-react';
import { SCHOLARSHIPS, SCHOLARSHIP_TYPES } from '../../data/scholarships.js';
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

export default function Scholarships() {
  const [type, setType] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = SCHOLARSHIPS
    .filter(s => type === 'All' || s.type === type)
    .filter(s => {
      if (!query) return true;
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.org.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  return (
    <div className="ws-section">
      {/* Hero */}
      <div className="ws-sch-hero">
        <div className="ws-sch-hero-body">
          <span className="ws-sch-ai-badge"><Sparkles size={13} /> Nova-matched</span>
          <h1 className="ws-sch-hero-title">Find scholarships that fit you</h1>
          <p className="ws-sch-hero-sub">Curated opportunities for international students — tailored to your background and goals.</p>
          <Link
            to="/nova"
            state={{ prompt: 'Which scholarships am I most competitive for as an international student? Consider my profile and college list.' }}
            className="ws-btn ws-btn-primary ws-sch-hero-cta"
          >
            Ask Nova which fit me <ArrowRight size={15} />
          </Link>
        </div>
        <div className="ws-sch-hero-art" aria-hidden="true">
          <Globe size={68} strokeWidth={1} />
        </div>
      </div>

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

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="ws-empty">
          <Sparkles size={40} />
          <h3>No scholarships match</h3>
          <p>Try a different type or clear your search.</p>
        </div>
      ) : (
        <div className="ws-sch-grid">
          {filtered.map(s => {
            const tone = TYPE_TONE[s.type] || TYPE_TONE['Merit'];
            const days = daysUntil(s.deadline);
            const closing = days >= 0 && days <= 45;
            return (
              <a key={s.id} href={s.link} target="_blank" rel="noreferrer" className="ws-sch-card">
                <div className="ws-sch-card-head">
                  <div className="ws-sch-card-titles">
                    <span className="ws-sch-card-name">{s.name}</span>
                    <span className="ws-sch-card-org">{s.org}</span>
                  </div>
                  <ExternalLink size={14} className="ws-sch-card-ext" />
                </div>

                <div className="ws-sch-card-tags">
                  <span className="ws-sch-type-tag" style={{ background: tone.bg, color: tone.color, borderColor: tone.border }}>
                    {s.type.toUpperCase()}
                  </span>
                  {s.essayRequired && <span className="ws-sch-req" title="Essay required"><PenLine size={12} /> Essay</span>}
                  <span className="ws-sch-req" title="Open to international students"><Globe size={12} /> International</span>
                </div>

                <p className="ws-sch-card-desc">{s.description}</p>

                <div className="ws-sch-card-foot">
                  <span className="ws-sch-amount">{fmtAmount(s)}</span>
                  <span className="ws-sch-sep">|</span>
                  <span className={`ws-sch-deadline ${closing ? 'closing' : ''}`}>
                    {fmtDeadline(s.deadline)}
                    {closing && ` · ${days}d left`}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

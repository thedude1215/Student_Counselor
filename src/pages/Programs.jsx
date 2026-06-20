import { useState } from 'react';
import { Search, Calendar, Clock, ExternalLink } from 'lucide-react';
import LogoTile from '../components/LogoTile';
import { programs } from '../api/catalog';
import './Programs.css';

const DISCIPLINES = ['All','STEM','Math','Computer Science','Biology','Engineering','Leadership','Humanities','Policy'];
const COSTS = [['All','All costs'],['free','Free only'],['paid','Paid']];
const TYPES = ['All','Research','Summer Program','Fellowship','Competition + Research'];

export default function Programs() {
  const [query, setQuery]       = useState('');
  const [disc, setDisc]         = useState('All');
  const [cost, setCost]         = useState('All');
  const [type, setType]         = useState('All');

  const filtered = programs.filter(p => {
    const q = query.toLowerCase();
    const mQ = p.name.toLowerCase().includes(q) || p.host.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const mD = disc === 'All' || p.discipline.includes(disc);
    const mC = cost === 'All' || p.costType === cost;
    const mT = type === 'All' || p.type === type;
    return mQ && mD && mC && mT;
  });

  const freeCount = programs.filter(p => p.costType === 'free').length;

  return (
    <div className="prog-page">
      <div className="prog-top">
        <div className="wrap">
          <h1 className="page-h1">Programs</h1>
          <p className="page-sub">
            {programs.length} summer &amp; research programs for high school students.{' '}
            <strong>{freeCount} are completely free.</strong>
          </p>
          <div className="search-bar" style={{ maxWidth: 520, marginBottom: '0.75rem' }}>
            <Search size={16} />
            <input
              id="programs-search"
              placeholder="Search programs, universities, disciplines..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {DISCIPLINES.map(d => (
              <button key={d} className={`chip ${disc === d ? 'active' : ''}`}
                onClick={() => setDisc(d)}>{d}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="prog-filter-bar">
          <div className="chips">
            {TYPES.map(t => (
              <button key={t} className={`chip ${type === t ? 'active' : ''}`}
                onClick={() => setType(t)}>{t}</button>
            ))}
          </div>
          <div className="chips">
            {COSTS.map(([v, l]) => (
              <button key={v} className={`chip ${cost === v ? 'active' : ''}`}
                onClick={() => setCost(v)}>{l}</button>
            ))}
          </div>
          <span className="result-ct">{filtered.length} programs</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔬</div>
            <h3>No programs found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="prog-list">
            {filtered.map(p => (
              <div key={p.id} className="prog-row">
                <div className="prog-row-left">
                  <LogoTile item={p} size={48} radius={10} />
                </div>
                <div className="prog-row-body">
                  <div className="prog-row-meta">
                    <span className={`prog-type-badge ${p.costType === 'free' ? 'free' : ''}`}>
                      {p.type}
                    </span>
                    <span className={`prog-cost ${p.costType === 'free' ? 'free-cost' : ''}`}>
                      {p.costType === 'free' ? '🎁 Free' : p.cost}
                    </span>
                  </div>
                  <div className="prog-row-host">{p.host}</div>
                  <h3 className="prog-row-name">{p.name}</h3>
                  <p className="prog-row-desc">{p.description}</p>
                  <div className="prog-row-details">
                    <span><Calendar size={12} /> {p.dates}</span>
                    <span><Clock size={12} /> {p.duration}</span>
                    <span>Acceptance: {p.acceptance}</span>
                  </div>
                  <div className="prog-row-tags">
                    {p.tags.slice(0,3).map(t => <span key={t} className="tag tag-gray">{t}</span>)}
                  </div>
                </div>
                <div className="prog-row-right">
                  <div className="prog-deadline-label">Deadline</div>
                  <div className="prog-deadline-date">{p.deadline}</div>
                  <a href={p.link} target="_blank" rel="noreferrer" className="btn btn-blue btn-sm">
                    Apply <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

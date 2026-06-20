import { useState } from 'react';
import { Search, MapPin, Star } from 'lucide-react';
import LogoTile from '../components/LogoTile';
import { universities } from '../api/catalog';
import './Universities.css';

const COUNTRIES = ['All','United States','United Kingdom','Canada','Switzerland','Singapore','United Arab Emirates'];
const TAGS = ['All','Engineering','Liberal Arts','Research','Medicine','Business','Technology','STEM'];

export default function Universities() {
  const [query, setQuery]   = useState('');
  const [country, setCountry] = useState('All');
  const [tag, setTag]       = useState('All');
  const [aidOnly, setAidOnly] = useState(false);

  const filtered = universities.filter(u => {
    const q = query.toLowerCase();
    const mQ = u.name.toLowerCase().includes(q) || u.location.toLowerCase().includes(q);
    const mC = country === 'All' || u.country === country;
    const mT = tag === 'All' || u.tags.includes(tag);
    const mA = !aidOnly || u.financialAid;
    return mQ && mC && mT && mA;
  });

  return (
    <div className="uni-page">
      <div className="uni-top">
        <div className="wrap">
          <h1 className="page-h1">Universities</h1>
          <p className="page-sub">Browse and compare universities across 40+ countries.</p>
          <div className="search-bar uni-search">
            <Search size={16} />
            <input
              id="uni-search"
              placeholder="Search universities, countries..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {TAGS.map(t => (
              <button key={t} className={`chip ${tag === t ? 'active' : ''}`}
                onClick={() => setTag(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="uni-filter-bar">
          <select id="uni-country" className="sel" value={country} onChange={e => setCountry(e.target.value)}>
            {COUNTRIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <label className="aid-toggle">
            <input type="checkbox" checked={aidOnly} onChange={e => setAidOnly(e.target.checked)} />
            Financial aid available
          </label>
          <span className="result-ct">{filtered.length} universities</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎓</div>
            <h3>No universities found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="uni-grid">
            {filtered.map(u => (
              <div key={u.id} className="uni-card">
                <div className="uni-card-top">
                  <LogoTile item={u} size={48} radius={12} />
                  <div className="uni-card-rank">
                    <Star size={10} fill="currentColor" /> #{u.ranking}
                  </div>
                </div>
                <div className="uni-card-name">{u.name}</div>
                <div className="uni-card-loc"><MapPin size={11} /> {u.location}</div>
                <p className="uni-card-desc">{u.description}</p>
                <div className="uni-card-stats">
                  <div className="uni-stat">
                    <div className="uni-stat-v">{u.acceptanceRate}%</div>
                    <div className="uni-stat-l">Acceptance</div>
                  </div>
                  <div className="uni-stat">
                    <div className="uni-stat-v">{u.tuition === 0 ? 'Free' : `$${Math.round(u.tuition/1000)}k`}</div>
                    <div className="uni-stat-l">Tuition/yr</div>
                  </div>
                  <div className="uni-stat">
                    <div className="uni-stat-v">{u.size}</div>
                    <div className="uni-stat-l">Size</div>
                  </div>
                </div>
                <div className="uni-card-tags">
                  {u.tags.slice(0,3).map(t => <span key={t} className="tag tag-gray">{t}</span>)}
                  {u.financialAid && <span className="tag tag-green">Aid</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

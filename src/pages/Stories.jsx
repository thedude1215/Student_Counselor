import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import LogoTile from '../components/LogoTile';
import { fetchStories } from '../api/catalog';
import './Stories.css';

const FILTERS = ['All','Full Scholarship','Ivy League','UK','Asia','Research','Africa','Latin America','Engineering'];

const ROW_COLORS = [
  { bg:'#EDE9FF', border:'#D5CEEE' },
  { bg:'#FEF1E6', border:'#F5DFC5' },
  { bg:'#E5EAFF', border:'#C5CBEE' },
  { bg:'#FFE8E6', border:'#F5C4BE' },
  { bg:'#E8F5EF', border:'#C8E8D8' },
  { bg:'#FFF8E6', border:'#F0E5C8' },
  { bg:'#EDE9FF', border:'#D5CEEE' },
  { bg:'#FEF1E6', border:'#F5DFC5' },
];

export default function Stories() {
  const [query, setQuery]     = useState('');
  const [tab, setTab]         = useState('Stories');
  const [filter, setFilter]   = useState('All');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStories({
      q: query || undefined,
      tag: filter !== 'All' ? filter : undefined,
    })
      .then(setStories)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, filter]);

  return (
    <div className="stories-page">
      <div className="stories-top wrap">

        <div className="tab-bar stories-tabs">
          {['Stories', 'Playlists'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <div className="search-bar stories-search">
          <Search size={16} />
          <input
            id="stories-search"
            placeholder="Search for stories..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="chips" style={{ marginBottom: '1.75rem' }}>
          {FILTERS.map(f => (
            <button key={f} className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="stories-body wrap">
        {loading ? (
          <div className="empty"><p>Loading…</p></div>
        ) : stories.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <h3>No stories found</h3>
            <p>Try a different search or filter</p>
          </div>
        ) : (
          <div className="story-rows">
            {stories.map((s, idx) => {
              const c = ROW_COLORS[idx % ROW_COLORS.length];
              return (
                <div key={s.id} className="story-row"
                  style={{ background: c.bg, borderColor: c.border }}>
                  <img
                    src={s.photo}
                    alt={s.name}
                    className="story-row-photo"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div className="story-row-content">
                    <div className="story-row-uni">
                      <LogoTile item={{
                        logoUrl: s.university_logo_url,
                        logoStyle: s.university_logo_style,
                        fallback: s.fallback || s.university_logo,
                        name: s.university,
                      }} size={32} radius={8} />
                      <div className="story-row-uni-info">
                        <div className="story-row-uni-name">{s.university} {s.flag}</div>
                        <div className="story-row-uni-loc">{s.location}</div>
                      </div>
                    </div>
                    <h2 className="story-row-title">{s.title}</h2>
                    <div className="story-row-by">
                      <img
                        src={s.photo}
                        alt=""
                        className="story-row-avatar"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      by <strong>{s.name.split(' ')[0]}</strong> from {s.country} {s.flag}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

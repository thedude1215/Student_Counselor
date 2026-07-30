import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Plus, Check, SlidersHorizontal, X, ChevronDown, Stamp, Globe, ArrowRight } from 'lucide-react';
import LogoTile from './LogoTile';
import NovaMascot from './NovaMascot';
import { fetchUniversities } from '../api/catalog';
import { fetchCollegeList, addToCollegeList } from '../api/workspace';
import { useAuth } from '../context/AuthContext';
import { getBrandColor, hexToRgb } from '../lib/brandColors';

/* Each card's offset shadow is that university's real brand colour, so the
 * grid reads as a wall of school identity rather than 30 identical white
 * rectangles.
 *
 * This deliberately differs from the essay rail, where per-university tint was
 * removed: there the school was incidental and the wash fought the palette.
 * Here the school IS the content, and the colour lives in the shadow rather
 * than the surface, so text contrast is untouched. */
function stickerStyle(uni) {
  const [r, g, b] = hexToRgb(getBrandColor(uni));
  return {
    '--uni-brand': `rgba(${r},${g},${b},0.24)`,
  };
}

const REGIONS = {
  'All Regions': [],
  'North America': ['United States', 'Canada', 'Mexico', 'Puerto Rico'],
  'Europe': ['United Kingdom', 'Germany', 'France', 'Netherlands', 'Switzerland', 'Italy', 'Spain', 'Sweden', 'Denmark', 'Finland', 'Norway', 'Ireland', 'Belgium', 'Austria', 'Poland', 'Czech Republic', 'Portugal', 'Estonia', 'Iceland', 'Greece', 'Croatia', 'Slovenia', 'Serbia', 'Hungary', 'Romania', 'Lithuania', 'Latvia', 'Russia'],
  'Asia': ['China', 'Japan', 'South Korea', 'India', 'Singapore', 'Hong Kong', 'Taiwan', 'Malaysia', 'Thailand', 'Philippines', 'Indonesia', 'Vietnam', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Cambodia', 'Laos', 'Myanmar', 'Mongolia', 'Nepal', 'Bhutan', 'Brunei'],
  'Middle East': ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Israel', 'Turkey', 'Lebanon', 'Egypt'],
  'Oceania': ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea'],
  'Africa': ['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Rwanda', 'Uganda', 'Tanzania', 'Ethiopia', 'Morocco', 'Tunisia', 'Botswana', 'Mauritius'],
  'Latin America': ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Costa Rica', 'Peru', 'Venezuela', 'Jamaica', 'Trinidad and Tobago'],
};

const TAGS = ['All','Engineering','Computer Science','Business','Medicine','Liberal Arts','Sciences','Research','Technology','STEM','Law','Architecture','Art','AI','Economics'];

const TUITION_RANGES = [
  { label: 'Any tuition', min: null, max: null },
  { label: 'Free', min: null, max: 0 },
  { label: 'Under $5k', min: null, max: 5000 },
  { label: 'Under $15k', min: null, max: 15000 },
  { label: 'Under $30k', min: null, max: 30000 },
  { label: '$30k+', min: 30000, max: null },
];

const ACCEPTANCE_RANGES = [
  { label: 'Any selectivity', min: null, max: null },
  { label: 'Ultra selective (<10%)', min: null, max: 10 },
  { label: 'Highly selective (<25%)', min: null, max: 25 },
  { label: 'Selective (<50%)', min: null, max: 50 },
  { label: 'Accessible (50%+)', min: 50, max: null },
];

const SORT_OPTIONS = [
  { value: 'ranking', label: 'Ranking' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'acceptance_asc', label: 'Most selective' },
  { value: 'acceptance_desc', label: 'Least selective' },
  { value: 'tuition_asc', label: 'Lowest tuition' },
  { value: 'tuition_desc', label: 'Highest tuition' },
];

const ITEMS_PER_PAGE = 30;

function parseRankNum(r) {
  if (!r) return 9999;
  const n = parseInt(r, 10);
  return isNaN(n) ? 9999 : n;
}

/* `hero` is only set by the standalone /universities page. The dashboard
   embeds this same component inside its own workspace chrome, where a
   full-bleed dark band would be wrong. */
export default function UniversitySearchGrid({ hero = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All Regions');
  const [country, setCountry] = useState('All');
  const [tag, setTag] = useState('All');
  const [aidOnly, setAidOnly] = useState(false);
  const [tuitionIdx, setTuitionIdx] = useState(0);
  const [acceptIdx, setAcceptIdx] = useState(0);
  const [sortBy, setSortBy] = useState('ranking');
  const [showFilters, setShowFilters] = useState(false);
  const [allUniversities, setAllUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    fetchUniversities({})
      .then(setAllUniversities)
      .catch(err => {
        console.error(err);
        setLoadError('Could not load universities. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return; }
    fetchCollegeList(user.id)
      .then(list => setSavedIds(new Set(list.map(i => i.university_id))))
      .catch(console.error);
  }, [user]);

  const countriesInRegion = useMemo(() => {
    if (region === 'All Regions') {
      const set = new Set(allUniversities.map(u => u.country).filter(Boolean));
      return ['All', ...Array.from(set).sort()];
    }
    return ['All', ...(REGIONS[region] || [])];
  }, [region, allUniversities]);

  useEffect(() => { setCountry('All'); }, [region]);
  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [query, region, country, tag, aidOnly, tuitionIdx, acceptIdx, sortBy]);

  const filtered = useMemo(() => {
    let list = allUniversities;

    if (query) {
      const q = query.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.location?.toLowerCase().includes(q) ||
        u.country?.toLowerCase().includes(q) ||
        u.short_name?.toLowerCase().includes(q) ||
        u.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (region !== 'All Regions') {
      const regionCountries = REGIONS[region];
      list = list.filter(u => regionCountries.includes(u.country));
    }
    if (country !== 'All') {
      list = list.filter(u => u.country === country);
    }
    if (tag !== 'All') {
      list = list.filter(u => u.tags?.includes(tag));
    }
    if (aidOnly) {
      list = list.filter(u => u.financial_aid);
    }
    const tr = TUITION_RANGES[tuitionIdx];
    if (tr.max !== null) list = list.filter(u => u.tuition <= tr.max);
    if (tr.min !== null) list = list.filter(u => u.tuition >= tr.min);

    const ar = ACCEPTANCE_RANGES[acceptIdx];
    if (ar.max !== null) list = list.filter(u => u.acceptance_rate <= ar.max);
    if (ar.min !== null) list = list.filter(u => u.acceptance_rate >= ar.min);

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'acceptance_asc': return (a.acceptance_rate || 100) - (b.acceptance_rate || 100);
        case 'acceptance_desc': return (b.acceptance_rate || 0) - (a.acceptance_rate || 0);
        case 'tuition_asc': return (a.tuition || 0) - (b.tuition || 0);
        case 'tuition_desc': return (b.tuition || 0) - (a.tuition || 0);
        default: return parseRankNum(a.ranking) - parseRankNum(b.ranking);
      }
    });

    return list;
  }, [allUniversities, query, region, country, tag, aidOnly, tuitionIdx, acceptIdx, sortBy]);

  const topUniversities = useMemo(() =>
    [...allUniversities]
      .sort((a, b) => parseRankNum(a.ranking) - parseRankNum(b.ranking))
      .slice(0, 10),
    [allUniversities]
  );

  // Real counts for the header strip, not copy-written guesses.
  const countryCount = useMemo(
    () => new Set(allUniversities.map(u => u.country).filter(Boolean)).size,
    [allUniversities]
  );

  const activeFilterCount = [
    region !== 'All Regions',
    country !== 'All',
    tag !== 'All',
    aidOnly,
    tuitionIdx !== 0,
    acceptIdx !== 0,
  ].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setQuery('');
    setRegion('All Regions');
    setCountry('All');
    setTag('All');
    setAidOnly(false);
    setTuitionIdx(0);
    setAcceptIdx(0);
    setSortBy('ranking');
  }, []);

  async function handleAdd(universityId) {
    setSaveError('');
    if (!user) {
      navigate('/auth', { state: { from: '/universities' } });
      return;
    }
    if (savedIds.has(universityId)) return;
    setSavingId(universityId);
    try {
      await addToCollegeList(user.id, universityId);
      setSavedIds(new Set([...savedIds, universityId]));
    } catch (err) {
      console.error(err);
      setSaveError('Could not add that school. Please try again.');
    } finally {
      setSavingId(null);
    }
  }

  const visible = filtered.slice(0, visibleCount);

  const searchBar = (
    <div className="search-bar uni-search">
      <Search size={16} />
      <input
        id="uni-search"
        placeholder="Search universities, countries, tags..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {query && (
        <button className="search-clear" onClick={() => setQuery('')}><X size={14} /></button>
      )}
    </div>
  );

  return (
    <>
      {hero ? (
        /* Night band, matching the landing page's departure section — the page
           then opens out into the cream grid, the same night-to-day rhythm. */
        <div className="uni-hero">
          <div className="uni-hero-stamps" aria-hidden="true">
            <span className="hero-stamp hero-stamp-1"><Stamp size={64} strokeWidth={1} /></span>
            <span className="hero-stamp hero-stamp-2"><Stamp size={48} strokeWidth={1} /></span>
            <span className="hero-stamp hero-stamp-3"><Stamp size={80} strokeWidth={1} /></span>
          </div>
          <div className="wrap uni-hero-wrap">
            <div className="uni-hero-text">
              <h1 className="uni-hero-title">Every university, in one place.</h1>
              <p className="uni-hero-sub">
                {loading
                  ? 'Browse and compare universities worldwide.'
                  : <>Compare <strong>{allUniversities.length}</strong> universities across <strong>{countryCount}</strong> countries — admit rates, real cost, and whether you actually fit.</>}
              </p>
              <Link to="/nova" className="uni-hero-cta">
                <NovaMascot size={18} expression="curious" />
                Ask Nova which ones fit you
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="uni-hero-nova" aria-hidden="true">
              <NovaMascot size={92} expression="thinking" holding="map" idle />
            </div>
          </div>
          <div className="wrap uni-hero-search">{searchBar}</div>
        </div>
      ) : (
        <div className="wrap">
          <div className="uni-search-header">{searchBar}</div>
        </div>
      )}

      {!loading && !query && region === 'All Regions' && tag === 'All' && !aidOnly && tuitionIdx === 0 && acceptIdx === 0 && country === 'All' && (
        <div className="wrap">
          <div className="uni-top-section">
            <div className="uni-section-header">
              <Stamp size={18} />
              <h2>Top Ranked Universities</h2>
            </div>
            <div className="uni-top-scroll">
              {topUniversities.map((u) => (
                <div key={u.id} className="uni-top-card" style={stickerStyle(u)}>
                  <div className="uni-top-rank">#{parseRankNum(u.ranking)}</div>
                  <LogoTile item={{
                    logoUrl: u.logo_url, logoStyle: u.logo_style,
                    fallback: u.fallback, name: u.name, shortName: u.short_name,
                  }} size={40} radius={10} />
                  <div className="uni-top-info">
                    <div className="uni-top-name">{u.name}</div>
                    <div className="uni-top-loc">{u.location}</div>
                  </div>
                  <div className="uni-top-stats">
                    <span>{u.acceptance_rate}% accept</span>
                    <span>{u.tuition === 0 ? 'Free' : `$${Math.round(u.tuition / 1000)}k/yr`}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="wrap">
        <div className="uni-filter-bar">
          <div className="uni-filter-left">
            <button className={`uni-filter-toggle ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={14} />
              Filters
              {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
            </button>

            <div className="uni-quick-filters">
              <select className="sel" value={region} onChange={e => setRegion(e.target.value)}>
                {Object.keys(REGIONS).map(r => <option key={r}>{r}</option>)}
              </select>
              {region !== 'All Regions' && countriesInRegion.length > 2 && (
                <select className="sel" value={country} onChange={e => setCountry(e.target.value)}>
                  {countriesInRegion.map(c => <option key={c}>{c}</option>)}
                </select>
              )}
              <select className="sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="uni-filter-right">
            {activeFilterCount > 0 && (
              <button className="uni-clear-btn" onClick={clearFilters}>
                <X size={12} /> Clear all
              </button>
            )}
            <span className="result-ct">{filtered.length} universities</span>
          </div>
        </div>

        {showFilters && (
          <div className="uni-filters-panel">
            <div className="uni-fp-group">
              <label className="uni-fp-label">Field of Study</label>
              <div className="chips chips-sm">
                {TAGS.map(t => (
                  <button key={t} className={`chip ${tag === t ? 'active' : ''}`}
                    onClick={() => setTag(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="uni-fp-row">
              <div className="uni-fp-group">
                <label className="uni-fp-label">Tuition Range</label>
                <select className="sel" value={tuitionIdx} onChange={e => setTuitionIdx(+e.target.value)}>
                  {TUITION_RANGES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
                </select>
              </div>
              <div className="uni-fp-group">
                <label className="uni-fp-label">Selectivity</label>
                <select className="sel" value={acceptIdx} onChange={e => setAcceptIdx(+e.target.value)}>
                  {ACCEPTANCE_RANGES.map((a, i) => <option key={i} value={i}>{a.label}</option>)}
                </select>
              </div>
              <div className="uni-fp-group">
                <label className="uni-fp-label">&nbsp;</label>
                <label className="aid-toggle">
                  <input type="checkbox" checked={aidOnly} onChange={e => setAidOnly(e.target.checked)} />
                  Financial aid available
                </label>
              </div>
            </div>
          </div>
        )}

        {loadError ? (
          <div className="empty empty-error" role="alert">
            <div className="empty-icon">!</div>
            <h3>Universities could not load</h3>
            <p>{loadError}</p>
            <button className="uni-clear-btn" onClick={() => window.location.reload()}>Reload page</button>
          </div>
        ) : loading ? (
          <div className="empty"><p>Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎓</div>
            <h3>No universities found</h3>
            <p>Try adjusting your filters</p>
            <button className="uni-clear-btn" onClick={clearFilters}>Clear all filters</button>
          </div>
        ) : (
          <>
            <div className="uni-grid">
              {visible.map((u) => {
                return (
                <div key={u.id} className="uni-card" style={stickerStyle(u)}>
                  <div className="uni-card-top">
                    <LogoTile item={{
                      logoUrl: u.logo_url,
                      logoStyle: u.logo_style,
                      fallback: u.fallback,
                      name: u.name,
                      shortName: u.short_name,
                    }} size={48} radius={12} />
                    <div className="uni-card-rank">
                      <Star size={10} fill="currentColor" /> #{u.ranking}
                    </div>
                  </div>
                  <div className="uni-card-name">{u.name}</div>
                  {/* Location and country on one line — they were two stacked
                      rows saying nearly the same thing. */}
                  <div className="uni-card-loc">
                    <MapPin size={11} /> {u.location}
                    {u.country && <><span className="uni-card-dot">·</span><Globe size={10} /> {u.country}</>}
                  </div>
                  <p className="uni-card-desc">{u.description}</p>
                  <div className="uni-card-stats">
                    <div className="uni-stat">
                      <div className="uni-stat-v">{u.acceptance_rate}%</div>
                      <div className="uni-stat-l">Acceptance</div>
                    </div>
                    <div className="uni-stat">
                      <div className="uni-stat-v">
                        {u.tuition === 0 ? <span className="uni-free-sticker">Free</span> : `$${Math.round(u.tuition/1000)}k`}
                      </div>
                      <div className="uni-stat-l">Tuition/yr</div>
                    </div>
                    <div className="uni-stat">
                      <div className="uni-stat-v">{u.size}</div>
                      <div className="uni-stat-l">Size</div>
                    </div>
                  </div>
                  <Link
                    to="/nova"
                    state={{ prompt: `What are my real chances of getting into ${u.name}? Be honest about my profile's strengths and gaps.` }}
                    className="uni-card-nova"
                  >
                    <NovaMascot size={13} /> Nova's take <ArrowRight size={11} />
                  </Link>
                  <div className="uni-card-tags">
                    {u.tags?.slice(0,3).map(t => <span key={t} className="tag tag-gray">{t}</span>)}
                    {u.financial_aid && <span className="tag tag-green">Aid</span>}
                  </div>
                  {savedIds.has(u.id) ? (
                    <button className="uni-add-btn added" disabled>
                      <Check size={15} /> On your list
                    </button>
                  ) : (
                    <button
                      className="uni-add-btn"
                      onClick={() => handleAdd(u.id)}
                      disabled={savingId === u.id}
                    >
                      <Plus size={15} /> {savingId === u.id ? 'Adding…' : user ? 'Add to my list' : 'Log in to add'}
                    </button>
                  )}
                </div>
                );
              })}
            </div>
            {visibleCount < filtered.length && (
              <div className="uni-load-more">
                <button className="uni-load-btn" onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)}>
                  <ChevronDown size={16} />
                  Show more ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
            {saveError && <p className="uni-save-error" role="alert">{saveError}</p>}
          </>
        )}
      </div>
    </>
  );
}

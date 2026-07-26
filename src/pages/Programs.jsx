import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ExternalLink, X, Globe, Flag, CalendarClock, ArrowRight } from 'lucide-react';
import LogoTile from '../components/LogoTile';
import NovaMascot from '../components/NovaMascot';
import { fetchPrograms } from '../api/catalog';
import {
  disciplineColor, deadlineMonth, monthName, monthsAhead,
  firmDate, daysUntil, accessLevel, eligibilityDetail,
} from '../lib/programMeta';
import './Programs.css';

const DISCIPLINES = ['All','STEM','Math','Computer Science','Biology','Engineering','Leadership','Humanities','Policy'];
const COSTS = [['All','All costs'],['free','Free only'],['paid','Paid']];
const TYPES = ['All','Research','Summer Program','Fellowship','Competition + Research'];

const PROGRAM_HOST_DOMAINS = {
  'Amgen Foundation': 'amgenscholars.com',
  'Ashoka University': 'ashoka.edu.in',
  'Boston University': 'bu.edu',
  'Carnegie Mellon University': 'cmu.edu',
  'Case Western Reserve University': 'case.edu',
  'CERN': 'home.cern',
  'DAAD': 'daad.de',
  'MIT / Center for Excellence in Education': 'mit.edu',
  'NYU Abu Dhabi': 'nyuad.nyu.edu',
  'Rockefeller University': 'rockefeller.edu',
  'Simons Foundation': 'simonsfoundation.org',
  'SSP International': 'summerscience.org',
  'Stanford Medicine': 'med.stanford.edu',
  'Telluride Association': 'tellurideassociation.org',
  'UC System': 'universityofcalifornia.edu',
  'US Department of Energy': 'energy.gov',
  'US National Science Foundation': 'nsf.gov',
};

const PROGRAM_HOST_LOGOS = {
  'amgen foundation': {
    logoUrl: '/logos/program-amgen.png',
    fallback: 'Amgen',
    logoStyle: { background: '#FFFFFF', padding: '4px' },
  },
  ashoka: {
    logoUrl: '/logos/program-ashoka-cxc.png',
    fallback: 'CxC',
    logoStyle: { background: '#FFFFFF', padding: '4px' },
  },
  'boston university': {
    logoUrl: '/logos/program-promys.png',
    fallback: 'PROMYS',
    logoStyle: { background: '#FFFFFF', padding: '4px' },
  },
  'carnegie mellon university': {
    logoUrl: '/logos/program-cmu.png',
    fallback: 'CMU',
    logoStyle: { background: '#FFFFFF', padding: '3px' },
  },
  'case western reserve university': {
    logoUrl: '/logos/program-case-western.ico',
    fallback: 'CWRU',
    logoStyle: { background: '#FFFFFF', padding: '5px' },
  },
  cern: {
    logoUrl: '/logos/program-cern.svg',
    fallback: 'CERN',
    logoStyle: { background: '#FFFFFF', padding: '3px' },
  },
  daad: {
    logoUrl: '/logos/program-daad.png',
    fallback: 'DAAD',
    logoStyle: { background: '#FFFFFF', padding: '2px' },
  },
  'igem foundation': {
    logoUrl: '/logos/program-igem.svg',
    fallback: 'iGEM',
    logoStyle: { background: '#FFFFFF', padding: '5px' },
  },
  mit: {
    logoUrl: '/logos/massachusetts-institute-of-technology.svg',
    fallback: 'MIT',
    logoStyle: { background: '#FFFFFF', padding: '2px' },
  },
  'mit / center for excellence in education': {
    logoUrl: '/logos/massachusetts-institute-of-technology.svg',
    fallback: 'MIT',
    logoStyle: { background: '#FFFFFF', padding: '2px' },
  },
  'ssp international': {
    logoUrl: '/logos/program-ssp-icon.jpg',
    fallback: 'SSP',
    logoStyle: { background: '#FFFFFF', padding: '0px' },
  },
  'stony brook university': {
    logoUrl: '/logos/program-stony-brook.png',
    fallback: 'SBU',
    logoStyle: { background: '#FFFFFF', padding: '3px' },
  },
  'nyu abu dhabi': {
    logoUrl: '/logos/nyuad-hq.png',
    logoStyle: { background: '#FFFFFF', padding: '5px' },
  },
  'stanford medicine': {
    logoUrl: '/logos/stanford-hq.png',
    logoStyle: { background: '#FFFFFF', padding: '5px' },
  },
  'telluride association': {
    logoUrl: '/logos/program-telluride.ico',
    fallback: 'TA',
    logoStyle: { background: '#FFFFFF', padding: '5px' },
  },
  'texas tech university': {
    logoUrl: '/logos/program-texas-tech.svg',
    fallback: 'TTU',
    logoStyle: { background: '#FFFFFF', padding: '2px' },
  },
  'the rockefeller university': {
    logoUrl: '/logos/program-rockefeller.png',
    fallback: 'RU',
    logoStyle: { background: '#FFFFFF', padding: '0px' },
  },
  'uc system': {
    logoUrl: '/logos/program-uc-cosmos.png',
    fallback: 'UC',
    logoStyle: { background: '#FFFFFF', padding: '1px' },
  },
  'us department of energy': {
    logoUrl: '/logos/program-doe.png',
    fallback: 'DOE',
    logoStyle: { background: '#FFFFFF', padding: '2px' },
  },
  'us national science foundation': {
    logoUrl: '/logos/program-nsf.png',
    fallback: 'NSF',
    logoStyle: { background: '#FFFFFF', padding: '0px' },
  },
};

function normalizeProgramHost(host) {
  return (host || '').trim().toLowerCase();
}

function hostnameFromUrl(url) {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function faviconFromDomain(domain) {
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}

function faviconFromProgram(program) {
  return faviconFromDomain(PROGRAM_HOST_DOMAINS[program.host] || hostnameFromUrl(program.url));
}

function programBrandColor(program, fallback) {
  const styleBg = program.host_logo_style?.background;
  if (styleBg && !/^#?fff(?:fff)?$/i.test(styleBg)) return styleBg;
  return program.color || fallback;
}

/* Programmes grouped by the month their deadline falls in, ordered by how soon
 * that month is rather than by calendar order — the cycle runs Nov → Mar, so a
 * plain sort would list January before November and read backwards.
 * Anything with no month named ("Rolling", "Check official site") collects in a
 * final bucket instead of being dropped. */
function groupByMonth(programs) {
  const buckets = new Map();
  const undated = [];

  for (const p of programs) {
    const m = deadlineMonth(p.deadline);
    if (m === null) { undated.push(p); continue; }
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(p);
  }

  const groups = [...buckets.entries()]
    .sort((a, b) => monthsAhead(a[0]) - monthsAhead(b[0]))
    .map(([m, items]) => ({ key: m, label: monthName(m), items }));

  if (undated.length) groups.push({ key: 'open', label: 'Rolling & open entry', items: undated });
  return groups;
}

function ProgramCard({ program: p }) {
  const color = disciplineColor(p.discipline);
  const brand = programBrandColor(p, color);
  const hostLogo = PROGRAM_HOST_LOGOS[normalizeProgramHost(p.host)];
  const logoUrl = hostLogo && Object.hasOwn(hostLogo, 'logoUrl')
    ? hostLogo.logoUrl
    : p.host_logo_url || faviconFromProgram(p);
  const logoStyle = hostLogo?.logoStyle || (p.host_logo_url
    ? p.host_logo_style
    : { background: '#FFFFFF', padding: '8px', ...p.host_logo_style });
  const due = firmDate(p.deadline);
  const days = due ? daysUntil(due) : null;
  const access = accessLevel(p.eligibility);

  return (
    <article className="prog-card" style={{ '--prog-color': color, '--prog-brand': brand }}>
      <div className="prog-card-head">
        <LogoTile
          item={{
            logoUrl,
            logoStyle,
            fallback: hostLogo?.fallback || p.host_logo || p.host?.split(' ')[0],
            name: p.host,
          }}
          size={44}
          radius={11}
        />
        <div className="prog-card-headings">
          <span className="prog-card-host">{p.host}</span>
          <h3 className="prog-card-name">{p.name}</h3>
        </div>
        {p.cost_type === 'free' && <span className="prog-free">Free</span>}
      </div>

      <p className="prog-card-desc">{p.description}</p>

      <div className="prog-card-tags">
        <span className="prog-field">{p.type}</span>
        {(p.discipline || []).slice(0, 2).map(d => (
          <span key={d} className="tag tag-gray">{d}</span>
        ))}
      </div>

      {/* Access is given real estate rather than buried in the eligibility
          copy: several strong programmes are US-citizen-only, and for
          international students that is the whole question. */}
      {access && (
        <div className={`prog-access prog-access-${access}`}>
          {access === 'intl' ? <Globe size={12} /> : <Flag size={12} />}
          {access === 'intl' ? 'Open to international students' : 'US citizens / permanent residents only'}
        </div>
      )}
      {p.eligibility && (
        <p className="prog-elig">{eligibilityDetail(p.eligibility)}</p>
      )}

      <div className="prog-card-foot">
        <div className="prog-deadline">
          <CalendarClock size={13} />
          <span>{p.deadline || 'Check official site'}</span>
          {/* Only shown for dates that are actually announced — never a
              countdown to a date nobody has published. */}
          {days != null && days >= 0 && (
            <span className={`prog-countdown${days <= 30 ? ' soon' : ''}`}>{days}d left</span>
          )}
        </div>
        {p.url && (
          <a href={p.url} target="_blank" rel="noreferrer" className="prog-apply">
            Apply <ExternalLink size={11} />
          </a>
        )}
      </div>
    </article>
  );
}

export default function Programs() {
  const [query, setQuery]       = useState('');
  const [disc, setDisc]         = useState('All');
  const [cost, setCost]         = useState('All');
  const [type, setType]         = useState('All');
  const [intlOnly, setIntlOnly] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    fetchPrograms({
      q: query || undefined,
      discipline: disc !== 'All' ? disc : undefined,
      costType: cost !== 'All' ? cost : undefined,
      type: type !== 'All' ? type : undefined,
    })
      .then(setPrograms)
      .catch(err => {
        console.error(err);
        setLoadError('Could not load programs. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [query, disc, cost, type]);

  // Filtered client-side: access lives in free text, so it cannot be a
  // Supabase filter without a schema change.
  const shown = useMemo(
    () => (intlOnly ? programs.filter(p => accessLevel(p.eligibility) !== 'us') : programs),
    [programs, intlOnly]
  );

  const groups = useMemo(() => groupByMonth(shown), [shown]);
  const freeCount = shown.filter(p => p.cost_type === 'free').length;

  return (
    <div className="prog-page">
      {/* Night band, the same opening as the landing page and Universities —
          but the page below is a timeline rather than a grid. */}
      <div className="prog-hero">
        <div className="wrap prog-hero-wrap">
          <div className="prog-hero-text">
            <h1 className="prog-hero-title">Summers that change the application.</h1>
            <p className="prog-hero-sub">
              {loading
                ? 'Research placements, summer schools and fellowships.'
                : <>
                    <strong>{shown.length}</strong> programmes for high school and university students —{' '}
                    <strong>{freeCount}</strong> of them completely free.
                  </>}
            </p>
            <Link to="/nova" className="prog-hero-cta">
              <NovaMascot size={18} expression="curious" />
              Ask Nova which ones you&rsquo;d get into
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="prog-hero-nova" aria-hidden="true">
            <NovaMascot size={88} expression="cheering" holding="check" idle />
          </div>
        </div>

        <div className="wrap prog-hero-search">
          <div className="search-bar">
            <Search size={16} />
            <input
              id="programs-search"
              placeholder="Search programs, universities, disciplines..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')}><X size={14} /></button>
            )}
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="prog-filter-bar">
          <div className="chips">
            {DISCIPLINES.map(d => (
              <button key={d} className={`chip ${disc === d ? 'active' : ''}`}
                onClick={() => setDisc(d)}>{d}</button>
            ))}
          </div>
          <div className="prog-filter-row">
            <div className="chips">
              {TYPES.map(t => (
                <button key={t} className={`chip ${type === t ? 'active' : ''}`}
                  onClick={() => setType(t)}>{t}</button>
              ))}
              {COSTS.map(([v, l]) => (
                <button key={v} className={`chip ${cost === v ? 'active' : ''}`}
                  onClick={() => setCost(v)}>{l}</button>
              ))}
              <button
                className={`chip ${intlOnly ? 'active' : ''}`}
                onClick={() => setIntlOnly(o => !o)}
              >
                <Globe size={12} /> Open to international
              </button>
            </div>
            <span className="result-ct">{shown.length} programs</span>
          </div>
        </div>

        {loadError ? (
          <div className="empty empty-error" role="alert">
            <div className="empty-icon">!</div>
            <h3>Programs could not load</h3>
            <p>{loadError}</p>
          </div>
        ) : loading ? (
          <div className="empty"><p>Loading…</p></div>
        ) : shown.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔬</div>
            <h3>No programs found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="prog-timeline">
            {groups.map(g => (
              <section key={g.key} className="prog-month">
                <div className="prog-month-head">
                  <span className="prog-month-dot" />
                  <h2 className="prog-month-label">{g.label}</h2>
                  <span className="prog-month-count">{g.items.length}</span>
                </div>
                <div className="prog-month-grid">
                  {g.items.map(p => <ProgramCard key={p.id} program={p} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, Send } from 'lucide-react';
import LogoTile from '../components/LogoTile';
import NovaMascot from '../components/NovaMascot';
import { fetchStories } from '../api/catalog';
import { getBrandColor, hexToRgb } from '../lib/brandColors';
import './Stories.css';

const FILTERS = ['All','Full Scholarship','Ivy League','UK','Asia','Research','Africa','Latin America','Engineering'];

/* Same idea as the university sticker grid — the accent comes from the
 * school's real brand colour, so the wall of stories reads as a roster of
 * actual identities rather than a repeating palette. */
function cardAccent(uni, index) {
  // getBrandColor keys off `.name`, not a bare string — passing the string
  // silently hashed to the same fallback hue for every card.
  const [r, g, b] = hexToRgb(getBrandColor({ name: uni }));
  return {
    '--story-accent': `rgb(${r},${g},${b})`,
    '--story-accent-soft': `rgba(${r},${g},${b},0.14)`,
    '--story-tilt': index % 2 === 0 ? '-0.4deg' : '0.4deg',
  };
}

function StoryPhoto({ src, alt, className = '' }) {
  return (
    <div className={`story-photo-wrap ${className}`}>
      <span className="tape" />
      <img
        src={src}
        alt={alt}
        className="story-photo"
        onError={e => { e.target.parentElement.style.visibility = 'hidden'; }}
      />
    </div>
  );
}

function StoryUni({ s, size = 30 }) {
  return (
    <div className="story-uni">
      <LogoTile item={{
        logoUrl: s.university_logo_url,
        logoStyle: s.university_logo_style,
        fallback: s.fallback || s.university_logo,
        name: s.university,
      }} size={size} radius={8} />
      <div className="story-uni-info">
        <div className="story-uni-name">{s.university}</div>
        <div className="story-uni-loc">{s.location}</div>
      </div>
    </div>
  );
}

function StoryBy({ s }) {
  return (
    <div className="story-by">
      by <strong>{s.name?.split(' ')[0]}</strong> from {s.country}
      {s.year && <span className="story-year"> · {s.year}</span>}
    </div>
  );
}

export default function Stories() {
  const [query, setQuery]     = useState('');
  const [filter, setFilter]   = useState('All');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    fetchStories({
      q: query || undefined,
      tag: filter !== 'All' ? filter : undefined,
    })
      .then(setStories)
      .catch(err => {
        console.error(err);
        setLoadError('Could not load stories. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [query, filter]);

  const [featured, ...rest] = stories;

  // Hero quote cycles through whichever real stories have loaded — never a
  // placeholder line, since there's nothing to fake here that isn't already
  // sitting in the data.
  const [quoteIdx, setQuoteIdx] = useState(0);
  useEffect(() => {
    if (stories.length < 2) return;
    const id = setInterval(() => setQuoteIdx(i => (i + 1) % stories.length), 5000);
    return () => clearInterval(id);
  }, [stories.length]);
  const heroQuoteStory = stories[quoteIdx % Math.max(stories.length, 1)];

  const logoCluster = useMemo(() => stories.slice(0, 5), [stories]);

  /* Scroll-reveal for the grid.
   *
   * The hidden state is opt-in from JS (`reveal-ready`) rather than the CSS
   * default, and a timeout force-reveals everything regardless. Cards are
   * therefore visible if IntersectionObserver is missing, if the observer
   * never fires, or if JS fails outright — an opacity:0 default with no
   * guaranteed path back to 1 is exactly how content goes permanently
   * invisible, which has bitten this page twice already. */
  const gridRef = useRef(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el || !stories.length) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    el.classList.add('reveal-ready');
    const cards = [...el.querySelectorAll('.story-card')];
    const show = card => card.classList.add('is-visible');

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          show(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    cards.forEach(c => io.observe(c));
    const failsafe = setTimeout(() => cards.forEach(show), 1500);

    return () => { io.disconnect(); clearTimeout(failsafe); };
  }, [stories]);

  return (
    <div className="stories-page">
      <div className="stories-hero">
        {/* Mail motif, echoing the postcard cards below: a faint postmark
            ring and a few paper planes matching the ScholarPath logo. */}
        <div className="stories-hero-decor" aria-hidden="true">
          <span className="hero-postmark-ring" />
          <Send className="hero-plane hero-plane-1" size={24} strokeWidth={1.4} />
          <Send className="hero-plane hero-plane-2" size={16} strokeWidth={1.4} />
          <Send className="hero-plane hero-plane-3" size={30} strokeWidth={1.4} />
        </div>

        <div className="wrap stories-hero-wrap">
          <div className="stories-hero-text">
            <h1 className="stories-hero-title">Every path here<br />was walked by someone.</h1>
            <p className="stories-hero-sub">
              {loading
                ? 'Real voices from students who used ScholarPath to get in.'
                : <>In their own words — <strong>{stories.length}</strong> students who used Nova and got in.</>}
            </p>
            <Link to="/nova" className="stories-hero-cta">
              <NovaMascot size={18} expression="curious" />
              Start your own story
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Rendered only when there's a real quote to show — an empty
              postcard shell in the hero reads as a broken card, which is
              exactly what a no-results search used to produce. */}
          {heroQuoteStory && (
            <div className="stories-hero-quote postcard" aria-live="polite">
              <p className="stories-hero-quote-text">{heroQuoteStory.excerpt}</p>
              <div className="stories-hero-quote-by">
                <img src={heroQuoteStory.photo} alt="" onError={e => { e.target.style.visibility = 'hidden'; }} />
                <span><strong>{heroQuoteStory.name?.split(' ')[0]}</strong> → {heroQuoteStory.university}</span>
              </div>
            </div>
          )}
        </div>

        {logoCluster.length > 0 && (
          <div className="stories-hero-cluster" aria-hidden="true">
            <svg className="stories-hero-cluster-lines" viewBox="0 0 200 90" preserveAspectRatio="none">
              <polyline points="20,57 56,46 94,66 132,47 172,55" />
            </svg>
            {logoCluster.map((s, i) => (
              <span key={s.id} className={`cluster-logo-wrap cluster-logo-${i}`}>
                <LogoTile item={{
                  logoUrl: s.university_logo_url,
                  logoStyle: s.university_logo_style,
                  fallback: s.fallback || s.university_logo,
                  name: s.university,
                }} size={46} radius="50%" className="cluster-logo" />
              </span>
            ))}

            {/* Nova walks the path the students walked — "every path here was
                walked by someone" — carrying a postcard home, and hops as it
                passes over each school while that crest lifts to greet it.
                Three nested spans because travel, tilt and hop are all
                transforms and would otherwise overwrite one another. */}
            <span className="cluster-nova">
              <span className="cluster-nova-inner">
                <span className="cluster-nova-hop">
                  <NovaMascot size={54} expression="happy" holding="letter" />
                </span>
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="stories-body wrap">
        <div className="stories-toolbar">
          <div className="search-bar stories-search">
            <Search size={16} />
            <input
              id="stories-search"
              placeholder="Search for stories..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {FILTERS.map(f => (
              <button key={f} className={`chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>

        {loadError ? (
          <div className="empty empty-error" role="alert">
            <div className="empty-icon">!</div>
            <h3>Stories could not load</h3>
            <p>{loadError}</p>
          </div>
        ) : loading ? (
          <div className="empty"><p>Loading…</p></div>
        ) : stories.length === 0 ? (
          <div className="empty">
            <NovaMascot size={64} expression="thinking" />
            <h3>No stories found</h3>
            <p>Try a different search or filter</p>
          </div>
        ) : (
          <>
            {featured && (
              <article className="story-featured postcard" style={cardAccent(featured.university, 0)}>
                <StoryPhoto src={featured.photo} alt={featured.name} />
                <div className="story-featured-content">
                  <StoryUni s={featured} size={36} />
                  <p className="story-featured-quote">{featured.excerpt}</p>
                  <h2 className="story-featured-title">{featured.title}</h2>
                  <StoryBy s={featured} />
                </div>
              </article>
            )}

            <div className="story-grid" ref={gridRef}>
              {rest.map((s, idx) => {
                // Every fourth card runs wide — breaks the uniform grid into
                // something closer to a magazine spread.
                const wide = idx % 4 === 1;
                return (
                  <article
                    key={s.id}
                    className={`story-card postcard ${wide ? 'is-wide' : ''}`}
                    style={cardAccent(s.university, idx + 1)}
                  >
                    <StoryPhoto src={s.photo} alt={s.name} />
                    <div className="story-card-body">
                      <StoryUni s={s} />
                      <p className="story-card-quote">{s.excerpt}</p>
                      <h3 className="story-card-title">{s.title}</h3>
                      <StoryBy s={s} />
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

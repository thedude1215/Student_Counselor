import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';

const CHIP = {
  specificity:  { label: 'BE SPECIFIC', bg: '#FEF3C7', color: '#92400E' },
  clarity:      { label: 'CLARITY',     bg: '#DBEAFE', color: '#1E40AF' },
  impact:       { label: 'TIGHTEN',     bg: '#FEF3C7', color: '#92400E' },
  structure:    { label: 'STRUCTURE',   bg: '#E0E7FF', color: '#3730A3' },
  authenticity: { label: 'AUTHENTIC',   bg: '#FCE7F3', color: '#9D174D' },
  grammar:      { label: 'GRAMMAR',     bg: '#FEE2E2', color: '#991B1B' },
};
const dfChip = CHIP.clarity;

const HL = {
  specificity:  'rgba(245,158,11,0.25)',
  clarity:      'rgba(59,130,246,0.20)',
  impact:       'rgba(245,158,11,0.25)',
  structure:    'rgba(99,102,241,0.22)',
  authenticity: 'rgba(236,72,153,0.20)',
  grammar:      'rgba(239,68,68,0.20)',
};

const LC = {
  specificity:  '#D97706',
  clarity:      '#2563EB',
  impact:       '#D97706',
  structure:    '#6366F1',
  authenticity: '#DB2777',
  grammar:      '#DC2626',
};

const CARD_W   = 300;
const CARD_R   = 44;
const CARD_GAP = 14;

/* Per-suggestion timing — all relative to when the mark enters the viewport */
const TRIG = {
  HL_DUR:    0.70,  // highlight sweep duration (must match CSS)
  LINE_DUR:  0.90,  // connector line draw duration
  LINE_AFTER: 0.60, // line starts N seconds after mark becomes visible
  CARD_AFTER: 1.20, // card slides in N seconds after mark becomes visible
};

/* Natural S-curve bezier */
function bezier(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dy) < 55) {
    const bow = 44;
    return `M ${x1} ${y1} C ${x1 + dx * 0.42} ${y1 + bow}, ${x2 - dx * 0.18} ${y2 + bow * 0.5}, ${x2} ${y2}`;
  }
  const cpx = x1 + dx * 0.7;
  return `M ${x1} ${y1} C ${cpx} ${y1}, ${cpx} ${y2}, ${x2} ${y2}`;
}

function buildSegments(text, suggestions) {
  const lower = text.toLowerCase();
  const ranges = [];
  suggestions.forEach((s, i) => {
    const q = (s.quote || '').trim();
    if (!q) return;
    const start = lower.indexOf(q.toLowerCase());
    if (start === -1) return;
    ranges.push({ start, end: start + q.length, idx: i });
  });
  ranges.sort((a, b) => a.start - b.start);
  const placed = [];
  let cur = -1;
  for (const r of ranges) {
    if (r.start < cur) continue;
    placed.push(r);
    cur = r.end;
  }
  const segs = [];
  let pos = 0;
  for (const r of placed) {
    if (r.start > pos) segs.push({ text: text.slice(pos, r.start), idx: null });
    segs.push({ text: text.slice(r.start, r.end), idx: r.idx });
    pos = r.end;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), idx: null });
  return segs;
}

export default function EssayReview({ review, content, title, university, prompt, onClose, onReanalyze, reviewing }) {
  const [mounted,    setMounted]    = useState(false);
  const [active,     setActive]     = useState(null);
  const [cardTops,   setCardTops]   = useState({});
  const [paths,      setPaths]      = useState([]);
  // seenMarks[i] = true once suggestion i's mark has scrolled into view
  const [seenMarks,  setSeenMarks]  = useState({});
  const [drawnLines, setDrawnLines] = useState({});

  const bodyRef  = useRef(null);
  const markRefs = useRef({});
  const cardRefs = useRef({});

  const suggestions = review.suggestions || [];
  const suggestionsKey = suggestions.map(s => s.quote).join('|');
  const strengths = (review.strengths || [])
    .map(s => (typeof s === 'string' ? s : s.comment || s.quote || ''))
    .filter(Boolean);

  const segments = useMemo(
    () => buildSegments(content || '', suggestions),
    [content, suggestions],
  );

  /* Open / close */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const esc = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', esc); };
  }, [onClose]);

  /* Reset animation state when a new review is loaded */
  useEffect(() => {
    setSeenMarks({});
    setDrawnLines({});
  }, [suggestionsKey]);

  /* Compute card positions + bezier paths; update on scroll */
  useEffect(() => {
    if (!mounted) return;

    function compute() {
      const body = bodyRef.current;
      if (!body) return;
      const bb = body.getBoundingClientRect();
      const st = body.scrollTop;
      const bw = body.offsetWidth;

      const centers = {};
      suggestions.forEach((_, i) => {
        const el = markRefs.current[i];
        if (!el) return;
        const r = el.getBoundingClientRect();
        centers[i] = (r.top + r.bottom) / 2 - bb.top + st;
      });

      const sorted = Object.entries(centers)
        .map(([k, y]) => [+k, y])
        .sort((a, b) => a[1] - b[1]);

      let lastBottom = -Infinity;
      const resolved = {};
      for (const [i, y] of sorted) {
        const h   = cardRefs.current[i]?.offsetHeight || 140;
        const top = Math.max(y - h / 2, lastBottom + CARD_GAP, 8);
        resolved[i] = top;
        lastBottom   = top + h;
      }
      setCardTops(resolved);

      const cardX = bw - CARD_R - CARD_W;
      const newPaths = [];
      suggestions.forEach((s, i) => {
        const mark = markRefs.current[i];
        if (!mark || resolved[i] == null) return;
        const mr = mark.getBoundingClientRect();
        const x1 = mr.right  - bb.left;
        const y1 = (mr.top + mr.bottom) / 2 - bb.top + st;
        const h  = cardRefs.current[i]?.offsetHeight || 140;
        const x2 = cardX;
        const y2 = resolved[i] + h / 2;
        newPaths.push({ i, d: bezier(x1, y1, x2, y2), color: LC[s.category] || '#94A3B8' });
      });
      setPaths(newPaths);
      // Do NOT reset drawnLines here — lines must stay solid on scroll
    }

    const t1 = setTimeout(compute, 60);
    const t2 = setTimeout(compute, 350);
    const body = bodyRef.current;
    body?.addEventListener('scroll', compute);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      body?.removeEventListener('scroll', compute);
    };
  }, [mounted, suggestions]);

  /* IntersectionObserver — trigger each suggestion's animation when its mark enters view */
  useEffect(() => {
    if (!mounted) return;
    const body = bodyRef.current;
    if (!body) return;

    const observers = [];
    suggestions.forEach((_, i) => {
      const el = markRefs.current[i];
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setSeenMarks(prev => ({ ...prev, [i]: true }));
            obs.disconnect(); // fire once per mark
          }
        },
        { root: body, threshold: 0.5 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [mounted, suggestions]);

  function activate(i) {
    setActive(i);
    markRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const essayPadRight = CARD_W + CARD_R + 56;

  return createPortal(
    <div className={`erv-backdrop ${mounted ? 'in' : ''}`} onMouseDown={onClose}>
      <div className="erv-modal" onMouseDown={e => e.stopPropagation()}>

        {/* Sticky header */}
        <div className="erv-head">
          <div className="erv-head-l">
            <span className="erv-nova-badge"><Sparkles size={12} /> Nova · Essay review</span>
            <h2 className="erv-head-title">{title || 'Essay'}</h2>
            {university && <span className="erv-head-uni">— {university}</span>}
          </div>
          <div className="erv-head-r">
            {review.score > 0 && (
              <span
                className="erv-score-pill"
                data-level={review.score >= 8 ? 'high' : review.score >= 6 ? 'mid' : 'low'}
              >
                {review.score}/10
              </span>
            )}
            {onReanalyze && (
              <button
                className="erv-reanalyze"
                onClick={onReanalyze}
                disabled={reviewing}
                title="Run a fresh review"
              >
                <Sparkles size={12} />
                {reviewing ? 'Analyzing…' : 'Re-analyze'}
              </button>
            )}
            <button className="erv-close" onClick={onClose} title="Close"><X size={17} /></button>
          </div>
        </div>

        {/* Full-page scroll body */}
        <div className="erv-body" ref={bodyRef}>

          {/* White essay card */}
          <div className="erv-essay-card" style={{ paddingRight: essayPadRight + 'px' }}>

            {review.overall && (
              <p className="erv-overall">{review.overall}</p>
            )}

            {strengths.length > 0 && (
              <div className="erv-strengths">
                {strengths.map((s, i) => (
                  <div key={i} className="erv-strength">
                    <span className="erv-strength-tick">✓</span>{s}
                  </div>
                ))}
              </div>
            )}

            {prompt && (
              <div className="erv-prompt-box">{prompt}</div>
            )}

            {/* Essay body — each mark animates when it scrolls into view */}
            <div className="erv-essay-text">
              {segments.map((seg, si) =>
                seg.idx === null ? (
                  <span key={si}>{seg.text}</span>
                ) : (() => {
                  const i = seg.idx;
                  return (
                    <mark
                      key={si}
                      ref={el => { markRefs.current[i] = el; }}
                      className={`erv-mark ${seenMarks[i] ? 'lit' : ''} ${active === i ? 'active' : ''}`}
                      style={{
                        '--hl':       HL[suggestions[i]?.category] || 'rgba(99,102,241,0.20)',
                        '--hl-delay': '0s', // delay is 0 — fires exactly when mark enters view
                      }}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onClick={() => activate(i)}
                    >
                      {seg.text}
                    </mark>
                  );
                })()
              )}
            </div>
          </div>

          {/* Floating annotation cards — slide in after their mark is seen */}
          {suggestions.map((s, i) => {
            const chip = CHIP[s.category] || dfChip;
            const top  = cardTops[i];
            const seen = seenMarks[i];
            return (
              <div
                key={i}
                ref={el => { cardRefs.current[i] = el; }}
                className={`erv-card ${active === i ? 'active' : ''} ${seen && top != null ? 'in' : ''}`}
                style={{
                  position: 'absolute',
                  right: CARD_R + 'px',
                  top: (top ?? -9999) + 'px',
                  width: CARD_W + 'px',
                  // Delay is relative to when .in class is added (= when mark entered view)
                  transitionDelay: seen && top != null ? `${TRIG.CARD_AFTER}s` : '0s',
                }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => activate(i)}
              >
                <div className="erv-card-meta">
                  <div className="erv-avatar"><Sparkles size={10} /></div>
                  <span className="erv-card-byline">Nova · Essay review</span>
                </div>
                <div className="erv-chip" style={{ background: chip.bg, color: chip.color }}>
                  {chip.label}
                </div>
                <p className="erv-card-text">{s.suggestion}</p>
              </div>
            );
          })}

          {suggestions.length === 0 && mounted && (
            <p className="erv-no-sug">No line-level changes flagged — clean draft.</p>
          )}

          {/* SVG bezier connectors — drawn when their mark enters view */}
          <svg className="erv-svg" aria-hidden="true">
            {paths.map(({ i, d, color }) => {
              const seen     = seenMarks[i];
              const isDrawn  = drawnLines[i];
              const isActive = active === i;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  strokeLinecap="round"
                  opacity={seen ? (isActive ? 0.9 : 0.55) : 0}
                  pathLength={isDrawn ? undefined : 1}
                  strokeDasharray={isDrawn ? undefined : '1'}
                  // Animation class is only applied when seen AND not yet drawn.
                  // CSS --line-delay is relative to when this class is first applied
                  // (= when the mark entered view), so the line draws after the highlight.
                  className={seen && !isDrawn ? 'erv-line-draw' : undefined}
                  style={{
                    '--line-delay': `${TRIG.LINE_AFTER}s`,
                    '--line-dur':   `${TRIG.LINE_DUR}s`,
                    transition: isDrawn ? 'stroke-width 0.15s, opacity 0.15s' : undefined,
                  }}
                  onAnimationEnd={() =>
                    setDrawnLines(prev => ({ ...prev, [i]: true }))
                  }
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>,
    document.body,
  );
}

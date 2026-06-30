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

/* Animation timings (seconds) */
const ANIM = {
  BASE:       0.15,   // first highlight starts
  STEP:       0.32,   // stagger between each suggestion
  HL_DUR:     0.50,   // highlight sweep duration (match CSS)
  LINE_DUR:   0.65,   // connector line draw duration
  LINE_EXTRA: 0.44,   // line starts this many seconds after highlight starts
  CARD_EXTRA: 0.92,   // card appears this many seconds after highlight starts
};

/* Natural S-curve bezier:
   - Departs horizontally from the highlight right-edge
   - Arrives horizontally at the card left-edge
   - When endpoints are at similar Y, adds a gentle bow to stay visible */
function bezier(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dy) < 55) {
    // Nearly same height — add a downward bow so it never looks like a flat rule
    const bow = 44;
    const cpx1 = x1 + dx * 0.42;
    const cpx2 = x2 - dx * 0.18;
    return `M ${x1} ${y1} C ${cpx1} ${y1 + bow}, ${cpx2} ${y2 + bow * 0.5}, ${x2} ${y2}`;
  }
  // True S-curve: same horizontal X for both control points (natural elbow)
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

export default function EssayReview({ review, content, title, university, prompt, onClose }) {
  const [mounted,    setMounted]    = useState(false);
  const [active,     setActive]     = useState(null);
  const [cardTops,   setCardTops]   = useState({});
  const [paths,      setPaths]      = useState([]);
  const [drawnLines, setDrawnLines] = useState({});

  const bodyRef  = useRef(null);
  const markRefs = useRef({});
  const cardRefs = useRef({});

  const suggestions = review.suggestions || [];
  // Stable key: resets drawnLines only when a new review is loaded (new quotes), not on scroll.
  const suggestionsKey = suggestions.map(s => s.quote).join('|');
  const strengths = (review.strengths || [])
    .map(s => (typeof s === 'string' ? s : s.comment || s.quote || ''))
    .filter(Boolean);

  const segments = useMemo(
    () => buildSegments(content || '', suggestions),
    [content, suggestions],
  );

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const esc = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', esc); };
  }, [onClose]);

  // Reset drawn-line tracker when a new review is loaded (different quotes)
  useEffect(() => { setDrawnLines({}); }, [suggestionsKey]);

  useEffect(() => {
    if (!mounted) return;

    function compute() {
      const body = bodyRef.current;
      if (!body) return;
      const bb  = body.getBoundingClientRect();
      const st  = body.scrollTop;
      const bw  = body.offsetWidth;

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

      const cardX    = bw - CARD_R - CARD_W;
      const newPaths = [];
      suggestions.forEach((s, i) => {
        const mark = markRefs.current[i];
        if (!mark || resolved[i] == null) return;
        const mr = mark.getBoundingClientRect();
        const x1 = mr.right - bb.left;
        const y1 = (mr.top + mr.bottom) / 2 - bb.top + st;
        const h  = cardRefs.current[i]?.offsetHeight || 140;
        const x2 = cardX;
        const y2 = resolved[i] + h / 2;
        newPaths.push({ i, d: bezier(x1, y1, x2, y2), color: LC[s.category] || '#94A3B8' });
      });
      setPaths(newPaths);
      // NOTE: do NOT reset drawnLines here — lines must stay solid on scroll
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

            {/* Prompt box (if available) */}
            {prompt && (
              <div className="erv-prompt-box">{prompt}</div>
            )}

            {/* Essay body with animated highlights */}
            <div className="erv-essay-text">
              {segments.map((seg, si) =>
                seg.idx === null ? (
                  <span key={si}>{seg.text}</span>
                ) : (() => {
                  const i     = seg.idx;
                  const delay = ANIM.BASE + i * ANIM.STEP;
                  return (
                    <mark
                      key={si}
                      ref={el => { markRefs.current[i] = el; }}
                      className={`erv-mark ${mounted ? 'lit' : ''} ${active === i ? 'active' : ''}`}
                      style={{
                        '--hl':       HL[suggestions[i]?.category] || 'rgba(99,102,241,0.20)',
                        '--hl-delay': `${delay}s`,
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

          {/* Floating annotation cards */}
          {suggestions.map((s, i) => {
            const chip      = CHIP[s.category] || dfChip;
            const top       = cardTops[i];
            const cardDelay = ANIM.BASE + i * ANIM.STEP + ANIM.CARD_EXTRA;
            return (
              <div
                key={i}
                ref={el => { cardRefs.current[i] = el; }}
                className={`erv-card ${active === i ? 'active' : ''} ${mounted && top != null ? 'in' : ''}`}
                style={{
                  position: 'absolute',
                  right: CARD_R + 'px',
                  top: (top ?? -9999) + 'px',
                  width: CARD_W + 'px',
                  transitionDelay: top != null ? `${cardDelay}s` : '0s',
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

          {/* SVG bezier connectors — solid reveal, not dotted */}
          <svg className="erv-svg" aria-hidden="true">
            {paths.map(({ i, d, color }) => {
              const lineDelay = ANIM.BASE + i * ANIM.STEP + ANIM.LINE_EXTRA;
              const isDrawn   = drawnLines[i];
              const isActive  = active === i;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  strokeLinecap="round"
                  opacity={isActive ? 0.9 : 0.55}
                  pathLength={isDrawn ? undefined : 1}
                  strokeDasharray={isDrawn ? undefined : '1'}
                  className={isDrawn ? undefined : 'erv-line-draw'}
                  style={{
                    '--line-delay': `${lineDelay}s`,
                    '--line-dur':   `${ANIM.LINE_DUR}s`,
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

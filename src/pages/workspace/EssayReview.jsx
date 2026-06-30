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
  specificity:  'rgba(245,158,11,0.20)',
  clarity:      'rgba(59,130,246,0.20)',
  impact:       'rgba(245,158,11,0.20)',
  structure:    'rgba(99,102,241,0.20)',
  authenticity: 'rgba(236,72,153,0.20)',
  grammar:      'rgba(239,68,68,0.20)',
};

const LC = {
  specificity:  '#F59E0B',
  clarity:      '#3B82F6',
  impact:       '#F59E0B',
  structure:    '#6366F1',
  authenticity: '#EC4899',
  grammar:      '#EF4444',
};

const CARD_W   = 264;
const CARD_R   = 22;
const CARD_GAP = 12;

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

export default function EssayReview({ review, content, title, university, onClose }) {
  const [active, setActive]       = useState(null);
  const [mounted, setMounted]     = useState(false);
  const [cardTops, setCardTops]   = useState({});
  const [paths, setPaths]         = useState([]);

  const bodyRef  = useRef(null);
  const markRefs = useRef({});
  const cardRefs = useRef({});

  const suggestions = review.suggestions || [];
  const strengths = (review.strengths || [])
    .map(s => (typeof s === 'string' ? s : s.comment || s.quote || ''))
    .filter(Boolean);

  const segments = useMemo(
    () => buildSegments(content || '', suggestions),
    [content, suggestions],
  );

  /* Fade the backdrop in on next frame */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', esc); };
  }, [onClose]);

  /* Compute card vertical positions + SVG bezier paths */
  useEffect(() => {
    if (!mounted) return;

    function compute() {
      const body = bodyRef.current;
      if (!body) return;
      const bb  = body.getBoundingClientRect();
      const st  = body.scrollTop;
      const bw  = body.offsetWidth;

      /* Step 1 — vertical center of each highlight in content coords */
      const centers = {};
      suggestions.forEach((_, i) => {
        const el = markRefs.current[i];
        if (!el) return;
        const r = el.getBoundingClientRect();
        centers[i] = (r.top + r.bottom) / 2 - bb.top + st;
      });

      /* Step 2 — sort by Y, push cards down to avoid overlap */
      const sorted = Object.entries(centers)
        .map(([k, y]) => [+k, y])
        .sort((a, b) => a[1] - b[1]);

      let lastBottom = -Infinity;
      const resolved = {};
      for (const [i, y] of sorted) {
        const h   = cardRefs.current[i]?.offsetHeight || 120;
        const top = Math.max(y - h / 2, lastBottom + CARD_GAP, 8);
        resolved[i] = top;
        lastBottom   = top + h;
      }
      setCardTops(resolved);

      /* Step 3 — SVG bezier from mark right-edge → card left-edge */
      const cardX   = bw - CARD_R - CARD_W;
      const newPaths = [];
      suggestions.forEach((s, i) => {
        const mark = markRefs.current[i];
        if (!mark || resolved[i] == null) return;
        const mr = mark.getBoundingClientRect();
        const x1 = mr.right - bb.left;
        const y1 = (mr.top + mr.bottom) / 2 - bb.top + st;
        const h  = cardRefs.current[i]?.offsetHeight || 120;
        const x2 = cardX;
        const y2 = resolved[i] + h / 2;
        const cx = x1 + (x2 - x1) * 0.52;
        newPaths.push({
          i,
          d: `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`,
          color: LC[s.category] || '#94A3B8',
        });
      });
      setPaths(newPaths);
    }

    /* Two passes: one immediate, one after fonts/images settle */
    const t1 = setTimeout(compute, 60);
    const t2 = setTimeout(compute, 380);
    const body = bodyRef.current;
    body?.addEventListener('scroll', compute);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      body?.removeEventListener('scroll', compute);
    };
  }, [mounted, suggestions]);

  function activate(i) {
    setActive(i);
    markRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* Essay text leaves room for cards on the right */
  const essayPadRight = CARD_W + CARD_R + 44;

  return createPortal(
    <div className={`erv-backdrop ${mounted ? 'in' : ''}`} onMouseDown={onClose}>
      <div className="erv-modal" onMouseDown={e => e.stopPropagation()}>

        {/* ── Header ── */}
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

        {/* ── Single-scroll body — cards positioned absolute ── */}
        <div className="erv-body" ref={bodyRef}>

          {/* Overall impression */}
          {review.overall && (
            <p className="erv-overall">{review.overall}</p>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="erv-strengths">
              {strengths.map((s, i) => (
                <div key={i} className="erv-strength">
                  <span className="erv-strength-tick">✓</span>
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* Essay with highlighted quotes */}
          <div className="erv-essay-text" style={{ paddingRight: essayPadRight + 'px' }}>
            {segments.map((seg, si) =>
              seg.idx === null ? (
                <span key={si}>{seg.text}</span>
              ) : (
                <mark
                  key={si}
                  ref={el => { markRefs.current[seg.idx] = el; }}
                  className={`erv-mark ${mounted ? 'lit' : ''} ${active === seg.idx ? 'active' : ''}`}
                  style={{ '--hl': HL[suggestions[seg.idx]?.category] || 'rgba(99,102,241,0.18)' }}
                  onMouseEnter={() => setActive(seg.idx)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => activate(seg.idx)}
                >
                  {seg.text}
                </mark>
              )
            )}
          </div>

          {/* Floating suggestion cards */}
          {suggestions.map((s, i) => {
            const chip = CHIP[s.category] || dfChip;
            const top  = cardTops[i];
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
                  transitionDelay: top != null ? `${i * 0.07}s` : '0s',
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

          {/* SVG bezier connector lines */}
          <svg className="erv-svg" aria-hidden="true">
            {paths.map(({ i, d, color }) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={active === i ? 2 : 1.5}
                strokeDasharray={active === i ? '' : '5 4'}
                opacity={active === i ? 0.9 : 0.5}
                style={{ transition: 'stroke-width 0.15s, opacity 0.15s' }}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>,
    document.body,
  );
}

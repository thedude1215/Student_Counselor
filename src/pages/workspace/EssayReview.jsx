import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Compass, CheckCircle2 } from 'lucide-react';
import NovaMascot from '../../components/NovaMascot.jsx';

const CHIP = {
  specificity:  { label: 'BE SPECIFIC', bg: '#FFF8E6', color: '#92400E' },
  clarity:      { label: 'CLARITY',     bg: '#E5EAFF', color: '#2E3A8C' },
  impact:       { label: 'TIGHTEN',     bg: '#FEF1E6', color: '#B45309' },
  structure:    { label: 'STRUCTURE',   bg: '#EDE9FF', color: '#065f46' },
  authenticity: { label: 'AUTHENTIC',   bg: '#FFE8E6', color: '#9D174D' },
  grammar:      { label: 'GRAMMAR',     bg: '#FFE8E6', color: '#C0392B' },
  strength:     { label: 'STRENGTH',    bg: '#ECFDF5', color: '#047857' },
};
const dfChip = CHIP.clarity;

const HL = {
  specificity:  'rgba(146,64,14,0.16)',
  clarity:      'rgba(46,58,140,0.16)',
  impact:       'rgba(180,83,9,0.16)',
  structure:    'rgba(6,95,70,0.14)',
  authenticity: 'rgba(157,23,77,0.16)',
  grammar:      'rgba(192,57,43,0.16)',
  strength:     'rgba(4,120,87,0.18)',
};

const LC = {
  specificity:  '#92400E',
  clarity:      '#2E3A8C',
  impact:       '#B45309',
  structure:    '#065f46',
  authenticity: '#9D174D',
  grammar:      '#C0392B',
  strength:     '#047857',
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

// Apply corrections to a chunk of text → returns sub-segments [{kind:'text'|'correction', text, c?}]
function applyCorrections(chunk, corrList) {
  const lower = chunk.toLowerCase();
  const cRanges = [];
  for (const c of corrList) {
    let from = 0;
    while (true) {
      const found = lower.indexOf(c.origLower, from);
      if (found === -1) break;
      cRanges.push({ start: found, end: found + c.origLower.length, c });
      from = found + 1;
    }
  }
  cRanges.sort((a, b) => a.start - b.start);
  const placed = []; let cCur = -1;
  for (const r of cRanges) {
    if (r.start < cCur) continue;
    placed.push(r); cCur = r.end;
  }
  if (!placed.length) return [{ kind: 'text', text: chunk }];
  const result = []; let p = 0;
  for (const r of placed) {
    if (r.start > p) result.push({ kind: 'text', text: chunk.slice(p, r.start) });
    result.push({ kind: 'correction', text: chunk.slice(r.start, r.end), c: r.c });
    p = r.end;
  }
  if (p < chunk.length) result.push({ kind: 'text', text: chunk.slice(p) });
  return result;
}

function buildSegments(text, annotations, corrections) {
  const lower = text.toLowerCase();

  // Pre-process corrections into a lookup list
  const corrList = (corrections || [])
    .map(c => ({ ...c, origLower: (c.original || '').trim().toLowerCase() }))
    .filter(c => c.origLower && lower.includes(c.origLower));

  // Find annotation ranges (non-overlapping, greedy)
  const annotRanges = [];
  annotations.forEach((s, i) => {
    const q = (s.quote || '').trim();
    if (!q) return;
    const start = lower.indexOf(q.toLowerCase());
    if (start === -1) return;
    annotRanges.push({ start, end: start + q.length, idx: i });
  });
  annotRanges.sort((a, b) => a.start - b.start);
  const placedAnnot = []; let cur = -1;
  for (const r of annotRanges) {
    if (r.start < cur) continue;
    placedAnnot.push(r); cur = r.end;
  }

  // Build top-level segments: annotation blocks + plain text gaps
  const topSegs = []; let pos = 0;
  for (const r of placedAnnot) {
    if (r.start > pos) topSegs.push({ kind: 'text', text: text.slice(pos, r.start) });
    topSegs.push({ kind: 'annotation', text: text.slice(r.start, r.end), idx: r.idx });
    pos = r.end;
  }
  if (pos < text.length) topSegs.push({ kind: 'text', text: text.slice(pos) });

  // For each segment, split by corrections → produce final flat list
  // Annotations get a `subs` array so corrections render INSIDE the <mark>.
  const finalSegs = [];
  for (const seg of topSegs) {
    if (seg.kind === 'annotation') {
      finalSegs.push({ ...seg, subs: applyCorrections(seg.text, corrList) });
    } else {
      finalSegs.push(...applyCorrections(seg.text, corrList));
    }
  }

  // Stamp each correction with a sequential index so the component can
  // observe it and trigger its strikethrough animation when scrolled into view.
  let ci = 0;
  for (const seg of finalSegs) {
    if (seg.kind === 'correction') seg.ci = ci++;
    else if (seg.subs) {
      for (const sub of seg.subs) {
        if (sub.kind === 'correction') sub.ci = ci++;
      }
    }
  }
  return finalSegs;
}

export default function EssayReview({ review, content, title, university, prompt, onClose, onReanalyze, reviewing }) {
  const [mounted,    setMounted]    = useState(false);
  const [active,     setActive]     = useState(null);
  const [cardTops,   setCardTops]   = useState({});
  const [paths,      setPaths]      = useState([]);
  // seenMarks[i] = true once suggestion i's mark has scrolled into view
  const [seenMarks,  setSeenMarks]  = useState({});
  const [drawnLines, setDrawnLines] = useState({});
  // seenCorr[ci] = true once correction ci has scrolled into view → strike animation fires
  const [seenCorr,   setSeenCorr]   = useState({});

  const bodyRef  = useRef(null);
  const markRefs = useRef({});
  const cardRefs = useRef({});
  const corrRefs = useRef({});

  // Unified annotation list: suggestions + strength annotations share the same
  // index space so highlights, cards, connectors, and animations all work identically.
  const annotations = useMemo(() => {
    const sugg = (review.suggestions || []).map(s => ({
      kind: 'suggestion',
      quote: s.quote,
      category: s.category,
      text: s.suggestion,
    }));
    const strong = (review.strength_annotations || []).map(s => ({
      kind: 'strength',
      quote: s.quote,
      category: 'strength',
      text: s.comment,
    }));
    return [...sugg, ...strong];
  }, [review]);

  const suggestionsKey = annotations.map(s => s.quote).join('|');
  const strengths = (review.strengths || [])
    .map(s => (typeof s === 'string' ? s : s.comment || s.quote || ''))
    .filter(Boolean);
  // Legacy bullet list only when there are no inline strength annotations.
  const showStrengthBullets = strengths.length > 0 && !(review.strength_annotations || []).length;

  const corrections = review.corrections || [];

  const segments = useMemo(
    () => buildSegments(content || '', annotations, corrections),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content, annotations, corrections.map(c => c.original).join('|')],
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
    setSeenCorr({});
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
      annotations.forEach((_, i) => {
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
      annotations.forEach((s, i) => {
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
  }, [mounted, annotations]);

  /* IntersectionObserver — trigger each suggestion's animation when its mark enters view */
  useEffect(() => {
    if (!mounted) return;
    const body = bodyRef.current;
    if (!body) return;

    const observers = [];
    annotations.forEach((_, i) => {
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
  }, [mounted, annotations]);

  /* IntersectionObserver — trigger each correction's strikethrough when it enters view */
  useEffect(() => {
    if (!mounted) return;
    const body = bodyRef.current;
    if (!body) return;

    const observers = [];
    Object.entries(corrRefs.current).forEach(([ci, el]) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setSeenCorr(prev => ({ ...prev, [ci]: true }));
            obs.disconnect(); // fire once per correction
          }
        },
        { root: body, threshold: 0.6 },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [mounted, segments]);

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
            <span className="erv-nova-badge"><NovaMascot size={15} /> Nova · Essay review</span>
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
                <Compass size={12} />
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

            {showStrengthBullets && (
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
              {(() => {
                // Shared renderer — strikethrough draws when the correction enters view
                const renderCorrection = (seg, key) => {
                  const isDelete = seg.c?.type === 'delete' || !seg.c?.corrected;
                  return (
                    <span
                      key={key}
                      ref={el => { corrRefs.current[seg.ci] = el; }}
                      className={
                        `erv-correction${isDelete ? ' erv-corr-delete' : ''}${seenCorr[seg.ci] ? ' lit' : ''}`
                      }
                    >
                      <del className="erv-del">{seg.text}</del>
                      {!isDelete && <ins className="erv-ins">{seg.c.corrected}</ins>}
                    </span>
                  );
                };

                return segments.map((seg, si) => {
                  if (seg.kind === 'correction') return renderCorrection(seg, si);
                  if (seg.kind === 'text') return <span key={si}>{seg.text}</span>;

                  // kind === 'annotation' — may contain correction sub-segments
                  const i = seg.idx;
                  return (
                    <mark
                      key={si}
                      ref={el => { markRefs.current[i] = el; }}
                      className={`erv-mark ${seenMarks[i] ? 'lit' : ''} ${active === i ? 'active' : ''}`}
                      style={{
                        '--hl':       HL[annotations[i]?.category] || 'rgba(99,102,241,0.20)',
                        '--hl-delay': '0s',
                      }}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onClick={() => activate(i)}
                    >
                      {(seg.subs || [{ kind: 'text', text: seg.text }]).map((sub, sj) =>
                        sub.kind === 'correction'
                          ? renderCorrection(sub, sj)
                          : <span key={sj}>{sub.text}</span>
                      )}
                    </mark>
                  );
                });
              })()}
            </div>
          </div>

          {/* Floating annotation cards — slide in after their mark is seen */}
          {annotations.map((s, i) => {
            const isStrength = s.kind === 'strength';
            const chip = CHIP[s.category] || dfChip;
            const top  = cardTops[i];
            const seen = seenMarks[i];
            return (
              <div
                key={i}
                ref={el => { cardRefs.current[i] = el; }}
                className={`erv-card ${isStrength ? 'erv-card-strength' : ''} ${active === i ? 'active' : ''} ${seen && top != null ? 'in' : ''}`}
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
                  <div className={`erv-avatar ${isStrength ? 'erv-avatar-strength' : ''}`}>
                    {isStrength ? <CheckCircle2 size={10} /> : <Compass size={10} />}
                  </div>
                  <span className="erv-card-byline">Nova · Essay review</span>
                </div>
                <div className="erv-chip" style={{ background: chip.bg, color: chip.color }}>
                  {chip.label}
                </div>
                <p className="erv-card-text">{s.text}</p>
              </div>
            );
          })}

          {annotations.length === 0 && mounted && (
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';

/* Category → visual identity for highlights + cards. */
const CATEGORY = {
  specificity:  { label: 'Specificity',  hue: '#D97706', soft: 'rgba(217,119,6,0.16)',  line: 'rgba(217,119,6,0.55)' },
  clarity:      { label: 'Clarity',      hue: '#2563EB', soft: 'rgba(37,99,235,0.14)',  line: 'rgba(37,99,235,0.5)' },
  impact:       { label: 'Impact',       hue: '#7C3AED', soft: 'rgba(124,58,237,0.15)', line: 'rgba(124,58,237,0.5)' },
  structure:    { label: 'Structure',    hue: '#0D9488', soft: 'rgba(13,148,136,0.15)', line: 'rgba(13,148,136,0.5)' },
  authenticity: { label: 'Authenticity', hue: '#E11D48', soft: 'rgba(225,29,72,0.13)',  line: 'rgba(225,29,72,0.5)' },
  grammar:      { label: 'Grammar',      hue: '#DC2626', soft: 'rgba(220,38,38,0.14)',  line: 'rgba(220,38,38,0.5)' },
};
const cat = (c) => CATEGORY[c] || CATEGORY.clarity;

/* Build non-overlapping highlight segments from the essay text + suggestions.
   Each suggestion's quote is located by its first case-insensitive occurrence;
   overlapping matches are dropped (earliest start wins). */
function buildSegments(text, suggestions) {
  const lower = text.toLowerCase();
  const ranges = [];
  suggestions.forEach((s, i) => {
    const q = (s.quote || '').toLowerCase().trim();
    if (!q) return;
    const start = lower.indexOf(q);
    if (start === -1) return;
    ranges.push({ start, end: start + q.length, idx: i });
  });
  ranges.sort((a, b) => a.start - b.start);

  const placed = [];
  let cursor = -1;
  for (const r of ranges) {
    if (r.start < cursor) continue; // overlaps an earlier highlight
    placed.push(r);
    cursor = r.end;
  }

  const segments = [];
  let pos = 0;
  for (const r of placed) {
    if (r.start > pos) segments.push({ text: text.slice(pos, r.start), idx: null });
    segments.push({ text: text.slice(r.start, r.end), idx: r.idx });
    pos = r.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), idx: null });
  return segments;
}

function ScoreRing({ score }) {
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const R = 26, C = 2 * Math.PI * R;
  const hue = score >= 8 ? '#16A34A' : score >= 6 ? '#D97706' : '#DC2626';
  return (
    <div className="erv-score">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={R} fill="none" stroke="#EEE9E1" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={R} fill="none" stroke={hue} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
          transform="rotate(-90 32 32)" className="erv-score-arc"
        />
      </svg>
      <div className="erv-score-num" style={{ color: hue }}>{score}<span>/10</span></div>
    </div>
  );
}

export default function EssayReview({ review, content, title, university, onClose }) {
  const [active, setActive] = useState(null);     // hovered/selected suggestion index
  const [mounted, setMounted] = useState(false);
  const markRefs = useRef({});
  const suggestions = review.suggestions || [];

  const segments = useMemo(() => buildSegments(content || '', suggestions), [content, suggestions]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  function focusSuggestion(i) {
    setActive(i);
    const el = markRefs.current[i];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return createPortal(
    <div className={`erv-backdrop ${mounted ? 'in' : ''}`} onMouseDown={onClose}>
      <div className="erv-modal" onMouseDown={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="erv-head">
          <div className="erv-head-l">
            <span className="erv-badge"><Sparkles size={13} /> Nova's review</span>
            <h2 className="erv-title">{title || 'Untitled essay'}</h2>
            {university && <span className="erv-uni">{university}</span>}
          </div>
          <button className="erv-close" onClick={onClose} title="Close"><X size={18} /></button>
        </div>

        <div className="erv-body">
          {/* Left: highlighted essay */}
          <div className="erv-doc">
            <p className="erv-doc-text">
              {segments.map((seg, i) =>
                seg.idx === null ? (
                  <span key={i}>{seg.text}</span>
                ) : (
                  <mark
                    key={i}
                    ref={(el) => { markRefs.current[seg.idx] = el; }}
                    className={`erv-mark ${mounted ? 'lit' : ''} ${active === seg.idx ? 'active' : ''}`}
                    style={{
                      '--hue': cat(suggestions[seg.idx]?.category).hue,
                      '--soft': cat(suggestions[seg.idx]?.category).soft,
                      '--line': cat(suggestions[seg.idx]?.category).line,
                      transitionDelay: `${0.15 + seg.idx * 0.07}s`,
                    }}
                    onMouseEnter={() => setActive(seg.idx)}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => focusSuggestion(seg.idx)}
                  >
                    {seg.text}
                  </mark>
                )
              )}
            </p>
          </div>

          {/* Right: suggestions rail */}
          <div className="erv-rail">
            {review.overall && (
              <div className="erv-overall">
                <ScoreRing score={review.score || 0} />
                <p>{review.overall}</p>
              </div>
            )}

            {review.strengths?.length > 0 && (
              <div className="erv-strengths">
                <div className="erv-rail-label">What's working</div>
                {review.strengths.map((s, i) => (
                  <div key={i} className="erv-strength"><span>✓</span>{s}</div>
                ))}
              </div>
            )}

            <div className="erv-rail-label erv-rail-label-sug">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
            </div>
            <div className="erv-cards">
              {suggestions.map((s, i) => {
                const c = cat(s.category);
                return (
                  <div
                    key={i}
                    className={`erv-card ${active === i ? 'active' : ''}`}
                    style={{ '--hue': c.hue, '--soft': c.soft }}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => focusSuggestion(i)}
                  >
                    <div className="erv-card-top">
                      <span className="erv-chip">{c.label}</span>
                    </div>
                    <div className="erv-quote">“{s.quote}”</div>
                    {s.issue && <div className="erv-issue">{s.issue}</div>}
                    <div className="erv-fix"><ArrowRight size={13} />{s.suggestion}</div>
                  </div>
                );
              })}
              {suggestions.length === 0 && (
                <div className="erv-empty-sug">No line-level changes flagged — strong draft.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

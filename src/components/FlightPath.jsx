import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/*
 * FlightPath
 * One continuous dotted flight path running from Act I onward, with the paper
 * plane riding it as you scroll.
 *
 *  • Geometry — anchors are read at runtime from every [data-waypoint] section.
 *    The route alternates sides through the product acts, then keeps sweeping
 *    behind centered content instead of locking into straight side rails.
 *  • Progress  — the plane sits at the point on the path level with the middle
 *    of the viewport, found by binary search over pre-sampled points. The trail
 *    draws itself in behind the plane; the route ahead stays faint.
 *  • Rotation  — taken from the local tangent, so the plane banks into turns.
 *  • Waypoints — each anchor gets a dot that lights up as the plane passes it,
 *    the same language as the Journey map's milestone nodes.
 *
 * The hero keeps its own text-to-logo connection line; this route starts where
 * the product story starts: "Tell us who you are."
 */

/* Cheap early-out. The real gate is the clearance check in gutters(), which
   measures the widest section and bails if the route would not fit beside it. */
const MIN_PATH_WIDTH = 1180;
const SAMPLE_COUNT = 420;

/* Which side each section's anchor sits on.
 *
 * For two-column sections these follow the artwork side. For centered sections
 * they are hand-tuned to keep the line moving in broad S-curves; the SVG sits
 * behind section content, so the route may disappear under copy or cards and
 * reappear like a real flight path crossing a map. */
const SIDE = {
  departure:    'l',
  receipts:     'r',   // stat cards sit right
  'act-1':      'r',   // art right, text left
  'act-2':      'l',   // flipped
  'act-3':      'r',
  'act-4':      'l',   // flipped
  scholarships: 'r',   // art right
  map:          'l',
  nova:         'r',   // phone frame right
  value:        'l',
  faq:          'r',
  arrival:      'l',
};

const FIRST_WAYPOINT = 'act-1';

/* Each section contributes a single anchor, at its vertical centre, and the
   sides alternate — so every segment is a full section-height S-curve and the
   route reads as one continuous flight path rather than a straight rail.
 *
 * The path layer is behind the page content, so centered sections no longer
 * need extra same-side "hold" anchors. Those anchors kept the route readable,
 * but they also created straight vertical rails.
 */

const GUTTER_GAP = 26;     // how far outside the content column the route sits
const EDGE_MIN = 14;       // never closer than this to the viewport edge

/* Measure the real content column rather than assuming --max-w: several
   sections override .wrap's max-width (the hero runs to 1180, the WhatsApp
   block to 1100), and assuming 1080 puts the "gutter" straight through them.
   One left and one right x is derived for the whole route, from the widest
   section, so the vertical runs stay aligned down the page. */
function gutters(sections, originX, width) {
  let widestLeft = Infinity;
  let widestRight = -Infinity;

  sections.forEach(el => {
    const inner = el.querySelector('.wrap') || el;
    const r = inner.getBoundingClientRect();
    if (!r.width) return;
    widestLeft = Math.min(widestLeft, r.left - originX);
    widestRight = Math.max(widestRight, r.right - originX);
  });

  if (!Number.isFinite(widestLeft) || widestRight < 0) return null;

  const l = widestLeft - GUTTER_GAP;
  const r = widestRight + GUTTER_GAP;

  // Not enough room beside the content for the route to live in.
  if (l < EDGE_MIN || r > width - EDGE_MIN) return null;

  return { l, r, c: width / 2 };
}

/* Index of the first sample at or past `y`. Samples run top to bottom, so a
   binary search is valid. */
function indexAtY(samples, y) {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].y < y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/* Cubic beziers with purely vertical tangents at every anchor.
 *
 * Both control points sit directly below/above their own anchor, so each
 * segment's four control x-values are only p1.x and p2.x. A bezier is contained
 * in the convex hull of its control points, which makes horizontal overshoot
 * impossible — the curve can never leave the [p1.x, p2.x] band.
 *
 * A Catmull-Rom spline was used here first and derived each control point from
 * the *neighbouring* anchors instead. With a far-away neighbour on the opposite
 * side that threw the control point well past the edge of the page
 * (c2x = 150 - (1290 - 150)/6 = -40), which is what bowed the route off-canvas
 * in the hero. Same-x anchors now give a dead-straight vertical run, and a side
 * change gives a clean S.
 */
function flowPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const k = (p2.y - p1.y) / 2;
    d += ` C ${p1.x} ${p1.y + k}, ${p2.x} ${p2.y - k}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function FlightPath() {
  const pathRef = useRef(null);

  const [geom, setGeom] = useState(null);      // { d, width, height, nodes }
  const [samples, setSamples] = useState([]);  // points along the rendered path
  const [progress, setProgress] = useState(0); // 0..1 along the path
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /* ── Measure: build the route from the live section anchors ── */
  const measure = useCallback(() => {
    if (window.innerWidth < MIN_PATH_WIDTH) {
      setGeom(null);
      return;
    }

    const host = document.querySelector('.home');
    const allSections = [...document.querySelectorAll('[data-waypoint]')];
    const firstIndex = allSections.findIndex(el => el.dataset.waypoint === FIRST_WAYPOINT);
    const sections = firstIndex >= 0 ? allSections.slice(firstIndex) : allSections;
    if (!host || sections.length < 2) {
      setGeom(null);
      return;
    }

    const hostRect = host.getBoundingClientRect();
    const originY = hostRect.top + window.scrollY;
    const width = host.offsetWidth;
    const height = host.offsetHeight;

    const g = gutters(sections, hostRect.left, width);
    if (!g) {
      setGeom(null);
      return;
    }

    // A section that is display:none or not yet laid out reports an all-zero
    // rect. Including it would drag an anchor to y=0 and wreck the spline, so
    // drop anything with no box.
    const pts = [];
    const nodes = [];   // one marker dot per section, at its midpoint

    sections
      .map(el => ({ el, name: el.dataset.waypoint, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.height > 0)
      .forEach(({ el, name, rect }) => {
        const x = g[SIDE[name] ?? 'c'];
        const top = rect.top + window.scrollY - originY;
        const mid = top + rect.height / 2;

        // A single anchor at the centre keeps each transition as a broad
        // S-curve. The route sits behind section content, so it can pass under
        // centered copy/cards without needing straight side-rail holds.
        pts.push({ x, y: mid });

        // x is resolved from the sampled curve at render time.
        nodes.push({ name, y: mid });
      });

    if (pts.length < 2) {
      setGeom(null);
      return;
    }

    setGeom({ d: flowPath(pts), width, height, nodes });
  }, []);

  useEffect(() => {
    // Debounced on a timer rather than requestAnimationFrame: rAF is throttled
    // or paused entirely in a hidden or background tab, which would strand the
    // route at whatever size it last measured. Timers keep running.
    let timer = 0;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 100);
    };

    schedule();
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);

    // Fonts and images settle after first paint and shift section heights.
    const settle = setTimeout(measure, 400);
    const ro = new ResizeObserver(schedule);
    const host = document.querySelector('.home');
    if (host) ro.observe(host);

    return () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('load', schedule);
      clearTimeout(timer);
      clearTimeout(settle);
      ro.disconnect();
    };
  }, [measure]);

  /* ── Sample the rendered path so scroll lookups are cheap ──
     Held in state, not a ref: the samples decide where the plane is drawn,
     so producing them has to trigger a render. */
  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el || !geom) {
      setSamples([]);
      return;
    }
    const total = el.getTotalLength();
    const out = new Array(SAMPLE_COUNT + 1);
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const len = (total * i) / SAMPLE_COUNT;
      const p = el.getPointAtLength(len);
      out[i] = { x: p.x, y: p.y, len };
    }
    setSamples(out);
  }, [geom]);

  /* ── Scroll: put the plane level with the middle of the viewport ── */
  useEffect(() => {
    if (!geom || reduced || !samples.length) return;

    let raf = 0;
    const update = () => {
      const host = document.querySelector('.home');
      if (!host) return;
      const originY = host.getBoundingClientRect().top + window.scrollY;
      const targetY = window.scrollY + window.innerHeight * 0.5 - originY;
      setProgress(indexAtY(samples, targetY) / (samples.length - 1));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [geom, reduced, samples]);

  if (!geom) return null;

  const total = samples.length ? samples[samples.length - 1].len : 0;
  const idx = Math.min(samples.length - 1, Math.round(progress * (samples.length - 1)));
  const here = samples[idx];
  const ahead = samples[Math.min(samples.length - 1, idx + 2)];
  const angle = here && ahead
    ? (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI
    : 0;

  const drawn = total * progress;

  return (
    <svg
      className="flight-path"
      aria-hidden="true"
      width={geom.width}
      height={geom.height}
      viewBox={`0 0 ${geom.width} ${geom.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* The route ahead — faint, dotted. */}
      <path
        ref={pathRef}
        d={geom.d}
        stroke="var(--blue)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="4 7"
        opacity="0.28"
      />

      {/* The trail already flown — drawn in behind the plane. */}
      {!reduced && total > 0 && (
        <path
          d={geom.d}
          stroke="var(--blue)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${drawn} ${total}`}
          opacity="0.75"
        />
      )}

      {/* Waypoint dots — pinned to the route, lit once the plane has passed. */}
      {samples.length > 0 && geom.nodes.map(node => {
        const at = samples[indexAtY(samples, node.y)];
        if (!at) return null;
        const lit = !reduced && here && node.y <= here.y;
        return (
          <circle
            key={node.name}
            cx={at.x}
            cy={at.y}
            r={lit ? 5 : 3.5}
            className={`flight-node${lit ? ' lit' : ''}`}
          />
        );
      })}

      {/* The plane, banking into the turns. */}
      {!reduced && here && (
        <g transform={`translate(${here.x} ${here.y}) rotate(${angle})`} className="flight-plane">
          {/* A solid paper plane, echoing the navbar logo. Emerald is mid-tone
              enough to hold up on the night sections and the daylight ones
              alike; an outlined glyph just read as a hollow arrowhead. */}
          <path d="M17 0 -11 11 -6 1.1 -11 -11Z" fill="var(--blue)" />
          <path d="M-6 1.1 -11 11 -1 4.4Z" fill="var(--blue-dark)" />
        </g>
      )}
    </svg>
  );
}

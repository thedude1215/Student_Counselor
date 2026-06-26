import { useState, useEffect, useCallback } from 'react';

/*
 * HeroConnectionLine
 * One continuous dotted "flight path" from the navbar's paper-plane icon
 * (#nav-logo-icon) — a tight aviation loop just below the plane, then a large
 * sweeping curve that lands at the word "Every" (#hero-every).
 *
 *  • Geometry — a single <path>, one M, two C commands (tight loop + big sweep).
 *  • Animation — the line draws itself on load (stroke-dashoffset reveal), then
 *    settles into its dotted resting state.
 *  • Scroll — fades out as soon as the user scrolls, to keep the layout clean.
 *
 * Coordinates are read at runtime from getBoundingClientRect() and redrawn on
 * resize. The SVG is a fixed, click-through overlay layered just above the navbar
 * so the line merges seamlessly with the logo.
 */

const MOBILE_BREAKPOINT = 768;
const SCROLL_FADE_THRESHOLD = 24;

export default function HeroConnectionLine() {
  const [path, setPath] = useState(null);
  const [drawn, setDrawn] = useState(false);
  const [faded, setFaded] = useState(false);

  const calculate = useCallback(() => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      setPath(null);
      return;
    }

    const plane = document.getElementById('nav-logo-icon');
    const every = document.getElementById('hero-every');
    if (!plane || !every) {
      setPath(null);
      return;
    }

    const planeRect = plane.getBoundingClientRect();
    const everyRect = every.getBoundingClientRect();
    if (!planeRect.width || !everyRect.width) {
      setPath(null);
      return;
    }

    const h = everyRect.height;

    // Anchors. The flight trail runs FROM the "E" up to the plane.
    const planeX = planeRect.left + planeRect.width / 2;
    const planeY = planeRect.bottom;
    
    //  • Start: To the LEFT of the 'E', at the height of the middle arm.
    const sX = everyRect.left - 15; 
    const sY = everyRect.top + h * 0.51;

    // A single, elegant C-curve that bulges to the left and sweeps up to the airplane.
    // Matches the provided screenshot exactly (no loops).
    
    // Control point 1: Pulls the line left and slightly down from the 'E'.
    const cp1_x = planeX - 120;
    const cp1_y = sY + 40;
    
    // End point: Just below the paper airplane's folding/crease point.
    const end_x = planeRect.left + planeRect.width * 0.45;
    const end_y = planeRect.top + planeRect.height * 0.75;

    // Control point 2: Positioned along the airplane's flight trajectory (~45° angle).
    // This ensures the line arrives at the airplane matching its exact flight direction.
    const cp2_x = end_x - 60;
    const cp2_y = end_y + 60;

    const d = `M ${sX} ${sY} C ${cp1_x} ${cp1_y}, ${cp2_x} ${cp2_y}, ${end_x} ${end_y}`;

    setPath(d);
  }, []);

  // Geometry: compute on mount + resize (no longer on scroll — scroll fades it).
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(calculate);
    };

    raf = requestAnimationFrame(calculate);
    window.addEventListener('resize', onResize);
    const settle = setTimeout(calculate, 300);
    window.addEventListener('load', calculate);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', calculate);
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [calculate]);

  // Scroll: fade the whole overlay out once the user starts scrolling.
  useEffect(() => {
    const onScroll = () => setFaded(window.scrollY > SCROLL_FADE_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!path) return null;

  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1001, // one above the navbar so the line flows out of the logo
        overflow: 'visible',
        opacity: faded ? 0 : 1,
        transition: 'opacity 0.45s ease',
      }}
    >
      <path
        d={path}
        fill="none"
        stroke="var(--blue)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
        // Before drawn: pathLength-normalised solid reveal (the draw-on).
        // After: the dotted resting state.
        className={drawn ? undefined : 'hero-line-draw'}
        pathLength={drawn ? undefined : 1}
        strokeDasharray={drawn ? '4 6' : undefined}
        onAnimationEnd={() => setDrawn(true)}
      />
    </svg>
  );
}

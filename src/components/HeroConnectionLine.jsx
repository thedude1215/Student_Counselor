import { useState, useEffect, useCallback } from 'react';

/*
 * HeroConnectionLine
 * One continuous dotted "flight path" from the navbar's paper-plane icon
 * (#nav-logo-icon) to the hero word (#hero-every).
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
    const planeX = planeRect.left + planeRect.width / 2;

    const sX = everyRect.left - 15;
    const sY = everyRect.top + h * 0.51;

    const cp1X = planeX - 120;
    const cp1Y = sY + 40;
    const endX = planeRect.left + planeRect.width * 0.45;
    const endY = planeRect.top + planeRect.height * 0.75;
    const cp2X = endX - 60;
    const cp2Y = endY + 60;

    setPath(`M ${sX} ${sY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`);
  }, []);

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
        zIndex: 1001,
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
        className={drawn ? undefined : 'hero-line-draw'}
        pathLength={drawn ? undefined : 1}
        strokeDasharray={drawn ? '4 6' : undefined}
        onAnimationEnd={() => setDrawn(true)}
      />
    </svg>
  );
}

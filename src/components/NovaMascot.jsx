/*
 * NovaMascot
 * Nova's face. The same character the student meets inside the workspace,
 * so the landing page and the product read as one thing.
 *
 *  • expression — the mood. Used as a through-line: Nova reacts differently
 *    at each act of the journey rather than wearing one frozen smile.
 *  • holding    — an optional prop (map, pen, checklist, compass, key) for the
 *    larger act moments. Ignored below 48px, where it would be mush.
 */

import { useId } from 'react';

const INK = '#0E2A1C';
const PAPER = '#F4F2EC';

/* ── Faces ── */
function Face({ expression, eyeR, mouthW }) {
  switch (expression) {
    /* Act I — meeting you for the first time. */
    case 'curious':
      return (
        <>
          <circle cx="39" cy="44" r={eyeR} fill={INK} />
          <circle cx="61" cy="44" r={eyeR} fill={INK} />
          <ellipse cx="50" cy="61" rx={mouthW * 0.85} ry={mouthW * 1.1} fill={INK} />
        </>
      );

    /* Act II — weighing the list, glancing off to one side. */
    case 'thinking':
      return (
        <>
          <circle cx="36" cy="44" r={eyeR} fill={INK} />
          <circle cx="58" cy="44" r={eyeR} fill={INK} />
          <path d="M42 60h13" stroke={INK} strokeWidth={mouthW} strokeLinecap="round" fill="none" />
        </>
      );

    /* Act III — heads down in the draft. */
    case 'focused':
      return (
        <>
          <ellipse cx="39" cy="46" rx={eyeR} ry={eyeR * 0.55} fill={INK} />
          <ellipse cx="61" cy="46" rx={eyeR} ry={eyeR * 0.55} fill={INK} />
          <path d="M43 59c2.5 2.6 9 2.6 12 0" stroke={INK} strokeWidth={mouthW} strokeLinecap="round" fill="none" />
        </>
      );

    /* Act IV / arrival — you made it. */
    case 'cheering':
      return (
        <>
          <path d="M33 48c2.5-5.5 9.5-5.5 12 0" stroke={INK} strokeWidth={mouthW} strokeLinecap="round" fill="none" />
          <path d="M55 48c2.5-5.5 9.5-5.5 12 0" stroke={INK} strokeWidth={mouthW} strokeLinecap="round" fill="none" />
          <path d="M40 56q10 12 20 0z" fill={INK} />
        </>
      );

    default:
      return (
        <>
          <circle cx="39" cy="46" r={eyeR} fill={INK} />
          <circle cx="61" cy="46" r={eyeR} fill={INK} />
          <path d="M41 59c3.5 4 14.5 4 18 0" stroke={INK} strokeWidth={mouthW} strokeLinecap="round" fill="none" />
        </>
      );
  }
}

/* ── Props ──
 * Anchored over the body's lower-right quadrant so they read as held rather
 * than floating alongside. Kept clear of the mouth (which ends around x=59)
 * and inside the 100x100 viewBox, which the SVG root clips.
 */
function Holding({ holding }) {
  switch (holding) {
    case 'map':
      return (
        <g transform="translate(52 58)">
          <path
            d="M0 6 12 0 24 6 36 0v26l-12 6-12-6-12 6z"
            fill={PAPER} stroke={INK} strokeWidth="2.6" strokeLinejoin="round"
          />
          <path d="M12 0v26M24 6v26" stroke={INK} strokeWidth="2" />
          <circle cx="18" cy="15" r="3" fill="#EF4444" />
        </g>
      );

    case 'pen':
      return (
        <g transform="translate(64 50) rotate(-34)">
          <rect x="0" y="0" width="10" height="26" rx="3.5" fill={PAPER} stroke={INK} strokeWidth="2.6" />
          <path d="M0 26h10l-5 8z" fill={INK} />
        </g>
      );

    case 'check':
      return (
        <g transform="translate(56 54)">
          <rect x="0" y="4" width="28" height="34" rx="4.5" fill={PAPER} stroke={INK} strokeWidth="2.6" />
          <rect x="8" y="0" width="12" height="8" rx="3" fill={INK} />
          <path d="M7 18l4.5 4.5 9-10" stroke="#059669" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 29h15" stroke="#9BB0A3" strokeWidth="3" strokeLinecap="round" />
        </g>
      );

    case 'key':
      return (
        <g transform="translate(56 56) rotate(-28)">
          <circle cx="10" cy="10" r="7.5" fill={PAPER} stroke={INK} strokeWidth="2.6" />
          <path d="M16 10h24" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M30 10v7M37 10v5" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="10" cy="10" r="2.7" fill="#34D399" />
        </g>
      );

    /* A thin needle vanishes at act size — this is the classic two-tone
       diamond, which still reads at ~35px. */
    case 'compass':
      return (
        <g transform="translate(52 52)">
          <circle cx="18" cy="18" r="17" fill={PAPER} stroke={INK} strokeWidth="2.6" />
          <path d="M18 4 26 19H10z" fill="#EF4444" />
          <path d="M18 32 10 19h16z" fill={INK} />
          <circle cx="18" cy="18" r="2.4" fill={PAPER} stroke={INK} strokeWidth="1.4" />
        </g>
      );

    default:
      return null;
  }
}

export default function NovaMascot({
  size = 72,
  animated = false,
  idle = false,
  expression = 'happy',
  holding,
}) {
  const bodyClass = animated ? 'nova-mascot-anim' : idle ? 'nova-mascot-idle' : undefined;
  const sparkClass = animated ? 'nova-mascot-spark' : idle ? 'nova-mascot-spark-idle' : undefined;

  // Below icon size the default features shrink to sub-pixel noise and the
  // mascot reads as a plain blob. Scale them up so the face still registers,
  // and drop the sparkle (invisible at that size anyway).
  const small = size <= 28;
  const scale = small ? 1.7 : 1;
  const eyeR = 4.2 * scale;
  const mouthW = 3.2 * scale;

  // Props only earn their pixels at display sizes.
  const showHolding = holding && size >= 48;

  // Nova now appears many times on one page. A shared gradient id would be a
  // duplicate DOM id, and every instance after the first loses its fill.
  const gradId = `novaMascotGrad-${useId()}`;

  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
      className={bodyClass}
    >
      <defs>
        <linearGradient id={gradId} x1="14" y1="10" x2="82" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34D399" />
          <stop offset="1" stopColor="#065F46" />
        </linearGradient>
      </defs>
      <path
        d="M50 8c14 0 25.5 6.2 31.5 16.4 5.4 9.2 6 20.4 2 30.2-4 9.8-12.4 17.4-22.6 20.8-11 3.7-23.3 3-33.4-3.1-9.4-5.7-15.7-15-17.2-25.8-1.6-11.6 2.6-23.4 11.5-31 7.4-6.4 17.3-9.9 28.2-7.5z"
        fill={`url(#${gradId})`}
      />
      <Face expression={expression} eyeR={eyeR} mouthW={mouthW} />
      {showHolding && <Holding holding={holding} />}
      {!small && (
        <path
          d="M79 18l2.6 6.4 6.4 2.6-6.4 2.6L79 36l-2.6-6.4-6.4-2.6 6.4-2.6z"
          fill="#F472B6"
          className={sparkClass}
        />
      )}
    </svg>
  );
}

// Hand-drawn 3D isometric milestone icons, Kollegio-style.
// Each is a flat-shaded SVG "object" that sits on top of the platform tile.

export function BackpackIcon({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* straps behind */}
      <path d="M14 12 Q14 5 24 5 Q34 5 34 12" stroke="#5A3A1E" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* main body */}
      <rect x="9" y="12" width="30" height="28" rx="7" fill="#C94F3D" />
      <rect x="9" y="12" width="30" height="28" rx="7" fill="url(#bp-shade)" />
      {/* side shading */}
      <path d="M9 19 Q9 12 16 12 L16 40 Q9 40 9 33 Z" fill="#A83B2C" />
      {/* front pocket */}
      <rect x="16" y="24" width="16" height="13" rx="4" fill="#E2664F" stroke="#8F2F22" strokeWidth="1.4" />
      <rect x="21" y="24" width="6" height="4" rx="1.5" fill="#8F2F22" />
      {/* top flap highlight */}
      <path d="M13 14 Q24 9 35 14" stroke="#F0937F" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <defs>
        <linearGradient id="bp-shade" x1="9" y1="12" x2="39" y2="40">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CompassIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* body: squashed ellipse for isometric feel */}
      <ellipse cx="24" cy="27" rx="19" ry="14" fill="#6E7678" />
      <ellipse cx="24" cy="25" rx="19" ry="14" fill="#9AA4A6" />
      <ellipse cx="24" cy="25" rx="15.5" ry="11" fill="#E8E4D8" stroke="#7C8486" strokeWidth="1.2" />
      {/* tick marks */}
      <path d="M24 15.5v2.6M24 31.9v2.6M10 25h3M35 25h3" stroke="#7C8486" strokeWidth="1.6" strokeLinecap="round" />
      {/* needle */}
      <path d="M24 25 L31.5 19.4 L26 25.8 Z" fill="#D14B3A" />
      <path d="M24 25 L16.5 30.6 L22 24.2 Z" fill="#3E4B50" />
      <circle cx="24" cy="25" r="2.1" fill="#3E4B50" stroke="#E8E4D8" strokeWidth="0.8" />
    </svg>
  );
}

export function ScrollIcon({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* rolled ends — dark wood dowels */}
      <rect x="5" y="6" width="38" height="8" rx="4" fill="#7A4B22" />
      <rect x="5" y="34" width="38" height="8" rx="4" fill="#5A3517" />
      {/* dowel caps */}
      <circle cx="8" cy="10" r="3.4" fill="#93602F" />
      <circle cx="40" cy="10" r="3.4" fill="#93602F" />
      <circle cx="8" cy="38" r="3.4" fill="#7A4B22" />
      <circle cx="40" cy="38" r="3.4" fill="#7A4B22" />
      {/* white sheet */}
      <rect x="10" y="10" width="28" height="28" fill="#FDFBF3" stroke="#C9B896" strokeWidth="1" />
      <path d="M10 10 h28 v4 H10 Z" fill="#EFE8D4" />
      {/* text lines */}
      <path d="M15 19h18M15 24h18M15 29h11" stroke="#8C7B55" strokeWidth="2.2" strokeLinecap="round" />
      {/* wax seal */}
      <circle cx="33" cy="31.5" r="5" fill="#B03427" />
      <circle cx="33" cy="31.5" r="2.4" fill="#E05A48" />
    </svg>
  );
}

export function CampusIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* pediment */}
      <path d="M24 4 L44 14 H4 Z" fill="#D8CBB2" />
      <path d="M24 4 L44 14 H24 Z" fill="#C2B294" />
      {/* architrave */}
      <rect x="6" y="14" width="36" height="4" fill="#B5A688" />
      {/* columns */}
      <rect x="9"  y="18" width="5" height="18" fill="#E8DEC8" />
      <rect x="18" y="18" width="5" height="18" fill="#DCD0B6" />
      <rect x="27" y="18" width="5" height="18" fill="#E8DEC8" />
      <rect x="36" y="18" width="4" height="18" fill="#CBBD9E" />
      {/* steps */}
      <rect x="5" y="36" width="38" height="4" fill="#B5A688" />
      <rect x="3" y="40" width="42" height="4" fill="#A29373" />
      {/* door */}
      <rect x="21" y="26" width="7" height="10" fill="#5A4A30" />
    </svg>
  );
}

export function MapIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* folded map: three panels */}
      <path d="M5 12 L17 8 V38 L5 42 Z" fill="#DCE9D2" />
      <path d="M17 8 L31 12 V42 L17 38 Z" fill="#C4DCB2" />
      <path d="M31 12 L43 8 V38 L31 42 Z" fill="#DCE9D2" />
      {/* water */}
      <path d="M5 30 Q11 26 17 30 L17 38 L5 42 Z" fill="#9FC6E8" />
      {/* route */}
      <path d="M10 18 Q16 24 22 19 T34 24 Q38 26 39 31" stroke="#D14B3A" strokeWidth="2" strokeDasharray="3.5 3" fill="none" strokeLinecap="round" />
      {/* destination pin */}
      <circle cx="39" cy="30" r="3.2" fill="#D14B3A" />
      <circle cx="39" cy="30" r="1.3" fill="#F3E7CB" />
      {/* fold shading */}
      <path d="M17 8 V38 M31 12 V42" stroke="#8FA87E" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}

export function ScalesIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* base */}
      <ellipse cx="24" cy="42.5" rx="9" ry="3" fill="#4A3524" />
      <rect x="21" y="38" width="6" height="4" fill="#5A3517" />
      {/* pole */}
      <rect x="22.4" y="10" width="3.2" height="30" rx="1.6" fill="#7A4B22" />
      <rect x="22.4" y="10" width="1.5" height="30" fill="#93602F" />
      {/* beam */}
      <rect x="5" y="9" width="38" height="3.4" rx="1.7" fill="#7A4B22" />
      <circle cx="24" cy="10.7" r="3.2" fill="#D14B3A" stroke="#4A3524" strokeWidth="1.2" />
      {/* hanger strings */}
      <path d="M10 12.5 L5.5 22 M10 12.5 L14.5 22 M38 12.5 L33.5 25 M38 12.5 L42.5 25" stroke="#4A3524" strokeWidth="1.5" strokeLinecap="round" />
      {/* pans — deep bowls with dark rims (one lower = weighing) */}
      <path d="M3.5 22 Q10 30 16.5 22 Z" fill="#B08A3E" />
      <ellipse cx="10" cy="22" rx="6.6" ry="2.3" fill="#E4C05A" stroke="#4A3524" strokeWidth="1.1" />
      <path d="M31.5 25 Q38 33 44.5 25 Z" fill="#B08A3E" />
      <ellipse cx="38" cy="25" rx="6.6" ry="2.3" fill="#E4C05A" stroke="#4A3524" strokeWidth="1.1" />
    </svg>
  );
}

export function CampfireIcon({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* outer flame */}
      <path d="M24 4 Q31 13 33 20 Q35 28 29 32 Q31 26 24 21 Q17 26 19 32 Q13 28 15 20 Q17 13 24 4Z" fill="#F5941D" />
      {/* inner flame */}
      <path d="M24 14 Q28 19 28 24 Q28 29 24 30 Q20 29 20 24 Q20 19 24 14Z" fill="#FFC93D" />
      <path d="M24 20 Q26 23 25.5 26 Q25 28.5 24 29 Q23 28.5 22.5 26 Q22 23 24 20Z" fill="#FFF3C4" />
      {/* logs */}
      <rect x="8" y="34" width="32" height="5" rx="2.5" transform="rotate(8 24 36.5)" fill="#7A4B22" />
      <rect x="8" y="34" width="32" height="5" rx="2.5" transform="rotate(-8 24 36.5)" fill="#93602F" />
      <ellipse cx="10" cy="39.5" rx="2.4" ry="2" fill="#5A3517" />
      <ellipse cx="38" cy="39.5" rx="2.4" ry="2" fill="#6E4420" />
    </svg>
  );
}

export function BooksIcon({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* bottom book */}
      <path d="M6 33 L24 27 L42 33 L24 39 Z" fill="#2F6E4E" />
      <path d="M6 33 L24 39 L24 44 L6 38 Z" fill="#245740" />
      <path d="M42 33 L24 39 L24 44 L42 38 Z" fill="#1C4632" />
      {/* middle book */}
      <path d="M8 26 L24 21 L40 26 L24 31.5 Z" fill="#C94F3D" />
      <path d="M8 26 L24 31.5 L24 36 L8 30.5 Z" fill="#A83B2C" />
      <path d="M40 26 L24 31.5 L24 36 L40 30.5 Z" fill="#8F2F22" />
      {/* top book */}
      <path d="M10 19 L24 14.5 L38 19 L24 24 Z" fill="#E8A33D" />
      <path d="M10 19 L24 24 L24 28 L10 23.5 Z" fill="#C9862B" />
      <path d="M38 19 L24 24 L24 28 L38 23.5 Z" fill="#A86D1F" />
      {/* page edges */}
      <path d="M12 19.4 L24 15.6 L36 19.4" stroke="#F3E7CB" strokeWidth="1.6" fill="none" />
      <path d="M10 26.4 L24 22 L38 26.4" stroke="#F3E7CB" strokeWidth="1.4" fill="none" opacity="0.85" />
    </svg>
  );
}

export function MountainIcon({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* back peak */}
      <path d="M28 16 L44 42 H12 Z" fill="#6E7678" />
      <path d="M28 16 L44 42 H28 Z" fill="#565E60" />
      {/* front peak */}
      <path d="M18 10 L36 42 H2 Z" fill="#8C9496" />
      <path d="M18 10 L36 42 H18 Z" fill="#6E7678" />
      {/* snow caps */}
      <path d="M18 10 L23 19 L20 17.5 L17.5 20 L15 17 L13 19 Z" fill="#F4F2EC" />
      <path d="M28 16 L32 23 L29.5 21 L27 23.5 L25.5 21.5 Z" fill="#E4E2DA" />
      {/* flag */}
      <rect x="17.2" y="2" width="1.7" height="10" fill="#4A3524" />
      <path d="M19 2.5 L28 5 L19 7.8 Z" fill="#D14B3A" />
    </svg>
  );
}

// id → icon component
export const MILESTONE_ICONS = {
  1: BackpackIcon,
  2: CompassIcon,
  3: ScrollIcon,
  4: CampusIcon,
  5: MapIcon,
  6: ScalesIcon,
  7: CampfireIcon,
  8: BooksIcon,
  9: MountainIcon,
};

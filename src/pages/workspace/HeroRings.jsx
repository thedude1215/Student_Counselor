// Hero centerpiece rings — give each workspace hero a distinct focal element
// while sharing the forest-box + mascot DNA.

// Multi-segment donut (e.g. reach / match / likely proportions).
export function SegmentDonut({ segments, total, centerBig, centerCap, size = 128, stroke = 15 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${centerBig} ${centerCap}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      {total > 0 && segments.map((s, i) => {
        const len = (s.value / total) * c;
        const dash = <circle
          key={i}
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${len} ${c - len}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />;
        offset += len;
        return dash;
      })}
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" fill="#F4F2EC" fontSize={size * 0.28} fontWeight="900" style={{ letterSpacing: '-0.03em' }}>{centerBig}</text>
      <text x="50%" y="63%" textAnchor="middle" dominantBaseline="central" fill="rgba(244,242,236,0.65)" fontSize={size * 0.09} fontWeight="800" style={{ letterSpacing: '0.1em' }}>{centerCap}</text>
    </svg>
  );
}

// Single-arc progress ring (e.g. essays final vs total).
export function ProgressArc({ percent, centerBig, centerCap, color = '#4ADE80', size = 128, stroke = 15 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${percent}% ${centerCap}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)' }}
      />
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" fill="#F4F2EC" fontSize={size * 0.28} fontWeight="900" style={{ letterSpacing: '-0.03em' }}>{centerBig}</text>
      <text x="50%" y="63%" textAnchor="middle" dominantBaseline="central" fill="rgba(244,242,236,0.65)" fontSize={size * 0.09} fontWeight="800" style={{ letterSpacing: '0.1em' }}>{centerCap}</text>
    </svg>
  );
}

// Computed Reach / Match / Safety fit for a university given the student's
// profile. Pure heuristic — acceptance rate scaled by academic strength.

const clamp01 = v => Math.max(0, Math.min(1, v));

export function computeFit(uni, profile = {}) {
  const rate = uni?.acceptance_rate;
  if (rate == null) return null;

  // Academic strength 0..1 from whatever we know (defaults to average)
  let signals = 0;
  let sum = 0;
  const gpa = Number(profile?.gpa);
  const sat = Number(profile?.sat_score);
  if (gpa) { sum += clamp01((gpa - 2.5) / 1.5); signals++; }
  if (sat) { sum += clamp01((sat - 1000) / 550); signals++; }
  const strength = signals ? sum / signals : 0.5;

  // Effective odds: strong students see selective schools as more attainable
  const adjusted = rate * (0.5 + strength);

  if (rate < 15) return FITS.reach; // ultra-selective is a reach for everyone
  if (adjusted < 28) return FITS.reach;
  if (adjusted < 55) return FITS.match;
  return FITS.safety;
}

export const FITS = {
  reach:  { key: 'reach',  label: 'Reach',  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  match:  { key: 'match',  label: 'Match',  color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  safety: { key: 'safety', label: 'Safety', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
};

// Letter grades for Common App activity entries, Kollegio-style.
// Heuristic grades render instantly; a Nova review rating overrides them.

const ACTION_VERBS = [
  'led', 'founded', 'created', 'built', 'organized', 'launched', 'directed',
  'managed', 'designed', 'developed', 'coordinated', 'taught', 'mentored',
  'raised', 'won', 'grew', 'established', 'initiated', 'captained', 'published',
];

const LEADERSHIP_WORDS = [
  'president', 'captain', 'founder', 'leader', 'director', 'head', 'chair',
  'editor', 'chief', 'lead', 'organizer', 'coordinator', 'co-founder',
];

function letter(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

/* Title grade: rewards a specific name + a leadership role */
export function gradeTitle(activity) {
  const title = (activity.title || '').trim();
  const role = (activity.role || '').toLowerCase();
  if (!title) return null;

  let score = 50;
  if (title.length >= 8) score += 15;                       // specific, not "Club"
  if (title.length >= 16) score += 10;
  if (LEADERSHIP_WORDS.some(w => role.includes(w))) score += 25;
  else if (role) score += 12;                               // any stated role
  if (activity.organization) score += 5;
  return letter(Math.min(score, 100));
}

/* Description grade: rewards impact metrics, action verbs, using the 150 chars */
export function gradeDescription(activity) {
  const desc = (activity.description || '').trim();
  if (!desc) return null;

  let score = 30;
  const lower = desc.toLowerCase();
  if (/\d/.test(desc)) score += 25;                          // quantified impact
  if (ACTION_VERBS.some(v => lower.includes(v))) score += 20;
  if (desc.length >= 90) score += 15;                        // uses the space
  else if (desc.length >= 50) score += 8;
  if (desc.length >= 130) score += 5;
  if ((desc.match(/\d+%|\$\d|\d+\+/g) || []).length) score += 5; // %, $, N+
  return letter(Math.min(score, 100));
}

/* Nova rating → grade pair (overrides heuristics once a review exists) */
export function gradesFromReview(review) {
  if (!review || review.error) return null;
  const map = { strong: 'A', good: 'B', needs_work: 'C' };
  const g = map[review.rating] || 'B';
  return { title: g, description: g };
}

export function gradeColor(grade) {
  if (grade === 'A' || grade === 'B') return '#065f46';
  if (grade === 'C') return '#B45309';
  return '#DC2626';
}

/* Sticker-badge background tint for a grade */
export function gradeBg(grade) {
  if (grade === 'A' || grade === 'B') return '#D1FAE5';
  if (grade === 'C') return '#FEF3C7';
  return '#FEE2E2';
}

/* Order grades so the strongest sorts first (A best → F worst) */
const GRADE_RANK = { A: 0, B: 1, C: 2, D: 3, F: 4 };
export function bestGrade(grades) {
  const valid = grades.filter(Boolean);
  if (!valid.length) return null;
  return valid.sort((a, b) => (GRADE_RANK[a] ?? 9) - (GRADE_RANK[b] ?? 9))[0];
}

const LEADERSHIP_ROLE_WORDS = [
  'president', 'captain', 'founder', 'leader', 'director', 'head', 'chair',
  'editor', 'chief', 'lead', 'organizer', 'coordinator', 'co-founder', 'ceo',
];
export function isLeadershipRole(role) {
  const r = (role || '').toLowerCase();
  return LEADERSHIP_ROLE_WORDS.some(w => r.includes(w));
}

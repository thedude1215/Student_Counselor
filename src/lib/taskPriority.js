// Task weights — heavier tasks need more lead time, so urgency kicks in earlier
const WEIGHTS = [
  { keywords: ['common app', 'coalition app', 'personal statement', 'main essay'], weight: 3 },
  { keywords: ['supplement', 'supplemental', 'why us', 'why school', 'why college'], weight: 2 },
  { keywords: ['css profile', 'financial aid', 'fafsa', 'scholarship application'],  weight: 2 },
  { keywords: ['sat', 'act', 'toefl', 'ielts', 'duolingo english'],                  weight: 2 },
  { keywords: ['interview', 'portfolio', 'audition'],                                 weight: 2 },
  { keywords: ['recommendation', 'letter of rec', 'lor'],                             weight: 1 },
];

function taskWeight(title = '') {
  const lower = title.toLowerCase();
  for (const { keywords, weight } of WEIGHTS) {
    if (keywords.some(k => lower.includes(k))) return weight;
  }
  return 0;
}

/**
 * Returns 'high' | 'medium' | 'low' based on deadline proximity + task importance.
 *
 * Rules (read top-to-bottom, first match wins):
 *   ≤ 1 day                         → high   (anything due tomorrow or today)
 *   ≤ 3 days                         → high
 *   ≤ 7 days  AND weight ≥ 2         → high   (e.g. common app essay with 7 days left)
 *   ≤ 7 days                         → medium
 *   ≤ 14 days AND weight ≥ 2         → medium (important task, two weeks out)
 *   ≤ 30 days                        → medium
 *   no due date AND weight ≥ 3       → medium (common app essay with no date set)
 *   everything else                  → low
 */
export function calcPriority(title = '', dueDate = null) {
  const weight = taskWeight(title);

  let days = Infinity;
  if (dueDate) {
    const due   = new Date(dueDate + 'T00:00:00');
    const today = new Date(new Date().toDateString());
    days = Math.round((due - today) / 86400000);
  }

  if (days <= 1)                   return 'high';
  if (days <= 3)                   return 'high';
  if (days <= 7  && weight >= 2)   return 'high';
  if (days <= 7)                   return 'medium';
  if (days <= 14 && weight >= 2)   return 'medium';
  if (days <= 30)                  return 'medium';
  if (days === Infinity && weight >= 3) return 'medium';
  return 'low';
}

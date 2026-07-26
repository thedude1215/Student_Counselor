/*
 * Presentation helpers for the Programs catalogue.
 *
 * Deliberately derives everything from the existing `deadline` and
 * `eligibility` text columns rather than adding schema — the data lives in
 * Supabase and an ALTER TABLE would need coordinating with a deploy.
 */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/* Discipline drives the card's colour.
 *
 * A deep, saturated, earthy set rather than the usual bright primaries: the
 * point is for a field to be recognisable at a glance while still reading as
 * one family. Universities colours by SCHOOL, so colouring by FIELD here keeps
 * the two catalogue pages from looking like the same page twice. */
const DISCIPLINE_COLORS = {
  'STEM':                    '#047857',
  'Science':                 '#047857',
  'Math':                    '#0F766E',
  'Computer Science':        '#175F70',
  'Biology':                 '#15803D',
  'Engineering':             '#B45309',
  'Leadership':              '#C2410C',
  'Humanities':              '#9F2D20',
  'Policy':                  '#7C5E10',
  'Social Entrepreneurship': '#7C5E10',
};

const FALLBACK_COLOR = '#047857';

/** The colour for a programme, taken from its first recognised discipline. */
export function disciplineColor(discipline = []) {
  for (const d of discipline) {
    if (DISCIPLINE_COLORS[d]) return DISCIPLINE_COLORS[d];
  }
  return FALLBACK_COLOR;
}

/**
 * Month a deadline falls in, as an index, or null when the text names no month
 * ("Rolling", "Check official site"). Matches the first month named, so both
 * "30 January 2027" and "Typically early December" resolve.
 */
export function deadlineMonth(deadline) {
  if (!deadline) return null;
  const lower = deadline.toLowerCase();
  let best = null;
  let bestAt = Infinity;
  MONTHS.forEach((m, i) => {
    const at = lower.indexOf(m);
    if (at !== -1 && at < bestAt) { bestAt = at; best = i; }
  });
  return best;
}

export function monthName(index) {
  return MONTHS[index].charAt(0).toUpperCase() + MONTHS[index].slice(1);
}

/**
 * How many months ahead a given month is, wrapping across the year boundary.
 * The application cycle runs Nov → Mar, so a plain calendar sort would put
 * January before November and read backwards.
 */
export function monthsAhead(index, from = new Date().getMonth()) {
  return (index - from + 12) % 12;
}

/**
 * A firm date, if the deadline text contains one — used for the countdown.
 * Anything hedged ("Typically…", "Varies…") deliberately returns null so the
 * UI never counts down to a date nobody has announced.
 */
export function firmDate(deadline) {
  if (!deadline) return null;
  if (/typically|varies|rolling|check|tentative|opens/i.test(deadline)) return null;
  const m = deadline.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month === -1) return null;
  const d = new Date(Number(m[3]), month, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysUntil(date, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date - start) / 86_400_000);
}

/**
 * Access level, parsed from the `eligibility` convention used by the seed
 * migration. This is surfaced prominently rather than buried: several strong
 * programmes are US-citizen-only, and for an audience of international
 * students that is the difference between a real option and a dead end.
 */
export function accessLevel(eligibility = '') {
  if (/^us only/i.test(eligibility)) return 'us';
  if (/^international welcome/i.test(eligibility)) return 'intl';
  return null;
}

/** The eligibility text with the access marker stripped off the front. */
export function eligibilityDetail(eligibility = '') {
  return eligibility.replace(/^(us only|international welcome)\s*·\s*/i, '');
}

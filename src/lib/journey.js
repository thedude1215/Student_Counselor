// Gamified application "journey" — four acts, Kollegio-style.
// Returns the current act, milestone progress within it, and the next CTA.

export function computeJourney({ profile = {}, collegeList = [], essays = [], tasks = [] }) {
  const acts = [
    {
      num: 1,
      name: 'The Foundation',
      headline: 'Tell us who you are',
      to: '/dashboard/profile',
      cta: 'Complete your profile',
      milestones: [
        !!(profile.gpa || profile.sat_score),
        !!profile.intended_major,
        !!(profile.class_year || profile.grade_level),
      ],
    },
    {
      num: 2,
      name: 'The List',
      headline: 'Decide what to study and where',
      to: '/dashboard/colleges',
      cta: 'Build your list',
      milestones: [
        collegeList.length > 0,
        collegeList.length >= 4,
        new Set(collegeList.map(i => i.tier)).size >= 3,
      ],
    },
    {
      num: 3,
      name: 'The Story',
      headline: 'Write essays that sound like you',
      to: '/dashboard/essays',
      cta: 'Work on essays',
      milestones: [
        essays.length > 0,
        essays.some(e => (e.content || '').trim().split(/\s+/).filter(Boolean).length >= 100),
        essays.some(e => e.ai_feedback),
      ],
    },
    {
      num: 4,
      name: 'The Finish',
      headline: 'Track every deadline to the end',
      to: '/dashboard/tasks',
      cta: 'Manage tasks',
      milestones: [
        tasks.length > 0,
        tasks.some(t => t.status === 'done'),
        tasks.length > 0 && tasks.every(t => t.status === 'done'),
      ],
    },
  ];

  // Current act = first act with an incomplete milestone
  let current = acts[acts.length - 1];
  for (const act of acts) {
    if (act.milestones.some(m => !m)) { current = act; break; }
  }

  const done = current.milestones.filter(Boolean).length;
  const total = current.milestones.length;
  return {
    ...current,
    done,
    total,
    percent: Math.round((done / total) * 100),
    complete: acts.every(a => a.milestones.every(Boolean)),
  };
}

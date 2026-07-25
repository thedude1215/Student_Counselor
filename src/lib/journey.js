// The application as four acts. The act names, headlines and Nova's mood per
// act are the same ones the landing page walks a visitor through, so the
// dashboard reads as a continuation rather than a different product.
// Returns the current act, milestone progress within it, and the next CTA.

export function computeJourney({ profile = {}, collegeList = [], essays = [], tasks = [] }) {
  const acts = [
    {
      num: 1,
      name: 'The Foundation',
      headline: 'Tell us who you are',
      to: '/dashboard/profile',
      cta: 'Complete your profile',
      expression: 'curious',
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
      expression: 'thinking',
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
      expression: 'focused',
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
      expression: 'cheering',
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
    // Every act, so the dashboard can show the whole arc rather than just the
    // act you happen to be in — the same four waypoints the landing page shows.
    acts: acts.map(a => {
      const d = a.milestones.filter(Boolean).length;
      return {
        num: a.num,
        name: a.name,
        to: a.to,
        expression: a.expression,
        done: d,
        total: a.milestones.length,
        complete: d === a.milestones.length,
        current: a.num === current.num,
      };
    }),
  };
}

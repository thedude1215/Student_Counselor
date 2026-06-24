// Derives proactive "nudges" from the student's real workspace data.
// Pure function — no side effects, easy to reuse on the dashboard or (later)
// in a scheduled job that emails / WhatsApps the same nudges.

function daysUntil(dateStr) {
  const today = new Date(new Date().toDateString());
  const due = new Date(dateStr + 'T00:00:00');
  return Math.round((due - today) / 86_400_000);
}

export function computeNudges({ tasks = [], essays = [], collegeList = [] }) {
  const nudges = [];
  const open = tasks.filter(t => t.status !== 'done');

  /* ── Overdue tasks (most urgent) ── */
  const overdue = open.filter(t => t.due_date && daysUntil(t.due_date) < 0);
  if (overdue.length) {
    nudges.push({
      id: 'overdue',
      level: 'high',
      title: `${overdue.length} ${overdue.length === 1 ? 'task is' : 'tasks are'} overdue`,
      detail: overdue.map(t => t.title).slice(0, 3).join(', '),
      to: '/dashboard/tasks',
      action: 'Review tasks',
    });
  }

  /* ── Deadlines due within 7 days ── */
  const soon = open
    .filter(t => t.due_date && daysUntil(t.due_date) >= 0 && daysUntil(t.due_date) <= 7)
    .sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date));
  soon.slice(0, 3).forEach(t => {
    const d = daysUntil(t.due_date);
    nudges.push({
      id: `due-${t.id}`,
      level: d <= 2 ? 'high' : 'medium',
      title: `"${t.title}" is due ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`}`,
      detail: t.universities?.name || null,
      to: '/dashboard/tasks',
      action: 'Open',
    });
  });

  /* ── College list balance ── */
  if (collegeList.length === 0) {
    nudges.push({
      id: 'list-empty',
      level: 'info',
      title: 'Your college list is empty',
      detail: 'Add a few schools so Nova can plan around them.',
      to: '/universities',
      action: 'Browse schools',
    });
  } else {
    const likely = collegeList.filter(i => i.tier === 'likely').length;
    const reach = collegeList.filter(i => i.tier === 'reach').length;
    if (likely === 0) {
      nudges.push({
        id: 'no-likely',
        level: 'info',
        title: 'No "likely" school on your list',
        detail: 'Balance your list with at least one safer option.',
        to: '/dashboard/colleges',
        action: 'Review list',
      });
    } else if (reach === 0 && collegeList.length >= 2) {
      nudges.push({
        id: 'no-reach',
        level: 'info',
        title: 'No "reach" school yet',
        detail: 'Add a dream school — you might surprise yourself.',
        to: '/universities',
        action: 'Browse schools',
      });
    }
  }

  /* ── Essays ── */
  if (collegeList.length > 0 && essays.length === 0) {
    nudges.push({
      id: 'no-essays',
      level: 'info',
      title: 'No essay drafts yet',
      detail: 'Start a draft — Nova can review it line by line.',
      to: '/dashboard/essays',
      action: 'Start writing',
    });
  } else {
    const thin = essays.find(e => {
      const words = e.content ? e.content.trim().split(/\s+/).filter(Boolean).length : 0;
      return words > 0 && words < 50;
    });
    if (thin) {
      nudges.push({
        id: `thin-${thin.id}`,
        level: 'info',
        title: `"${thin.title || 'Untitled'}" is still a rough draft`,
        detail: 'Flesh it out, then ask Nova for feedback.',
        to: '/dashboard/essays',
        action: 'Open essay',
      });
    }
  }

  return nudges;
}

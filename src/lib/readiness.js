// Computes an application "readiness" score + status, borderless-style.
// Pure function so it can drive the dashboard status card.

export function computeReadiness({ profile = {}, collegeList = [], essays = [], tasks = [] }) {
  let score = 0;
  const max = 100;

  // Profile completeness (40 pts)
  const profFields = ['gpa', 'sat_score', 'intended_major', 'class_year', 'grade_level'];
  const filled = profFields.filter(k => profile[k]).length;
  score += Math.round((filled / profFields.length) * 30);
  if ((profile.target_countries || []).length) score += 5;
  if ((profile.interests || []).length) score += 5;

  // College list (25 pts) — rewards a balanced list
  if (collegeList.length > 0) score += 8;
  if (collegeList.length >= 4) score += 4;
  const tiers = new Set(collegeList.map(i => i.tier));
  score += tiers.size * 4; // up to 12 for reach+match+likely

  // Essays (20 pts)
  if (essays.length > 0) score += 8;
  const substantial = essays.filter(e => (e.content || '').trim().split(/\s+/).filter(Boolean).length >= 100).length;
  score += Math.min(substantial * 6, 12);

  // Tasks momentum (15 pts)
  if (tasks.length > 0) score += 5;
  const done = tasks.filter(t => t.status === 'done').length;
  score += Math.min(done * 2, 10);

  const percent = Math.min(Math.round(score), max);

  let label, tone;
  if (percent < 35) { label = 'Getting started'; tone = 'early'; }
  else if (percent < 70) { label = 'Building momentum'; tone = 'building'; }
  else { label = 'On track'; tone = 'ontrack'; }

  return { percent, label, tone, summary: buildSummary({ profile, collegeList, essays, tasks, percent }) };
}

function buildSummary({ profile, collegeList, essays, tasks, percent }) {
  const bits = [];
  const tiers = new Set(collegeList.map(i => i.tier));

  if (!profile.gpa && !profile.sat_score) {
    bits.push('Fill in your academics (GPA, test scores) so Nova can gauge fit.');
  } else if (collegeList.length === 0) {
    bits.push('Add a few target schools to start shaping your list.');
  } else if (tiers.size < 3) {
    bits.push('Balance your list across reach, match, and likely schools.');
  } else if (essays.length === 0) {
    bits.push('Start your first essay draft — Nova can review it line by line.');
  } else {
    bits.push('Your list, testing, and essays are moving together. Keep the momentum.');
  }

  const open = tasks.filter(t => t.status !== 'done').length;
  if (open) bits.push(`${open} open task${open === 1 ? '' : 's'} to keep things on schedule.`);

  if (percent >= 70) return `Strong progress. ${bits.join(' ')}`;
  if (percent >= 35) return `Good start. ${bits.join(' ')}`;
  return `Let's build your foundation. ${bits.join(' ')}`;
}

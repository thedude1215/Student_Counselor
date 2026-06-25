import { supabase } from '../lib/supabase.js';
import { universities } from '../../shared/data/universities.js';

export async function getStudentProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export async function getCollegeList(userId) {
  const { data } = await supabase
    .from('college_list_items')
    .select('tier, universities(name, country, ranking, acceptance_rate)')
    .eq('profile_id', userId);
  return data || [];
}

export async function getEssaySummary(userId) {
  const { data } = await supabase
    .from('essays')
    .select('title, prompt, updated_at')
    .eq('profile_id', userId);
  return data || [];
}

export function getCatalogSummary() {
  return universities.map(u => ({
    name: u.name,
    country: u.country,
    ranking: u.ranking,
    acceptanceRate: u.acceptanceRate,
    tuition: u.tuition,
    tags: u.tags,
    financialAid: u.financialAid,
  }));
}

export async function buildStudentContext(userId) {
  const [profile, collegeList, essays] = await Promise.all([
    getStudentProfile(userId),
    getCollegeList(userId),
    getEssaySummary(userId),
  ]);

  const parts = [];

  if (profile) {
    const fields = [];
    if (profile.full_name) fields.push(`Name: ${profile.full_name}`);
    if (profile.grade_level) fields.push(`Grade: ${profile.grade_level}`);
    if (profile.country) fields.push(`Country: ${profile.country}`);
    if (profile.gpa) fields.push(`GPA: ${profile.gpa}`);
    if (profile.sat_score) fields.push(`SAT: ${profile.sat_score}`);
    if (profile.interests?.length) fields.push(`Interests: ${profile.interests.join(', ')}`);
    if (profile.target_countries?.length) fields.push(`Target Countries: ${profile.target_countries.join(', ')}`);
    if (profile.budget) fields.push(`Budget: ${profile.budget}`);
    if (profile.goals) fields.push(`Goals: ${profile.goals}`);
    if (fields.length) parts.push(`STUDENT PROFILE:\n${fields.join('\n')}`);
  }

  if (collegeList.length) {
    const items = collegeList.map(c =>
      `${c.universities?.name || 'Unknown'} (${c.tier})`
    );
    parts.push(`COLLEGE LIST:\n${items.join(', ')}`);
  }

  if (essays.length) {
    const items = essays.map(e => `"${e.title}"`);
    parts.push(`ESSAYS IN PROGRESS: ${items.join(', ')}`);
  }

  return parts.length
    ? `\n\nUSE THIS CONTEXT TO PERSONALIZE ADVICE:\n${parts.join('\n\n')}`
    : '';
}

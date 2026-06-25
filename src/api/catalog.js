import { supabase } from '../lib/supabase.js';
import { stories as staticStories } from '../../shared/data/stories.js';
import {
  comparisonRows,
  counselorFeatures,
  homeStats,
  homeUniversityLogos,
  processSteps,
  storyCardColors,
} from '../../shared/data/home.js';

export {
  comparisonRows,
  counselorFeatures,
  homeStats,
  homeUniversityLogos,
  processSteps,
  storyCardColors,
};

export function getFeaturedStories(limit = 4) {
  return staticStories.slice(0, limit);
}

export function getFeaturedUniversities(limit = 16) {
  return homeUniversityLogos.slice(0, limit);
}

export async function fetchUniversities(filters = {}) {
  let query = supabase.from('universities').select('*');

  if (filters.q) {
    const term = `%${filters.q}%`;
    query = query.or(`name.ilike.${term},location.ilike.${term},country.ilike.${term}`);
  }
  if (filters.country && filters.country !== 'All') {
    query = query.eq('country', filters.country);
  }
  if (filters.tag && filters.tag !== 'All') {
    query = query.contains('tags', [filters.tag]);
  }
  if (filters.aid) {
    query = query.eq('financial_aid', true);
  }

  const { data, error } = await query.order('ranking').limit(1000);
  if (error) throw error;
  return data;
}

export async function fetchPrograms(filters = {}) {
  let query = supabase.from('programs').select('*');

  if (filters.q) {
    const term = `%${filters.q}%`;
    query = query.or(`name.ilike.${term},host.ilike.${term},description.ilike.${term}`);
  }
  if (filters.discipline && filters.discipline !== 'All') {
    query = query.contains('discipline', [filters.discipline]);
  }
  if (filters.costType && filters.costType !== 'All') {
    query = query.eq('cost_type', filters.costType);
  }
  if (filters.type && filters.type !== 'All') {
    query = query.eq('type', filters.type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchStories(filters = {}) {
  let query = supabase.from('stories').select('*');

  if (filters.q) {
    const term = `%${filters.q}%`;
    query = query.or(`name.ilike.${term},title.ilike.${term},university.ilike.${term},country.ilike.${term}`);
  }
  if (filters.tag && filters.tag !== 'All') {
    query = query.contains('tags', [filters.tag]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchAcceptances(filters = {}) {
  let query = supabase.from('acceptances').select('*');

  if (filters.q) {
    const term = `%${filters.q}%`;
    query = query.or(`student.ilike.${term},university.ilike.${term},country.ilike.${term},scholarship.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

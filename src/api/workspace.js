import { supabase } from '../lib/supabase.js';

/* ─────────────── College List ─────────────── */

export async function fetchCollegeList(profileId) {
  const { data, error } = await supabase
    .from('college_list_items')
    .select('*, universities(*)')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addToCollegeList(profileId, universityId, tier = 'match') {
  const { data, error } = await supabase
    .from('college_list_items')
    .insert({ profile_id: profileId, university_id: universityId, tier })
    .select('*, universities(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateCollegeListItem(id, updates) {
  const { data, error } = await supabase
    .from('college_list_items')
    .update(updates)
    .eq('id', id)
    .select('*, universities(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function removeFromCollegeList(id) {
  const { error } = await supabase.from('college_list_items').delete().eq('id', id);
  if (error) throw error;
}

/* ─────────────── Tasks ─────────────── */

export async function fetchTasks(profileId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, universities(name, logo_url, logo_style, fallback)')
    .eq('profile_id', profileId)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function addTask(profileId, task) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ profile_id: profileId, ...task })
    .select('*, universities(name, logo_url, logo_style, fallback)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, universities(name, logo_url, logo_style, fallback)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

/* ─────────────── Essays ─────────────── */

export async function fetchEssays(profileId) {
  const { data, error } = await supabase
    .from('essays')
    .select('*, universities(name, logo_url, logo_style, fallback)')
    .eq('profile_id', profileId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addEssay(profileId, essay) {
  const { data, error } = await supabase
    .from('essays')
    .insert({ profile_id: profileId, ...essay })
    .select('*, universities(name, logo_url, logo_style, fallback)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateEssay(id, updates) {
  const { data, error } = await supabase
    .from('essays')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, universities(name, logo_url, logo_style, fallback)')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEssay(id) {
  const { error } = await supabase.from('essays').delete().eq('id', id);
  if (error) throw error;
}

/* ─────────────── Profile ─────────────── */

export async function fetchProfile(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(profileId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/* ─────────────── Activities ─────────────── */

export async function fetchActivities(profileId) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addActivity(profileId, activity) {
  const { data, error } = await supabase
    .from('activities')
    .insert({ profile_id: profileId, ...activity })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteActivity(id) {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
}

/* ─────────────── Honors ─────────────── */

export async function fetchHonors(profileId) {
  const { data, error } = await supabase
    .from('honors')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addHonor(profileId, honor) {
  const { data, error } = await supabase
    .from('honors')
    .insert({ profile_id: profileId, ...honor })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHonor(id) {
  const { error } = await supabase.from('honors').delete().eq('id', id);
  if (error) throw error;
}

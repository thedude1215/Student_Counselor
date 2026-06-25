import { supabase } from '../lib/supabase.js';
import { semanticSearch } from './embeddingService.js';

/* ─── Tool Declarations (Gemini functionDeclarations format) ─── */

export const toolDeclarations = [
  {
    name: 'search_universities',
    description: 'Search and filter universities by country, tags, acceptance rate, tuition, financial aid, or a text query. Always use this instead of guessing university facts.',
    parameters: {
      type: 'OBJECT',
      properties: {
        country: { type: 'STRING', description: 'Filter by country name (e.g. "United States", "United Kingdom")' },
        tags: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Filter by tags (e.g. ["Engineering", "STEM", "Liberal Arts"])' },
        max_acceptance_rate: { type: 'NUMBER', description: 'Maximum acceptance rate percentage (e.g. 15 for schools under 15%)' },
        financial_aid: { type: 'BOOLEAN', description: 'If true, only return schools offering financial aid to internationals' },
        max_tuition: { type: 'NUMBER', description: 'Maximum annual tuition in USD' },
        query: { type: 'STRING', description: 'Free-text search query to match against name, location, or description' },
      },
    },
  },
  {
    name: 'search_programs',
    description: 'Search summer programs, research programs, and competitions by discipline, cost, or type.',
    parameters: {
      type: 'OBJECT',
      properties: {
        discipline: { type: 'STRING', description: 'Academic discipline (e.g. "STEM", "Mathematics", "Computer Science")' },
        cost_type: { type: 'STRING', description: 'Cost category: "Free", "Paid", or "Varies"' },
        program_type: { type: 'STRING', description: 'Program type: "Summer", "Year-round", "Competition"' },
        query: { type: 'STRING', description: 'Free-text search query' },
      },
    },
  },
  {
    name: 'search_stories',
    description: 'Find student success stories by country, tags, or university. Use to show relevant examples to inspire students.',
    parameters: {
      type: 'OBJECT',
      properties: {
        country: { type: 'STRING', description: 'Student\'s country of origin' },
        tags: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Tags like "Full Scholarship", "Ivy League", "Engineering"' },
        university: { type: 'STRING', description: 'University name to match' },
        query: { type: 'STRING', description: 'Free-text search query' },
      },
    },
  },
  {
    name: 'get_student_profile',
    description: 'Get the current student\'s profile data including grade, country, GPA, SAT score, interests, target countries, and budget. Use this to personalize advice.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'get_college_list',
    description: 'Get the student\'s current college list with tier classifications (reach/match/likely). Use this to understand what schools they\'re already considering.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'get_upcoming_tasks',
    description: 'Get the student\'s upcoming tasks and deadlines for the next 30 days. Use this to help with deadline planning.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'compare_universities',
    description: 'Get a structured side-by-side comparison of 2-4 universities by their IDs. Returns key stats for each.',
    parameters: {
      type: 'OBJECT',
      properties: {
        university_names: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Names of universities to compare (2-4)',
        },
      },
      required: ['university_names'],
    },
  },
  {
    name: 'add_to_college_list',
    description: 'Add a university to the student\'s college list. Use when a student says they want to add a school.',
    parameters: {
      type: 'OBJECT',
      properties: {
        university_name: { type: 'STRING', description: 'Name of the university to add' },
        tier: { type: 'STRING', enum: ['reach', 'match', 'likely'], description: 'Classification tier' },
      },
      required: ['university_name', 'tier'],
    },
  },
];

/* ─── Tool Executors ─── */

async function searchUniversities(args) {
  const hasStructuredFilters = args.country || args.tags?.length || args.max_acceptance_rate || args.financial_aid || args.max_tuition;

  // Use semantic search for natural language queries without structured filters
  if (args.query && !hasStructuredFilters) {
    try {
      const semanticResults = await semanticSearch('universities', args.query, 10);
      if (semanticResults?.length) return semanticResults;
    } catch {
      // Fall through to structured search if semantic search fails
    }
  }

  let query = supabase.from('universities').select('id, name, country, location, ranking, acceptance_rate, tuition, tags, financial_aid, sat_range, type, size, description');

  if (args.country) query = query.ilike('country', `%${args.country}%`);
  if (args.tags?.length) query = query.contains('tags', args.tags);
  if (args.max_acceptance_rate) query = query.lte('acceptance_rate', args.max_acceptance_rate);
  if (args.financial_aid) query = query.eq('financial_aid', true);
  if (args.max_tuition) query = query.lte('tuition', args.max_tuition);
  if (args.query) {
    const term = `%${args.query}%`;
    query = query.or(`name.ilike.${term},location.ilike.${term},description.ilike.${term},country.ilike.${term}`);
  }

  const { data, error } = await query.order('ranking').limit(10);
  if (error) return { error: error.message };
  if (!data?.length) return { message: 'No universities found matching those criteria. Try broadening your search.' };
  return data;
}

async function searchPrograms(args) {
  const hasStructuredFilters = args.discipline || args.cost_type || args.program_type;

  if (args.query && !hasStructuredFilters) {
    try {
      const semanticResults = await semanticSearch('programs', args.query, 10);
      if (semanticResults?.length) return semanticResults;
    } catch { /* fall through */ }
  }

  let query = supabase.from('programs').select('id, name, host, discipline, type, cost_type, deadline, eligibility, description');

  if (args.discipline) query = query.contains('discipline', [args.discipline]);
  if (args.cost_type) query = query.eq('cost_type', args.cost_type);
  if (args.program_type) query = query.eq('type', args.program_type);
  if (args.query) {
    const term = `%${args.query}%`;
    query = query.or(`name.ilike.${term},host.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await query.limit(10);
  if (error) return { error: error.message };
  if (!data?.length) return { message: 'No programs found matching those criteria.' };
  return data;
}

async function searchStories(args) {
  const hasStructuredFilters = args.country || args.tags?.length || args.university;

  if (args.query && !hasStructuredFilters) {
    try {
      const semanticResults = await semanticSearch('stories', args.query, 10);
      if (semanticResults?.length) return semanticResults;
    } catch { /* fall through */ }
  }

  let query = supabase.from('stories').select('name, country, university, major, title, excerpt, tags, year');

  if (args.country) query = query.ilike('country', `%${args.country}%`);
  if (args.tags?.length) query = query.contains('tags', args.tags);
  if (args.university) query = query.ilike('university', `%${args.university}%`);
  if (args.query) {
    const term = `%${args.query}%`;
    query = query.or(`name.ilike.${term},title.ilike.${term},university.ilike.${term},country.ilike.${term}`);
  }

  const { data, error } = await query.limit(10);
  if (error) return { error: error.message };
  if (!data?.length) return { message: 'No matching student stories found.' };
  return data;
}

async function getStudentProfile(args, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, grade_level, country, gpa, sat_score, interests, target_countries, budget, goals')
    .eq('id', userId)
    .single();
  if (error) return { error: error.message };
  if (!data) return { message: 'No profile found. The student hasn\'t filled in their profile yet.' };
  return data;
}

async function getCollegeList(args, userId) {
  const { data, error } = await supabase
    .from('college_list_items')
    .select('tier, universities(id, name, country, ranking, acceptance_rate, tuition, financial_aid)')
    .eq('profile_id', userId)
    .order('created_at', { ascending: true });
  if (error) return { error: error.message };
  if (!data?.length) return { message: 'The student\'s college list is empty. Help them start building one.' };
  return data.map(item => ({
    university: item.universities?.name,
    country: item.universities?.country,
    tier: item.tier,
    acceptance_rate: item.universities?.acceptance_rate,
    tuition: item.universities?.tuition,
  }));
}

async function getUpcomingTasks(args, userId) {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('tasks')
    .select('title, due_date, priority, status, universities(name)')
    .eq('profile_id', userId)
    .lte('due_date', thirtyDaysFromNow)
    .order('due_date', { ascending: true })
    .limit(15);
  if (error) return { error: error.message };
  if (!data?.length) return { message: 'No upcoming tasks in the next 30 days.' };
  return data.map(t => ({
    title: t.title,
    due_date: t.due_date,
    priority: t.priority,
    status: t.status,
    university: t.universities?.name,
  }));
}

async function compareUniversities(args) {
  const names = args.university_names;
  if (!names?.length || names.length < 2) return { error: 'Provide at least 2 university names to compare.' };

  const conditions = names.map(n => `name.ilike.%${n}%`).join(',');
  const { data, error } = await supabase
    .from('universities')
    .select('name, country, location, ranking, acceptance_rate, tuition, sat_range, financial_aid, tags, type, size, description')
    .or(conditions)
    .limit(4);
  if (error) return { error: error.message };
  if (!data?.length) return { message: 'Could not find those universities in the catalog.' };
  return data;
}

async function addToCollegeList(args, userId) {
  const { data: uni } = await supabase
    .from('universities')
    .select('id, name')
    .ilike('name', `%${args.university_name}%`)
    .limit(1)
    .single();

  if (!uni) return { error: `University "${args.university_name}" not found in our catalog.` };

  const { data: existing } = await supabase
    .from('college_list_items')
    .select('id')
    .eq('profile_id', userId)
    .eq('university_id', uni.id)
    .limit(1);

  if (existing?.length) return { message: `${uni.name} is already on the student's college list.` };

  const { error } = await supabase
    .from('college_list_items')
    .insert({ profile_id: userId, university_id: uni.id, tier: args.tier });

  if (error) return { error: error.message };
  return { success: true, message: `Added ${uni.name} to the college list as a ${args.tier}.` };
}

/* ─── Executor Map ─── */

const executors = {
  search_universities: searchUniversities,
  search_programs: searchPrograms,
  search_stories: searchStories,
  get_student_profile: getStudentProfile,
  get_college_list: getCollegeList,
  get_upcoming_tasks: getUpcomingTasks,
  compare_universities: compareUniversities,
  add_to_college_list: addToCollegeList,
};

export async function executeTool(name, args, userId) {
  const executor = executors[name];
  if (!executor) return { error: `Unknown tool: ${name}` };
  try {
    return await executor(args || {}, userId);
  } catch (err) {
    return { error: err.message };
  }
}

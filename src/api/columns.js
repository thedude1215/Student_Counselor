// Explicit column lists for catalog tables — deliberately EXCLUDE the heavy
// `description_embedding` pgvector column (used only by the RAG/Nova backend).
// Selecting `*` drags that large float array across the wire for every row,
// which made list/catalog queries ~3x slower (e.g. ~985ms → ~305ms).

export const UNIVERSITY_COLUMNS = [
  'id', 'name', 'short_name', 'logo', 'logo_url', 'logo_style', 'fallback',
  'location', 'country', 'country_code', 'ranking', 'acceptance_rate',
  'tuition', 'type', 'size', 'tags', 'sat_range', 'financial_aid',
  'description', 'color', 'border_color', 'created_at',
].join(', ');

export const PROGRAM_COLUMNS = [
  'id', 'name', 'host', 'host_logo', 'host_logo_url', 'host_logo_style',
  'description', 'discipline', 'type', 'cost_type', 'deadline', 'eligibility',
  'url', 'color', 'border_color', 'created_at',
].join(', ');

export const STORY_COLUMNS = [
  'id', 'name', 'country', 'flag', 'university', 'university_logo',
  'university_logo_url', 'university_logo_style', 'fallback', 'location',
  'major', 'year', 'title', 'excerpt', 'photo', 'tags', 'read_time',
  'color', 'created_at',
].join(', ');

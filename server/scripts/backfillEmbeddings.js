import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const API_KEY = process.env.GEMINI_API_KEY;
const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;
const OUTPUT_DIM = 768;
const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES = 1000;

async function embedOne(text) {
  const res = await fetch(`${EMBED_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: OUTPUT_DIM,
    }),
  });

  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 5000));
    return embedOne(text);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Embed error ${res.status}: ${err?.error?.message || 'unknown'}`);
  }

  const data = await res.json();
  return data.embedding?.values;
}

async function embedBatch(items, textBuilder) {
  const results = [];
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const chunk = items.slice(i, i + CONCURRENCY);
    const embeddings = await Promise.all(
      chunk.map(item => embedOne(textBuilder(item)))
    );
    results.push(...chunk.map((item, j) => ({ id: item.id, embedding: embeddings[j] })));
    if (i + CONCURRENCY < items.length) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }
  return results;
}

function buildUniversityText(u) {
  const parts = [u.name];
  if (u.location) parts.push(u.location);
  if (u.country) parts.push(u.country);
  if (u.type) parts.push(u.type);
  if (u.size) parts.push(`${u.size} university`);
  if (u.tags?.length) parts.push(`Tags: ${u.tags.join(', ')}`);
  if (u.sat_range) parts.push(`SAT: ${u.sat_range}`);
  if (u.acceptance_rate) parts.push(`Acceptance rate: ${u.acceptance_rate}%`);
  if (u.tuition) parts.push(`Tuition: $${u.tuition}`);
  if (u.financial_aid) parts.push('Offers financial aid to international students');
  if (u.description) parts.push(u.description);
  return parts.join('. ');
}

function buildProgramText(p) {
  const parts = [p.name];
  if (p.host) parts.push(`Hosted by ${p.host}`);
  if (p.discipline?.length) parts.push(`Discipline: ${Array.isArray(p.discipline) ? p.discipline.join(', ') : p.discipline}`);
  if (p.type) parts.push(`Type: ${p.type}`);
  if (p.cost_type) parts.push(`Cost: ${p.cost_type}`);
  if (p.eligibility) parts.push(`Eligibility: ${p.eligibility}`);
  if (p.description) parts.push(p.description);
  return parts.join('. ');
}

function buildStoryText(s) {
  const parts = [s.title || s.name];
  if (s.name && s.title) parts.push(`by ${s.name}`);
  if (s.country) parts.push(`from ${s.country}`);
  if (s.university) parts.push(`at ${s.university}`);
  if (s.major) parts.push(`studying ${s.major}`);
  if (s.tags?.length) parts.push(`Tags: ${s.tags.join(', ')}`);
  if (s.excerpt) parts.push(s.excerpt);
  return parts.join('. ');
}

async function backfillTable(table, selectCols, textBuilder) {
  console.log(`\n--- Backfilling ${table} ---`);

  const { data: rows, error } = await supabase
    .from(table)
    .select(selectCols)
    .is('description_embedding', null);

  if (error) {
    console.error(`Failed to fetch ${table}:`, error.message);
    return;
  }

  console.log(`${rows.length} rows need embeddings`);
  if (!rows.length) return;

  const results = await embedBatch(rows, textBuilder);
  let done = 0;
  let failed = 0;

  for (const { id, embedding } of results) {
    const { error: updateErr } = await supabase
      .from(table)
      .update({ description_embedding: JSON.stringify(embedding) })
      .eq('id', id);

    if (updateErr) {
      console.error(`  Failed id=${id}: ${updateErr.message}`);
      failed++;
    } else {
      done++;
    }

    if (done % 50 === 0) console.log(`  ${done}/${rows.length} written`);
  }

  console.log(`${table}: ${done} succeeded, ${failed} failed`);
}

async function main() {
  console.log('Starting embedding backfill...');
  console.log(`Model: ${EMBED_MODEL} (${OUTPUT_DIM}d)`);
  console.log(`API Key: ${API_KEY ? API_KEY.slice(0, 6) + '...' : 'MISSING'}`);

  await backfillTable(
    'universities',
    'id, name, location, country, type, size, tags, sat_range, acceptance_rate, tuition, financial_aid, description',
    buildUniversityText
  );

  await backfillTable(
    'programs',
    'id, name, host, discipline, type, cost_type, eligibility, description',
    buildProgramText
  );

  await backfillTable(
    'stories',
    'id, name, country, university, major, title, excerpt, tags',
    buildStoryText
  );

  console.log('\nBackfill complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

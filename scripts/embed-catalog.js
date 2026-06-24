/**
 * One-time script to embed university/program/story descriptions into pgvector.
 * Run: node --env-file=.env scripts/embed-catalog.js
 */

import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${API_KEY}`;

async function embed(text) {
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Embed failed: ${res.status}`);
  }

  const data = await res.json();
  return data.embedding?.values;
}

async function embedTable(table, textBuilder) {
  console.log(`\nEmbedding ${table}...`);
  const { data: rows, error } = await supabase.from(table).select('*');
  if (error) { console.error(`  Error fetching ${table}:`, error.message); return; }

  let updated = 0;
  for (const row of rows) {
    const text = textBuilder(row);
    if (!text) { console.log(`  Skipping ${row.name || row.id} (no text)`); continue; }

    try {
      const vector = await embed(text);
      const { error: updateErr } = await supabase
        .from(table)
        .update({ description_embedding: JSON.stringify(vector) })
        .eq('id', row.id);

      if (updateErr) {
        console.error(`  Error updating ${row.name || row.id}:`, updateErr.message);
      } else {
        updated++;
        console.log(`  ✓ ${row.name || row.id}`);
      }

      // Respect rate limits (free tier: 1500/day, ~1/sec safe)
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`  Error embedding ${row.name || row.id}:`, err.message);
    }
  }
  console.log(`  Done: ${updated}/${rows.length} embedded`);
}

// Build rich text for each table by combining all useful fields
await embedTable('universities', (u) => {
  const parts = [u.name, u.description, u.location, u.country];
  if (u.type) parts.push(u.type);
  if (u.tags?.length) parts.push(`Focus areas: ${u.tags.join(', ')}`);
  if (u.size) parts.push(`Size: ${u.size}`);
  return parts.filter(Boolean).join('. ');
});

await embedTable('programs', (p) => {
  const parts = [p.name, p.description, p.host];
  if (p.discipline?.length) parts.push(`Disciplines: ${p.discipline.join(', ')}`);
  if (p.type) parts.push(`Type: ${p.type}`);
  if (p.eligibility) parts.push(`Eligibility: ${p.eligibility}`);
  return parts.filter(Boolean).join('. ');
});

await embedTable('stories', (s) => {
  const parts = [s.name, s.title, s.excerpt, s.university, s.country, s.major];
  if (s.tags?.length) parts.push(`Tags: ${s.tags.join(', ')}`);
  return parts.filter(Boolean).join('. ');
});

console.log('\nAll done!');

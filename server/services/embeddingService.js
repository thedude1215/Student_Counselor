import { supabase } from '../lib/supabase.js';

const API_KEY = process.env.GEMINI_API_KEY;
const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;
const OUTPUT_DIMENSIONALITY = 768;

export async function embedText(text) {
  if (!API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const res = await fetch(`${EMBED_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: OUTPUT_DIMENSIONALITY,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Embedding API error: ${res.status}`);
  }

  const data = await res.json();
  return data.embedding?.values;
}

export async function semanticSearch(table, query, limit = 5) {
  const embedding = await embedText(query);
  if (!embedding) throw new Error('Failed to generate embedding');

  const rpcName = `match_${table}`;
  const { data, error } = await supabase.rpc(rpcName, {
    query_embedding: JSON.stringify(embedding),
    match_count: limit,
  });

  if (error) throw new Error(`Semantic search error: ${error.message}`);
  return data || [];
}

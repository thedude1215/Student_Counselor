import { createClient } from '@supabase/supabase-js';

function requiredEnv(key) {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`${key} is required. Add it to your Vite environment before starting ScholarPath.`);
  }
  return value;
}

export const supabase = createClient(
  requiredEnv('VITE_SUPABASE_URL'),
  requiredEnv('VITE_SUPABASE_ANON_KEY')
);

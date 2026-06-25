import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://qfmiilxytmccuihbyvga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set — auth-protected routes will fail');
}

const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder';

export const supabase = createClient(supabaseUrl, supabaseServiceKey || PLACEHOLDER_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

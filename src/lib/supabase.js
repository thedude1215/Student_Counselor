import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qfmiilxytmccuihbyvga.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmbWlpbHh5dG1jY3VpaGJ5dmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzcwNTksImV4cCI6MjA5NzU1MzA1OX0.M2Kv0McL2hdpFKLZbOq8yiNJS-Laj5r6upyoMAyyG6E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

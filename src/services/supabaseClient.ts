import { createClient } from '@supabase/supabase-js';

// Singleton Supabase client. Reads credentials from Vite env vars
// (pre-populated in .env by the platform). Exposed as a named export
// so every part of the app shares the same auth + realtime session.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Explicitly configure session persistence to address user concerns.
// The Supabase client uses localStorage by default, this makes it explicit.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    storage: window.localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials as per user request
const supabaseUrl = "https://tlbdginpqxezsywenzvi.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYmRnaW5wcXhlenN5d2VuenZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTAxMTYsImV4cCI6MjA4MDMyNjExNn0.q7tcb3_RFuTE87IPnxI9WTqhI4xkIfcc5KWBSQAI7VM";

// Explicitly configure session persistence to address user concerns.
// The Supabase client uses localStorage by default, this makes it explicit.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

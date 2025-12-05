// This file centralizes all environment variable access for the application.
// It allows for default values for non-sensitive keys and optional values for sensitive keys.

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  // This will now only throw for vars without a default that are missing
  throw new Error(`Missing required environment variable: ${key}`);
};

const getOptionalEnvVar = (key: string): string | undefined => {
  return process.env[key];
};

export const env = {
  // Supabase Credentials - public, so we can provide fallbacks to prevent app crash
  SUPABASE_URL: getEnvVar('SUPABASE_URL', "https://tlbdginpqxezsywenzvi.supabase.co"),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsYmRnaW5wcXhlenN5d2VuenZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTAxMTYsImV4cCI6MjA4MDMyNjExNn0.q7tcb3_RFuTE87IPnxI9WTqhI4xkIfcc5KWBSQAI7VM"),

  // AI Provider API Keys - sensitive, should be provided by user. We allow them to be undefined
  // so the app can start. The service using them will handle the missing key.
  GEMINI_API_KEY: getOptionalEnvVar('GEMINI_API_KEY'),
  GLM_API_KEY: getOptionalEnvVar('GLM_API_KEY'),
  DEEPSEEK_API_KEY: getOptionalEnvVar('DEEPSEEK_API_KEY'),
};

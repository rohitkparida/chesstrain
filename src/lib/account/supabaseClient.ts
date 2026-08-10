import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Public browser configuration. Never put a service-role key in these values. */
const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

/**
 * A singleton is exported so every repository shares one auth session and
 * refresh listener. It is undefined until deployment configuration is set,
 * which keeps guest/demo mode usable in local development and tests.
 */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;


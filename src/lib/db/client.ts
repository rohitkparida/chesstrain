import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
	if (typeof window === 'undefined') return null;
	const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
	const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
	if (!url || !key) return null;
	return client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
}

export function hasSupabaseConfig(): boolean {
	return Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}

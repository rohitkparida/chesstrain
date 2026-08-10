import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { supabase as defaultClient } from './supabaseClient';

/** Internal identity used by Supabase Auth; users still enter a username. */
export function usernameEmail(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(normalized)) throw new Error('Invalid username.');
  return `${normalized}@auth.chesstrain.local`;
}

export interface CloudAuthUser { id: string; username: string; email: string }

function mapUser(user: User | null): CloudAuthUser | null {
  if (!user) return null;
  const username = (user.user_metadata?.username as string | undefined) ?? user.email?.split('@')[0] ?? '';
  return { id: user.id, username, email: user.email ?? '' };
}

export interface CloudAuthRepository {
  signIn(username: string, password: string): Promise<CloudAuthUser>;
  signOut(): Promise<void>;
  currentUser(): Promise<CloudAuthUser | null>;
  subscribe(callback: (user: CloudAuthUser | null, event: AuthChangeEvent) => void): () => void;
}

export function createCloudAuthRepository(client: SupabaseClient | null = defaultClient): CloudAuthRepository {
  const requireClient = (): SupabaseClient => {
    if (!client) throw new Error('Cloud accounts are not configured.');
    return client;
  };
  return {
    async signIn(username, password) {
      const { data, error } = await requireClient().auth.signInWithPassword({ email: usernameEmail(username), password });
      if (error || !data.user) throw new Error(error?.message ?? 'Could not sign in.');
      return mapUser(data.user)!;
    },
    async signOut() {
      const { error } = await requireClient().auth.signOut();
      if (error) throw new Error(error.message);
    },
    async currentUser() {
      const { data, error } = await requireClient().auth.getUser();
      if (error && error.message !== 'Auth session missing!') throw new Error(error.message);
      return mapUser(data.user);
    },
    subscribe(callback) {
      const { data } = requireClient().auth.onAuthStateChange((event, session: Session | null) => callback(mapUser(session?.user ?? null), event));
      return () => data.subscription.unsubscribe();
    }
  };
}

export const cloudAuthRepository = createCloudAuthRepository();


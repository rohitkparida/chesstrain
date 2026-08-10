import { writable } from 'svelte/store';
import {
  localProfileRepository,
  type UserProfile
} from '$lib/account/profile';
import { LOCAL_ACCOUNT_USERNAME } from '$lib/account/localAuth';
import { supabase } from '$lib/account/supabaseClient';
import { createCloudRepositories } from '$lib/cloud/repositories';

let profileOwner = LOCAL_ACCOUNT_USERNAME;
const initialProfile = localProfileRepository.read(profileOwner);

export const profileStore = writable<UserProfile>(initialProfile);

profileStore.subscribe((profile) => {
  if (typeof window !== 'undefined') localProfileRepository.write(profileOwner, profile);
});

export function switchProfileOwner(username: string): void {
  if (username === profileOwner) return;
  profileOwner = username;
  profileStore.set(localProfileRepository.read(profileOwner));
}

export function updateProfile(patch: Partial<UserProfile>): void {
  let next: UserProfile | null = null;
  profileStore.update((profile) => (next = { ...profile, ...patch }));
  const updated = next;
  // Cloud is authoritative for authenticated users; local storage remains a
  // cache so guest mode and the UI continue to work without Supabase.
  if (supabase && profileOwner !== 'guest' && updated) {
    const client = supabase;
    const cloudProfile = updated as UserProfile;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) return;
      return createCloudRepositories(client).profiles.upsert(data.user.id, {
        username: profileOwner,
        chesscomUsername: cloudProfile.chessComUsername || null,
        preferences: {
          displayName: cloudProfile.displayName,
          theme: cloudProfile.theme,
          showDefinitions: cloudProfile.showDefinitions,
          difficultyOffset: cloudProfile.difficultyOffset,
          onboardingCompletedAt: cloudProfile.onboardingCompletedAt
        }
      });
    }).catch(() => { /* surfaced on the next hydration/retry */ });
  }
}

/** Load the server profile after cloud auth resolves. Local storage remains a
 * device cache and is deliberately retained for guest/demo sessions. */
export async function hydrateCloudProfile(userId: string, username: string): Promise<void> {
  if (!supabase) return;
  const record = await createCloudRepositories(supabase).profiles.get(userId);
  if (!record) return;
  const preferences = record.preferences ?? {};
  const fallback = localProfileRepository.read(username);
  const profile = {
    ...fallback,
    displayName: typeof preferences.displayName === 'string' ? preferences.displayName : (fallback.displayName || username),
    theme: preferences.theme === 'light' || preferences.theme === 'dark' || preferences.theme === 'system' ? preferences.theme : fallback.theme,
    showDefinitions: typeof preferences.showDefinitions === 'boolean' ? preferences.showDefinitions : fallback.showDefinitions,
    difficultyOffset: typeof preferences.difficultyOffset === 'number' ? preferences.difficultyOffset : fallback.difficultyOffset,
    onboardingCompletedAt: typeof preferences.onboardingCompletedAt === 'number' ? preferences.onboardingCompletedAt : fallback.onboardingCompletedAt,
    chessComUsername: record.chesscomUsername ?? fallback.chessComUsername
  } satisfies UserProfile;
  switchProfileOwner(username);
  profileStore.set(profile);
}

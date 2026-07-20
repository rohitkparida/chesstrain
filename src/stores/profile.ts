import { writable } from 'svelte/store';
import {
  localProfileRepository,
  type UserProfile
} from '$lib/account/profile';
import { LOCAL_ACCOUNT_USERNAME } from '$lib/account/localAuth';

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
  profileStore.update((profile) => ({ ...profile, ...patch }));
}

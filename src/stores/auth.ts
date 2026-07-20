import { writable } from 'svelte/store';
import { GUEST_USERNAME, LOCAL_ACCOUNT_USERNAME, LOCAL_ACCOUNTS, localAuthRepository } from '$lib/account/localAuth';
import { migrateLocalAccount } from '$lib/db/migrateLocalAccount';
import { getSupabaseClient, hasSupabaseConfig } from '$lib/db/client';

const GUEST_SESSION_KEY = 'magnus_guest_authenticated';
const CLOUD_SESSION_KEY = 'magnus_cloud_username';

function cloudEmail(username: string): string {
  return `${username}@magnus.engine`;
}

export interface LocalAuthState {
  username: string;
  accounts: typeof LOCAL_ACCOUNTS;
  hasPassword: boolean;
  authenticated: boolean;
  working: boolean;
  error: string;
  guest: boolean;
}

function currentState(selectedUsername?: string): LocalAuthState {
  const guestActive = typeof window !== 'undefined' && localStorage.getItem(GUEST_SESSION_KEY) === '1';
  const active = localAuthRepository.activeUsername();
  const cloudActive = typeof window !== 'undefined' ? localStorage.getItem(CLOUD_SESSION_KEY) : null;
  const username = guestActive ? GUEST_USERNAME : cloudActive ?? active ?? selectedUsername ?? LOCAL_ACCOUNT_USERNAME;
  return {
    username,
    accounts: LOCAL_ACCOUNTS,
    hasPassword: localAuthRepository.hasPassword(username),
    authenticated: guestActive || active === username || cloudActive === username,
    working: false,
    error: ''
    ,guest: username === GUEST_USERNAME
  };
}

export const authStore = writable<LocalAuthState>(currentState());

export function selectLocalAccount(username: string): void {
  if (!LOCAL_ACCOUNTS.some((account) => account.username === username)) return;
  authStore.set(currentState(username));
}

export function startGuestMode(): void {
  if (typeof window !== 'undefined') localStorage.setItem(GUEST_SESSION_KEY, '1');
  authStore.set({ username: GUEST_USERNAME, accounts: LOCAL_ACCOUNTS, hasPassword: false, authenticated: true, working: false, error: '', guest: true });
}

export async function setLocalPassword(currentPassword: string, newPassword: string): Promise<boolean> {
  let username = LOCAL_ACCOUNT_USERNAME;
  authStore.update((state) => { username = state.username; return { ...state, working: true, error: '' }; });
  try {
    await localAuthRepository.setPassword(username, newPassword, currentPassword);
    authStore.set(currentState(username));
    return true;
  } catch (error) {
    authStore.update((state) => ({
      ...state,
      working: false,
      error: error instanceof Error ? error.message : 'Could not save the password.'
    }));
    return false;
  }
}

export async function signInLocal(password: string): Promise<boolean> {
  let username = LOCAL_ACCOUNT_USERNAME;
  authStore.update((state) => { username = state.username; return { ...state, working: true, error: '' }; });
  try {
    const cloud = getSupabaseClient();
    if (hasSupabaseConfig() && cloud) {
      const { data, error } = await cloud.auth.signInWithPassword({ email: cloudEmail(username), password });
      if (!error && data.user) {
        if (typeof window !== 'undefined') localStorage.setItem(CLOUD_SESSION_KEY, username);
        await migrateLocalAccount(username).catch(() => undefined);
        authStore.set(currentState(username));
        return true;
      }
    }
    const valid = await localAuthRepository.signIn(username, password);
    if (valid) await migrateLocalAccount(username).catch(() => undefined);
    authStore.set(valid ? currentState(username) : { ...currentState(username), error: 'Incorrect password.' });
    return valid;
  } catch {
    authStore.update((state) => ({ ...state, working: false, error: 'Could not unlock this account.' }));
    return false;
  }
}

export function lockLocalAccount(): void {
  let selected = LOCAL_ACCOUNT_USERNAME;
  authStore.update((state) => { selected = state.username; return state; });
  localAuthRepository.signOut();
  const cloud = getSupabaseClient();
  if (cloud) cloud.auth.signOut().catch(() => undefined);
  if (typeof window !== 'undefined') localStorage.removeItem(CLOUD_SESSION_KEY);
  if (typeof window !== 'undefined') localStorage.removeItem(GUEST_SESSION_KEY);
  authStore.set(currentState(selected));
}

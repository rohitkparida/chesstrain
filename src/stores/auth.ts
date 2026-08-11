import { writable } from 'svelte/store';
import { GUEST_USERNAME, LOCAL_ACCOUNT_USERNAME, LOCAL_ACCOUNTS, localAuthRepository } from '$lib/account/localAuth';
import { cloudAuthRepository } from '$lib/account/cloudAuth';
import { supabaseConfigured } from '$lib/account/supabaseClient';

const GUEST_SESSION_KEY = 'magnus_guest_authenticated';

export interface LocalAuthState {
  username: string;
  accounts: typeof LOCAL_ACCOUNTS;
  hasPassword: boolean;
  authenticated: boolean;
  working: boolean;
  error: string;
  guest: boolean;
  /** True after the persisted cloud session has been checked on startup. */
  ready: boolean;
}

// Vitest must remain deterministic and offline; production uses Supabase when configured.
const cloudEnabled = supabaseConfigured && import.meta.env.MODE !== 'test';

function currentState(selectedUsername?: string): LocalAuthState {
  const guestActive = typeof window !== 'undefined' && localStorage.getItem(GUEST_SESSION_KEY) === '1';
  const active = localAuthRepository.activeUsername();
  const username = guestActive ? GUEST_USERNAME : active ?? selectedUsername ?? LOCAL_ACCOUNT_USERNAME;
  return {
    username,
    accounts: LOCAL_ACCOUNTS,
    hasPassword: localAuthRepository.hasPassword(username),
    authenticated: guestActive || active === username,
    working: false,
    error: '',
    guest: username === GUEST_USERNAME
    ,ready: !cloudEnabled
  };
}

export const authStore = writable<LocalAuthState>(currentState());

/** Resolve the persisted cloud session before protected routes are rendered. */
export async function initializeAuth(): Promise<void> {
  if (!cloudEnabled) return;
  authStore.update((state) => ({ ...state, ready: false, working: true, error: '' }));
  try {
    const user = await cloudAuthRepository.currentUser();
    if (user) {
      authStore.set({ username: user.username, accounts: LOCAL_ACCOUNTS, hasPassword: true, authenticated: true, working: false, error: '', guest: false, ready: true });
      try {
        const [{ hydrateCloudProfile }, { hydrateCloudSession }] = await Promise.all([import('./profile'), import('./session')]);
        await Promise.all([hydrateCloudProfile(user.id, user.username), hydrateCloudSession(user.id, user.username)]);
      } catch { /* hydration is retried by the next sign-in */ }
    } else {
      authStore.set({ ...currentState(), authenticated: false, working: false, ready: true });
    }
  } catch (error) {
    authStore.set({ ...currentState(), authenticated: false, working: false, ready: true, error: error instanceof Error ? error.message : 'Could not connect to cloud accounts.' });
  }
}

export function selectLocalAccount(username: string): void {
  if (cloudEnabled) {
    const normalized = username.trim().toLowerCase();
    if (normalized) authStore.set({ ...currentState(normalized), username: normalized, hasPassword: true, ready: true });
    return;
  }
  if (!LOCAL_ACCOUNTS.some((account) => account.username === username)) return;
  authStore.set(currentState(username));
}

export function startGuestMode(): void {
  if (typeof window !== 'undefined') localStorage.setItem(GUEST_SESSION_KEY, '1');
  authStore.set({ username: GUEST_USERNAME, accounts: LOCAL_ACCOUNTS, hasPassword: false, authenticated: true, working: false, error: '', guest: true, ready: true });
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
    if (cloudEnabled) {
      const user = await cloudAuthRepository.signIn(username, password);
      authStore.set({ username: user.username, accounts: LOCAL_ACCOUNTS, hasPassword: true, authenticated: true, working: false, error: '', guest: false, ready: true });
      try {
        const [{ hydrateCloudProfile }, { hydrateCloudSession }] = await Promise.all([import('./profile'), import('./session')]);
        await Promise.all([hydrateCloudProfile(user.id, user.username), hydrateCloudSession(user.id, user.username)]);
      } catch { /* keep login usable if a cloud row is absent */ }
      return true;
    }
    const valid = await localAuthRepository.signIn(username, password);
    authStore.set(valid ? currentState(username) : { ...currentState(username), error: 'Incorrect password.', ready: true });
    return valid;
  } catch {
    authStore.update((state) => ({ ...state, working: false, ready: true, error: 'Could not unlock this account.' }));
    return false;
  }
}

export function lockLocalAccount(): void {
  let selected = LOCAL_ACCOUNT_USERNAME;
  authStore.update((state) => { selected = state.username; return state; });
  if (cloudEnabled) void cloudAuthRepository.signOut().catch(() => {});
  else localAuthRepository.signOut();
  if (typeof window !== 'undefined') localStorage.removeItem(GUEST_SESSION_KEY);
  authStore.set({ ...currentState(selected), authenticated: false, ready: true });
}

if (typeof window !== 'undefined') void initializeAuth();

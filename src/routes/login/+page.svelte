<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import ActionButton from '../../components/ActionButton.svelte';
  import { selectLocalAccount, signInLocal, startGuestMode } from '../../stores/auth';
  import { LOCAL_ACCOUNTS } from '$lib/account/localAuth';

  let username = $state('');
  let password = $state('');
  let submitting = $state(false);
  let error = $state('');
  const LOGIN_USERNAME_KEY = 'magnus_login_username';

  onMount(() => {
    try { username = localStorage.getItem(LOGIN_USERNAME_KEY) ?? ''; } catch {}
  });

  function returnDestination(): string {
    const value = page.url.searchParams.get('returnTo');
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return '/';
    return value;
  }

  function rememberUsername(value: string): void {
    try { localStorage.setItem(LOGIN_USERNAME_KEY, value); } catch {}
  }

  async function unlock(event: SubmitEvent) {
    event.preventDefault();
    if (submitting) return;
    const normalizedUsername = username.trim().toLowerCase();
    if (!LOCAL_ACCOUNTS.some((account) => account.username === normalizedUsername)) {
      error = 'Incorrect username or password.';
      password = '';
      return;
    }
    rememberUsername(normalizedUsername);
    selectLocalAccount(normalizedUsername);
    submitting = true;
    error = '';
    const valid = await signInLocal(password);
    submitting = false;
    if (valid) {
      await goto(returnDestination());
    } else {
      error = 'Incorrect username or password.';
      password = '';
    }
  }

  async function continueAsGuest() {
    startGuestMode();
    await goto(returnDestination());
  }
</script>

<main class="login-page">
  <p class="eyebrow">ACCOUNT</p>
  <h1>Welcome back</h1>
  <form onsubmit={unlock}>
    <label for="username">Username</label>
    <input id="username" bind:value={username} maxlength="50" autocomplete="username" autocapitalize="none" spellcheck="false" />
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} maxlength="128" autocomplete="current-password" />
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <ActionButton variant="primary" type="submit" disabled={submitting || !username.trim() || !password}>
      {submitting ? 'Logging in...' : 'Log in'}
    </ActionButton>
  </form>

  <div class="guest-divider"><span>or</span></div>
  <ActionButton variant="quiet" type="button" onclick={continueAsGuest}>Continue as guest</ActionButton>

  <p class="notice">Guest mode unlocks every module; progress stays separate.</p>
</main>

<style>
  .login-page { width: min(100%, 420px); margin: 8vh auto 0; }
  .eyebrow { margin: 0 0 0.4rem; color: var(--accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; }
  h1 { margin: 0; color: var(--text-1); font-size: 1.8rem; }
  form { display: grid; gap: 0.65rem; border-top: 1px solid var(--border); padding-top: 1.2rem; }
  label { color: var(--text-2); font-size: 0.88rem; font-weight: 700; }
  input { width: 100%; border: 1px solid var(--border-sub); border-radius: 6px; background: var(--surface-2); color: var(--text-1); padding: 0.7rem; font: inherit; }
  input:focus { border-color: var(--accent); outline: 2px solid var(--accent-border); }
  .error { margin: 0; color: var(--error); font-size: 0.85rem; }
  .notice { border-top: 1px solid var(--border); margin-top: 1.4rem; padding-top: 1rem; color: var(--text-5); font-size: 0.78rem; line-height: 1.45; }
  .guest-divider { display: flex; align-items: center; gap: 0.5rem; margin: 1rem 0 0.65rem; color: var(--text-5); font-size: 0.75rem; }
  .guest-divider::before, .guest-divider::after { content: ''; flex: 1; border-top: 1px solid var(--border); }
  .guest-divider span { padding: 0 0.25rem; }
</style>

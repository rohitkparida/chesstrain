<script lang="ts">
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  import ActionButton from '../../components/ActionButton.svelte';
  import { profileStore, updateProfile } from '../../stores/profile';
  import { sessionStore } from '../../stores/session';
  import { authStore, lockLocalAccount, setLocalPassword } from '../../stores/auth';
  import type { ThemePreference } from '$lib/account/profile';
  import { appPath } from '$lib/paths';

  const initialProfile = get(profileStore);
  let profile = $derived($profileStore);
  let session = $derived($sessionStore);
  let auth = $derived($authStore);
  let displayName = $state(initialProfile.displayName);
  let chessComUsername = $state(initialProfile.chessComUsername);
  let theme = $state<ThemePreference>(initialProfile.theme);
  let showDefinitions = $state(initialProfile.showDefinitions);
  let difficultyOffset = $state(initialProfile.difficultyOffset);
  let saved = $state(false);
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordMessage = $state('');
  let passwordError = $state('');
  let showPassword = $state(false);
  let formOwner = $state('');

  $effect(() => {
    const owner = auth.username;
    if (owner === formOwner) return;
    formOwner = owner;
    displayName = profile.displayName;
    chessComUsername = profile.chessComUsername;
    theme = profile.theme;
    showDefinitions = profile.showDefinitions;
    difficultyOffset = profile.difficultyOffset;
  });

  function applyTheme(value: ThemePreference) {
    const light = value === 'light' || (value === 'system' && window.matchMedia?.('(prefers-color-scheme: light)').matches);
    document.documentElement.classList.toggle('light', light);
    try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch {}
  }

  function saveProfile() {
    updateProfile({
      displayName: displayName.trim(),
      chessComUsername: chessComUsername.trim(),
      theme,
      showDefinitions
		,difficultyOffset
    });
    applyTheme(theme);
    saved = true;
    window.setTimeout(() => { saved = false; }, 1800);
  }

  function resetForm() {
    displayName = profile.displayName;
    chessComUsername = profile.chessComUsername;
    theme = profile.theme;
    showDefinitions = profile.showDefinitions;
    difficultyOffset = profile.difficultyOffset;
  }

  async function savePassword(event: SubmitEvent) {
    event.preventDefault();
    passwordMessage = '';
    passwordError = '';
    if (newPassword !== confirmPassword) {
      passwordError = 'New passwords do not match.';
      return;
    }
    const changed = await setLocalPassword(currentPassword, newPassword);
    if (!changed) {
      passwordError = auth.error || 'Could not change the password.';
      return;
    }
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
    passwordMessage = 'Password changed.';
  }

  async function logOut() {
    lockLocalAccount();
    await goto(appPath('/login'));
  }

  function replayIntroduction() {
    updateProfile({ onboardingCompletedAt: null });
  }
</script>

<main class="profile-page">
  <header class="page-header">
    <p class="eyebrow">ACCOUNT</p>
    <h1>Profile</h1>
  </header>

  <section class="profile-section" aria-labelledby="identity-heading">
    <div class="section-heading">
      <h2 id="identity-heading">Identity</h2>
    </div>
    <label>
      Username
      <input value={auth.username} readonly aria-describedby="username-help" />
      <span id="username-help" class="field-help">Account name</span>
    </label>
    <label>
      Display name
      <input bind:value={displayName} maxlength="50" placeholder="e.g. Rohit" autocomplete="name" />
    </label>
    <label>
      Chess.com name
      <input bind:value={chessComUsername} maxlength="50" placeholder="Used to load your public games" autocomplete="username" />
    </label>
  </section>

  <section class="profile-section" aria-labelledby="progress-heading">
    <div class="section-heading">
      <h2 id="progress-heading">Training snapshot</h2>
    </div>
    <div class="stats" aria-label="Training statistics">
      <div><strong>{session.totalSolved}</strong><span>Correct tactics answers</span></div>
      <div><strong>{session.streak}</strong><span>Correct-answer streak</span></div>
      <div><strong>{Math.round(Object.entries(session.ratings).filter(([key]) => key.startsWith('tactics:')).reduce((sum, [, value]) => sum + value, 0) / Math.max(1, Object.keys(session.ratings).filter((key) => key.startsWith('tactics:')).length))}</strong><span>Tactics practice rating</span></div>
    </div>
  </section>

  <section class="profile-section" aria-labelledby="preferences-heading">
    <div class="section-heading">
      <h2 id="preferences-heading">Preferences</h2>
    </div>
    <label>
      Theme
      <select bind:value={theme}>
        <option value="system">System</option>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
      </select>
    </label>
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={showDefinitions} />
      <span>
        Show definitions on hover
      </span>
    </label>
    <label>
      Exercise difficulty
      <input type="range" min="-300" max="300" step="50" bind:value={difficultyOffset} aria-describedby="difficulty-help" />
      <span id="difficulty-help" class="field-help">Adjusts exercise difficulty: {difficultyOffset > 0 ? '+' : ''}{difficultyOffset}.</span>
    </label>
    <a class="dictionary-link" href={appPath('/dictionary')}>Open dictionary</a>
  </section>

  <section class="profile-section" aria-labelledby="security-heading">
    <div class="section-heading">
      <h2 id="security-heading">Password</h2>
    </div>
    <button class="disclosure" type="button" onclick={() => showPassword = !showPassword} aria-expanded={showPassword}>
      {showPassword ? 'Hide password settings' : 'Change password'}
    </button>
    {#if showPassword}<form class="password-form" onsubmit={savePassword}>
      <label>
        Current password
        <input type="password" bind:value={currentPassword} maxlength="128" autocomplete="current-password" />
      </label>
      <label>
        New password
        <input type="password" bind:value={newPassword} minlength="8" maxlength="128" autocomplete="new-password" />
      </label>
      <label>
        Confirm new password
        <input type="password" bind:value={confirmPassword} minlength="8" maxlength="128" autocomplete="new-password" />
      </label>
      {#if passwordError}<p class="password-error" role="alert">{passwordError}</p>{/if}
      {#if passwordMessage}<p class="saved" role="status">{passwordMessage}</p>{/if}
      <div class="security-actions">
        <ActionButton variant="primary" type="submit" disabled={auth.working || !currentPassword || !newPassword || !confirmPassword}>
          {auth.working ? 'Changing...' : 'Change password'}
        </ActionButton>
      </div>
    </form>
    {/if}
  </section>

  <section class="profile-section" aria-labelledby="help-heading">
    <div class="section-heading">
      <h2 id="help-heading">Getting started</h2>
    </div>
    <button class="disclosure" type="button" onclick={replayIntroduction}>Replay introduction</button>
  </section>

  <footer class="actions">
    <ActionButton variant="quiet" onclick={resetForm}>Cancel</ActionButton>
    <ActionButton variant="primary" onclick={saveProfile}>Save</ActionButton>
    {#if saved}<span class="saved" role="status">Saved</span>{/if}
  </footer>
</main>

<style>
  .profile-page { max-width: 760px; display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header h1 { margin: 0 0 0.4rem; color: var(--text-1); font-size: 1.7rem; }
  .page-header p:last-child { margin: 0; max-width: 620px; color: var(--text-4); line-height: 1.5; }
  .eyebrow { margin: 0 0 0.4rem; color: var(--accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; }
  .profile-section { display: flex; flex-direction: column; gap: 0.85rem; border-top: 1px solid var(--border); padding-top: 1.25rem; }
  .section-heading h2 { margin: 0; color: var(--text-1); font-size: 1.05rem; }
  label { display: grid; gap: 0.35rem; color: var(--text-2); font-weight: 700; font-size: 0.88rem; }
  .field-help { color: var(--text-5); font-size: 0.76rem; font-weight: 400; }
  input, select { width: 100%; border: 1px solid var(--border-sub); border-radius: 6px; background: var(--surface-2); color: var(--text-1); padding: 0.65rem 0.7rem; font: inherit; }
  input[type="checkbox"] { width: 1rem; height: 1rem; margin: 0.15rem 0 0; accent-color: var(--accent); }
  .checkbox-label { display: flex; align-items: flex-start; gap: 0.55rem; }
  .dictionary-link { width: fit-content; font-size: 0.85rem; font-weight: 700; text-decoration: none; }
  input:focus, select:focus { border-color: var(--accent); outline: 2px solid var(--accent-border); }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
  .stats div { display: flex; flex-direction: column; gap: 0.2rem; border-left: 2px solid var(--accent-border); padding-left: 0.7rem; }
  .stats strong { color: var(--text-1); font-size: 1.35rem; }
  .stats span { color: var(--text-4); font-size: 0.78rem; }
  .actions { display: flex; align-items: center; gap: 0.65rem; border-top: 1px solid var(--border); padding-top: 1rem; }
  .password-form { display: grid; gap: 0.75rem; }
  .security-actions { display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap; }
  .disclosure { align-self: flex-start; border: 1px solid var(--border-sub); border-radius: 6px; background: transparent; color: var(--text-2); padding: 0.55rem 0.7rem; font: inherit; font-size: 0.82rem; cursor: pointer; }
  .disclosure:hover { border-color: var(--accent); color: var(--accent); }
  .password-error { margin: 0; color: var(--error); font-size: 0.85rem; }
  .saved { color: var(--success); font-size: 0.85rem; font-weight: 700; }
  @media (max-width: 520px) { .stats { grid-template-columns: 1fr; } }
</style>

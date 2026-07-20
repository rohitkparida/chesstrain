<script lang="ts">
  import { goto } from '$app/navigation';
  import { appPath, routePath } from '$lib/paths';
  import { page } from '$app/state';
  import { authStore, lockLocalAccount } from '../stores/auth';
  import { switchSessionOwner } from '../stores/session';
  import { profileStore, switchProfileOwner, updateProfile } from '../stores/profile';
  import { profileInitials, type ThemePreference } from '$lib/account/profile';
  import { mistakeSyncStore, startMistakeSync } from '../stores/mistakeSync';
  import { type Snippet } from 'svelte';

  let { children } = $props<{ children: Snippet }>();
  let light = $state(false);
  let onboardingOpen = $state(false);
  let profileBadge = $derived(profileInitials($profileStore));
  let authenticated = $derived($authStore.authenticated);
  let mistakeSync = $derived($mistakeSyncStore);

  $effect(() => {
    const path = routePath(page.url.pathname);
    const auth = $authStore;
    if (auth.authenticated) {
      switchProfileOwner(auth.username);
      switchSessionOwner(auth.username);
    }
    onboardingOpen = auth.authenticated && !auth.guest && $profileStore.onboardingCompletedAt === null;
    if (!authenticated && path !== '/login') {
      const returnTo = `${page.url.pathname}${page.url.search}${page.url.hash}`;
      void goto(`${appPath('/login')}?returnTo=${encodeURIComponent(returnTo)}`);
    }
    if (authenticated && path === '/login') {
      const requested = page.url.searchParams.get('returnTo');
      const destination = requested && requested.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/login')
        ? requested
        : '/';
      void goto(appPath(destination));
    }
  });

  $effect(() => {
    const auth = $authStore;
    const username = $profileStore.chessComUsername;
    if (auth.authenticated && !auth.guest && username) startMistakeSync(auth.username, username);
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    const preference: ThemePreference = $profileStore.theme;
    const media = window.matchMedia?.('(prefers-color-scheme: light)');
    const applyPreference = () => {
      const isLight = preference === 'light' || (preference === 'system' && (media?.matches ?? false));
      light = isLight;
      applyTheme(isLight);
    };
    applyPreference();
    if (preference !== 'system' || !media) return;
    media.addEventListener?.('change', applyPreference);
    return () => media.removeEventListener?.('change', applyPreference);
  });

  function applyTheme(isLight: boolean) {
    document.documentElement.classList.toggle('light', isLight);
  }

  function toggleTheme() {
    updateProfile({ theme: light ? 'dark' : 'light' });
  }

  async function logOut() {
    lockLocalAccount();
    await goto(appPath('/login'));
  }

  async function finishOnboarding(destination: string) {
    updateProfile({ onboardingCompletedAt: Date.now() });
    onboardingOpen = false;
    await goto(appPath(destination));
  }

  function isActive(href: string) {
    const path = routePath(page.url.pathname);
    if (href === '/') return path === '/';
    return path.startsWith(href);
  }
</script>

<div class="app-layout">
  {#if authenticated}
    <header class="topbar">
      <div class="topbar-row">
        <a class="brand" href={appPath('/')}>
          <div class="logo-icon">N</div>
          <div>
            <div class="logo-title">MAGNUS ENGINE</div>
            <div class="logo-sub">Adaptive Chess Training</div>
          </div>
        </a>

        <div class="topbar-meta">
          {#if mistakeSync.status === 'syncing' || mistakeSync.status === 'analyzing'}
            <span class="sync-indicator" title="Checking your Chess.com games" aria-label="Checking your Chess.com games"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /></svg></span>
          {:else if mistakeSync.status === 'error'}
            <span class="sync-indicator error" title="Chess.com sync needs attention" aria-label="Chess.com sync needs attention"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d="M8 4.5v4M8 11.5h.01" /></svg></span>
          {/if}
          <details class="profile-menu">
            <summary class:active={isActive('/profile')} aria-label="Open profile menu">
              <span class="profile-badge" aria-hidden="true">{profileBadge}</span>
              <span>Profile</span>
            </summary>
            <div class="profile-menu-panel">
              <a href={appPath('/profile')}>Profile settings</a>
              <button onclick={toggleTheme}>{light ? 'Use dark mode' : 'Use light mode'}</button>
              <button onclick={logOut}>Log out</button>
            </div>
          </details>
        </div>
      </div>

      <nav class="nav-links" aria-label="Primary">
        <a class="nav-link" class:active={isActive('/')} href={appPath('/')}>Today</a>
        <a class="nav-link" class:active={isActive('/train')} href={appPath('/train')}>Train</a>
        <a class="nav-link" class:active={isActive('/dictionary')} href={appPath('/dictionary')}>Dictionary</a>
      </nav>
    </header>
  {:else}
    <header class="login-topbar">
      <a class="brand" href={appPath('/')}>
        <div class="logo-icon">N</div>
        <div>
          <div class="logo-title">MAGNUS ENGINE</div>
          <div class="logo-sub">Adaptive Chess Training</div>
        </div>
      </a>
      <button class="theme-btn" onclick={toggleTheme} aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}>
        {light ? 'Dark mode' : 'Light mode'}
      </button>
    </header>
  {/if}

  <main class="main-content">
    {#if authenticated || routePath(page.url.pathname) === '/login'}
      {@render children()}
    {/if}
  </main>

  {#if onboardingOpen}
    <div class="onboarding-backdrop">
      <div class="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <p class="eyebrow">WELCOME</p>
        <h1 id="onboarding-title">A simple way to train</h1>
        <p class="onboarding-lede">Magnus keeps the next useful exercise close and leaves the answer for you to find.</p>
        <ol>
          <li><strong>Today</strong><span>gives you a short focused plan.</span></li>
          <li><strong>Train</strong><span>lets you choose one skill.</span></li>
          <li><strong>Commit, then review</strong><span>keeps feedback useful without giving away the move.</span></li>
        </ol>
        <div class="onboarding-actions">
          <button class="onboarding-primary" onclick={() => finishOnboarding('/')}>Start today's plan</button>
          <button class="onboarding-secondary" onclick={() => finishOnboarding('/train')}>Choose a skill</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(:root) {
    --bg: #090b0e; --surface-1: #0d1117; --surface-2: #10141d; --surface-3: #1a2232;
    --border: #1a2232; --border-sub: #323238; --text-1: #ffffff; --text-2: #e1e1e6;
    --text-3: #c4c4cc; --text-4: #8d8d99; --text-5: #555566; --text-6: #323238;
    --accent: #00b7ff; --accent-dim: rgba(0, 183, 255, 0.08); --accent-border: rgba(0, 183, 255, 0.18);
    --success: #00b37e; --success-dim: rgba(0, 179, 126, 0.08); --error: #f75a68; --error-dim: rgba(247, 90, 104, 0.08);
    --warning: #fba94c; --warning-dim: rgba(255, 120, 0, 0.08); color-scheme: dark;
  }
  :global(:root.light) {
    --bg: #f1f5f9; --surface-1: #ffffff; --surface-2: #f8fafc; --surface-3: #e2e8f0;
    --border: #e2e8f0; --border-sub: #cbd5e1; --text-1: #0f172a; --text-2: #1e293b;
    --text-3: #475569; --text-4: #64748b; --text-5: #94a3b8; --text-6: #cbd5e1;
    --accent: #0284c7; --accent-dim: rgba(2, 132, 199, 0.08); --accent-border: rgba(2, 132, 199, 0.2);
    --success: #059669; --success-dim: rgba(5, 150, 105, 0.08); --error: #dc2626; --error-dim: rgba(220, 38, 38, 0.08);
    --warning: #d97706; --warning-dim: rgba(217, 119, 6, 0.08); color-scheme: light;
  }
  :global(body) { margin: 0; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text-2); }
  :global(*, *::before, *::after) { box-sizing: border-box; }
  :global(a) { color: var(--accent); }
  :global(:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
  .app-layout { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100vh; overflow: hidden; }
  .topbar, .login-topbar { background: var(--surface-1); border-bottom: 1px solid var(--border); padding: 0.85rem 1rem; }
  .topbar { display: grid; gap: 0.8rem; }
  .topbar-row, .login-topbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .brand { display: flex; align-items: center; gap: 0.6rem; color: inherit; text-decoration: none; }
  .logo-icon { display: grid; place-items: center; width: 1.5rem; height: 1.5rem; border: 1px solid var(--accent-border); border-radius: 5px; color: var(--accent); font-size: 0.75rem; font-weight: 800; }
  .logo-title { color: var(--text-1); font-size: 0.8rem; font-weight: 800; letter-spacing: 1.5px; }
  .logo-sub { color: var(--text-5); font-size: 0.68rem; }
  .topbar-meta, .nav-links { display: flex; align-items: center; gap: 0.75rem; }
  .nav-links { gap: 0.35rem; }
  .nav-link { padding: 0.42rem 0.7rem; border: 1px solid transparent; border-radius: 999px; color: var(--text-4); font-size: 0.82rem; text-decoration: none; }
  .nav-link:hover, .nav-link.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
  .profile-menu { position: relative; }
  .profile-menu summary { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem; border-radius: 999px; color: var(--text-3); cursor: pointer; font-size: 0.78rem; font-weight: 600; list-style: none; }
  .profile-menu summary::-webkit-details-marker { display: none; }
  .profile-menu summary:hover, .profile-menu summary.active { color: var(--accent); }
  .profile-badge { display: inline-grid; place-items: center; width: 1.45rem; height: 1.45rem; border: 1px solid var(--accent-border); border-radius: 50%; background: var(--accent-dim); color: var(--accent); font-size: 0.62rem; font-weight: 800; }
  .sync-indicator { display: inline-grid; place-items: center; width: 1.45rem; height: 1.45rem; color: var(--accent); }
  .sync-indicator svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 1.5; animation: sync-pulse 1.4s ease-in-out infinite; }
  .sync-indicator.error { color: var(--error); }
  @keyframes sync-pulse { 50% { opacity: 0.35; transform: scale(0.85); } }
  .profile-menu-panel { position: absolute; top: calc(100% + 0.5rem); right: 0; z-index: 10; display: grid; min-width: 150px; padding: 0.35rem; border: 1px solid var(--border-sub); background: var(--surface-1); box-shadow: 0 10px 24px rgba(0,0,0,0.18); }
  .profile-menu-panel a, .profile-menu-panel button { padding: 0.6rem 0.65rem; border: 0; background: transparent; color: var(--text-2); font: inherit; font-size: 0.78rem; text-align: left; text-decoration: none; cursor: pointer; }
  .profile-menu-panel a:hover, .profile-menu-panel button:hover { background: var(--accent-dim); color: var(--accent); }
  .theme-btn { padding: 0.2rem 0.5rem; border: 1px solid var(--border-sub); border-radius: 6px; background: none; color: var(--text-3); cursor: pointer; font-size: 0.75rem; }
  .theme-btn:hover { color: var(--accent); }
  .main-content { display: flex; flex-direction: column; overflow-y: auto; padding: 1.25rem 1.5rem 1.5rem; background: var(--bg); }
  .onboarding-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 1rem; background: color-mix(in srgb, var(--bg) 82%, transparent); }
  .onboarding { width: min(100%, 430px); padding: 1.35rem; border: 1px solid var(--accent-border); background: var(--surface-1); box-shadow: 0 16px 48px rgba(0,0,0,0.25); }
  .eyebrow { margin: 0 0 0.35rem; color: var(--accent); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; }
  .onboarding h1 { margin: 0; color: var(--text-1); font-size: 1.45rem; }
  .onboarding-lede { margin: 0.45rem 0 1rem; color: var(--text-4); font-size: 0.86rem; line-height: 1.45; }
  .onboarding ol { display: grid; gap: 0.7rem; margin: 0; padding-left: 1.25rem; color: var(--text-3); font-size: 0.86rem; }
  .onboarding li { padding-left: 0.25rem; }
  .onboarding li strong { display: block; color: var(--text-1); }
  .onboarding li span { color: var(--text-4); }
  .onboarding-actions { display: flex; gap: 0.6rem; margin-top: 1.25rem; }
  .onboarding-actions button { min-height: 2.6rem; padding: 0.6rem 0.8rem; border: 1px solid var(--accent-border); border-radius: 6px; font: inherit; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
  .onboarding-primary { background: var(--accent); color: var(--bg); }
  .onboarding-secondary { background: transparent; color: var(--accent); }
  @media (max-width: 760px) { .topbar, .login-topbar { padding: 0.7rem 0.8rem; } .topbar-row { align-items: flex-start; flex-direction: column; gap: 0.5rem; } .topbar-meta { width: 100%; justify-content: flex-end; } .nav-links { width: 100%; } .nav-link { flex: 1; text-align: center; } .main-content { padding: 1rem 0.75rem 1.5rem; } }
</style>

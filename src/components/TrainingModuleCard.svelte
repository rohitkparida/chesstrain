<script lang="ts">
  let {
    name,
    description,
    href,
    icon,
    unlocked,
    progressText = '',
    lockReason = '',
    unlockHref = ''
  } = $props<{
    name: string;
    description: string;
    href: string;
    icon: string;
    unlocked: boolean;
    progressText?: string;
    lockReason?: string;
    unlockHref?: string;
  }>();
</script>

{#if unlocked}
  <a class="module-card" href={href} data-locked="false">
    <span class="module-icon" aria-hidden="true">{@render ModuleIcon(icon)}</span>
    <span class="module-copy">
      <strong>{name}</strong>
      <span>{description}</span>
      {#if progressText}<small>{progressText}</small>{/if}
    </span>
  </a>
{:else}
  <article class="module-card locked" data-locked="true" aria-label={`${name}, locked`}>
    <span class="module-icon lock-icon" aria-hidden="true">{@render ModuleIcon(icon)}</span>
    <span class="module-copy">
      <strong>{name}<span class="lock-badge" aria-label="Locked" title="Locked"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.75A1.75 1.75 0 0 1 14 8.75v5.5A1.75 1.75 0 0 1 12.25 16h-8.5A1.75 1.75 0 0 1 2 14.25v-5.5A1.75 1.75 0 0 1 3.75 7h.75Zm1.5 0h4V5a2 2 0 0 0-4 0v2Z"/></svg></span></strong>
      {#if lockReason}<small>{lockReason}</small>{/if}
      {#if unlockHref}<a class="placement-link" href={unlockHref}>Practice first</a>{/if}
    </span>
  </article>
{/if}

{#snippet ModuleIcon(icon: string)}
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    {#if icon === 'board'}<rect x="4" y="4" width="16" height="16" /><path d="M8 4v16M12 4v16M16 4v16M4 8h16M4 12h16M4 16h16" />
    {:else if icon === 'tactics'}<path d="M5 19 19 5M7 7h.01M17 17h.01" /><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" />
    {:else if icon === 'calculation'}<path d="M6 4h12v16H6zM9 8h6M9 12h2M13 12h2M9 16h2M13 16h2" />
    {:else if icon === 'positional'}<path d="M5 18V9M12 18V5M19 18v-7M4 18h16" />
    {:else if icon === 'decision'}<path d="m5 12 4 4L19 6" />
    {:else if icon === 'opening'}<path d="M5 19h14M7 19V9l5-4 5 4v10M10 19v-5h4v5" />
    {:else if icon === 'endgame'}<path d="M8 4h8M10 4v4l-3 4h10l-3-4V4M12 12v6M8 20h8" />
    {:else}<path d="m6 6 12 12M18 6 6 18" /><circle cx="12" cy="12" r="9" />{/if}
  </svg>
{/snippet}

<style>
  .module-card {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-height: 76px;
    padding: 0.8rem 0.2rem;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: transparent;
    color: inherit;
    text-decoration: none;
  }
  a.module-card { transition: color 0.15s, border-color 0.15s; }
  a.module-card:hover { border-color: var(--accent-border); }
  .locked { color: var(--text-3); }
  .module-icon {
    display: grid;
    place-items: center;
    flex: 0 0 2rem;
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--accent-border);
    border-radius: 6px;
    color: var(--accent);
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }
  .lock-icon { color: var(--text-5); border-color: var(--border-sub); }
  .module-copy { display: grid; gap: 0.18rem; flex: 1; min-width: 0; }
  .module-copy strong { display: flex; align-items: center; gap: 0.45rem; color: var(--text-1); font-size: 0.95rem; }
  .module-copy > span { color: var(--text-4); font-size: 0.78rem; line-height: 1.35; }
  .module-copy small { color: var(--text-5); font-size: 0.72rem; line-height: 1.35; }
  .lock-badge { display: inline-flex; color: var(--text-5); line-height: 1; }
  .placement-link { color: var(--accent); font-size: 0.75rem; font-weight: 700; text-decoration: none; }
  .placement-link:hover { text-decoration: underline; }
</style>

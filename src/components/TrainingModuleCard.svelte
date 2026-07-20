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
    <span class="module-icon" aria-hidden="true">{icon}</span>
    <span class="module-copy">
      <strong>{name}</strong>
      <span>{description}</span>
      {#if progressText}<small>{progressText}</small>{/if}
    </span>
  </a>
{:else}
  <article class="module-card locked" data-locked="true" aria-label={`${name}, locked`}>
    <span class="module-icon lock-icon" aria-hidden="true">{icon}</span>
    <span class="module-copy">
      <strong>{name}<span class="lock-badge" aria-label="Locked" title="Locked"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2h.75A1.75 1.75 0 0 1 14 8.75v5.5A1.75 1.75 0 0 1 12.25 16h-8.5A1.75 1.75 0 0 1 2 14.25v-5.5A1.75 1.75 0 0 1 3.75 7h.75Zm1.5 0h4V5a2 2 0 0 0-4 0v2Z"/></svg></span></strong>
      {#if lockReason}<small>{lockReason}</small>{/if}
      {#if unlockHref}<a class="placement-link" href={unlockHref}>Practice prerequisite</a>{/if}
    </span>
  </article>
{/if}

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

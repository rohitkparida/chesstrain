<script lang="ts">
  import { onDestroy } from 'svelte';
  import { appPath } from '$lib/paths';
  import { dictionaryEntry } from '$lib/chess/dictionary';
  import { profileStore } from '../stores/profile';
  import type { Snippet } from 'svelte';

  let { term, children } = $props<{ term: string; children: Snippet }>();
  const entry = $derived(dictionaryEntry(term));
  let enabled = $state(true);
  let open = $state(false);
  const id = `chess-term-${Math.random().toString(36).slice(2)}`;

  const unsubscribe = profileStore.subscribe((profile) => { enabled = profile.showDefinitions; });
  onDestroy(unsubscribe);

  function toggle() {
    if (enabled && entry) open = !open;
  }

  function close() { open = false; }
</script>

{#if !enabled || !entry}
  {@render children()}
{:else}
  <span class="term-wrap" role="presentation" onmouseenter={() => open = true} onmouseleave={close}>
    <button
      type="button"
      class="term-trigger"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={id}
      onclick={toggle}
      onfocus={() => open = true}
      onblur={(event) => {
        if (!(event.currentTarget as HTMLElement).parentElement?.contains(event.relatedTarget as Node)) close();
      }}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
        if (event.key === 'Escape') close();
      }}
    >{@render children()}</button>
    {#if open}
      <span class="definition-popover" id={id} role="dialog" aria-label={`${entry.term} definition`}>
        <strong>{entry.term}</strong>
        <span>{entry.shortDefinition}</span>
        <a href={`${appPath('/dictionary')}#${entry.id}`}>Open definition</a>
      </span>
    {/if}
  </span>
{/if}

<style>
  .term-wrap { position: relative; display: inline; }
  .term-trigger { margin: 0; padding: 0; border: 0; border-bottom: 1px dotted var(--accent); background: transparent; color: inherit; font: inherit; cursor: help; }
  .term-trigger:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .definition-popover {
    position: absolute;
    z-index: 20;
    left: 50%;
    top: calc(100% + 0.55rem);
    width: min(280px, 78vw);
    display: grid;
    gap: 0.35rem;
    padding: 0.75rem;
    transform: translateX(-50%);
    border: 1px solid var(--accent-border);
    border-radius: 8px;
    background: var(--surface-1);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.25);
    color: var(--text-3);
    font-size: 0.78rem;
    line-height: 1.4;
  }
  .definition-popover::after { content: ''; position: absolute; left: 50%; top: -0.35rem; width: 0.65rem; height: 0.65rem; transform: translateX(-50%) rotate(45deg); border-left: 1px solid var(--accent-border); border-top: 1px solid var(--accent-border); background: var(--surface-1); }
  .definition-popover strong { color: var(--text-1); font-size: 0.84rem; }
  .definition-popover a { position: relative; z-index: 1; color: var(--accent); font-weight: 700; text-decoration: none; }
</style>

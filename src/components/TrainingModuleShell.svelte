<script lang="ts">
  import type { Snippet } from 'svelte';
  import ActionButton from './ActionButton.svelte';
  import TaskMetadata from './TaskMetadata.svelte';
  import GlossaryText from './GlossaryText.svelte';

  let {
    title,
    task,
    resetLabel = 'Reset',
    onReset,
    exposure = 'new',
    source = 'curated',
    reason,
    verification,
    children,
  } = $props<{
    title: string;
    task: string;
    resetLabel?: string;
    onReset?: () => void;
    exposure?: 'new' | `review-${number}`;
    source?: 'curated' | 'lichess' | 'personal-game' | 'repertoire' | 'generated' | 'tablebase';
    reason?: string;
    verification?: 'curated' | 'stockfish' | 'tablebase';
    children: Snippet;
  }>();
</script>

<main class="module-container" data-workflow="task-commit-feedback-continue">
  <div class="task-line">
    <span class="task-label">Task</span>
    <span><GlossaryText text={task} /></span>
  </div>
  <TaskMetadata {exposure} {source} {reason} {verification} />
  <div class="module-header">
    <h2><GlossaryText text={title} /></h2>
    {#if onReset}
      <ActionButton variant="quiet" onclick={onReset}>{resetLabel}</ActionButton>
    {/if}
  </div>
  <div class="module-content">
    {@render children()}
  </div>
</main>

<style>
  .module-container {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    max-width: 600px;
    margin: 0 auto;
  }
  .task-line { display: flex; align-items: baseline; gap: 0.6rem; padding-bottom: 0.65rem; border-bottom: 1px solid var(--accent-border); color: var(--text-4); font-size: 0.84rem; line-height: 1.45; }
  .task-label { flex: 0 0 auto; color: var(--text-1); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; }
  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .module-content {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  h2 {
    margin: 0;
    color: var(--text-1);
    font-size: 1.4rem;
  }
</style>

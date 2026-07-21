<script lang="ts">
  import type { Snippet } from 'svelte';
  import ActionButton from './ActionButton.svelte';
  import TaskMetadata from './TaskMetadata.svelte';
  import GlossaryText from './GlossaryText.svelte';
  import HighlightedInstruction from './HighlightedInstruction.svelte';

  let {
    title,
    task,
    taskKeywords = [],
    resetLabel = 'Reset',
    onReset,
    onSkip,
    exposure = 'new',
    source = 'curated',
    reason,
    verification,
    children,
  } = $props<{
    title: string;
    task: string;
    taskKeywords?: string[];
    resetLabel?: string;
    onReset?: () => void;
    onSkip?: () => void;
    exposure?: 'new' | `review-${number}`;
    source?: 'curated' | 'lichess' | 'personal-game' | 'repertoire' | 'generated' | 'tablebase';
    reason?: string;
    verification?: 'curated' | 'stockfish' | 'tablebase';
    children: Snippet;
  }>();
  let skipRequested = $state(false);

  function requestSkip() {
    if (skipRequested) {
      skipRequested = false;
      onSkip?.();
      return;
    }
    skipRequested = true;
  }
</script>

<main class="module-container" data-workflow="task-commit-feedback-continue">
  <div class="task-line">
    <span class="task-label">Task</span>
    <HighlightedInstruction text={task} keywords={taskKeywords} />
  </div>
  <TaskMetadata {exposure} {source} {reason} {verification} />
  <div class="module-header">
    <h2><GlossaryText text={title} /></h2>
    <div class="header-actions">
      {#if onSkip}
        {#if skipRequested}
          <span class="skip-confirm">Skip?</span>
          <button class="skip-cancel" type="button" onclick={() => skipRequested = false}>Keep</button>
          <button class="skip-yes" type="button" onclick={requestSkip}>Skip</button>
        {:else}
          <button class="skip-button" type="button" onclick={requestSkip}>Skip</button>
        {/if}
      {/if}
      {#if onReset}<ActionButton variant="quiet" onclick={onReset}>{resetLabel}</ActionButton>{/if}
    </div>
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
  .task-line { display: flex; align-items: baseline; gap: 0.6rem; padding-bottom: 0.55rem; border-bottom: 1px solid var(--border); color: var(--text-4); font-size: 0.84rem; line-height: 1.4; }
  .task-label { flex: 0 0 auto; color: var(--text-4); font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.45rem; }
  .skip-button, .skip-cancel, .skip-yes { padding: 0.45rem 0.65rem; border: 1px solid var(--border-sub); border-radius: 6px; background: transparent; color: var(--text-4); font: inherit; font-size: 0.76rem; cursor: pointer; }
  .skip-button:hover, .skip-cancel:hover { color: var(--text-2); border-color: var(--accent-border); }
  .skip-yes { color: var(--accent); border-color: var(--accent-border); }
  .skip-confirm { color: var(--text-4); font-size: 0.76rem; }
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

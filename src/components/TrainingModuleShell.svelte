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
  <div class="module-header">
    <div class="task-line">
      <h2><GlossaryText text={title} /></h2>
      <HighlightedInstruction text={task} keywords={taskKeywords} />
    </div>
    <div class="header-actions">
      {#if onSkip}
        {#if skipRequested}
          <span class="skip-confirm">Skip?</span>
          <button class="skip-cancel" type="button" onclick={() => skipRequested = false}>Keep</button>
          <button class="skip-yes" type="button" onclick={requestSkip}>Skip</button>
        {:else}
          <button class="skip-button" type="button" title="Skip to next exercise (does not count as failure)" onclick={requestSkip}>
            <svg class="action-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
            <span>Skip</span>
          </button>
        {/if}
      {/if}
      {#if onReset}
        <ActionButton variant="quiet" onclick={onReset}>
          <svg class="action-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span>{resetLabel}</span>
        </ActionButton>
      {/if}
    </div>
  </div>
  <div class="module-content">
    {@render children()}
  </div>
  <TaskMetadata {exposure} {source} {reason} {verification} />
</main>

<style>
  .module-container {
    --training-board-size: min(480px, calc(100vh - 210px));
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    width: min(100%, var(--content-width));
    margin: 0 auto;
  }
  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid var(--border);
  }
  .task-line {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    color: var(--text-1);
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.3;
    min-width: 0;
    flex: 1 1 auto;
  }

  .header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.45rem;
    flex: 0 0 auto;
  }
  .skip-button, .skip-cancel, .skip-yes {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.55rem;
    border: 1px solid var(--border-sub);
    border-radius: 6px;
    background: transparent;
    color: var(--text-4);
    font: inherit;
    font-size: 0.76rem;
    cursor: pointer;
  }
  .skip-button:hover, .skip-cancel:hover { color: var(--text-2); border-color: var(--accent-border); }
  .skip-yes { color: var(--accent); border-color: var(--accent-border); }
  .skip-confirm { color: var(--text-4); font-size: 0.76rem; }
  .action-icon { flex-shrink: 0; opacity: 0.85; }
  .module-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  h2 {
    margin: 0;
    color: var(--text-4);
    font-size: 0.85rem;
    font-weight: 600;
    flex: 0 0 auto;
    padding-right: 0.4rem;
    border-right: 1px solid var(--border);
  }
</style>

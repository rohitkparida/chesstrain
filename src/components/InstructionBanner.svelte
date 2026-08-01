<script lang="ts">
  import HighlightedInstruction from './HighlightedInstruction.svelte';
  let { title = 'Task', hint, keywords = [] } = $props<{
    title?: string;
    hint?: string;
    keywords?: string[];
  }>();
</script>

<section class="instruction-banner" aria-label="Task instructions">
  <div class="copy">
    <HighlightedInstruction text={title} {keywords} />
    {#if hint}<span class="hint">{hint}</span>{/if}
  </div>
</section>

<style>
  .instruction-banner {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    padding: 0 0 0.55rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.84rem;
  }
  .copy { display: flex; align-items: baseline; gap: 0.45rem; flex-wrap: wrap; }
  .hint {
    color: var(--text-4);
    font-size: 0.78rem;
    line-height: 1.4;
  }
</style>

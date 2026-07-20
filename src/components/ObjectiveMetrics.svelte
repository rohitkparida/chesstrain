<script lang="ts">
  import type { ObjectiveMetric } from '$lib/learning/objectiveScoring';
  import GlossaryText from './GlossaryText.svelte';

  let {
    title = 'Result',
    items,
    note = '',
  } = $props<{
    title?: string;
    items: ObjectiveMetric[];
    note?: string;
  }>();
</script>

<section class="metrics" aria-label={title === 'Tactics evidence' ? 'Tactics feedback' : title} data-stage="feedback">
  <h3><GlossaryText text={title} /></h3>
  {#each items as item}
    <div class="metric-row">
      <div>
        <span class="metric-label"><GlossaryText text={item.label} /></span>
        {#if item.note}<span class="metric-note"><GlossaryText text={item.note} /></span>{/if}
      </div>
      <strong>{item.value}</strong>
    </div>
  {/each}
  {#if note}<p><GlossaryText text={note} /></p>{/if}
</section>

<style>
  .metrics {
    margin-top: 0.1rem;
    padding-top: 0.65rem;
    border-top: 1px solid var(--border);
  }
  h3 {
    margin: 0 0 0.4rem;
    color: var(--text-1);
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .metric-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.45rem 0;
    border-bottom: 1px solid var(--border);
  }
  .metric-label, .metric-note { display: block; }
  .metric-label { color: var(--text-3); font-size: 0.88rem; }
  .metric-note { margin-top: 0.1rem; color: var(--text-5); font-size: 0.72rem; }
  strong { color: var(--accent); font-size: 0.9rem; white-space: nowrap; }
  p { margin: 0.55rem 0 0; color: var(--text-5); font-size: 0.74rem; line-height: 1.45; }
</style>

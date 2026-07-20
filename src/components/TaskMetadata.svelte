<script lang="ts">
  import type { ExerciseSource } from '$lib/learning/training';
  import GlossaryText from './GlossaryText.svelte';

  let { exposure = 'new', source, reason, verification } = $props<{
    exposure?: 'new' | `review-${number}`;
    source?: ExerciseSource;
    reason?: string;
    verification?: 'curated' | 'stockfish' | 'tablebase';
  }>();

  const sourceLabels: Record<ExerciseSource, string> = {
    curated: 'Selected exercise', lichess: 'Lichess puzzle', 'personal-game': 'Your game',
    repertoire: 'Your opening', generated: 'New position', tablebase: 'Endgame database'
  };
</script>

<p class="task-meta" aria-label="Exercise information">
  <span><GlossaryText text={exposure === 'new' ? 'New' : exposure} /></span>
  {#if source}<span><GlossaryText text={sourceLabels[String(source) as ExerciseSource]} /></span>{/if}
  {#if reason}<span><GlossaryText text={reason} /></span>{/if}
  {#if verification && verification !== 'curated'}<span><GlossaryText text={verification === 'stockfish' ? 'Checked by Stockfish' : 'Checked by an endgame database'} /></span>{/if}
</p>

<style>
  .task-meta { display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 0; color: var(--text-4); font-size: 0.72rem; }
  .task-meta span + span::before { content: '·'; margin-right: 0.45rem; color: var(--border); }
</style>

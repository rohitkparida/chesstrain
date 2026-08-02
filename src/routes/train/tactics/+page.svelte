<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { TacticsPageData } from './+page';
  import DrillRunner from '../../../components/drills/DrillRunner.svelte';
  import { DRILLS } from '$lib/drills/registry';
  import { sessionStore, loadPuzzles, recordPuzzleAttempt, selectNextPuzzle } from '../../../stores/session';
  import type { AttemptRecordEvent } from '$lib/drills/runner';
  import { mockPuzzles, type PuzzleData } from '$lib/chess/mockPuzzles';
  import { puzzleTag } from '$lib/learning/tacticsLifecycle';

  let { data }: { data: TacticsPageData } = $props();
  const puzzles = $derived(data.puzzles?.length > 0 ? data.puzzles : mockPuzzles);

  let activePuzzle = $state<PuzzleData>(mockPuzzles[0]);
  let userElo = $state(1200);
  let totalSolved = $state(0);
  let reloadNonce = $state(0);
  let attempted = $state(false);

  const unsubscribe = sessionStore.subscribe((s) => {
    totalSolved = s.totalSolved;
    if (s.activePuzzle) activePuzzle = s.activePuzzle as PuzzleData;
    userElo = s.ratings[`tactics:${puzzleTag(activePuzzle)}`] || s.ratings['tactics'] || 1200;
  });

  onDestroy(() => unsubscribe());

  onMount(() => {
    activePuzzle = puzzles[0];
    loadPuzzles(puzzles);
  });

  function handleRecordAttempt(event: AttemptRecordEvent) {
    attempted = true;
    recordPuzzleAttempt(activePuzzle, 'tactics', event.correct, event.timeMs);
  }

  function handleNextDrill() {
    attempted = false;
    const selected = selectNextPuzzle('tactics', puzzleTag(activePuzzle)) as PuzzleData | null;
    if (selected) {
      activePuzzle = selected;
    }
    reloadNonce += 1;
  }

  const context = $derived({
    userId: 'user',
    difficulty: userElo,
    random: Math.random,
    getPuzzle: () => activePuzzle
  });
</script>

<div class="tactics-layout">
  <div class="board-col">
    <DrillRunner
      entry={DRILLS['tactics.random']}
      context={context}
      reloadNonce={reloadNonce}
      onNextDrill={handleNextDrill}
      onRecordAttempt={handleRecordAttempt}
    />
  </div>

  {#if attempted}
    <div class="info-col">
      <div class="info-card">
        <div class="info-label">YOUR LEVEL</div>
        <div class="info-big">{userElo}</div>
        <div class="info-sub">Tactics ELO</div>
      </div>
      <div class="info-card">
        <div class="info-label">SOLVED</div>
        <div class="info-big">{totalSolved}</div>
        <div class="info-sub">puzzles</div>
      </div>
      {#if activePuzzle?.description}
        <div class="info-card">
          <div class="info-label">HINT</div>
          <p class="hint-text">{activePuzzle.description}</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .tactics-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    align-items: start;
    width: min(100%, var(--content-width));
    margin: 0 auto;
  }

  .board-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .info-col {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .info-card {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
  }

  .info-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text-6);
    margin-bottom: 0.4rem;
  }

  .info-big {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-1);
    line-height: 1;
  }

  .info-sub {
    font-size: 0.75rem;
    color: var(--text-4);
    margin-top: 0.2rem;
  }

  .hint-text {
    margin: 0;
    color: var(--text-4);
    font-size: 0.85rem;
    line-height: 1.5;
  }

  @media (max-width: 520px) {
    .info-col {
      grid-template-columns: 1fr;
    }
  }
</style>

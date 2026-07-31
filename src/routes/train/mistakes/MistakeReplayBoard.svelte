<script lang="ts">
  import ChessBoard from '../../../components/ChessBoard.svelte';
  import ActionButton from '../../../components/ActionButton.svelte';
  import type { BoardAnnotation } from '$lib/chess/annotations';

  type Arrow = { from: string; to: string; tone: 'played' | 'engine' };
  type ReplayStep = { fen: string; move: string; label: string };

  let {
    fen,
    arrows = [],
    continuation = [],
    step = 0,
    onNext = () => {}
  } = $props<{
    fen: string;
    arrows?: Arrow[];
    continuation?: ReplayStep[];
    step?: number;
    onNext?: () => void;
  }>();

  let flipped = $state(false);
  let activeStep = $derived(step > 0 ? continuation[step - 1] : null);
  let displayFen = $derived(activeStep ? activeStep.fen : fen);

  let boardAnnotations = $derived<BoardAnnotation[]>(
    (step === 0 ? arrows : []).map((a: Arrow) => ({
      from: a.from,
      to: a.to,
      color: a.tone === 'played' ? '#d95c5c' : '#35b878',
      kind: 'arrow'
    }))
  );
</script>

<div class="replay">
  <div class="controls">
    <span class="legend"><i class="played"></i> Played move</span>
    <span class="legend"><i class="engine"></i> Engine move</span>
    <ActionButton variant="quiet" onclick={() => (flipped = !flipped)}>
      ↕ Flip
    </ActionButton>
  </div>

  <div class="board-container">
    <ChessBoard
      fen={displayFen}
      playable={false}
      showControls={false}
      orientation={flipped ? 'black' : 'white'}
      annotations={boardAnnotations}
    />
  </div>

  {#if activeStep}
    <p class="step-label">Engine continuation: <strong>{activeStep.label}</strong></p>
    <ActionButton variant="primary" onclick={onNext}>
      {step - 1 < continuation.length - 1 ? 'Show next move' : 'Finish replay'}
    </ActionButton>
  {:else if continuation.length}
    <p class="step-label">The engine line is ready to replay.</p>
    <ActionButton variant="primary" onclick={onNext}>
      Show engine continuation
    </ActionButton>
  {/if}
</div>

<style>
  .replay {
    display: grid;
    gap: 0.65rem;
    justify-items: center;
    width: 100%;
  }

  .controls {
    width: min(var(--training-board-size, 480px), 100%);
    display: flex;
    gap: 0.65rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .legend {
    color: var(--text-3);
    font-size: 0.8rem;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .legend i {
    width: 10px;
    height: 4px;
    border-radius: 2px;
    display: inline-block;
  }

  .legend .played {
    background: #d95c5c;
  }

  .legend .engine {
    background: #35b878;
  }

  .board-container {
    width: min(var(--training-board-size, 480px), 100%);
  }

  .step-label {
    color: var(--text-2);
    margin: 0;
  }
</style>

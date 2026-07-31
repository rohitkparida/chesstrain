<script lang="ts">
  import type { SquareTapData } from '$lib/drills/types';
  import BoardGripBoard from '../../BoardGripBoard.svelte';
  import ActionButton from '../../ActionButton.svelte';
  import { ALL_SQUARES, piecesFromFen } from '$lib/learning/nameTheSquare';

  let {
    data,
    reveal,
    disabled = false,
    onSubmit
  } = $props<{
    data: SquareTapData;
    reveal?: unknown;
    disabled?: boolean;
    onSubmit: (response: string) => void;
  }>();

  const pieces = $derived(data.fen ? piecesFromFen(data.fen) : {});
  const correctSquares = $derived(
    disabled && typeof reveal === 'string' && reveal !== 'none' ? [reveal] : []
  );

  function handleSquareClick(square: string) {
    if (disabled) return;
    onSubmit(square);
  }

  function handleNoneClick() {
    if (disabled) return;
    onSubmit('none');
  }
</script>

<div class="square-tap-interaction">
  <BoardGripBoard
    squares={ALL_SQUARES}
    pieces={pieces}
    selected={new Set()}
    markedSquare={data.markedSquare}
    correctSquares={correctSquares}
    orientation={data.orientation ?? 'white'}
    rotation={data.rotation ?? 0}
    onChoose={handleSquareClick}
  />
  {#if data.allowNone}
    <div class="actions">
      <ActionButton variant="quiet" disabled={disabled} onclick={handleNoneClick}>
        No squares
      </ActionButton>
    </div>
  {/if}
</div>

<style>
  .square-tap-interaction {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .actions {
    display: flex;
    justify-content: center;
  }
</style>

<script lang="ts">
  import type { SquareSelectData } from '$lib/drills/types';
  import BoardGripBoard from '../../BoardGripBoard.svelte';
  import ActionButton from '../../ActionButton.svelte';
  import { ALL_SQUARES, piecesFromFen } from '$lib/learning/nameTheSquare';

  let {
    data,
    reveal,
    disabled = false,
    onSubmit
  } = $props<{
    data: SquareSelectData;
    reveal?: unknown;
    disabled?: boolean;
    onSubmit: (response: string[]) => void;
  }>();

  let selected = $state<Set<string>>(new Set());

  $effect(() => {
    data;
    selected = new Set();
  });

  const pieces = $derived(data.fen ? piecesFromFen(data.fen) : {});
  const correctSquares = $derived(
    disabled && Array.isArray(reveal) ? (reveal as string[]) : []
  );

  function toggleSquare(square: string) {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(square)) {
      next.delete(square);
    } else {
      next.add(square);
    }
    selected = next;
  }

  function handleSubmit() {
    if (disabled) return;
    onSubmit(Array.from(selected));
  }

  function handleNoneClick() {
    if (disabled) return;
    onSubmit([]);
  }
</script>

<div class="square-select-interaction">
  <BoardGripBoard
    squares={ALL_SQUARES}
    pieces={pieces}
    selected={selected}
    markedSquare={data.markedSquare}
    correctSquares={correctSquares}
    orientation={data.orientation ?? 'white'}
    rotation={data.rotation ?? 0}
    onChoose={toggleSquare}
  />

  <div class="actions">
    {#if data.allowNone}
      <ActionButton variant="quiet" disabled={disabled} onclick={handleNoneClick}>
        No squares
      </ActionButton>
    {/if}

    <ActionButton
      variant="primary"
      disabled={disabled || selected.size === 0}
      onclick={handleSubmit}
    >
      Submit selection ({selected.size})
    </ActionButton>
  </div>
</div>

<style>
  .square-select-interaction {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
  }
</style>

<script lang="ts">
  import type { MoveData, MoveResponse } from '$lib/drills/types';
  import ChessBoard from '../../ChessBoard.svelte';
  import type { BoardAnnotation } from '$lib/chess/annotations';

  let {
    data,
    reveal,
    disabled = false,
    onSubmit
  } = $props<{
    data: MoveData;
    reveal?: unknown;
    disabled?: boolean;
    onSubmit: (response: MoveResponse) => void;
  }>();

  const annotations = $derived<BoardAnnotation[]>(
    disabled && Array.isArray(reveal) ? (reveal as BoardAnnotation[]) : []
  );

  function handleMove(from: string, to: string, _afterFen: string) {
    if (disabled) return false;
    const uci = `${from}${to}`;
    onSubmit({ from, to, uci });
    return true;
  }
</script>

<div class="move-interaction">
  <ChessBoard
    fen={data.fen}
    orientation={data.orientation ?? 'side-to-move'}
    playable={!disabled}
    annotations={annotations}
    onMove={handleMove}
  />
</div>

<style>
  .move-interaction {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
</style>

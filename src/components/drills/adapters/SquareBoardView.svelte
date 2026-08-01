<script lang="ts">
  import type { SquareBoardData } from '$lib/drills/types';
  import BoardGripBoard from '../../BoardGripBoard.svelte';
  import { ALL_SQUARES, piecesFromFen } from '$lib/learning/nameTheSquare';

  let {
    data,
    reveal,
    disabled = false,
    selected = new Set<string>(),
    correctSquares: customCorrectSquares,
    onChoose = () => {}
  } = $props<{
    data: SquareBoardData;
    reveal?: unknown;
    disabled?: boolean;
    selected?: Set<string>;
    correctSquares?: string[];
    onChoose?: (square: string) => void;
  }>();

  const pieces = $derived(data.fen ? piecesFromFen(data.fen) : {});
  const orientation = $derived(data.orientation ?? 'white');
  const rotation = $derived(data.rotation ?? 0);
  const derivedCorrectSquares = $derived(
    disabled && reveal !== undefined && reveal !== null
      ? Array.isArray(reveal)
        ? (reveal as string[])
        : typeof reveal === 'string' && reveal !== 'none'
          ? [reveal]
          : []
      : []
  );
  const correctSquares = $derived(customCorrectSquares ?? derivedCorrectSquares);
</script>

<BoardGripBoard
  squares={ALL_SQUARES}
  pieces={pieces}
  selected={selected}
  markedSquare={data.markedSquare}
  correctSquares={correctSquares}
  orientation={orientation}
  rotation={rotation}
  onChoose={onChoose}
/>

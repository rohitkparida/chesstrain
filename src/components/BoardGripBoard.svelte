<script lang="ts">
  import { isDarkSquare, orientSquare, pieceGlyph } from '$lib/chess/board';
  import type { PositionPiece } from '$lib/learning/nameTheSquare';

  let {
    squares,
    pieces,
    selected,
    markedSquare,
    correctSquares = [],
    onChoose,
    orientation = 'white',
    turn = 'w'
  } = $props<{
    squares: string[];
    pieces: Record<string, PositionPiece>;
    selected: Set<string>;
    markedSquare?: string;
    correctSquares?: string[];
    onChoose: (square: string) => void;
    orientation?: 'white' | 'black' | 'side-to-move';
    turn?: 'w' | 'b';
  }>();

  const viewFlipped = $derived(orientation === 'black' || (orientation === 'side-to-move' && turn === 'b'));

</script>

<div class="square-board" aria-label="Coordinate training board">
  {#each squares as square}
    {@const visualSquare = orientSquare(square, viewFlipped)}
    {@const piece = pieces[square]}
    <button
      class:dark={isDarkSquare(visualSquare)}
      class:light={!isDarkSquare(visualSquare)}
      class:selected={selected.has(square)}
      class:marked={markedSquare === square}
      class:correct={correctSquares.includes(square)}
      aria-label={`Square ${visualSquare}`}
      aria-describedby={`grip-square-description-${square}`}
      aria-pressed={selected.has(square)}
      onclick={() => onChoose(square)}
    >
      {#if piece}
        <span class="piece" class:white-piece={piece.color === 'w'}>
          {pieceGlyph(`${piece.color}${piece.type.toUpperCase()}`)}
        </span>
      {/if}
      <span class="sr-only" id={`grip-square-description-${square}`}>{`${isDarkSquare(visualSquare) ? 'Dark' : 'Light'} square${piece ? `, ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''}${selected.has(square) ? ', selected' : ''}`}</span>
    </button>
  {/each}
</div>

<style>
  .square-board { width: min(480px, 100%); aspect-ratio: 1; margin: 0 auto; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); grid-template-rows: repeat(8, minmax(0, 1fr)); border: 3px solid #0a0f1a; border-radius: 6px; overflow: hidden; }
  .square-board button { min-width: 0; min-height: 0; padding: 0; position: relative; display: grid; place-items: center; border: 0; cursor: pointer; }
  .square-board button:hover, .square-board button:focus-visible { filter: brightness(1.18); z-index: 1; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .light { background: #f0d9b5; }
  .dark { background: #b58863; }
  .selected::after, .marked::before { content: ''; position: absolute; inset: 6px; border-radius: 6px; pointer-events: none; z-index: 1; }
  .selected::after { border: 3px solid var(--accent); box-shadow: inset 0 0 0 999px rgba(0,183,255,0.16); }
  .marked::before { border: 3px dashed var(--warning); }
  .correct::after { content: ''; position: absolute; inset: 5px; border: 3px solid var(--success); border-radius: 6px; box-shadow: inset 0 0 0 999px rgba(72, 206, 142, 0.18); pointer-events: none; z-index: 1; }
  .piece { color: #111; font-family: 'Segoe UI Symbol', 'Noto Chess', serif; font-size: clamp(1.7rem, 7vw, 2.8rem); line-height: 1; pointer-events: none; z-index: 2; text-shadow: 0 0 2px rgba(255,255,255,0.45); }
  .white-piece { color: #fff; text-shadow: 0 0 3px #000, 1px 1px 0 #222, -1px 1px 0 #222, 1px -1px 0 #222, -1px -1px 0 #222; }
</style>

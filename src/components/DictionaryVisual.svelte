<script lang="ts">
  import type { DictionaryVisual } from '$lib/chess/dictionary';
  import { pieceGlyph } from '$lib/chess/board';

  let { type, caption, termId } = $props<{ type: DictionaryVisual; caption: string; termId?: string }>();
  const squares = Array.from({ length: 64 }, (_, index) => ({ index, dark: (index + Math.floor(index / 8)) % 2 === 1 }));
  const boardPieces: Record<string, Record<number, string>> = {
    'square-control': { 45: 'wN' }, 'loose-piece': { 35: 'wB', 11: 'bR' },
    'open-file': { 59: 'wR' }, 'weak-square': { 28: 'bN', 35: 'wP', 37: 'wP' },
    'king-safety': { 6: 'bR', 54: 'wK', 53: 'wP', 55: 'wP' },
    pin: { 4: 'bR', 12: 'wP', 20: 'wK' }, stalemate: { 0: 'bK', 17: 'wQ', 18: 'wK' },
    checkmate: { 7: 'bK', 14: 'wQ', 21: 'wK' }, initiative: { 52: 'wQ', 12: 'bK', 20: 'bP' },
    'candidate-move': { 45: 'wN', 28: 'bP', 35: 'bP' }, refutation: { 35: 'wQ', 11: 'bR', 28: 'bK' },
    repertoire: { 52: 'wP', 28: 'bP', 36: 'wN' }, calculation: { 45: 'wN', 28: 'bP', 35: 'bP' },
    development: { 57: 'wN', 61: 'wB', 62: 'wK' }, 'endgame-technique': { 28: 'wK', 20: 'bK', 36: 'wP' },
    evaluation: { 52: 'wQ', 11: 'bR', 54: 'wK', 6: 'bK' }, space: { 28: 'wP', 29: 'wP', 30: 'wP', 36: 'bP' }
  };
  const boardMarks: Record<string, number[]> = {
    'square-control': [28, 30, 35, 39, 51, 55, 60, 62], 'loose-piece': [35],
    'open-file': [3, 11, 19, 27, 35, 43, 51, 59], 'weak-square': [28],
    'king-safety': [6, 14, 22, 30, 38, 46, 54, 62], pin: [4, 12, 20],
    stalemate: [1, 2, 8, 9], checkmate: [6, 15, 22, 23], initiative: [12, 20], 'candidate-move': [28, 35],
    refutation: [28], repertoire: [28, 36], calculation: [28, 35], development: [57, 61],
    'endgame-technique': [20, 28, 36], evaluation: [52, 11], space: [28, 29, 30]
  };
  const boardArrows: Record<string, Array<{ from: number; to: number; color: string }>> = {
    'square-control': [28, 30, 35, 39, 51, 55, 60, 62].map((to) => ({ from: 45, to, color: 'var(--accent)' })),
    'loose-piece': [{ from: 11, to: 35, color: 'var(--error)' }],
    'open-file': [{ from: 59, to: 3, color: 'var(--accent)' }],
    'weak-square': [{ from: 35, to: 28, color: 'var(--warning)' }, { from: 37, to: 28, color: 'var(--warning)' }],
    'king-safety': [{ from: 6, to: 62, color: 'var(--error)' }],
    pin: [{ from: 4, to: 20, color: 'var(--error)' }],
    checkmate: [{ from: 14, to: 7, color: 'var(--error)' }], initiative: [{ from: 52, to: 20, color: 'var(--accent)' }],
    'candidate-move': [{ from: 45, to: 28, color: 'var(--accent)' }, { from: 45, to: 35, color: 'var(--warning)' }],
    refutation: [{ from: 35, to: 11, color: 'var(--error)' }], repertoire: [{ from: 52, to: 36, color: 'var(--accent)' }],
    calculation: [{ from: 45, to: 28, color: 'var(--accent)' }], development: [{ from: 57, to: 42, color: 'var(--accent)' }, { from: 61, to: 44, color: 'var(--accent)' }],
    'endgame-technique': [{ from: 28, to: 20, color: 'var(--warning)' }, { from: 36, to: 28, color: 'var(--accent)' }],
    evaluation: [{ from: 52, to: 11, color: 'var(--warning)' }], space: [{ from: 28, to: 20, color: 'var(--accent)' }, { from: 29, to: 21, color: 'var(--accent)' }, { from: 30, to: 22, color: 'var(--accent)' }]
  };

  function pieceAt(index: number): string { return boardPieces[termId ?? '']?.[index] ?? ''; }
  function isMarked(index: number): boolean { return boardMarks[termId ?? '']?.includes(index) ?? (index === 27 || index === 36); }
  function point(index: number): number { return index % 8 + 0.5; }
  function row(index: number): number { return Math.floor(index / 8) + 0.5; }
</script>

<div class="visual term-{termId ?? 'generic'}" class:pin-visual={type === 'pin'} class:arrow-visual={type === 'arrow'} class:flow-visual={type === 'flow'} class:balance-visual={type === 'balance'} aria-label={caption} role="img">
  {#if type === 'flow'}
    <div class="concept-layout"><div class="mini-board compact-board"><svg class="board-arrows" viewBox="0 0 8 8" aria-hidden="true"><defs><marker id={`dictionary-arrow-${termId}`} markerWidth="0.34" markerHeight="0.34" refX="0.28" refY="0.17" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L0.34,0.17 L0,0.34 z" fill={boardArrows[termId ?? '']?.[0]?.color ?? 'var(--accent)'} /></marker></defs>{#each boardArrows[termId ?? ''] ?? [] as arrow}<line x1={point(arrow.from)} y1={row(arrow.from)} x2={point(arrow.to)} y2={row(arrow.to)} stroke={arrow.color} marker-end={`url(#dictionary-arrow-${termId})`} />{/each}</svg>{#each squares as square}<span class:dark={square.dark} class:highlight={isMarked(square.index)}>{#if pieceAt(square.index)}<span class="piece" class:wp={pieceAt(square.index).startsWith('w')} class:bp={pieceAt(square.index).startsWith('b')}>{pieceGlyph(pieceAt(square.index))}</span>{/if}</span>{/each}</div><div class="flow">
      {#if termId === 'initiative'}<span>Threat</span><b>→</b><span>Forced reply</span><b>→</b><span>New threat</span>
      {:else if termId === 'candidate-move'}<span>Candidate A</span><b>↔</b><span>Candidate B</span><b>→</b><span>Choose</span>
      {:else if termId === 'refutation'}<span>Your idea</span><b>→</b><span>Best reply</span><b>→</b><span>Does it work?</span>
      {:else if termId === 'repertoire'}<span>Opening</span><b>→</b><span>Branch A</span><b>↘</b><span>Branch B</span>
      {:else if termId === 'calculation'}<span>Your move</span><b>→</b><span>Reply</span><b>→</b><span>Result</span>
      {:else if termId === 'development'}<span>Start</span><b>→</b><span>Develop</span><b>→</b><span>Castle</span>
      {:else}<span>Improve king</span><b>→</b><span>Restrict</span><b>→</b><span>Promote</span>{/if}
    </div></div>
  {:else if type === 'balance'}
    {#if termId === 'space'}
      <div class="mini-board compact-board">{#each squares as square}<span class:dark={square.dark} class:highlight={isMarked(square.index)}>{#if pieceAt(square.index)}<span class="piece" class:wp={pieceAt(square.index).startsWith('w')} class:bp={pieceAt(square.index).startsWith('b')}>{pieceGlyph(pieceAt(square.index))}</span>{/if}</span>{/each}</div>
      <div class="space-scene"><strong>Your pawns control more squares</strong><div class="space-board"><span class="space-pawn wp">{pieceGlyph('wP')}</span><span class="space-pawn wp">{pieceGlyph('wP')}</span><span class="space-pawn wp">{pieceGlyph('wP')}</span><br />· · · · ·</div><small>More room to move</small></div>
    {:else}
      <div class="mini-board compact-board">{#each squares as square}<span class:dark={square.dark} class:highlight={isMarked(square.index)}>{#if pieceAt(square.index)}<span class="piece" class:wp={pieceAt(square.index).startsWith('w')} class:bp={pieceAt(square.index).startsWith('b')}>{pieceGlyph(pieceAt(square.index))}</span>{/if}</span>{/each}</div>
      <div class="balance"><span>Black</span><div class="bar"><i></i><b></b></div><span>White</span></div><small>Material + activity + king safety</small>
    {/if}
  {:else}
    <div class="mini-board">
      {#if boardArrows[termId ?? '']}
        <svg class="board-arrows" viewBox="0 0 8 8" aria-hidden="true">
          <defs><marker id={`dictionary-arrow-${termId}`} markerWidth="0.34" markerHeight="0.34" refX="0.28" refY="0.17" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L0.34,0.17 L0,0.34 z" fill={boardArrows[termId ?? '']?.[0]?.color ?? 'var(--accent)'} /></marker></defs>
          {#each boardArrows[termId ?? ''] as arrow}
            <line x1={point(arrow.from)} y1={row(arrow.from)} x2={point(arrow.to)} y2={row(arrow.to)} stroke={arrow.color} marker-end={`url(#dictionary-arrow-${termId})`} />
          {/each}
        </svg>
      {/if}
      {#each squares as square}<span class:dark={square.dark} class:highlight={isMarked(square.index)} class:arrow={type === 'arrow' && square.index === 28} class:pin={type === 'pin' && [4, 12, 20].includes(square.index)}>{#if pieceAt(square.index)}<span class="piece" class:wp={pieceAt(square.index).startsWith('w')} class:bp={pieceAt(square.index).startsWith('b')}>{pieceGlyph(pieceAt(square.index))}</span>{/if}</span>{/each}
      {#if type === 'arrow'}<strong class="move-arrow">{termId === 'line' ? '1. Nf3 → 1... d5 → 2. c4' : termId === 'tempo' ? 'Develop + attack' : 'e4 → d5'}</strong>{/if}
    </div>
  {/if}
  <small>{caption}</small>
</div>

<style>
  .visual { display: grid; gap: 0.45rem; justify-items: center; min-height: 112px; padding: 0.75rem; border-bottom: 1px solid var(--border); color: var(--text-4); outline: none; }
  .mini-board { position: relative; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); grid-template-rows: repeat(8, minmax(0, 1fr)); width: min(190px, 52vw); height: min(190px, 52vw); overflow: hidden; border: 2px solid var(--border-sub); border-radius: 4px; }
  .mini-board > span { display: grid; place-items: center; background: #f0d9b5; color: #172033; font-size: 0.78rem; font-weight: 800; }
  .mini-board > span.dark { background: #b58863; }
  .mini-board > span.highlight { box-shadow: inset 0 0 0 3px #0b7895, inset 0 0 0 999px rgba(142, 226, 211, 0.78); background: #8ee2d3; }
  .mini-board > span.arrow { box-shadow: inset 0 0 0 3px var(--warning); }
  .mini-board > span.pin { box-shadow: inset 0 0 0 3px #c83c55, inset 0 0 0 999px rgba(255, 125, 135, 0.72); background: #ff9a9f; }
  .board-arrows { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
  .board-arrows line { stroke-width: 0.08; stroke-linecap: round; opacity: 0.58; }
  .piece { position: relative; z-index: 1; font-family: 'Segoe UI Symbol', 'Apple Symbols', 'Noto Chess', 'FreeSerif', serif; font-size: 1.35rem; line-height: 1; user-select: none; pointer-events: none; }
  .piece.wp { color: #fff; text-shadow: 0 0 3px #000, 1px 1px 0 #222, -1px 1px 0 #222, 1px -1px 0 #222, -1px -1px 0 #222; }
  .piece.bp { color: #111; text-shadow: 0 0 2px #fff, 0 0 4px #fff, 1px 1px 0 rgba(255,255,255,0.8), -1px 1px 0 rgba(255,255,255,0.8), 1px -1px 0 rgba(255,255,255,0.8), -1px -1px 0 rgba(255,255,255,0.8); }
  .concept-layout { display: flex; align-items: center; justify-content: center; gap: 0.7rem; width: 100%; }
  .compact-board { width: min(132px, 34vw); height: min(132px, 34vw); flex: 0 0 auto; }
  .compact-board .piece { font-size: 1rem; }
  .move-arrow { position: absolute; inset: 0; display: grid; place-items: center; padding: 0.35rem; color: var(--warning); font-size: 0.7rem; text-align: center; text-shadow: 0 1px 2px var(--bg); }
  .flow { display: flex; align-items: center; gap: 0.45rem; min-height: 70px; color: var(--text-1); font-size: 0.78rem; }
  .flow span { padding: 0.5rem; border: 1px solid var(--accent-border); background: var(--accent-dim); }
  .flow b { color: var(--accent); }
  .balance { display: flex; align-items: center; gap: 0.5rem; min-height: 70px; color: var(--text-3); font-size: 0.78rem; }
  .bar { position: relative; width: 150px; height: 16px; overflow: hidden; border: 1px solid var(--border-sub); border-radius: 99px; background: var(--surface-3); }
  .bar i { display: block; width: 62%; height: 100%; background: var(--accent); }
  .bar b { position: absolute; left: 50%; top: 0; width: 1px; height: 100%; background: var(--text-1); opacity: 0.8; }
  .space-scene { display: grid; gap: 0.35rem; justify-items: center; min-height: 70px; color: var(--text-2); font-size: 0.75rem; text-align: center; }
  .space-scene strong { color: var(--accent); }
  .space-board { padding: 0.45rem 0.7rem; border: 1px solid var(--accent-border); background: var(--accent-dim); color: var(--text-1); line-height: 1.5; letter-spacing: 0.32rem; }
  .space-pawn { display: inline-block; font-family: 'Segoe UI Symbol', 'Apple Symbols', 'Noto Chess', 'FreeSerif', serif; font-size: 1.15rem; line-height: 1; letter-spacing: 0; }
  .space-pawn.wp { color: #fff; text-shadow: 0 0 2px #000, 1px 1px 0 #222; }
  .concept-layout .flow { min-width: 0; flex: 1; flex-wrap: wrap; justify-content: center; }
  .concept-layout .balance { min-width: 0; flex-wrap: wrap; justify-content: center; }
  small { text-align: center; font-size: 0.72rem; }
  .visual:hover .mini-board > span.highlight, .visual:focus-within .mini-board > span.highlight { animation: highlight-pulse 1.05s ease-in-out; }
  .term-square-control:hover .mini-board > span.highlight, .term-square-control:focus-within .mini-board > span.highlight { animation-delay: calc(var(--square-index, 0) * 45ms); }
  .term-loose-piece:hover .mini-board > span > .piece, .term-loose-piece:focus-within .mini-board > span > .piece { animation: loose-scan 1.1s ease-in-out; }
  .term-open-file:hover .mini-board > span.highlight, .term-open-file:focus-within .mini-board > span.highlight { animation: file-flow 1.2s ease-in-out; }
  .term-weak-square:hover .mini-board > span.highlight, .term-weak-square:focus-within .mini-board > span.highlight { animation: landing 1.05s ease-in-out; }
  .term-king-safety:hover .mini-board > span.highlight, .term-king-safety:focus-within .mini-board > span.highlight { animation: attack-ray 1.2s ease-in-out; }
  .pin-visual:hover .mini-board > span.pin, .pin-visual:focus-within .mini-board > span.pin { animation: pin-pulse 1.1s ease-in-out; }
  .term-stalemate:hover .mini-board > span.highlight, .term-stalemate:focus-within .mini-board > span.highlight { animation: escape-check 1.2s ease-in-out; }
  .term-checkmate:hover .mini-board > span.highlight, .term-checkmate:focus-within .mini-board > span.highlight { animation: mate-check 1.2s ease-in-out; }
  .arrow-visual:hover .move-arrow, .arrow-visual:focus-within .move-arrow { animation: move-prompt 1s ease-in-out; }
  .flow-visual:hover .flow span, .flow-visual:focus-within .flow span { animation: flow-step 1.2s ease-in-out; }
  .flow-visual:hover .flow span:nth-of-type(2), .flow-visual:focus-within .flow span:nth-of-type(2) { animation-delay: 180ms; }
  .flow-visual:hover .flow span:nth-of-type(3), .flow-visual:focus-within .flow span:nth-of-type(3) { animation-delay: 360ms; }
  .balance-visual:hover .bar i, .balance-visual:focus-within .bar i { animation: balance-check 1.1s ease-in-out; }
  .space-scene:hover .space-board, .space-scene:focus-within .space-board { animation: territory-grow 1.1s ease-in-out; }
  .visual:hover .mini-board > span.highlight, .visual:focus-within .mini-board > span.highlight,
  .term-loose-piece:hover .mini-board > span > .piece, .term-loose-piece:focus-within .mini-board > span > .piece,
  .arrow-visual:hover .move-arrow, .arrow-visual:focus-within .move-arrow,
  .flow-visual:hover .flow span, .flow-visual:focus-within .flow span,
  .balance-visual:hover .bar i, .balance-visual:focus-within .bar i,
  .space-scene:hover .space-board, .space-scene:focus-within .space-board { animation-iteration-count: infinite; }
  .visual:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
  @keyframes highlight-pulse { 0%, 100% { box-shadow: inset 0 0 0 2px var(--accent); } 50% { box-shadow: inset 0 0 0 4px var(--accent); } }
  @keyframes loose-scan { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); color: var(--error); } }
  @keyframes file-flow { 0%, 100% { background: var(--accent-dim); } 50% { background: var(--accent); } }
  @keyframes landing { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
  @keyframes attack-ray { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; background: var(--error); } }
  @keyframes pin-pulse { 50% { box-shadow: inset 0 0 0 5px var(--error); } }
  @keyframes escape-check { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; background: var(--warning); } }
  @keyframes mate-check { 0%, 100% { box-shadow: inset 0 0 0 2px var(--error); } 50% { box-shadow: inset 0 0 0 5px var(--error); } }
  @keyframes move-prompt { 0%, 100% { transform: translate(0, 0); opacity: 0.75; } 50% { transform: translate(0.25rem, -0.25rem); opacity: 1; } }
  @keyframes flow-step { 0%, 100% { transform: translateX(0); opacity: 0.7; } 50% { transform: translateX(0.15rem); opacity: 1; } }
  @keyframes balance-check { 0%, 100% { width: 62%; } 50% { width: 68%; } }
  @keyframes territory-grow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); background: var(--accent); } }
  @media (prefers-reduced-motion: reduce) { .visual * { animation: none !important; transition: none !important; } }
</style>

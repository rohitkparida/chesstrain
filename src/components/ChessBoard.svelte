<script lang="ts">
  import { Chess, type Square as ChessSquare } from 'chess.js';
  import { annotationPoint, transformAnnotations, type BoardAnnotation } from '$lib/chess/annotations';
  import { applyCoordinateMove } from '$lib/chess/moves';
  import { buildBoardSquares, getTerminalState, isFlippedForOrientation, pieceGlyph, type BoardOrientation, type BoardSquare, type TerminalState } from '$lib/chess/board';

  let {
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    onMove = (_from: string, _to: string, _afterFen: string) => {},
    onInvalidMove = () => {},
    playable = true,
    showLegalTargets = true,
    showUndo = true,
    showControls = true,
    inactiveLabel = 'Viewing position',
    orientation = 'white',
    annotations = []
  } = $props<{
    fen?: string;
    onMove?: (from: string, to: string, afterFen: string) => boolean | void;
    onInvalidMove?: () => void;
    playable?: boolean;
    showLegalTargets?: boolean;
    showUndo?: boolean;
    showControls?: boolean;
    inactiveLabel?: string;
    orientation?: BoardOrientation;
    annotations?: BoardAnnotation[];
  }>();

  const GLYPHS: Record<string, string> = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
  };

  let squares    = $state<BoardSquare[]>([]);
  let selected   = $state<string | null>(null);
  let legalTargets = $state<Set<string>>(new Set());
  let manualFlip = $state(false);
  let canUndo    = $state(false);
  let currentTurn = $state<'w' | 'b'>('w');
  let terminalState = $state<TerminalState>('ongoing');
  let focusedSquare = $state<string | null>(null);

  let game = new Chess();

  function syncFen(f: string) {
    try { game.load(f); } catch {}
    rebuildSquares();
  }

  function rebuildSquares() {
    currentTurn = game.turn();
    terminalState = getTerminalState(game);
    squares = buildBoardSquares(game, isFlippedForOrientation(orientation, currentTurn) !== manualFlip);
  }

  $effect(() => { orientation; manualFlip; rebuildSquares(); });

  function getTargets(from: string): Set<string> {
    return new Set(game.moves({ square: from as ChessSquare, verbose: true }).map((move) => move.to));
  }

  function clearSelection() {
    selected = null;
    legalTargets = new Set();
  }

  function handleSquareKeydown(event: KeyboardEvent, name: string) {
    if (event.key === 'Escape') {
      if (selected !== null) {
        event.preventDefault();
        clearSelection();
      }
      return;
    }

    if (!playable || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const index = squares.findIndex((square) => square.name === name);
    if (index < 0) return;
    const row = Math.floor(index / 8);
    const column = index % 8;
    const nextRow = row + (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0);
    const nextColumn = column + (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0);
    if (nextRow < 0 || nextRow > 7 || nextColumn < 0 || nextColumn > 7) return;

    event.preventDefault();
    const nextSquare = squares[nextRow * 8 + nextColumn].name;
    focusedSquare = nextSquare;
    (event.currentTarget as HTMLButtonElement).parentElement?.querySelector<HTMLButtonElement>(`[data-square="${nextSquare}"]`)?.focus();
  }

  function clickSquare(name: string) {
    if (!playable) return;
    if (selected === null) {
      const piece = game.get(name as ChessSquare);
      if (piece && piece.color === game.turn()) { selected = name; legalTargets = getTargets(name); }
      return;
    }
    if (name === selected) { clearSelection(); return; }
    if (legalTargets.has(name)) {
      const from = selected;
      const result = applyCoordinateMove(game.fen(), from, name);
      clearSelection();
      if (result) {
        const accepted = onMove(from, name, result.afterFen);
        if (accepted !== false) {
          game.load(result.afterFen);
          canUndo = true;
          rebuildSquares();
        }
      }
    } else {
      const piece = game.get(name as ChessSquare);
      if (piece && piece.color === game.turn()) { selected = name; legalTargets = getTargets(name); }
      else {
        clearSelection();
        onInvalidMove();
      }
    }
  }

  function undoMove() {
    const undone = game.undo();
    if (undone) { clearSelection(); canUndo = game.history().length > 0; rebuildSquares(); }
  }

  let prevFen = '';
  $effect(() => { if (fen !== prevFen) { prevFen = fen; syncFen(fen); } });

  const displayFlipped = $derived(isFlippedForOrientation(orientation, currentTurn) !== manualFlip);
  const visibleAnnotations = $derived(transformAnnotations(annotations, displayFlipped));
  const turnLabel  = $derived(currentTurn === 'w' ? 'White to move' : 'Black to move');
  const terminalLabel = $derived(terminalState === 'checkmate' ? 'Checkmate' : terminalState === 'stalemate' ? 'Stalemate' : terminalState === 'draw' ? 'Draw' : '');
  const turnBorder = $derived(currentTurn === 'w' ? '#d4a843' : '#666');
  const turnDot    = $derived(currentTurn === 'w' ? '#fff' : '#222');

  function pieceLabel(pieceKey: string): string {
    const names: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
    return `${pieceKey[0] === 'w' ? 'White' : 'Black'} ${names[pieceKey[1]] ?? 'piece'}`;
  }
</script>

<div class="board-outer" role="group" aria-label={`Chess board, ${turnLabel}`}>
    {#if showControls}<div class="board-controls">
    {#if playable}
      <div class="turn-pill" style="border-color:{turnBorder}">
        <span class="turn-dot" style="background:{turnDot}"></span>
        {turnLabel}
        {#if terminalLabel}<span class="terminal-label">{terminalLabel}</span>{/if}
      </div>
    {:else}
      <div class="turn-pill static">{inactiveLabel}</div>
    {/if}
    <div class="board-btns">
      {#if playable && showUndo && canUndo}
        <button class="board-btn undo" onclick={undoMove} title="Undo last move">&#8630; Undo</button>
      {/if}
      <button class="board-btn flip" onclick={() => manualFlip = !manualFlip} aria-pressed={manualFlip} title="Flip board">&#8645; Flip</button>
    </div></div>{/if}

  <div class="board-surface">
    {#if visibleAnnotations.length > 0}
        <svg class="annotations" viewBox="0 0 8 8" role="img" aria-label="Move arrows and highlights">
        <defs>
          {#each visibleAnnotations as annotation, index}
            {#if annotation.kind !== 'highlight' && annotation.to}
              <marker id={`board-arrow-${index}`} markerWidth="0.55" markerHeight="0.55" refX="0.48" refY="0.275" orient="auto"><path d="M0,0 L0.55,0.275 L0,0.55 z" fill={annotation.color ?? 'var(--accent)'} /></marker>
            {/if}
          {/each}
        </defs>
        {#each visibleAnnotations as annotation, index}
          {@const from = annotationPoint(annotation.from, false)}
          {#if annotation.kind === 'highlight' || !annotation.to}
            <circle cx={from.x} cy={from.y} r="0.3" fill={annotation.color ?? 'var(--accent)'} opacity="0.55" aria-label={annotation.label ?? `Highlighted ${annotation.from}`} />
          {:else}
            {@const to = annotationPoint(annotation.to, false)}
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={annotation.color ?? 'var(--accent)'} marker-end={`url(#board-arrow-${index})`} aria-label={annotation.label ?? `${annotation.from} to ${annotation.to}`} />
          {/if}
        {/each}
      </svg>
    {/if}
    <div class="board-grid">
      {#each squares as sq (sq.name)}
      <button
        class="sq"
        class:dark={sq.dark}
        class:light={!sq.dark}
        class:selected={selected === sq.name}
        class:target={showLegalTargets && legalTargets.has(sq.name)}
        class:target-piece={showLegalTargets && legalTargets.has(sq.name) && sq.pieceKey !== null}
        onclick={() => clickSquare(sq.name)}
        onfocus={() => focusedSquare = sq.name}
        onkeydown={(event) => handleSquareKeydown(event, sq.name)}
        data-square={sq.name}
        tabindex={focusedSquare === sq.name || (focusedSquare === null && sq.name === squares[0]?.name) ? 0 : -1}
        aria-label={sq.name}
        aria-describedby={`square-description-${sq.name}`}
        aria-pressed={selected === sq.name}
        disabled={!playable}
      >
        {#if sq.pieceKey}
          <span class="piece" class:wp={sq.pieceColor === 'w'} class:bp={sq.pieceColor === 'b'} aria-label={pieceLabel(sq.pieceKey)}>
            {pieceGlyph(sq.pieceKey)}
          </span>
        {/if}
        {#if showLegalTargets && legalTargets.has(sq.name) && !sq.pieceKey}
          <span class="dot"></span>
        {/if}
        {#if sq.rankLabel}<span class="rank-lbl">{sq.rankLabel}</span>{/if}
        {#if sq.fileLabel}<span class="file-lbl">{sq.fileLabel}</span>{/if}
        <span class="sr-only" id={`square-description-${sq.name}`}>{`${sq.dark ? 'Dark' : 'Light'} square${sq.pieceKey ? `, ${pieceLabel(sq.pieceKey)}` : ''}${selected === sq.name ? ', selected' : ''}${legalTargets.has(sq.name) ? ', legal move target' : ''}, ${turnLabel}`}</span>
      </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .board-outer { display: flex; flex-direction: column; align-items: center; gap: 8px; }

  .board-controls {
    width: min(480px, 88vw);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .terminal-label { color: var(--text-4); font-size: 0.72rem; }

  .turn-pill {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.8rem; font-weight: 600;
    color: var(--text-3);
    padding: 4px 10px; border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--surface-1);
    transition: border-color 0.3s, background 0.2s;
  }
  .turn-pill.static { border-color: var(--border); color: var(--text-4); }
  .turn-dot { width: 8px; height: 8px; border-radius: 50%; border: 1px solid #555; flex-shrink: 0; }

  .board-btns { display: flex; gap: 6px; }
  .board-btn {
    background: var(--surface-1);
    border: 1px solid var(--border-sub);
    padding: 4px 10px; border-radius: 6px;
    font-size: 0.8rem; font-weight: 600; cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .board-btn.undo { color: var(--warning); border-color: rgba(251,169,76,0.2); }
  .board-btn.undo:hover { border-color: var(--warning); }
  .board-btn.flip { color: var(--text-4); }
  .board-btn.flip:hover { color: var(--accent); border-color: var(--accent-border); }

  /* Board — chess square colors never change (they're chess, not UI) */
  .board-grid {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    grid-template-rows: repeat(8, minmax(0, 1fr));
    width: 100%;
    height: 100%;
    border: 3px solid #0a0f1a;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5);
  }
  .board-surface { position: relative; width: min(480px, 100%, 88vw); aspect-ratio: 1; min-width: 0; min-height: 0; }
  .annotations { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; overflow: visible; }
  .annotations line { stroke-width: 0.12; stroke-linecap: round; opacity: 0.9; }
  .annotations circle { stroke: currentColor; stroke-width: 0.06; }

  .sq {
    width: 100%; height: 100%; min-width: 0; min-height: 0;
    display: flex; align-items: center; justify-content: center;
    position: relative; border: none; padding: 0; margin: 0;
    cursor: pointer; outline: none; box-sizing: border-box;
  }
  .sq.light { background: #f0d9b5; }
  .sq.dark  { background: #b58863; }
  .sq.selected { background: #7fc97f !important; box-shadow: inset 0 0 0 3px #3a9a3a; }
  .sq.target   { background: rgba(0,180,100,0.35) !important; }
  .sq.target-piece { box-shadow: inset 0 0 0 3px rgba(0,180,100,0.8); background: inherit !important; }
  .sq:hover { filter: brightness(1.08); }
  .sq:disabled { cursor: default; }
  .sq:disabled:hover { filter: none; }
  .sq:focus-visible {
    z-index: 1;
    outline: 3px solid var(--accent);
    outline-offset: -3px;
  }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

  .piece {
    font-size: 40px; line-height: 1; display: block;
    user-select: none; pointer-events: none;
    font-family: 'Segoe UI Symbol','Apple Symbols','Noto Chess','FreeSerif',serif;
  }
  .piece.wp {
    color: #fff;
    text-shadow: 0 0 3px #000, 1px 1px 0 #000, -1px 1px 0 #000, 1px -1px 0 #000, -1px -1px 0 #000,
                 2px 0 0 #222, -2px 0 0 #222, 0 2px 0 #222, 0 -2px 0 #222;
  }
  .piece.bp {
    color: #111;
    text-shadow: 0 0 2px rgba(255,255,255,0.5), 1px 1px 0 rgba(255,255,255,0.3);
  }

  .dot { width: 22px; height: 22px; border-radius: 50%; background: rgba(0,160,90,0.6); pointer-events: none; display: block; }

  .rank-lbl {
    position: absolute; top: 2px; left: 3px;
    font-size: 9px; font-weight: 700; pointer-events: none; user-select: none; color: rgba(0,0,0,0.35);
  }
  .sq.dark .rank-lbl { color: rgba(255,255,255,0.4); }
  .file-lbl {
    position: absolute; bottom: 2px; right: 3px;
    font-size: 9px; font-weight: 700; pointer-events: none; user-select: none; color: rgba(0,0,0,0.35);
  }
  .sq.dark .file-lbl { color: rgba(255,255,255,0.4); }
</style>

<script lang="ts">
  import { Chess } from 'chess.js';
  import { buildBoardSquares, pieceGlyph, type BoardSquare } from '$lib/chess/board';
  type Arrow = { from: string; to: string; tone: 'played' | 'engine' };
  type ReplayStep = { fen: string; move: string; label: string };
  let { fen, arrows = [], continuation = [], step = 0, onNext = () => {} } = $props<{ fen: string; arrows?: Arrow[]; continuation?: ReplayStep[]; step?: number; onNext?: () => void }>();
  let flipped = $state(false);
  let game = $derived(new Chess(fen));
  let squares = $derived<BoardSquare[]>(buildBoardSquares(game, flipped));
  let visibleArrows = $derived(step === 0 ? arrows : []);
  let currentStep = $derived(continuation[step]);
  function point(square: string) { let file = square.charCodeAt(0) - 97; let rank = 8 - Number(square[1]); if (flipped) { file = 7 - file; rank = 7 - rank; } return { x: (file + .5) * 12.5, y: (rank + .5) * 12.5 }; }
</script>

<div class="replay">
  <div class="controls"><span class="legend"><i class="played"></i> Played move</span><span class="legend"><i class="engine"></i> Engine move</span><button class="quiet" onclick={() => flipped = !flipped}>↕ Flip</button></div>
  <div class="board-wrap">
    <svg class="arrows" viewBox="0 0 100 100" aria-hidden="true"><defs><marker id="played-head" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="#d95c5c" /></marker><marker id="engine-head" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="#35b878" /></marker></defs>{#each visibleArrows as arrow}{@const start = point(arrow.from)}{@const end = point(arrow.to)}<line class={arrow.tone} x1={start.x} y1={start.y} x2={end.x} y2={end.y} marker-end="url(#{arrow.tone}-head)" />{/each}</svg>
    <div class="board-grid">{#each squares as sq (sq.name)}<div class="sq" class:dark={sq.dark} class:light={!sq.dark}>{#if sq.pieceKey}<span class="piece" class:wp={sq.pieceColor === 'w'} class:bp={sq.pieceColor === 'b'}>{pieceGlyph(sq.pieceKey)}</span>{/if}{#if sq.rankLabel}<span class="rank">{sq.rankLabel}</span>{/if}{#if sq.fileLabel}<span class="file">{sq.fileLabel}</span>{/if}</div>{/each}</div>
  </div>
  {#if currentStep}<p class="step-label">Engine continuation: <strong>{currentStep.label}</strong></p><button class="primary" onclick={onNext}>{step < continuation.length - 1 ? 'Show next move' : 'Finish replay'}</button>{:else if continuation.length}<p class="step-label">The engine line is ready to replay.</p><button class="primary" onclick={onNext}>Show engine continuation</button>{/if}
</div>

<style>
  .replay { display:grid; gap:.65rem; justify-items:center; }.controls { width:min(480px,88vw); display:flex; gap:.65rem; align-items:center; flex-wrap:wrap; }.legend { color:var(--text-3); font-size:.8rem; display:inline-flex; align-items:center; gap:.3rem; }.legend i { width:10px; height:4px; border-radius:2px; display:inline-block; }.legend .played { background:#d95c5c; }.legend .engine { background:#35b878; }.quiet,.primary { padding:.45rem .8rem; border-radius:6px; font:inherit; font-weight:700; cursor:pointer; }.quiet { margin-left:auto; color:var(--text-3); background:var(--surface-1); border:1px solid var(--border); }.primary { color:var(--bg); background:var(--accent); border:0; }.board-wrap { width:min(480px,88vw); aspect-ratio:1; position:relative; border:3px solid #0a0f1a; border-radius:6px; overflow:hidden; }.board-grid { display:grid; grid-template-columns:repeat(8,1fr); width:100%; height:100%; }.sq { position:relative; display:grid; place-items:center; }.sq.light { background:#f0d9b5; }.sq.dark { background:#b58863; }.piece { font-size:clamp(1.9rem,7vw,3rem); line-height:1; font-family:'Segoe UI Symbol','Apple Symbols','Noto Chess','FreeSerif',serif; user-select:none; }.wp { color:#fff; text-shadow:0 0 3px #000,1px 1px 0 #000,-1px 1px 0 #000; }.bp { color:#111; text-shadow:0 0 2px rgba(255,255,255,.5); }.arrows { position:absolute; inset:0; z-index:2; pointer-events:none; } line { stroke-width:1.5; opacity:.9; } line.played { stroke:#d95c5c; } line.engine { stroke:#35b878; }.rank,.file { position:absolute; font-size:9px; font-weight:700; color:rgba(0,0,0,.35); }.rank { top:2px; left:3px; }.file { bottom:2px; right:3px; }.dark .rank,.dark .file { color:rgba(255,255,255,.4); }.step-label { color:var(--text-2); margin:0; }
</style>

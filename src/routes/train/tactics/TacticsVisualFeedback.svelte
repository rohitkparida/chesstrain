<script lang="ts">
  import ChessBoard from '../../../components/ChessBoard.svelte';
  import type { BoardAnnotation } from '$lib/chess/annotations';

  let {
    fen,
    attemptedMove = '',
    bestMove = '',
    solutionMoves = [],
    showBest = false
  }: { fen: string; attemptedMove?: string; bestMove?: string; solutionMoves?: string[]; showBest?: boolean } = $props();

  function annotation(move: string, color: string): BoardAnnotation | null {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) return null;
    return { from: move.slice(0, 2), to: move.slice(2, 4), color };
  }

  const annotations = $derived([
    annotation(attemptedMove, 'var(--warning)'),
    ...(showBest ? [annotation(bestMove, 'var(--success)')] : [])
  ].filter((item): item is BoardAnnotation => item !== null));
  const line = $derived(showBest ? solutionMoves : []);
</script>

{#if annotations.length > 0}
  <div class="visual-feedback">
    <div class="visual-heading">What changed</div>
    <div class="visual-board">
      <ChessBoard {fen} playable={false} showControls={false} annotations={annotations} />
    </div>
    <div class="legend">
      <span><i class="user-key"></i>Your move</span>
      {#if showBest}<span><i class="best-key"></i>Engine move</span>{:else}<span class="hint">Engine move appears after reflection.</span>{/if}
    </div>
    {#if line.length > 0}<div class="line-label" aria-label="Visual solution line">Line: {line.join(' ')}</div>{/if}
  </div>
{/if}

<style>
  .visual-feedback { display: flex; flex-direction: column; gap: 0.45rem; max-width: 480px; }
  .visual-heading { color: var(--text-2); font-size: 0.82rem; font-weight: 700; }
  .visual-board { width: min(100%, 360px); }
  .visual-board :global(.board-outer), .visual-board :global(.board-surface) { width: 100%; }
  .legend { display: flex; gap: 0.8rem; align-items: center; color: var(--text-4); font-size: 0.75rem; }
  .legend span { display: inline-flex; align-items: center; gap: 0.3rem; }
  i { width: 10px; height: 3px; display: inline-block; }
  .user-key { background: var(--warning); }
  .best-key { background: var(--success); }
  .hint { font-style: italic; }
  .line-label { color: var(--text-3); font-size: 0.78rem; }
</style>

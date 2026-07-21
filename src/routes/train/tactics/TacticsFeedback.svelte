<script lang="ts">
  type FeedbackType = 'correct' | 'wrong' | '';

  let {
    inputNotice = '',
    feedbackType,
    feedback,
    eloDelta,
    coachLoading,
    reflectionOpen,
    reflectionSeconds,
    coachText,
    solutionLine = [],
    canReveal = false,
    onReveal
  }: {
    inputNotice?: string;
    feedbackType: FeedbackType;
    feedback: string;
    eloDelta: number | null;
    coachLoading: boolean;
    reflectionOpen: boolean;
    reflectionSeconds: number;
    coachText: string;
    solutionLine?: string[];
    canReveal?: boolean;
    onReveal: () => void;
  } = $props();
</script>

<div class="feedback-zone">
  {#if inputNotice}<p class="input-notice" role="status">{inputNotice}</p>{/if}
  {#if feedbackType}
    <div class="feedback-pill {feedbackType}">
      {feedbackType === 'correct' ? '&#9989;' : '&#10060;'} {feedback}
      {#if eloDelta !== null}
        <span class="elo-delta {eloDelta > 0 ? 'pos' : 'neg'}">{eloDelta > 0 ? '+' : ''}{eloDelta} ELO</span>
      {/if}
    </div>
  {/if}
  {#if coachLoading}
    <div class="coach-bubble loading"><span class="pulse">&#9679;</span> Engine is checking...</div>
  {:else if feedbackType === 'wrong' && !reflectionOpen}
    <div class="coach-bubble reflection">
      {#if reflectionSeconds > 0}Reflect for {reflectionSeconds}s before seeing the explanation.{:else}Review the explanation when ready.{/if}
      <button class="reveal-btn" onclick={onReveal} disabled={!canReveal}>Show explanation</button>
    </div>
  {:else if coachText}
    <div class="coach-bubble"><span class="coach-icon">&#9822;</span> {coachText}</div>
  {/if}
  {#if solutionLine.length > 0}
    <div class="solution-line" aria-label="Tactic solution line">
      <strong>Solution line:</strong> {solutionLine.join(' ')}
    </div>
  {/if}
</div>

<style>
  .feedback-zone { display: flex; flex-direction: column; gap: 0.6rem; min-height: 3.5rem; }
  .input-notice { margin: 0; color: var(--warning); font-size: 0.86rem; }
  .feedback-pill, .coach-bubble { background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; }
  .feedback-pill { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 1rem; font-weight: 600; font-size: 0.92rem; }
  .feedback-pill.correct { border-color: var(--success); color: var(--success); background: var(--success-dim); }
  .feedback-pill.wrong { border-color: var(--error); color: var(--error); background: var(--error-dim); }
  .elo-delta { margin-left: auto; font-size: 0.85rem; font-weight: 700; }
  .elo-delta.pos { color: var(--success); }
  .elo-delta.neg { color: var(--error); }
  .coach-bubble { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 1rem; font-size: 0.88rem; color: var(--text-3); line-height: 1.5; }
  .coach-bubble.loading { color: var(--text-4); font-style: italic; }
  .coach-icon { flex-shrink: 0; }
  .solution-line { color: var(--text-3); font-size: 0.86rem; }
  .reveal-btn { margin-left: auto; border: 1px solid var(--border-sub); border-radius: 6px; padding: 0.35rem 0.6rem; background: var(--surface-2); color: var(--text-2); cursor: pointer; font-weight: 600; }
  .reveal-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  .pulse { animation: pulse 1.2s infinite; display: inline-block; color: var(--accent); }
</style>

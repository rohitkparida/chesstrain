<script lang="ts">
  import type { DailyPlan, TrainingModuleId } from '$lib/learning/training';

  type PlanEntry = {
    id: string;
    module: TrainingModuleId;
    name: string;
    href: string;
    reason: string;
    seconds: number;
    completed: boolean;
  };

  let {
    plan,
    entries,
    completedCount,
    totalSeconds
  } = $props<{
    plan: DailyPlan;
    entries: readonly PlanEntry[];
    completedCount: number;
    totalSeconds: number;
  }>();

  const reasonLabel: Record<string, string> = {
    'due-review': 'Ready to review',
    'weakest-unlocked': 'Needs practice',
    new: 'New'
  };

  const nextEntry = $derived(entries.find((entry: PlanEntry) => !entry.completed) ?? null);
  const complete = $derived(entries.length > 0 && completedCount === entries.length);
  const counts = $derived({
    due: entries.filter((entry: PlanEntry) => entry.reason === 'due-review').length,
    weak: entries.filter((entry: PlanEntry) => entry.reason === 'weakest-unlocked').length,
    fresh: entries.filter((entry: PlanEntry) => entry.reason === 'new').length
  });
  const exerciseSummary = $derived([
    counts.due > 0 ? `${counts.due} due` : '',
    counts.weak > 0 ? `${counts.weak} to strengthen` : '',
    counts.fresh > 0 ? `${counts.fresh} new` : ''
  ].filter(Boolean).join(' · '));

  function formatMinutes(seconds: number): string {
    if (seconds <= 0) return '0 min';
    if (seconds < 60) return '<1 min';
    return `${Math.ceil(seconds / 60)} min`;
  }
</script>

<section class="plan" aria-labelledby="daily-plan-title" data-plan-date={plan.dateKey}>
  <div class="plan-heading">
    <div>
      <p class="eyebrow">Today</p>
    <h1 id="daily-plan-title">Today's plan</h1>
    </div>
    <div class="remaining" aria-label={`${formatMinutes(totalSeconds)} remaining`}>
      <strong>{formatMinutes(totalSeconds)}</strong>
      <span>remaining</span>
    </div>
  </div>

  <p class="plan-summary" aria-label="Daily plan summary">
    <strong>{completedCount}/{entries.length} complete</strong>
    <span>{exerciseSummary || 'Your next exercise is ready'}</span>
  </p>

  {#if nextEntry}
    <div class="next-exercise">
      <div>
        <p class="label">Next</p>
        <h2>{nextEntry.name}</h2>
        <p>{reasonLabel[nextEntry.reason] ?? nextEntry.reason} · {formatMinutes(nextEntry.seconds)}</p>
      </div>
      <a class="primary-action" href={nextEntry.href}>{completedCount > 0 ? 'Resume plan' : 'Start plan'}</a>
    </div>
  {:else if complete}
    <section class="completion" aria-label="Completion summary">
        <p class="label">Done for today</p>
        <h2>Today's focus is complete.</h2>
        <p>Come back tomorrow for your next review.</p>
    </section>
  {:else}
    <p class="empty-plan">No exercises yet. Browse Train.</p>
  {/if}

  {#if entries.length > 0}
    <details class="exercise-list">
      <summary>View all {entries.length} exercises</summary>
      <div aria-label="Planned exercises">
      {#each entries as entry}
        <a class:completed={entry.completed} href={entry.href}>
          <span class="status" aria-hidden="true">{entry.completed ? '✓' : '○'}</span>
          <span>{entry.name}</span>
          <small>{entry.completed ? 'Done' : formatMinutes(entry.seconds)}</small>
        </a>
      {/each}
      </div>
    </details>
  {/if}
</section>

<style>
  .plan { width: min(100%, 860px); display: grid; gap: 1rem; }
  .plan-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
  .eyebrow, h1, h2, p { margin: 0; }
  .eyebrow, .label { color: var(--accent); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  h1 { margin-top: 0.25rem; color: var(--text-1); font-size: 1.75rem; }
  .next-exercise p, .completion p, .empty-plan { color: var(--text-4); font-size: 0.86rem; line-height: 1.45; }
  .remaining { display: grid; justify-items: end; gap: 0.1rem; padding-bottom: 0.1rem; }
  .remaining strong { color: var(--text-1); font-size: 1.25rem; }
  .remaining span { color: var(--text-5); font-size: 0.7rem; }
  .plan-summary { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.25rem 0.65rem; margin: 0; padding: 0.7rem 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .plan-summary strong { color: var(--text-1); font-size: 0.9rem; }
  .plan-summary span { color: var(--text-5); font-size: 0.78rem; }
  .next-exercise, .completion { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-width: 0; padding: 1.05rem; border: 1px solid var(--accent-border); background: var(--accent-dim); }
  .next-exercise > div { min-width: 0; }
  h2 { margin-top: 0.3rem; color: var(--text-1); font-size: 1.15rem; }
  .primary-action { flex-shrink: 0; padding: 0.6rem 0.9rem; border-radius: 6px; background: var(--accent); color: var(--bg); font-size: 0.82rem; font-weight: 800; text-decoration: none; }
  .completion { display: grid; justify-content: stretch; }
  .completion h2 { margin-top: 0.25rem; }
  .exercise-list { border-top: 1px solid var(--border); }
  .exercise-list summary { padding: 0.7rem 0.2rem; color: var(--accent); cursor: pointer; font-size: 0.8rem; font-weight: 700; }
  .exercise-list > div { display: grid; }
  .exercise-list a { display: flex; align-items: center; gap: 0.65rem; min-width: 0; padding: 0.7rem 0.2rem; border-bottom: 1px solid var(--border); color: var(--text-2); text-decoration: none; font-size: 0.84rem; }
  .exercise-list a > span:not(.status) { min-width: 0; overflow-wrap: anywhere; }
  .exercise-list a:hover { color: var(--accent); }
  .exercise-list small { margin-left: auto; color: var(--text-5); font-size: 0.7rem; }
  .status { color: var(--accent); font-size: 1rem; }
  .completed { color: var(--text-5) !important; }
  .completed .status { color: var(--success); }
  @media (max-width: 560px) { .plan-heading, .next-exercise { align-items: flex-start; flex-direction: column; } .remaining { justify-items: start; } .primary-action { align-self: stretch; text-align: center; } }
</style>

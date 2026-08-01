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
      <h1 id="daily-plan-title">Today's plan</h1>
    </div>
    <div class="remaining" title="Estimated time remaining" aria-label={`${formatMinutes(totalSeconds)} remaining`}>
      <svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <strong>{formatMinutes(totalSeconds)}</strong>
      <span>remaining</span>
    </div>
  </div>

  <p class="plan-summary" aria-label="Daily plan summary">
    <svg class="icon-inline" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
    <strong>{completedCount}/{entries.length} complete</strong>
    <span>{exerciseSummary}</span>
  </p>

  {#if nextEntry}
    <div class="action-row">
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
  .plan { display: flex; flex-direction: column; gap: 1rem; width: min(100%, var(--content-width)); margin: 0 auto; }
  .plan-heading { display: flex; justify-content: space-between; align-items: flex-start; }
  h1 { margin: 0; color: var(--text-1); font-size: 1.6rem; font-weight: 700; }
  .remaining { display: flex; align-items: center; gap: 0.35rem; color: var(--text-4); font-size: 0.84rem; }
  .icon { flex-shrink: 0; opacity: 0.85; }
  .icon-inline { flex-shrink: 0; margin-right: 0.2rem; vertical-align: middle; opacity: 0.85; }
  .remaining strong { color: var(--text-4); }
  .plan-summary { display: flex; align-items: center; gap: 0.5rem; margin: 0; color: var(--text-4); font-size: 0.86rem; }
  .action-row { display: flex; align-items: center; margin-top: 0.25rem; }
  .primary-action { padding: 0.6rem 1.2rem; border-radius: 8px; background: var(--accent); color: var(--bg); font-weight: 700; font-size: 0.9rem; text-decoration: none; transition: opacity 0.15s ease; }
  .primary-action:hover { opacity: 0.9; }
  .completion { padding: 1.1rem 1.25rem; border: 1px solid var(--success-dim); border-radius: 10px; background: var(--success-dim); }
  .completion h2 { margin: 0 0 0.25rem 0; color: var(--text-1); font-size: 1.2rem; }
  .completion p { margin: 0; color: var(--text-3); font-size: 0.84rem; }
  .empty-plan { color: var(--text-4); font-size: 0.88rem; }
  .exercise-list { border: 1px solid var(--border); border-radius: 8px; background: var(--surface-1); overflow: hidden; }
  .exercise-list summary { padding: 0.75rem 1rem; color: var(--text-3); font-size: 0.84rem; font-weight: 600; cursor: pointer; user-select: none; }
  .exercise-list summary:hover { color: var(--text-1); }
  .exercise-list div { display: flex; flex-direction: column; border-top: 1px solid var(--border); }
  .exercise-list a { display: flex; align-items: center; gap: 0.65rem; padding: 0.65rem 1rem; border-bottom: 1px solid var(--border); color: var(--text-2); font-size: 0.84rem; text-decoration: none; }
  .exercise-list a:last-child { border-bottom: none; }
  .exercise-list a:hover { background: var(--surface-2); }
  .exercise-list a.completed { color: var(--text-4); text-decoration: line-through; }
  .status { font-weight: 700; color: var(--accent); }
  .completed .status { color: var(--success); }
  small { margin-left: auto; color: var(--text-4); font-size: 0.76rem; }
</style>

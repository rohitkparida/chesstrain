<script lang="ts">
  import { onDestroy } from 'svelte';
  import DailyPlanCard from '../components/DailyPlanCard.svelte';
  import { modulePresentation } from '../components/trainingCatalog';
  import { completedDailyPlanSlots, dailyPlanSlotKey, generateDailyPlan, localDateKey, type DailyPlan, type TrainingAttempt } from '$lib/learning/training';
  import { validatedExercises } from '$lib/learning/moduleExercises';
  import { recentFingerprints } from '$lib/learning/generator';
  import { sessionStore } from '../stores/session';

  type PlanEntry = {
    id: string;
    module: DailyPlan['items'][number]['module'];
    name: string;
    href: string;
    reason: string;
    seconds: number;
    completed: boolean;
  };

  let plan = $state<DailyPlan | null>(null);
  let attempts = $state<TrainingAttempt[]>([]);

  const exercises = validatedExercises();

  const unsubscribe = sessionStore.subscribe((state) => {
    attempts = state.trainingAttempts ?? [];
    const now = Date.now();
    const dateKey = localDateKey(now);
    const userId = state.userId ?? 'local-player';
    const saved = state.dailyPlan;

    if (saved?.userId === userId && saved.dateKey === dateKey) {
      plan = saved;
      return;
    }

    const generated = generateDailyPlan({
      userId,
      exercises,
      attempts,
      progress: state.moduleProgress,
      srs: state.srs,
      recentFingerprints: recentFingerprints(attempts),
      now,
      dateKey
    });
    plan = generated;
    sessionStore.update((current) => {
      const currentPlan = current.dailyPlan;
      if (currentPlan?.userId === userId && currentPlan.dateKey === dateKey) return current;
      return { ...current, dailyPlan: generated };
    });
  });
  onDestroy(unsubscribe);

  const completedPlanSlots = $derived(plan ? completedDailyPlanSlots(plan, attempts) : new Set<string>());
  const planEntries = $derived<PlanEntry[]>(plan
    ? plan.items.map((item) => {
        const presentation = modulePresentation(item.module);
        return {
          id: item.exerciseId,
          module: item.module,
          name: presentation.name,
          href: todayOriginHref(presentation.href),
          reason: item.reason,
          seconds: item.estimatedSeconds,
          completed: completedPlanSlots.has(dailyPlanSlotKey(item.module, item.exerciseId))
        };
      })
    : []);
  const completedCount = $derived(planEntries.filter((entry) => entry.completed).length);
  const totalSeconds = $derived(planEntries
    .filter((entry) => !entry.completed)
    .reduce((total, entry) => total + entry.seconds, 0));

  function todayOriginHref(href: string): string {
    const url = new URL(href, 'https://magnus.local');
    url.searchParams.set('origin', 'today');
    return `${url.pathname}${url.search}${url.hash}`;
  }
</script>

<svelte:head>
  <title>Today | Magnus Engine</title>
  <meta name="description" content="Your adaptive ten-minute chess training plan." />
</svelte:head>

{#if plan}
  <DailyPlanCard {plan} entries={planEntries} {completedCount} {totalSeconds} />
{/if}

<div class="train-link">
  <a href="/train">Choose another skill</a>
</div>

<style>
  .train-link { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.25rem 0.5rem; width: min(100%, 860px); padding-top: 0.2rem; border-top: 1px solid var(--border); color: var(--text-5); font-size: 0.78rem; }
  .train-link a { font-weight: 700; text-decoration: none; }
</style>

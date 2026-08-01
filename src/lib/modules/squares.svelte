<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { DRILLS, pickRandomDrillId } from '$lib/drills/registry';
  import type { LazyDrillEntry, DrillContext } from '$lib/drills/types';
  import DrillRunner from '../../components/drills/DrillRunner.svelte';
  import type { AttemptRecordEvent } from '$lib/drills/runner';
  import { recordModuleAttempt, sessionStore } from '../../stores/session';
  import { accuracyPercent } from '../learning/objectiveScoring';
  import ObjectiveMetrics from '../../components/ObjectiveMetrics.svelte';
  import { appPath } from '../../lib/paths';

  let { fixedKind = null } = $props<{ fixedKind?: string | null }>();

  const STORAGE_KEY = 'board_vision_active_drills';
  const visionDrillEntries = Object.values(DRILLS).filter((d) => d.module === 'board-grip');
  const allVisionIds = visionDrillEntries.map((d) => d.id);

  let selectedDrillIds = $state<string[]>([...allVisionIds]);
  let currentDrillId = $state<string>(allVisionIds[0]);
  let manualOrientation = $state<'white' | 'black' | null>(null);
  let currentUserId = $state<string>('guest');
  let reloadNonce = $state(0);

  let attempts = $state(0);
  let correctCount = $state(0);
  let streak = $state(0);
  let bestStreak = $state(0);
  let totalCorrectTimeMs = $state(0);

  const unsubscribe = sessionStore.subscribe((state) => {
    const nextUser = state.userId ?? 'guest';
    if (nextUser !== currentUserId) {
      currentUserId = nextUser;
      resetAccountState();
      loadUserPreferences();
    }
  });

  onDestroy(() => unsubscribe());

  function resetAccountState() {
    selectedDrillIds = [...allVisionIds];
    currentDrillId = allVisionIds[0];
    attempts = 0;
    correctCount = 0;
    streak = 0;
    bestStreak = 0;
    totalCorrectTimeMs = 0;
  }

  import { readJson, writeJson } from '$lib/storage/localJsonStorage';

  function loadUserPreferences() {
    if (fixedKind) return;
    const validSaved = readJson(`${STORAGE_KEY}_${currentUserId}`, (parsed) => {
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter((id): id is string => typeof id === 'string' && allVisionIds.includes(id));
        return filtered.length > 0 ? filtered : null;
      }
      return null;
    });
    if (validSaved) {
      selectedDrillIds = validSaved;
      currentDrillId = validSaved[0];
      return;
    }
    resetAccountState();
  }

  onMount(() => loadUserPreferences());

  $effect(() => {
    if (fixedKind === 'name-square') {
      selectedDrillIds = ['vision.name-square'];
      currentDrillId = 'vision.name-square';
    }
  });

  function saveFilter(ids: string[]) {
    writeJson(`${STORAGE_KEY}_${currentUserId}`, ids);
  }

  let currentEntry = $derived<LazyDrillEntry>(
    DRILLS[currentDrillId] ?? DRILLS['vision.name-square']
  );

  const context = $derived<DrillContext>({
    userId: currentUserId,
    difficulty: 1200,
    random: Math.random
  });

  function toggleDrillFilter(id: string) {
    if (fixedKind) return;
    const next = selectedDrillIds.includes(id)
      ? selectedDrillIds.length > 1 ? selectedDrillIds.filter((d) => d !== id) : selectedDrillIds
      : [...selectedDrillIds, id];
    selectedDrillIds = next;
    saveFilter(next);
  }

  function handleRecordAttempt(event: AttemptRecordEvent) {
    attempts++;
    if (event.correct) {
      correctCount++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      totalCorrectTimeMs += event.timeMs;
    } else {
      streak = 0;
    }

    recordModuleAttempt({
      exerciseId: event.drillId,
      module: 'board-grip',
      correctness: event.score,
      assistance: event.assistance === 'solution' ? 'solution' : undefined,
      startedAt: Date.now() - event.timeMs,
      completedAt: Date.now(),
      tags: [event.drillId],
      source: 'generated',
      positionFingerprint: event.fingerprint
    });
  }

  function handleNextDrill() {
    currentDrillId = pickRandomDrillId(selectedDrillIds, currentDrillId);
    reloadNonce += 1;
  }

  function toggleViewOrientation() {
    manualOrientation = manualOrientation === 'black' ? 'white' : 'black';
  }

  const avgSpeedSec = $derived(correctCount > 0 ? (totalCorrectTimeMs / correctCount / 1000).toFixed(1) : '-');
  const accuracy = $derived(accuracyPercent(correctCount, attempts));
</script>

<main class="module-container" data-workflow="task-commit-feedback-continue">
  <DrillRunner
    entry={currentEntry}
    context={context}
    reloadNonce={reloadNonce}
    orientationOverride={manualOrientation}
    onNextDrill={handleNextDrill}
    onRecordAttempt={handleRecordAttempt}
  />

  <ObjectiveMetrics
    items={[
      { label: 'Attempts', value: String(attempts) },
      { label: 'Accuracy', value: `${accuracy}%` },
      { label: 'Avg Speed', value: avgSpeedSec === '-' ? '-' : `${avgSpeedSec}s` },
      { label: 'Best Streak', value: String(bestStreak) }
    ]}
  />

  {#if !fixedKind}
    <div class="filter-bar">
      <span class="filter-label">Drill Mix:</span>
      <div class="filter-chips">
        {#each visionDrillEntries as drill (drill.id)}
          <button
            type="button"
            class="chip"
            class:active={selectedDrillIds.includes(drill.id)}
            onclick={() => toggleDrillFilter(drill.id)}
          >
            {drill.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="top-nav"><a href={appPath('/train')} class="back-link">&larr; Training Catalog</a></div>

  <div class="bottom-bar">
    <button type="button" class="view-toggle-btn" onclick={toggleViewOrientation}>
      View: {manualOrientation ?? 'Auto'}
    </button>
  </div>
</main>

<style>
  .module-container { max-width: var(--content-width); margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .top-nav { display: flex; align-items: center; }
  .back-link { color: var(--text-4); font-size: 0.85rem; text-decoration: none; }
  .back-link:hover { color: var(--accent); }
  .filter-bar { display: flex; align-items: center; gap: 0.75rem; background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.75rem; }
  .filter-label { font-size: 0.8rem; font-weight: 600; color: var(--text-3); }
  .filter-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .chip { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-4); padding: 0.25rem 0.6rem; border-radius: 12px; font-size: 0.78rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease; }
  .chip:hover { border-color: var(--accent-border); color: var(--text-1); }
  .chip.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
  .bottom-bar { display: flex; justify-content: flex-end; margin-top: 0.5rem; }
  .view-toggle-btn { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-4); padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
  .view-toggle-btn:hover { border-color: var(--accent); color: var(--text-1); }
</style>

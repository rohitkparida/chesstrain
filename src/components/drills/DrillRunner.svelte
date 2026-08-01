<script lang="ts">
  import { DrillRunnerMachine, type AttemptRecordEvent, type RunnerState } from '$lib/drills/runner';
  import { extractKeywordsFromPrompt, type LazyDrillEntry, type DrillContext, type SquareOrientation, type InteractionKind, type InteractionContracts } from '$lib/drills/types';
  import { INTERACTIONS } from './adapters';
  import TrainingModuleShell from '../TrainingModuleShell.svelte';
  import ActionButton from '../ActionButton.svelte';
  import DrillTimerControls from './DrillTimerControls.svelte';
  import CountdownBar from './CountdownBar.svelte';
  import { type TimerMode, getTimerConfig } from '$lib/learning/timerSystem';

  type K = keyof InteractionContracts;

  let {
    entry,
    context,
    reloadNonce = 0,
    orientationOverride = null,
    onNextDrill,
    onRecordAttempt
  } = $props<{
    entry: LazyDrillEntry<K>;
    context: DrillContext;
    reloadNonce?: number;
    orientationOverride?: SquareOrientation | null;
    onNextDrill?: () => void;
    onRecordAttempt?: (event: AttemptRecordEvent<K>) => void;
  }>();

  let isGraceRound = $state(false);
  let timerMode = $state<TimerMode>('session');
  let difficultyOffset = $state(0);
  let sprintComplete = $state(false);
  let sprintAttempts = $state(0);
  let sprintCorrect = $state(0);
  let sprintBestStreak = $state(0);
  let currentSprintStreak = $state(0);

  function resetSprintStats() {
    sprintAttempts = 0;
    sprintCorrect = 0;
    sprintBestStreak = 0;
    currentSprintStreak = 0;
  }

  const runner = new DrillRunnerMachine<K>({
    onRecordAttempt: (evt) => {
      if (!isGraceRound) {
        if (timerMode === 'session' && !sprintComplete) {
          sprintAttempts++;
          if (evt.correct) {
            sprintCorrect++;
            currentSprintStreak++;
            if (currentSprintStreak > sprintBestStreak) {
              sprintBestStreak = currentSprintStreak;
            }
          } else {
            currentSprintStreak = 0;
          }
        }
        onRecordAttempt?.(evt);
      }
    }
  });

  let runnerState: RunnerState<K> = $state(runner.getState());
  let isLoading: boolean = $state(true);
  let loadError: string | null = $state(null);
  let loadGeneration = 0;

  runner.subscribe((s) => { runnerState = s; });

  async function loadAndGenerate() {
    const currentGen = ++loadGeneration;
    try {
      isLoading = true;
      loadError = null;
      const def = await entry.load();
      if (currentGen !== loadGeneration) return;
      const inst = await def.generate(context);
      if (currentGen !== loadGeneration) return;
      runner.start(def, inst);
      isLoading = false;
    } catch (err: unknown) {
      if (currentGen !== loadGeneration) return;
      isLoading = false;
      loadError = err instanceof Error ? err.message : 'Failed to load drill';
    }
  }

  $effect(() => {
    entry;
    reloadNonce;
    loadAndGenerate();
  });

  function handleSubmitResponse(response: unknown) {
    runner.submit(response as InteractionContracts[K]['response']);
  }

  let initializedMode = false;

  function handleModeChange(newMode: TimerMode) {
    if (initializedMode) {
      isGraceRound = true;
    }
    initializedMode = true;
    resetSprintStats();
  }

  function handleSkip() {
    isGraceRound = false;
    runner.skip();
    if (onNextDrill) onNextDrill(); else loadAndGenerate();
  }

  function handleContinue() {
    isGraceRound = false;
    if (onNextDrill) onNextDrill(); else loadAndGenerate();
  }

  const activeAdapter = $derived(
    runnerState.definition ? INTERACTIONS[runnerState.definition.interaction] : null
  );

  const taskKeywords = $derived(
    runnerState.instance?.prompt ? extractKeywordsFromPrompt(runnerState.instance.prompt) : []
  );

  const mergedPublicData = $derived(() => {
    const pub = (runnerState.instance?.publicData as Record<string, unknown>) ?? {};
    return orientationOverride ? { ...pub, orientation: orientationOverride } : pub;
  });

  const timerConfig = $derived(getTimerConfig(timerMode, 3, difficultyOffset));
  const durationMs = $derived(timerMode === 'session' ? 60000 : timerConfig.perAttemptSeconds * 1000);
  const isTimerActive = $derived(runnerState.status === 'active' && timerMode !== 'none' && !isLoading && !sprintComplete);

  function handleTimerTimeout() {
    if (timerMode === 'session') {
      sprintComplete = true;
    }
    if (runnerState.status === 'active') {
      runner.giveUp();
    }
  }

  function restartSprint() {
    sprintComplete = false;
    resetSprintStats();
    handleContinue();
  }
</script>

<div class="drill-runner-container" class:is-loading={isLoading}>
  {#if (isLoading || runnerState.status === 'loading') && !runnerState.instance}
    <div class="loading-state"><p>Loading drill...</p></div>
  {:else if loadError && !runnerState.instance}
    <div class="error-container">
      <p class="error-msg">Failed to load drill: {loadError}</p>
      <ActionButton variant="primary" onclick={() => loadAndGenerate()}>Retry</ActionButton>
    </div>
  {:else if runnerState.instance && runnerState.definition}
    <TrainingModuleShell
      title={runnerState.definition.label}
      task={runnerState.instance.prompt}
      taskKeywords={taskKeywords}
      onSkip={handleSkip}
    >
      {#snippet children()}
        <div class="drill-body" class:is-loading={isLoading}>
          <div class="timer-bar-row">
            <DrillTimerControls bind:mode={timerMode} {difficultyOffset} onModeChange={(newMode) => { sprintComplete = false; handleModeChange(newMode); }} />
          </div>
          {#if isGraceRound}
            <div class="grace-notice">Grace Round — Mode switch warm-up (Points unrated)</div>
          {/if}
          <CountdownBar {durationMs} active={isTimerActive} resetOnAttempt={timerMode === 'per-attempt'} onTimeout={handleTimerTimeout} />

          {#if sprintComplete}
            <div class="sprint-summary-card">
              <div class="sprint-summary-header">
                <span class="sprint-title">🏁 60-Second Sprint Complete!</span>
              </div>
              <div class="sprint-score-grid">
                <div class="score-stat">
                  <span class="stat-value">{sprintCorrect} / {sprintAttempts}</span>
                  <span class="stat-label">Solved</span>
                </div>
                <div class="score-stat">
                  <span class="stat-value">{sprintAttempts > 0 ? Math.round((sprintCorrect / sprintAttempts) * 100) : 0}%</span>
                  <span class="stat-label">Accuracy</span>
                </div>
                <div class="score-stat">
                  <span class="stat-value">{sprintBestStreak}</span>
                  <span class="stat-label">Best Streak</span>
                </div>
              </div>
              <ActionButton variant="primary" onclick={restartSprint}>Start New 60s Sprint &rarr;</ActionButton>
            </div>
          {/if}

          <div class="board-area">
            {#if activeAdapter}
              {@const AdapterComponent = activeAdapter}
              <AdapterComponent
                data={mergedPublicData()}
                reveal={runnerState.assessment?.reveal}
                disabled={runnerState.status !== 'active' || isLoading || sprintComplete}
                onSubmit={handleSubmitResponse}
              />
            {:else}
              <p class="error-text">Adapter '{runnerState.definition?.interaction}' not implemented.</p>
            {/if}
          </div>

          <div class="action-bar">
            {#if runnerState.status === 'active' && !sprintComplete}
              <button type="button" class="btn-text" onclick={() => runner.giveUp()}>Give up & show answer</button>
            {:else if runnerState.status === 'feedback' || sprintComplete}
              <div class="feedback-badge" class:correct={runnerState.assessment?.correct} class:incorrect={!runnerState.assessment?.correct}>
                <span class="feedback-msg">{sprintComplete ? 'Time up! 60s sprint completed.' : (runnerState.assessment?.feedback ?? '')}</span>
              </div>
              {#if !sprintComplete}
                <ActionButton variant="primary" onclick={handleContinue}>Continue &rarr;</ActionButton>
              {/if}
            {/if}
          </div>

          {#if loadError}<p class="error-msg">{loadError}</p>{/if}
          {#if runnerState.error}<p class="error-msg">{runnerState.error}</p>{/if}
        </div>
      {/snippet}
    </TrainingModuleShell>
  {/if}
</div>

<style>
  .drill-runner-container {
    width: 100%;
    min-height: calc(var(--training-board-size, 480px) + 160px);
    display: flex;
    flex-direction: column;
  }
  .loading-state, .error-container {
    min-height: calc(var(--training-board-size, 480px) + 160px);
    width: 100%;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--text-4);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    box-sizing: border-box;
  }
  .timer-bar-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
  .grace-notice {
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-dim);
    border: 1px solid var(--accent-border);
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    text-align: center;
  }
  .sprint-summary-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.25rem;
    background: var(--surface-1);
    border: 1px solid var(--accent);
    border-radius: 8px;
    text-align: center;
    width: 100%;
    max-width: var(--training-board-size, 480px);
    box-sizing: border-box;
  }
  .sprint-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .sprint-score-grid {
    display: flex;
    justify-content: center;
    gap: 1.75rem;
    margin: 0.25rem 0 0.5rem;
  }
  .score-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .score-stat .stat-value {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--accent);
  }
  .score-stat .stat-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .drill-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    transition: opacity 0.15s ease;
  }
  .drill-body.is-loading {
    opacity: 0.6;
    pointer-events: none;
  }
  .board-area {
    width: 100%;
    min-height: var(--training-board-size, 480px);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .action-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 2.75rem;
  }
  .btn-text {
    background: transparent;
    border: none;
    color: var(--text-4);
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.4rem 0.75rem;
  }
  .btn-text:hover {
    color: var(--text-1);
  }
  .feedback-badge {
    padding: 0.5rem 0.85rem;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    display: inline-flex;
    align-items: center;
  }
  .feedback-badge.correct {
    background: var(--success-dim);
    border-color: var(--success);
    color: var(--success);
  }
  .feedback-badge.incorrect {
    background: var(--error-dim);
    border-color: var(--error);
    color: var(--error);
  }
  .feedback-msg {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
  }
  .error-text, .error-msg { color: var(--error); font-size: 0.85rem; }
</style>

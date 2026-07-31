<script lang="ts">
  import { DrillRunnerMachine, type AttemptRecordEvent, type RunnerState } from '$lib/drills/runner';
  import type { LazyDrillEntry, DrillContext, SquareOrientation, InteractionKind, InteractionContracts } from '$lib/drills/types';
  import { INTERACTIONS } from './adapters';
  import TrainingModuleShell from '../TrainingModuleShell.svelte';
  import ActionButton from '../ActionButton.svelte';

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

  const runner = new DrillRunnerMachine<K>({
    onRecordAttempt: (evt) => onRecordAttempt?.(evt)
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

  function handleSkip() {
    runner.skip();
    if (onNextDrill) onNextDrill(); else loadAndGenerate();
  }

  function handleContinue() {
    if (onNextDrill) onNextDrill(); else loadAndGenerate();
  }

  const activeAdapter = $derived(
    runnerState.definition ? INTERACTIONS[runnerState.definition.interaction] : null
  );

  const mergedPublicData = $derived(() => {
    const pub = (runnerState.instance?.publicData as Record<string, unknown>) ?? {};
    return orientationOverride ? { ...pub, orientation: orientationOverride } : pub;
  });
</script>

<div class="drill-runner-container">
  {#if isLoading || runnerState.status === 'loading'}
    <div class="loading-state"><p>Loading drill...</p></div>
  {:else if loadError}
    <div class="error-container">
      <p class="error-msg">Failed to load drill: {loadError}</p>
      <ActionButton variant="primary" onclick={() => loadAndGenerate()}>Retry</ActionButton>
    </div>
  {:else if runnerState.instance && runnerState.definition}
    <TrainingModuleShell
      title={runnerState.definition.label}
      task={runnerState.instance.prompt}
      onSkip={handleSkip}
    >
      {#snippet children()}
        <div class="drill-body">
          <div class="header-controls">
            {#if runnerState.status === 'active'}
              <button type="button" class="btn-text" onclick={() => runner.giveUp()}>Give up & show answer</button>
            {/if}
          </div>

          <div class="board-area">
            {#if activeAdapter}
              {@const AdapterComponent = activeAdapter}
              <AdapterComponent
                data={mergedPublicData()}
                reveal={runnerState.assessment?.reveal}
                disabled={runnerState.status !== 'active'}
                onSubmit={handleSubmitResponse}
              />
            {:else}
              <p class="error-text">Adapter '{runnerState.definition?.interaction}' not implemented.</p>
            {/if}
          </div>

          {#if runnerState.status === 'feedback'}
            <div class="feedback-section">
              <div class="feedback-box" class:correct={runnerState.assessment?.correct} class:incorrect={!runnerState.assessment?.correct}>
                <p class="feedback-msg">{runnerState.assessment?.feedback ?? ''}</p>
              </div>
              <div class="continue-row">
                <ActionButton variant="primary" onclick={handleContinue}>Continue &rarr;</ActionButton>
              </div>
            </div>
          {/if}

          {#if runnerState.error}<p class="error-msg">{runnerState.error}</p>{/if}
        </div>
      {/snippet}
    </TrainingModuleShell>
  {/if}
</div>

<style>
  .drill-runner-container { width: 100%; }
  .loading-state, .error-container { padding: 3rem; text-align: center; color: var(--text-4); display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .drill-body { display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; }
  .header-controls { display: flex; justify-content: flex-end; gap: 0.5rem; width: 100%; }
  .btn-text { background: transparent; border: none; color: var(--text-4); font-size: 0.85rem; cursor: pointer; padding: 0.2rem 0.5rem; }
  .btn-text:hover { color: var(--text-1); }
  .board-area { width: 100%; display: flex; justify-content: center; }
  .feedback-section { display: flex; flex-direction: column; gap: 1rem; width: 100%; margin-top: 1rem; }
  .feedback-box { padding: 0.75rem 1rem; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border); }
  .feedback-box.correct { background: var(--success-dim); border-color: var(--success); color: var(--success); }
  .feedback-box.incorrect { background: var(--error-dim); border-color: var(--error); color: var(--error); }
  .feedback-msg { margin: 0; font-size: 0.95rem; font-weight: 600; }
  .error-text, .error-msg { color: var(--error); font-size: 0.85rem; }
</style>

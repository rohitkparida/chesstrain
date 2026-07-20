<script lang="ts">
  import { onDestroy } from 'svelte';
  import TrainingModuleCard from '../../components/TrainingModuleCard.svelte';
  import { TRAINING_MODULES } from '../../components/trainingCatalog';
  import { MODULE_PREREQUISITES, isModuleUnlocked, type ModuleProgress, type TrainingModuleId } from '$lib/learning/training';
  import { sessionStore } from '../../stores/session';

  const groups = [
    { title: 'See the Board', modules: ['board-grip', 'tactics', 'calculation'] as TrainingModuleId[] },
    { title: 'Choose Better Moves', modules: ['positional', 'decision'] as TrainingModuleId[] },
    { title: 'Know the Position', modules: ['openings', 'endgame', 'mistakes'] as TrainingModuleId[] }
  ];

  let progress = $state<Partial<Record<TrainingModuleId, ModuleProgress>>>({});
  const unsubscribe = sessionStore.subscribe((state) => {
    progress = state.moduleProgress;
  });
  onDestroy(unsubscribe);

  function moduleCard(module: TrainingModuleId) {
    return TRAINING_MODULES.find((entry) => entry.module === module) ?? TRAINING_MODULES[0];
  }

  function isUnlocked(module: TrainingModuleId) {
    return progress[module]?.unlocked ?? isModuleUnlocked(module, progress);
  }

  function lockReason(module: TrainingModuleId) {
    const prerequisites = MODULE_PREREQUISITES[module];
    if (prerequisites.length === 0) return '';
    const names = prerequisites.map((prerequisite) => moduleCard(prerequisite).name).join(' and ');
    return `Reach 90% recent accuracy in ${names}.`;
  }

  function unlockHref(module: TrainingModuleId) {
    const prerequisite = MODULE_PREREQUISITES[module][0];
    return prerequisite ? moduleCard(prerequisite).href : '';
  }

  const recommendedModule = $derived(TRAINING_MODULES.find((entry) => {
    const current = progress[entry.module];
    return entry.module !== 'mistakes' && (!current || !current.mastered);
  }));

  function progressText(module: TrainingModuleId) {
    const current = progress[module];
    if (!current || current.masteryScore === null) return 'Not started';
    return `${Math.round(current.masteryScore * 100)}% recent accuracy`; 
  }
</script>

<svelte:head>
  <title>Train | Magnus Engine</title>
  <meta name="description" content="Choose a focused chess training module." />
</svelte:head>

<main class="train-home">
  <header class="intro">
    <p class="eyebrow">Train</p>
    <h1>Choose a skill</h1>
  </header>

  {#if recommendedModule}
    <div class="recommended">
      <span><small>Next up</small><strong>{recommendedModule.name}</strong><span>{recommendedModule.description}</span></span>
      <a class="recommended-action" aria-label={`Start ${recommendedModule.name}`} href={recommendedModule.href}>Start</a>
    </div>
  {/if}

  <div class="groups">
    {#each groups as group}
      <section class="group" aria-labelledby={group.title.replaceAll(' ', '-').toLowerCase()}>
        <div class="group-heading">
          <h2 id={group.title.replaceAll(' ', '-').toLowerCase()}>{group.title}</h2>
        </div>
        <div class="drills">
          {#each group.modules as module}
            {#if module !== recommendedModule?.module}
            {@const card = moduleCard(module)}
            {@const unlocked = isUnlocked(module)}
            <TrainingModuleCard
              name={card.name}
              description={card.description}
              href={card.href}
              icon={card.icon}
              {unlocked}
              progressText={unlocked ? progressText(module) : ''}
              lockReason={unlocked ? '' : lockReason(module)}
              unlockHref={unlocked ? '' : unlockHref(module)}
            />
            {/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>
</main>

<style>
  .train-home { display: grid; gap: 1.75rem; width: min(100%, 860px); }
  .intro, .group-heading { display: grid; gap: 0.3rem; }
  .eyebrow { margin: 0; color: var(--accent); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
  h1, h2, p { margin: 0; }
  h1 { color: var(--text-1); font-size: 1.8rem; }
  h2 { color: var(--text-1); font-size: 1.15rem; }
  .recommended { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-width: 0; padding: 0.9rem 1rem; border-left: 3px solid var(--accent); background: var(--accent-dim); color: inherit; text-decoration: none; }
  .recommended > span { display: grid; gap: 0.2rem; min-width: 0; }
  .recommended small { color: var(--accent); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  .recommended strong { color: var(--text-1); font-size: 0.95rem; }
  .recommended span span { color: var(--text-4); font-size: 0.78rem; line-height: 1.35; overflow-wrap: anywhere; }
  .recommended-action { flex: 0 0 auto; padding: 0.55rem 0.7rem; border: 1px solid var(--accent-border); border-radius: 6px; color: var(--accent); font-size: 0.78rem; font-weight: 700; text-decoration: none; }
  .groups { display: grid; gap: 1.75rem; }
  .group { display: grid; gap: 0.7rem; padding-top: 1.2rem; }
  .group:first-child { padding-top: 0; }
  .drills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem; }
  @media (max-width: 700px) { .drills { grid-template-columns: 1fr; } }
</style>

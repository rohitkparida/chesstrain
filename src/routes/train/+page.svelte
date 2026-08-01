<script lang="ts">
  import { onDestroy } from 'svelte';
  import TrainingModuleCard from '../../components/TrainingModuleCard.svelte';
  import { TRAINING_MODULES } from '../../components/trainingCatalog';
  import { MODULE_PREREQUISITES, type ModuleProgress, type TrainingModuleId } from '$lib/learning/training';
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
    return progress[module]?.unlocked ?? (MODULE_PREREQUISITES[module].length === 0);
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
    <h1>Train a skill</h1>
  </header>

  <div class="groups">
    {#each groups as group}
      <section class="group" aria-labelledby={group.title.replaceAll(' ', '-').toLowerCase()}>
        <div class="group-heading">
          <h2 id={group.title.replaceAll(' ', '-').toLowerCase()}>{group.title}</h2>
        </div>
        <div class="drills">
          {#each group.modules as module}
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
          {/each}
        </div>
      </section>
    {/each}
  </div>
</main>

<style>
  .train-home { display: grid; gap: 1.75rem; width: min(100%, var(--content-width)); margin: 0 auto; }
  .intro, .group-heading { display: grid; gap: 0.3rem; }
  h1, h2 { margin: 0; }
  h1 { color: var(--text-1); font-size: 1.8rem; }
  h2 { color: var(--text-1); font-size: 1.15rem; }
  .groups { display: grid; gap: 1.75rem; }
  .group { display: grid; gap: 0.7rem; padding-top: 1.2rem; }
  .group:first-child { padding-top: 0; }
  .drills { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.7rem; }
  @media (max-width: 700px) { .drills { grid-template-columns: 1fr; } }
</style>

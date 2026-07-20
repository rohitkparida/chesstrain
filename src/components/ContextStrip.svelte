<script lang="ts">
  import GlossaryText from './GlossaryText.svelte';
  let {
    module = '',
    skill = '',
    puzzleNum = 0,
    puzzleTotal = 0,
  } = $props<{
    module?: string;
    skill?: string;
    puzzleNum?: number;
    puzzleTotal?: number;
  }>();

  function displayModule(value: string) {
    if (value === 'Decision Making') return 'Decision';
    if (value === 'Tactics Training') return 'Tactics';
    return value;
  }
</script>

<div class="context-strip">
  {#if module}<span class="module-name"><GlossaryText text={displayModule(module)} /></span>{/if}
  <div class="right-meta">
    {#if skill}<span class="skill-tag"><GlossaryText text={skill} /></span>{/if}
    {#if puzzleNum > 0}<span class="puzzle-count">Attempt {puzzleNum}{#if puzzleTotal > 0} of {puzzleTotal}{/if}</span>{/if}
  </div>
</div>

<style>
  .context-strip { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; font-size: 0.82rem; }
  .module-name { color: var(--text-2); font-weight: 700; }
  .right-meta { display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; }
  .skill-tag { color: var(--accent); font-size: 0.75rem; font-weight: 600; }
  .puzzle-count { color: var(--text-4); }
</style>

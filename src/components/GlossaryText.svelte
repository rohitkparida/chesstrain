<script lang="ts">
  import ChessTerm from './ChessTerm.svelte';
  import { glossarySegments } from '$lib/chess/dictionary';

  let { text } = $props<{ text: string }>();
  const segments = $derived(glossarySegments(text));
</script>

<span class="glossary-text">{#each segments as segment}{#if segment.termId}<ChessTerm term={segment.termId}>{segment.text}</ChessTerm>{:else}{segment.text}{/if}{/each}</span>

<style>
  .glossary-text { display: contents; }
</style>

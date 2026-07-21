<script lang="ts">
  import GlossaryText from './GlossaryText.svelte';

  let { text, keywords = [] } = $props<{ text: string; keywords?: string[] }>();

  function escapePattern(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function splitInstruction(value: string, highlights: string[]) {
    const usable = highlights.filter(Boolean).sort((left, right) => right.length - left.length);
    if (usable.length === 0) return [{ text: value, highlighted: false }];
    const pattern = new RegExp(`(${usable.map(escapePattern).join('|')})`, 'gi');
    const normalized = new Set(usable.map((keyword) => keyword.toLowerCase()));
    return value.split(pattern)
      .filter(Boolean)
      .map((part) => ({ text: part, highlighted: normalized.has(part.toLowerCase()) }));
  }

  let parts = $derived(splitInstruction(text, keywords));
</script>

<span class="instruction">
  {#each parts as part}
    {#if part.highlighted}<strong><GlossaryText text={part.text} /></strong>{:else}<GlossaryText text={part.text} />{/if}
  {/each}
</span>

<style>
  .instruction { color: var(--text-3); font: inherit; line-height: 1.4; }
  strong { color: var(--accent); font-weight: 700; }
</style>

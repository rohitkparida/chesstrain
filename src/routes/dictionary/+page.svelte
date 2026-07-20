<script lang="ts">
  import DictionaryVisual from '../../components/DictionaryVisual.svelte';
  import GlossaryText from '../../components/GlossaryText.svelte';
  import { CHESS_DICTIONARY } from '$lib/chess/dictionary';

  let query = $state('');
  let expanded = $state<Set<string>>(new Set());
  const filteredEntries = $derived(CHESS_DICTIONARY.filter((entry) => {
    const text = `${entry.term} ${entry.shortDefinition} ${entry.definition}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }));

  function toggleEntry(id: string): void {
    expanded = new Set(expanded);
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
  }

  function clearSearch(): void {
    query = '';
  }

</script>

<svelte:head>
  <title>Chess Dictionary | Magnus Engine</title>
  <meta name="description" content="Plain-language chess definitions with visual examples." />
</svelte:head>

<main class="dictionary-page">
  <header class="page-header">
    <h1>Chess dictionary</h1>
    <p>Visual definitions for chess terms.</p>
    <label class="search-label" for="dictionary-search">Search chess terms</label>
    <div class="search-wrap">
      <input id="dictionary-search" class="search" bind:value={query} placeholder="Pin, tempo, endgame..." />
      {#if query}<button class="clear-search" type="button" onclick={clearSearch} aria-label="Clear search">×</button>{/if}
    </div>
    <span class="result-count">{filteredEntries.length} {filteredEntries.length === 1 ? 'term' : 'terms'}</span>
  </header>

  <div class="dictionary-grid">
    {#each filteredEntries as entry}
      <article id={entry.id} class="entry">
        <div class="entry-heading">
          <span class="term-copy"><strong>{entry.term}</strong><span>{entry.shortDefinition}</span></span>
        </div>
        <div class="entry-body">
          <DictionaryVisual type={entry.visual} termId={entry.id} caption={entry.visualCaption} />
          <button class="more" type="button" onclick={() => toggleEntry(entry.id)} aria-expanded={expanded.has(entry.id)}>
            {expanded.has(entry.id) ? 'Less' : 'More'}
          </button>
          {#if expanded.has(entry.id)}
            <div class="entry-copy">
              <p><GlossaryText text={entry.definition} /></p>
              <p class="example">{entry.example}</p>
            </div>
          {/if}
        </div>
      </article>
    {:else}
      <p class="empty">No matching terms.</p>
    {/each}
  </div>
</main>

<style>
  .dictionary-page { max-width: 980px; display: grid; gap: 1.5rem; }
  .page-header { display: grid; gap: 0.35rem; }
  .page-header h1, .page-header p { margin: 0; }
  .page-header h1 { color: var(--text-1); font-size: 1.8rem; }
  .page-header p:last-child { color: var(--text-4); line-height: 1.5; }
  .search-label { margin-top: 0.65rem; color: var(--text-2); font-size: 0.8rem; font-weight: 700; }
  .search-wrap { position: relative; width: min(100%, 520px); }
  .search { width: 100%; padding: 0.7rem 2.3rem 0.7rem 0.7rem; border: 1px solid var(--border-sub); border-radius: 6px; background: var(--surface-2); color: var(--text-1); font: inherit; }
  .search:focus { border-color: var(--accent); outline: 2px solid var(--accent-border); }
  .clear-search { position: absolute; top: 50%; right: 0.45rem; transform: translateY(-50%); width: 1.8rem; height: 1.8rem; border: 0; background: transparent; color: var(--text-4); font-size: 1.2rem; cursor: pointer; }
  .clear-search:hover { color: var(--text-1); }
  .result-count { color: var(--text-5); font-size: 0.75rem; }
  .dictionary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .entry { border-top: 1px solid var(--border); background: var(--surface-1); }
  .entry-heading { display: flex; align-items: center; gap: 0.75rem; min-height: 4.2rem; padding: 0.85rem 0.9rem; }
  .term-copy { display: grid; gap: 0.25rem; }
  .term-copy strong { color: var(--text-1); font-size: 1.05rem; }
  .term-copy span { color: var(--accent); font-size: 0.82rem; font-weight: 700; }
  .entry-body { display: grid; gap: 0; border-top: 1px solid var(--border); }
  .more { justify-self: start; margin: 0 0.9rem; padding: 0.35rem 0; border: 0; background: transparent; color: var(--accent); font: inherit; font-size: 0.78rem; font-weight: 700; cursor: pointer; }
  .entry-copy { display: grid; gap: 0.45rem; padding: 0.9rem; }
  p { margin: 0; }
  .entry-copy p { color: var(--text-3); font-size: 0.86rem; line-height: 1.45; }
  .example { color: var(--text-4) !important; }
  .empty { color: var(--text-4); }
  @media (max-width: 700px) { .dictionary-grid { grid-template-columns: 1fr; } }
</style>

<script lang="ts">
  import DictionaryVisual from '../../components/DictionaryVisual.svelte';
  import GlossaryText from '../../components/GlossaryText.svelte';
  import { CHESS_DICTIONARY } from '$lib/chess/dictionary';

  let query = $state('');
  const filteredEntries = $derived(CHESS_DICTIONARY.filter((entry) => {
    const text = `${entry.term} ${entry.shortDefinition} ${entry.definition}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }));

</script>

<svelte:head>
  <title>Chess Dictionary | Magnus Engine</title>
  <meta name="description" content="Plain-language chess definitions with visual examples." />
</svelte:head>

<main class="dictionary-page">
  <header class="page-header">
    <h1>Chess dictionary</h1>
    <p>Plain definitions with visual examples.</p>
    <label class="search-label" for="dictionary-search">Search</label>
    <input id="dictionary-search" class="search" bind:value={query} placeholder="Pin, tempo, endgame..." />
  </header>

  <div class="dictionary-grid">
    {#each filteredEntries as entry}
      <article id={entry.id} class="entry">
        <div class="entry-heading">
          <span class="term-copy"><strong>{entry.term}</strong><span>{entry.shortDefinition}</span></span>
        </div>
        <div class="entry-body">
          <DictionaryVisual type={entry.visual} termId={entry.id} caption={entry.visualCaption} />
          <div class="entry-copy">
            <p><GlossaryText text={entry.definition} /></p>
            <p class="example"><strong>Example:</strong> {entry.example}</p>
          </div>
        </div>
      </article>
    {:else}
      <p class="empty">No terms match “{query}”.</p>
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
  .search { width: min(100%, 520px); padding: 0.7rem; border: 1px solid var(--border-sub); border-radius: 6px; background: var(--surface-2); color: var(--text-1); font: inherit; }
  .search:focus { border-color: var(--accent); outline: 2px solid var(--accent-border); }
  .dictionary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .entry { border-top: 1px solid var(--border); background: var(--surface-1); }
  .entry-heading { display: flex; align-items: center; gap: 0.75rem; min-height: 4.2rem; padding: 0.85rem 0.9rem; }
  .term-copy { display: grid; gap: 0.25rem; }
  .term-copy strong { color: var(--text-1); font-size: 1.05rem; }
  .term-copy span { color: var(--accent); font-size: 0.82rem; font-weight: 700; }
  .entry-body { display: grid; gap: 0; border-top: 1px solid var(--border); }
  .entry-copy { display: grid; gap: 0.45rem; padding: 0.9rem; }
  p { margin: 0; }
  .entry-copy p { color: var(--text-3); font-size: 0.86rem; line-height: 1.45; }
  .example { color: var(--text-4) !important; }
  .example strong { color: var(--text-2); }
  .empty { color: var(--text-4); }
  @media (max-width: 700px) { .dictionary-grid { grid-template-columns: 1fr; } }
</style>

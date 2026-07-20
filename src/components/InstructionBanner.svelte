<script lang="ts">
  import GlossaryText from './GlossaryText.svelte';
  let { title = 'YOUR TASK', hint } = $props<{
    title?: string;
    hint: string;
  }>();
</script>

<section class="instruction-banner" aria-labelledby="task-title">
  <span class="banner-icon">&#127919;</span>
  <div>
    <strong id="task-title"><GlossaryText text={title} /></strong>
    <span><GlossaryText text={hint} /></span>
  </div>
</section>

<style>
  .instruction-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.15rem 0 0.8rem;
    border-bottom: 1px solid var(--accent-border);
    color: var(--text-3);
    font-size: 0.88rem;
  }
  .banner-icon { flex-shrink: 0; font-size: 1.05rem; }
  strong {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--text-1);
    font-size: 0.78rem;
    letter-spacing: 1px;
  }
  span:last-child {
    color: var(--text-4);
    font-size: 0.84rem;
    line-height: 1.5;
  }
</style>

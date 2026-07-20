<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'quiet',
    type = 'button',
    disabled = false,
    ariaLabel,
    children,
    onclick,
  } = $props<{
    variant?: 'primary' | 'quiet' | 'danger';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    ariaLabel?: string;
    children: Snippet;
    onclick?: (event: MouseEvent) => void;
  }>();
</script>

<button class={variant} {type} {disabled} aria-label={ariaLabel} {onclick}>
  {@render children()}
</button>

<style>
  button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .quiet { background: transparent; border: 1px solid var(--border-sub); color: var(--text-2); }
  .quiet:hover:not(:disabled) { background: var(--surface-4); color: var(--text-1); }
  .primary { background: var(--accent); border: 1px solid var(--accent); color: var(--bg); }
  .primary:hover:not(:disabled) { filter: brightness(1.08); }
  .danger { background: var(--error); border: 1px solid var(--error); color: var(--bg); }
</style>

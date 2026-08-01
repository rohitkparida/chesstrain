<script lang="ts">
  import type { SquareTapData } from '$lib/drills/types';
  import ActionButton from '../../ActionButton.svelte';
  import SquareBoardView from './SquareBoardView.svelte';

  let {
    data,
    reveal,
    disabled = false,
    onSubmit
  } = $props<{
    data: SquareTapData;
    reveal?: unknown;
    disabled?: boolean;
    onSubmit: (response: string) => void;
  }>();

  function handleSquareClick(square: string) {
    if (disabled) return;
    onSubmit(square);
  }

  function handleNoneClick() {
    if (disabled) return;
    onSubmit('none');
  }
</script>

<div class="square-tap-interaction">
  <SquareBoardView
    {data}
    {reveal}
    {disabled}
    onChoose={handleSquareClick}
  />
  {#if data.allowNone}
    <div class="actions">
      <ActionButton variant="quiet" disabled={disabled} onclick={handleNoneClick}>
        No squares
      </ActionButton>
    </div>
  {/if}
</div>

<style>
  .square-tap-interaction {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .actions {
    display: flex;
    justify-content: center;
  }
</style>

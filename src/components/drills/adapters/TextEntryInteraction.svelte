<script lang="ts">
	import type { SquareBoardData } from '$lib/drills/types';
	import SquareBoardView from './SquareBoardView.svelte';

	interface Props {
		data: SquareBoardData;
		reveal?: unknown;
		disabled?: boolean;
		onSubmit: (response: string) => void;
	}

	let { data, reveal, disabled = false, onSubmit }: Props = $props();

	let inputValue = $state('');
	let inputEl: HTMLInputElement | null = $state(null);

	$effect(() => {
		data;
		inputValue = '';
	});

	function handleSubmit(e?: Event) {
		if (e) e.preventDefault();
		const trimmed = inputValue.trim().toLowerCase();
		if (!trimmed || disabled) return;
		onSubmit(trimmed);
		inputValue = '';
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;
		if (/^[a-h][1-8]$/i.test(inputValue.trim())) {
			handleSubmit();
		}
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (disabled) return;
		if (e.ctrlKey || e.altKey || e.metaKey) return;
		
		if (document.activeElement !== inputEl) {
			if (/^[a-h1-8]$/i.test(e.key) && e.key.length === 1) {
				inputValue += e.key;
				if (inputEl) inputEl.focus();
				if (/^[a-h][1-8]$/i.test(inputValue.trim())) {
					handleSubmit();
				}
			} else if (e.key === 'Backspace') {
				inputValue = inputValue.slice(0, -1);
				if (inputEl) inputEl.focus();
			}
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="text-entry-interaction">
	<div class="board-container">
		<SquareBoardView
			{data}
			{reveal}
			{disabled}
		/>
	</div>

	<form class="entry-controls" onsubmit={handleSubmit}>
		<input
			bind:this={inputEl}
			type="text"
			class="square-input"
			placeholder="Type coordinate (e.g. e4)"
			maxlength="2"
			bind:value={inputValue}
			oninput={handleInput}
			disabled={disabled}
			autocomplete="off"
		/>
		<button type="submit" class="submit-btn" disabled={disabled || !inputValue.trim()}>
			Submit
		</button>
	</form>
</div>

<style>
	.text-entry-interaction {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		width: 100%;
	}

	.board-container {
		width: var(--training-board-size, 480px);
		max-width: 100%;
	}

	.entry-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: 320px;
	}

	.square-input {
		flex: 1;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.6rem 0.85rem;
		font-size: 1rem;
		color: var(--text-1);
		text-align: center;
		text-transform: lowercase;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.square-input:focus {
		border-color: var(--accent);
	}

	.submit-btn {
		background: var(--accent);
		color: #ffffff;
		border: none;
		border-radius: 8px;
		padding: 0.6rem 1.25rem;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s ease;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>

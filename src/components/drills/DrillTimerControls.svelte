<script lang="ts">
	import { type TimerMode, getTimerConfig } from '$lib/learning/timerSystem';

	let {
		mode = $bindable<'none' | 'session' | 'per-attempt'>('session'),
		difficultyOffset = 0,
		onModeChange
	} = $props<{
		mode?: TimerMode;
		difficultyOffset?: number;
		onModeChange?: (mode: TimerMode) => void;
	}>();

	const config = $derived(getTimerConfig(mode, 3, difficultyOffset));
</script>

<div class="timer-controls">
	<div class="mode-selector" role="group" aria-label="Timer mode selection">
		<button
			type="button"
			class="mode-btn"
			class:active={mode === 'session'}
			onclick={() => { mode = 'session'; onModeChange?.('session'); }}
			title={`Standard 60s Session Sprint (Target: ${config.targetRPM} RPM)`}
		>
			<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<circle cx="12" cy="12" r="10" />
				<polyline points="12 6 12 12 16 14" />
			</svg>
			<span>60s Sprint</span>
		</button>

		<button
			type="button"
			class="mode-btn"
			class:active={mode === 'per-attempt'}
			onclick={() => { mode = 'per-attempt'; onModeChange?.('per-attempt'); }}
			title={`Per-Attempt Blitz (${config.perAttemptSeconds}s per round)`}
		>
			<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
			</svg>
			<span>Blitz ({config.perAttemptSeconds}s)</span>
		</button>

		<button
			type="button"
			class="mode-btn"
			class:active={mode === 'none'}
			onclick={() => { mode = 'none'; onModeChange?.('none'); }}
			title="Untimed practice mode"
		>
			<span>Untimed</span>
		</button>
	</div>
</div>

<style>
	.timer-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.mode-selector {
		display: inline-flex;
		gap: 0.35rem;
		background: var(--surface-2);
		padding: 0.2rem;
		border-radius: 8px;
		border: 1px solid var(--border);
	}
	.mode-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.65rem;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--text-4);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.mode-btn:hover {
		color: var(--text-1);
	}
	.mode-btn.active {
		background: var(--surface-1);
		color: var(--text-1);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}
</style>

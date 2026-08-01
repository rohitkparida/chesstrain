<script lang="ts">
	import { onDestroy } from 'svelte';

	let {
		durationMs = 60000,
		active = false,
		resetOnAttempt = false,
		onTimeout
	} = $props<{
		durationMs?: number;
		active?: boolean;
		resetOnAttempt?: boolean;
		onTimeout?: () => void;
	}>();

	let remainingMs = $state(60000);
	let animationFrameId: number | null = null;
	let startTime: number | null = null;
	let startRemainingMs = $state(60000);

	$effect(() => {
		durationMs;
		if (resetOnAttempt) {
			remainingMs = durationMs;
			startRemainingMs = durationMs;
		}
	});

	const percent = $derived(Math.max(0, Math.min(100, (remainingMs / durationMs) * 100)));
	const colorClass = $derived(
		percent > 30 ? 'accent' : percent > 15 ? 'warning' : 'danger'
	);

	$effect(() => {
		if (active) {
			startCountdown();
		} else {
			stopCountdown();
			if (resetOnAttempt) {
				remainingMs = durationMs;
			}
		}
	});

	function startCountdown() {
		stopCountdown();
		startTime = performance.now();
		if (resetOnAttempt) {
			startRemainingMs = durationMs;
		} else {
			startRemainingMs = remainingMs > 0 ? remainingMs : durationMs;
		}

		const tick = (now: number) => {
			if (!startTime) return;
			const elapsed = now - startTime;
			const currentRemaining = Math.max(0, startRemainingMs - elapsed);
			remainingMs = currentRemaining;

			if (currentRemaining > 0) {
				animationFrameId = requestAnimationFrame(tick);
			} else {
				stopCountdown();
				onTimeout?.();
			}
		};

		animationFrameId = requestAnimationFrame(tick);
	}

	function stopCountdown() {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		startTime = null;
	}

	onDestroy(() => {
		stopCountdown();
	});
</script>

{#if active || remainingMs < durationMs}
	<div class="countdown-bar-container" aria-label="Countdown timer progress">
		<div
			class="countdown-bar-fill {colorClass}"
			style="width: {percent}%;"
		></div>
	</div>
{/if}

<style>
	.countdown-bar-container {
		width: 100%;
		height: 4px;
		background: var(--surface-3);
		border-radius: 2px;
		overflow: hidden;
		margin: 0.25rem 0;
	}

	.countdown-bar-fill {
		height: 100%;
		transition: width 80ms linear, background-color 0.3s ease;
		border-radius: 2px;
	}

	.countdown-bar-fill.accent {
		background: var(--accent);
	}

	.countdown-bar-fill.warning {
		background: var(--warning);
	}

	.countdown-bar-fill.danger {
		background: var(--error);
	}
</style>

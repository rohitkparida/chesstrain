<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { PieceSymbol, Color } from 'chess.js';
	import ChessBoard from '../../ChessBoard.svelte';
	import ActionButton from '../../ActionButton.svelte';
	import SquareBoardView from './SquareBoardView.svelte';
	import { pieceGlyph } from '$lib/chess/board';
	import { buildFenFromMap, generateRandomPosition } from '$lib/drills/vision/boardMemoryUtils';
	import type { BoardMemoryLevel, SquareBoardData } from '$lib/drills/types';

	let {
		data,
		reveal,
		disabled = false,
		onSubmit
	} = $props<{
		data: {
			fen: string;
			memorizeSeconds?: number;
			orientation?: 'white' | 'black' | 'side-to-move';
			pieceCount?: number;
			level?: BoardMemoryLevel;
		};
		reveal?: unknown;
		disabled?: boolean;
		onSubmit: (response: { placedFen: string }) => void;
	}>();

	let phase = $state<'memorize' | 'reconstruct'>('memorize');
	let activeLevel = $state<BoardMemoryLevel>('adaptive');
	let activeFen = $state('');
	let activePieceCount = $state(4);

	let remainingMs = $state(3000);
	let selectedPiece = $state<string | null>('P');
	let userMap = $state(new Map<string, { type: PieceSymbol; color: Color }>());
	let timerId: number | null = null;
	let startTime: number | null = null;

	const LEVEL_PRESETS: { id: BoardMemoryLevel; label: string; count: number | null }[] = [
		{ id: 'adaptive', label: 'Adaptive', count: null },
		{ id: 'beginner', label: 'Beginner', count: 4 },
		{ id: 'intermediate', label: 'Intermediate', count: 6 },
		{ id: 'advanced', label: 'Advanced', count: 10 }
	];

	const PIECE_TYPES: { type: PieceSymbol; name: string }[] = [
		{ type: 'p', name: 'Pawn' },
		{ type: 'n', name: 'Knight' },
		{ type: 'b', name: 'Bishop' },
		{ type: 'r', name: 'Rook' },
		{ type: 'q', name: 'Queen' },
		{ type: 'k', name: 'King' }
	];

	const PALETTE_COLORS: { color: Color; label: string }[] = [
		{ color: 'w', label: 'White' },
		{ color: 'b', label: 'Black' }
	];

	const memorizeSeconds = $derived(data.memorizeSeconds ?? 3);
	const targetDurationMs = $derived(memorizeSeconds * 1000);
	const percent = $derived(Math.max(0, Math.min(100, (remainingMs / targetDurationMs) * 100)));
	const boardOrientation = $derived(data.orientation === 'black' ? 'black' : 'white');
	const userFen = $derived(buildFenFromMap(userMap));
	const displayFen = $derived(reveal ? activeFen : userFen);
	const reconstructBoardData = $derived<SquareBoardData>({
		fen: displayFen,
		orientation: boardOrientation
	});

	$effect(() => {
		if (activeLevel === 'adaptive') {
			activeFen = data.fen;
			activePieceCount = data.pieceCount ?? 4;
		}
		resetDrillState();
	});

	onMount(() => {
		try {
			const saved = localStorage.getItem('board_memory_level_preset');
			if (saved && ['adaptive', 'beginner', 'intermediate', 'advanced'].includes(saved)) {
				selectLevel(saved as BoardMemoryLevel);
			}
		} catch {}
	});

	function selectLevel(level: BoardMemoryLevel) {
		activeLevel = level;
		try {
			localStorage.setItem('board_memory_level_preset', level);
		} catch {}

		if (level === 'adaptive') {
			activeFen = data.fen;
			activePieceCount = data.pieceCount ?? 4;
		} else {
			const preset = LEVEL_PRESETS.find((p) => p.id === level);
			if (preset?.count) {
				const generated = generateRandomPosition(preset.count);
				activeFen = generated.fen;
				activePieceCount = generated.pieceCount;
			}
		}
		resetDrillState();
	}

	function resetDrillState() {
		stopTimer();
		phase = 'memorize';
		remainingMs = targetDurationMs;
		selectedPiece = 'P';
		userMap = new Map();
		startMemorizeCountdown();
	}

	function startMemorizeCountdown() {
		stopTimer();
		startTime = performance.now();
		remainingMs = targetDurationMs;

		const tick = (now: number) => {
			if (!startTime) return;
			const elapsed = now - startTime;
			const currentRemaining = Math.max(0, targetDurationMs - elapsed);
			remainingMs = currentRemaining;

			if (currentRemaining > 0) {
				timerId = requestAnimationFrame(tick);
			} else {
				stopTimer();
				transitionToReconstruct();
			}
		};

		timerId = requestAnimationFrame(tick);
	}

	function stopTimer() {
		if (timerId !== null) {
			cancelAnimationFrame(timerId);
			timerId = null;
		}
		startTime = null;
	}

	function transitionToReconstruct() {
		stopTimer();
		phase = 'reconstruct';
	}

	function handleSquareClick(square: string) {
		if (phase !== 'reconstruct' || disabled || reveal) return;
		const nextMap = new Map(userMap);
		const currentPiece = nextMap.get(square);

		if (
			currentPiece &&
			(!selectedPiece ||
				(currentPiece.color === (selectedPiece === selectedPiece.toUpperCase() ? 'w' : 'b') &&
					currentPiece.type === selectedPiece.toLowerCase()))
		) {
			nextMap.delete(square);
		} else if (selectedPiece) {
			const color: Color = selectedPiece === selectedPiece.toUpperCase() ? 'w' : 'b';
			const type = selectedPiece.toLowerCase() as PieceSymbol;
			nextMap.set(square, { type, color });
		}
		userMap = nextMap;
	}

	function handleSubmit() {
		if (disabled) return;
		onSubmit({ placedFen: userFen });
	}

	onDestroy(() => {
		stopTimer();
	});
</script>

<div class="board-memory-container">
	<div class="level-tabs" role="tablist" aria-label="Board Memory difficulty tabs">
		{#each LEVEL_PRESETS as preset (preset.id)}
			<button
				type="button"
				class="tab-btn"
				class:active={activeLevel === preset.id}
				onclick={() => selectLevel(preset.id)}
				role="tab"
				aria-selected={activeLevel === preset.id}
			>
				{preset.label}{preset.count ? ` (${preset.count})` : ''}
			</button>
		{/each}
	</div>

	{#if phase === 'memorize'}
		<div class="memorize-header">
			<div class="memorize-copy">
				<span class="memorize-title">Memorize Position ({activePieceCount} pieces)</span>
				<span class="memorize-sub">Board hides in {(remainingMs / 1000).toFixed(1)}s</span>
			</div>
			<ActionButton variant="quiet" onclick={transitionToReconstruct}>I'm ready &rarr;</ActionButton>
		</div>

		<div class="countdown-track">
			<div class="countdown-fill" style="width: {percent}%;"></div>
		</div>

		<ChessBoard fen={activeFen} orientation={boardOrientation} showUndo={false} showControls={false} />
	{:else}
		<div class="reconstruct-header">
			<span class="reconstruct-title">{reveal ? 'Actual Position Revealed' : 'Place the pieces on the board'}</span>
			<span class="reconstruct-sub">{reveal ? 'Green indicates your reconstructed accuracy.' : 'Tap a piece in the palette, then tap a square.'}</span>
		</div>

		<SquareBoardView
			data={reconstructBoardData}
			{reveal}
			disabled={disabled || Boolean(reveal)}
			onChoose={handleSquareClick}
		/>

		{#if !reveal}
			<div class="palette-container" role="group" aria-label="Piece selection palette">
				{#each PALETTE_COLORS as { color, label: colorLabel } (color)}
					<div class="palette-row">
						<span class="palette-label">{colorLabel}:</span>
						{#each PIECE_TYPES as { type, name: pieceName } (type)}
							{@const code = color === 'w' ? type.toUpperCase() : type}
							{@const key = `${color}${type.toUpperCase()}`}
							{@const icon = pieceGlyph(key)}
							{@const label = `${colorLabel} ${pieceName}`}
							<button
								type="button"
								class="piece-btn"
								class:selected={selectedPiece === code}
								onclick={() => (selectedPiece = code)}
								title={label}
								aria-label={label}
							>
								<span class="piece-icon">{icon}</span>
							</button>
						{/each}
					</div>
				{/each}
			</div>

			<div class="submit-row">
				<ActionButton variant="primary" disabled={disabled} onclick={handleSubmit}>
					Submit Position
				</ActionButton>
			</div>
		{/if}
	{/if}
</div>

<style>
	.board-memory-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		max-width: var(--training-board-size, 480px);
		margin: 0 auto;
	}
	.level-tabs {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: var(--surface-2);
		padding: 0.25rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		margin-bottom: 0.2rem;
		overflow-x: auto;
	}
	.tab-btn {
		flex: 1;
		font-size: 0.76rem;
		font-weight: 600;
		padding: 0.3rem 0.5rem;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--text-3);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.12s ease;
	}
	.tab-btn:hover {
		color: var(--text-1);
		background: var(--surface-3);
	}
	.tab-btn.active {
		color: var(--text-1);
		background: var(--surface-1);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}
	.memorize-header,
	.reconstruct-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.2rem;
	}
	.memorize-copy,
	.reconstruct-header {
		display: flex;
		flex-direction: column;
	}
	.memorize-title,
	.reconstruct-title {
		font-weight: 700;
		font-size: 0.95rem;
		color: var(--text-1);
	}
	.memorize-sub,
	.reconstruct-sub {
		font-size: 0.78rem;
		color: var(--text-4);
	}
	.countdown-track {
		width: 100%;
		height: 4px;
		background: var(--surface-3);
		border-radius: 2px;
		overflow: hidden;
	}
	.countdown-fill {
		height: 100%;
		background: var(--accent);
		transition: width 50ms linear;
	}
	.palette-container {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		background: var(--surface-2);
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		border: 1px solid var(--border);
		margin-top: 0.35rem;
	}
	.palette-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.palette-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-4);
		width: 42px;
	}
	.piece-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface-1);
		cursor: pointer;
		transition: all 0.12s ease;
	}
	.piece-btn:hover {
		border-color: var(--accent);
	}
	.piece-btn.selected {
		border-color: var(--accent);
		background: var(--accent-dim);
		box-shadow: 0 0 0 1px var(--accent);
	}
	.piece-icon {
		font-size: 1.3rem;
		line-height: 1;
		color: var(--text-1);
	}
	.submit-row {
		display: flex;
		justify-content: center;
		margin-top: 0.25rem;
	}
</style>

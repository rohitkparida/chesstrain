<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Chess, type PieceSymbol, type Color } from 'chess.js';
	import ChessBoard from '../../ChessBoard.svelte';
	import ActionButton from '../../ActionButton.svelte';
	import { buildBoardSquares, pieceGlyph, type BoardSquare } from '$lib/chess/board';
	import { buildFenFromMap, parseBoardPieces } from '$lib/drills/vision/boardMemory';

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
		};
		reveal?: unknown;
		disabled?: boolean;
		onSubmit: (response: { placedFen: string }) => void;
	}>();

	let phase = $state<'memorize' | 'reconstruct'>('memorize');
	let remainingMs = $state(3000);
	let selectedPiece = $state<string | null>('P');
	let userMap = $state(new Map<string, { type: PieceSymbol; color: Color }>());
	let timerId: number | null = null;
	let startTime: number | null = null;

	const memorizeSeconds = $derived(data.memorizeSeconds ?? 3);
	const targetDurationMs = $derived(memorizeSeconds * 1000);
	const percent = $derived(Math.max(0, Math.min(100, (remainingMs / targetDurationMs) * 100)));
	const boardOrientation = $derived(data.orientation === 'black' ? 'black' : 'white');
	const userFen = $derived(buildFenFromMap(userMap));
	const displayFen = $derived(reveal ? data.fen : userFen);
	const isFlipped = $derived(boardOrientation === 'black');
	const boardSquares = $derived(buildBoardSquaresFromMap(userMap, data.fen, Boolean(reveal), isFlipped));

	const WHITE_PALETTE = [
		{ type: 'P', icon: '♙', label: 'White Pawn' },
		{ type: 'N', icon: '♘', label: 'White Knight' },
		{ type: 'B', icon: '♗', label: 'White Bishop' },
		{ type: 'R', icon: '♖', label: 'White Rook' },
		{ type: 'Q', icon: '♕', label: 'White Queen' },
		{ type: 'K', icon: '♔', label: 'White King' }
	];

	const BLACK_PALETTE = [
		{ type: 'p', icon: '♟', label: 'Black Pawn' },
		{ type: 'n', icon: '♞', label: 'Black Knight' },
		{ type: 'b', icon: '♝', label: 'Black Bishop' },
		{ type: 'r', icon: '♜', label: 'Black Rook' },
		{ type: 'q', icon: '♛', label: 'Black Queen' },
		{ type: 'k', icon: '♚', label: 'Black King' }
	];

	function buildBoardSquaresFromMap(
		placed: Map<string, { type: PieceSymbol; color: Color }>,
		targetFen: string,
		isReveal: boolean,
		flipped: boolean
	): BoardSquare[] {
		const targetMap = isReveal ? parseBoardPieces(targetFen) : placed;
		const next: BoardSquare[] = [];
		const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

		for (let row = 0; row < 8; row += 1) {
			for (let column = 0; column < 8; column += 1) {
				const boardRow = flipped ? 7 - row : row;
				const boardColumn = flipped ? 7 - column : column;
				const rank = 8 - boardRow;
				const file = FILES[boardColumn];
				const name = `${file}${rank}`;
				const cell = targetMap.get(name);
				const dark = (boardColumn + rank) % 2 === 1;

				next.push({
					name,
					dark,
					pieceKey: cell ? `${cell.color}${cell.type.toUpperCase()}` : null,
					pieceColor: cell ? cell.color : null,
					fileLabel: row === 7 ? file : null,
					rankLabel: column === 0 ? String(rank) : null
				});
			}
		}
		return next;
	}

	$effect(() => {
		data.fen;
		resetDrillState();
	});

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
	{#if phase === 'memorize'}
		<div class="memorize-header">
			<div class="memorize-copy">
				<span class="memorize-title">Memorize Position ({data.pieceCount ?? 4} pieces)</span>
				<span class="memorize-sub">Board hides in {(remainingMs / 1000).toFixed(1)}s</span>
			</div>
			<ActionButton variant="quiet" onclick={transitionToReconstruct}>I'm ready &rarr;</ActionButton>
		</div>

		<div class="countdown-track">
			<div class="countdown-fill" style="width: {percent}%;"></div>
		</div>

		<ChessBoard fen={data.fen} orientation={boardOrientation} showUndo={false} showControls={false} />
	{:else}
		<div class="reconstruct-header">
			<span class="reconstruct-title">{reveal ? 'Actual Position Revealed' : 'Place the pieces on the board'}</span>
			<span class="reconstruct-sub">{reveal ? 'Green indicates your reconstructed accuracy.' : 'Tap a piece in the palette, then tap a square.'}</span>
		</div>

		<div class="board-wrapper">
			<div class="reconstruct-grid" class:flipped={boardOrientation === 'black'}>
				{#each boardSquares as sq (sq.name)}
					<button
						type="button"
						class="board-square"
						class:dark={sq.dark}
						class:light={!sq.dark}
						onclick={() => handleSquareClick(sq.name)}
						disabled={disabled || Boolean(reveal)}
						aria-label="{sq.name}{sq.pieceKey ? ` contains piece` : ''}"
					>
						{#if sq.pieceKey}
							<span class="square-piece" class:white={sq.pieceColor === 'w'} class:black={sq.pieceColor === 'b'}>
								{pieceGlyph(sq.pieceKey)}
							</span>
						{/if}
						<span class="square-coord">{sq.name}</span>
					</button>
				{/each}
			</div>
		</div>

		{#if !reveal}
			<div class="palette-container" role="group" aria-label="Piece selection palette">
				<div class="palette-row">
					<span class="palette-label">White:</span>
					{#each WHITE_PALETTE as p (p.type)}
						<button
							type="button"
							class="piece-btn"
							class:selected={selectedPiece === p.type}
							onclick={() => (selectedPiece = p.type)}
							title={p.label}
							aria-label={p.label}
						>
							<span class="piece-icon">{p.icon}</span>
						</button>
					{/each}
				</div>

				<div class="palette-row">
					<span class="palette-label">Black:</span>
					{#each BLACK_PALETTE as p (p.type)}
						<button
							type="button"
							class="piece-btn"
							class:selected={selectedPiece === p.type}
							onclick={() => (selectedPiece = p.type)}
							title={p.label}
							aria-label={p.label}
						>
							<span class="piece-icon">{p.icon}</span>
						</button>
					{/each}
				</div>
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
	.board-wrapper {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--border);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
	}
	.reconstruct-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		width: 100%;
		height: 100%;
	}
	.board-square {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		padding: 0;
		cursor: pointer;
		user-select: none;
	}
	.board-square.light {
		background-color: #f0d9b5;
	}
	.board-square.dark {
		background-color: #b58863;
	}
	.board-square:hover:not(:disabled) {
		filter: brightness(1.1);
	}
	.square-piece {
		font-size: clamp(1.8rem, 4vw, 2.5rem);
		line-height: 1;
		pointer-events: none;
	}
	.square-piece.white {
		color: #ffffff;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8), 0 0 1px rgba(0, 0, 0, 0.9);
	}
	.square-piece.black {
		color: #111111;
		text-shadow: 0 1px 1px rgba(255, 255, 255, 0.4);
	}
	.square-coord {
		position: absolute;
		bottom: 2px;
		right: 2px;
		font-size: 0.62rem;
		font-weight: 700;
		opacity: 0.5;
		color: var(--text-2);
		pointer-events: none;
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

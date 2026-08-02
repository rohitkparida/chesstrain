import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSession, sessionStore } from '../../../stores/session';
import { get } from 'svelte/store';
import TacticsPage from './+page.svelte';
import { makePuzzleData } from '$lib/test/fixtures';
import type { PuzzleData } from '$lib/chess/mockPuzzles';

const puzzle: PuzzleData = makePuzzleData({ solution: ['Nf6', 'd3', 'd5'] });

vi.mock('$lib/chess/coach', () => ({
	coach: {
		init: vi.fn(),
		getPreMoveEval: vi.fn(async () => ({ bestMove: 'g8f6', evalCp: 0, depth: 15 })),
		explain: vi.fn(async () => ({
			bestMove: 'g8f6',
			evalCp: 0,
			cpLoss: 0,
			explanation: 'The knight belongs on f6.',
			correct: false
		}))
	}
}));

describe('tactics page retrieval integrity', () => {
	beforeEach(() => {
		resetSession();
	});

	const renderTactics = (customPuzzle: PuzzleData = puzzle) =>
		render(TacticsPage, { props: { data: { puzzles: [customPuzzle] } } });

	it('hides the motif hint until after completing full multi-move tactical lines with automatic opponent replies', async () => {
		renderTactics();
		expect(screen.queryByText('Standard defense challenge.')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByLabelText('g8'));
		await fireEvent.click(screen.getByLabelText('f6'));

		await waitFor(() =>
			expect(screen.getByText(/opponent reply is automatic/i)).toBeInTheDocument()
		);

		await fireEvent.click(screen.getByLabelText('d7'));
		await fireEvent.click(screen.getByLabelText('d5'));

		await waitFor(
			() => expect(screen.getByText('Standard defense challenge.')).toBeInTheDocument(),
			{ timeout: 10000 }
		);
	}, 15000);

	it('rejects Qf6 instead of awarding credit for sharing Nf6 destination', async () => {
		renderTactics();
		await fireEvent.click(screen.getByLabelText('d8'));
		await fireEvent.click(screen.getByLabelText('f6'));

		await waitFor(() => expect(screen.getByText(/Not quite/)).toBeInTheDocument(), { timeout: 10000 });
		expect(screen.queryByText(/\+16 ELO/)).not.toBeInTheDocument();
		expect(document.querySelector('.dot')).toBeNull();
	}, 15000);

	it('offers Continue after an attempt and cannot double-record it through Skip', async () => {
		renderTactics();
		await fireEvent.click(screen.getByLabelText('d8'));
		await fireEvent.click(screen.getByLabelText('f6'));
		await waitFor(() => expect(screen.getByText('Continue')).toBeInTheDocument(), { timeout: 10000 });

		expect(screen.queryByText('Skip')).not.toBeInTheDocument();
		expect(get(sessionStore).history).toHaveLength(1);
		await fireEvent.click(screen.getByText('Continue'));
		expect(get(sessionStore).history).toHaveLength(1);
	}, 15000);

	it('does not record a failed attempt when skipping an unattempted puzzle', async () => {
		renderTactics();
		const skipBtn = screen.getByText('Skip');
		await fireEvent.click(skipBtn);
		const confirmBtn = screen.getByText('Yes, skip');
		await fireEvent.click(confirmBtn);

		expect(get(sessionStore).history).toHaveLength(0);
	}, 15000);

	it('explains an illegal square click without penalizing the learner', async () => {
		renderTactics();
		await fireEvent.click(screen.getByLabelText('c6'));
		await fireEvent.click(screen.getByLabelText('c5'));

		await waitFor(
			() => expect(screen.getByText(/destination is not a legal move/i)).toBeInTheDocument(),
			{ timeout: 10000 }
		);
		expect(get(sessionStore).history).toHaveLength(0);
	}, 15000);
});

import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSession } from '../../../stores/session';
import { get } from 'svelte/store';
import { sessionStore } from '../../../stores/session';
import TacticsPage from './+page.svelte';
import { makePuzzleData } from '$lib/test/fixtures';
import type { PuzzleData } from '$lib/chess/mockPuzzles';

const puzzle: PuzzleData = makePuzzleData();

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

	const renderTactics = () => render(TacticsPage, { props: { data: { puzzles: [puzzle] } } });

	it('hides the motif hint until after the learner attempts the puzzle', async () => {
		renderTactics();
		expect(screen.queryByText('Standard defense challenge.')).not.toBeInTheDocument();

		await fireEvent.click(screen.getByLabelText('g8'));
		await fireEvent.click(screen.getByLabelText('f6'));
		await waitFor(() => expect(screen.getByText('Standard defense challenge.')).toBeInTheDocument());
	});

	it('rejects Qf6 instead of awarding credit for sharing Nf6 destination', async () => {
		renderTactics();
		await fireEvent.click(screen.getByLabelText('d8'));
		await fireEvent.click(screen.getByLabelText('f6'));

		await waitFor(() => expect(screen.getByText(/Not quite/)).toBeInTheDocument());
		expect(screen.queryByText(/\+16 ELO/)).not.toBeInTheDocument();
		expect(document.querySelector('.dot')).toBeNull();
	});

	it('offers Continue after an attempt and cannot double-record it through Skip', async () => {
		renderTactics();
		await fireEvent.click(screen.getByLabelText('d8'));
		await fireEvent.click(screen.getByLabelText('f6'));
		await waitFor(() => expect(screen.getByText('Continue')).toBeInTheDocument());

		expect(screen.queryByText('Skip')).not.toBeInTheDocument();
		expect(get(sessionStore).history).toHaveLength(1);
		await fireEvent.click(screen.getByText('Continue'));
		expect(get(sessionStore).history).toHaveLength(1);
	});

	it('explains an illegal square click without penalizing the learner', async () => {
		renderTactics();
		await fireEvent.click(screen.getByLabelText('g8'));
		await fireEvent.click(screen.getByLabelText('g6'));
		expect(screen.getByRole('status')).toHaveTextContent('not a legal move');
		expect(get(sessionStore).history).toHaveLength(0);
	});
});

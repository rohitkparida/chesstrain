import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ChessBoard from './ChessBoard.svelte';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('ChessBoard state contract', () => {
	it('renders black orientation and follows the side to move orientation', () => {
		render(ChessBoard, { fen: startFen, orientation: 'black' });
		expect(screen.getAllByRole('button').find(button => button.getAttribute('aria-label') === 'h1')).toBeDefined();

		render(ChessBoard, { fen: startFen.replace(' w ', ' b '), orientation: 'side-to-move' });
		expect(screen.getAllByRole('button').find(button => button.getAttribute('aria-label') === 'h1')).toBeDefined();
	}, 15000);

	it('transforms annotations when manually flipped', async () => {
		render(ChessBoard, { fen: startFen, annotations: [{ from: 'e2', to: 'e4', kind: 'arrow', label: 'Suggested move' }] });
		await fireEvent.click(screen.getByTitle('Flip board'));
		expect(screen.getByRole('img', { name: 'Board annotations' }).querySelector('line')).toHaveAttribute('x1', '3.5');
		expect(screen.getByRole('img', { name: 'Board annotations' }).querySelector('line')).toHaveAttribute('y1', '1.5');
	});

	it('shows the turn from the supplied FEN', () => {
		render(ChessBoard, {
			fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
		});
		expect(screen.getByText('Black to move')).toBeInTheDocument();
	});

	it('lets a parent reject a move without corrupting the board', async () => {
		render(ChessBoard, { fen: startFen, onMove: () => false });
		await fireEvent.click(screen.getByLabelText('e2'));
		await fireEvent.click(screen.getByLabelText('e4'));

		expect(screen.getByLabelText('e2').querySelector('.piece')).not.toBeNull();
		expect(screen.getByLabelText('e4').querySelector('.piece')).toBeNull();
	});

	it('can hide legal-target hints while retaining click-to-move', async () => {
		const onMove = vi.fn();
		render(ChessBoard, { fen: startFen, onMove, showLegalTargets: false });
		await fireEvent.click(screen.getByLabelText('e2'));
		expect(document.querySelector('.dot')).toBeNull();
		await fireEvent.click(screen.getByLabelText('e4'));
		expect(onMove).toHaveBeenCalledWith('e2', 'e4', expect.any(String));
	});

	it('makes a locked board visibly and functionally non-interactive', async () => {
		const onMove = vi.fn();
		render(ChessBoard, { fen: startFen, onMove, playable: false, inactiveLabel: 'Complete checklist to unlock board' });
		expect(screen.getByText('Complete checklist to unlock board')).toBeInTheDocument();
		expect(screen.getByLabelText('e2')).toBeDisabled();
		await fireEvent.click(screen.getByLabelText('e2'));
		expect(onMove).not.toHaveBeenCalled();
	});

	it('explains an illegal destination without counting it as a move', async () => {
		const onMove = vi.fn();
		const onInvalidMove = vi.fn();
		render(ChessBoard, { fen: startFen, onMove, onInvalidMove });
		await fireEvent.click(screen.getByLabelText('e2'));
		await fireEvent.click(screen.getByLabelText('e5'));
		expect(onInvalidMove).toHaveBeenCalledOnce();
		expect(onMove).not.toHaveBeenCalled();
	});
});

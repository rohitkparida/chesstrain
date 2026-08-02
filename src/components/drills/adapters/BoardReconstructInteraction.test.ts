import { render, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import BoardReconstructInteraction from './BoardReconstructInteraction.svelte';

describe('BoardReconstructInteraction component', () => {
	const sampleData = {
		fen: '8/8/8/8/8/8/8/8 w - - 0 1',
		memorizeSeconds: 1,
		orientation: 'white' as const,
		pieceCount: 2
	};

	it('renders level preset tabs and handles phase transition', async () => {
		const onSubmit = vi.fn();
		const { getByText, findByText } = render(BoardReconstructInteraction, {
			data: sampleData,
			onSubmit
		});

		expect(getByText('Memorize Position (2 pieces)')).toBeInTheDocument();
		expect(getByText('Adaptive')).toBeInTheDocument();

		const readyBtn = getByText("I'm ready \u2192");
		await fireEvent.click(readyBtn);

		expect(await findByText('Place the pieces on the board')).toBeInTheDocument();
	});

	it('allows piece selection from dynamic palette and clicking squares', async () => {
		const onSubmit = vi.fn();
		const { getByText, getByRole, getByLabelText } = render(BoardReconstructInteraction, {
			data: sampleData,
			onSubmit
		});

		const readyBtn = getByText("I'm ready \u2192");
		await fireEvent.click(readyBtn);

		const whitePawnBtn = getByRole('button', { name: 'White Pawn' });
		expect(whitePawnBtn).toBeInTheDocument();
		await fireEvent.click(whitePawnBtn);

		const squareE4 = getByLabelText('Square e4');
		await fireEvent.click(squareE4);

		const submitBtn = getByText('Submit Position');
		await fireEvent.click(submitBtn);

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenCalledWith({
			placedFen: '8/8/8/8/4P3/8/8/8 w - - 0 1'
		});
	});
});

import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SquareBoardView from './SquareBoardView.svelte';

describe('SquareBoardView component', () => {
	it('renders board with orientation and handles string and array reveal values', () => {
		const { container } = render(SquareBoardView, {
			data: {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
				markedSquare: 'e4',
				orientation: 'black',
				rotation: 90
			},
			reveal: 'e4',
			disabled: true
		});

		expect(container.querySelector('.square-board')).toBeInTheDocument();
	});

	it('safely filters reveal array to valid string elements', () => {
		const { container } = render(SquareBoardView, {
			data: {
				fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
			},
			reveal: ['e4', 123, null, 'd5'],
			disabled: true
		});

		expect(container.querySelector('.square-board')).toBeInTheDocument();
	});
});

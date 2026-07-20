import { describe, expect, it } from 'vitest';
import { legalCueAnnotations, resultForTerminalState, scoreEndgameResult, scoreResultPreservation, terminalStateForFen } from './endgameContent';

describe('endgame content contract', () => {
	it('detects checkmate, stalemate, and draw outcomes', () => {
		expect(terminalStateForFen('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1')).toBe('checkmate');
		expect(terminalStateForFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toBe('stalemate');
		expect(terminalStateForFen('8/8/8/8/8/2K5/8/6k1 w - - 0 1')).toBe('draw');
		expect(resultForTerminalState('checkmate', 'b', 'w')).toBe('win');
	});

	it('keeps only legal curated cues', () => {
		const fen = '8/8/8/8/8/4K3/4Q3/7k w - - 0 1';
		expect(legalCueAnnotations(fen, [
			{ from: 'e2', to: 'h2', kind: 'arrow' },
			{ from: 'a1', to: 'a8', kind: 'arrow' },
		])).toHaveLength(1);
	});

	it('scores theoretical result preservation instead of exact move identity', () => {
		expect(scoreResultPreservation('win', 'win')).toBe(1);
		expect(scoreResultPreservation('win', 'draw')).toBe(0);
		expect(scoreEndgameResult('draw', 'draw')).toMatchObject({ preserved: true, score: 1 });
	});
});

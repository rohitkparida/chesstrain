import { describe, expect, it } from 'vitest';
import { chooseInterleavedLine, type OpeningLine } from './openingPractice';

const lines: OpeningLine[] = [
	{ id: 'a', name: 'Ruy Lopez', moves: [] },
	{ id: 'b', name: 'Italian Game', moves: [] }
];

describe('opening interleaving', () => {
	it('does not immediately repeat the previous line when alternatives exist', () => {
		const original = Math.random;
		Math.random = () => 0;
		try { expect(chooseInterleavedLine(lines, 'a')?.id).toBe('b'); }
		finally { Math.random = original; }
	});

	it('returns null for an empty repertoire', () => {
		expect(chooseInterleavedLine([])).toBeNull();
	});
});

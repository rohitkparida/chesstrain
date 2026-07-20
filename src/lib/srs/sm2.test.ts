import { describe, expect, it, vi } from 'vitest';
import { calculateEloDelta, calculateSRS } from './sm2';

describe('SM-2 scheduling', () => {
	it('schedules fast correct retrievals farther apart over time', () => {
		vi.setSystemTime(new Date('2026-06-15T00:00:00Z'));
		const first = calculateSRS(5, 0, 0, 2.5);
		const second = calculateSRS(5, first.repetition, first.interval, first.easeFactor);
		const third = calculateSRS(5, second.repetition, second.interval, second.easeFactor);

		expect([first.interval, second.interval, third.interval]).toEqual([1, 6, 17]);
		expect(third.nextScheduledDate).toBeGreaterThan(second.nextScheduledDate);
	});

	it('resets repetition after an incorrect answer', () => {
		expect(calculateSRS(1, 4, 20, 2.5)).toMatchObject({ repetition: 0, interval: 1 });
	});
});

describe('Elo updates', () => {
	it('rewards an upset more than solving an easier puzzle', () => {
		expect(calculateEloDelta(1200, 1500, 1)).toBeGreaterThan(calculateEloDelta(1200, 900, 1));
	});

	it('penalizes a miss against an easier puzzle more strongly', () => {
		expect(calculateEloDelta(1200, 900, 0)).toBeLessThan(calculateEloDelta(1200, 1500, 0));
	});
});

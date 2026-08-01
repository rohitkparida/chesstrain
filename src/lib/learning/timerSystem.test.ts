import { describe, it, expect } from 'vitest';
import {
	calculateTimerMultiplier,
	calculateSessionSeconds,
	calculatePerAttemptSeconds,
	calculateTargetRPM,
	getTimerConfig,
	calculateThroughputRPM
} from './timerSystem';

describe('Dual-Mode Timer System & Target RPM', () => {
	it('calculates timer multiplier accurately across difficulty offsets', () => {
		expect(calculateTimerMultiplier(0)).toBe(1.0);
		expect(calculateTimerMultiplier(150)).toBe(0.75);
		expect(calculateTimerMultiplier(300)).toBe(0.5);
		expect(calculateTimerMultiplier(-150)).toBe(1.25);
		expect(calculateTimerMultiplier(-300)).toBe(1.5);
	});

	it('keeps Fixed Session Mode standardized at 60 seconds', () => {
		expect(calculateSessionSeconds()).toBe(60);
	});

	it('scales per-attempt seconds by difficulty multiplier', () => {
		expect(calculatePerAttemptSeconds(3, 0)).toBe(3);
		expect(calculatePerAttemptSeconds(3, 150)).toBe(2.3);
		expect(calculatePerAttemptSeconds(3, 300)).toBe(1.5);
		expect(calculatePerAttemptSeconds(3, -150)).toBe(3.8);
	});

	it('calculates target RPM goals based on difficulty offset', () => {
		expect(calculateTargetRPM(20, 0)).toBe(20);
		expect(calculateTargetRPM(20, 150)).toBe(27);
		expect(calculateTargetRPM(20, 300)).toBe(40);
		expect(calculateTargetRPM(20, -150)).toBe(16);
	});

	it('builds a full timer config', () => {
		const config = getTimerConfig('per-attempt', 3, 150);
		expect(config.mode).toBe('per-attempt');
		expect(config.sessionSeconds).toBe(60);
		expect(config.perAttemptSeconds).toBe(2.3);
		expect(config.targetRPM).toBe(27);
		expect(config.multiplier).toBe(0.75);
	});

	it('calculates throughput RPM correctly', () => {
		expect(calculateThroughputRPM(10, 30)).toBe(20);
		expect(calculateThroughputRPM(15, 60)).toBe(15);
		expect(calculateThroughputRPM(0, 30)).toBe(0);
	});
});

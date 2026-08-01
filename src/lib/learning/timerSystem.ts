export type TimerMode = 'none' | 'session' | 'per-attempt';

export interface TimerConfig {
	mode: TimerMode;
	sessionSeconds: number;
	perAttemptSeconds: number;
	targetRPM: number;
	multiplier: number;
}

export function calculateTimerMultiplier(difficultyOffset: number = 0): number {
	const raw = 1.0 - difficultyOffset / 600;
	return Math.max(0.5, Math.min(1.5, Math.round(raw * 100) / 100));
}

export function calculateSessionSeconds(): number {
	// Standardized 60-second 1-minute sprint benchmark
	return 60;
}

export function calculatePerAttemptSeconds(baseSeconds: number = 3, difficultyOffset: number = 0): number {
	const multiplier = calculateTimerMultiplier(difficultyOffset);
	const calculated = baseSeconds * multiplier;
	return Math.max(1, Math.round(calculated * 10) / 10);
}

export function calculateTargetRPM(baseRPM: number = 20, difficultyOffset: number = 0): number {
	const multiplier = calculateTimerMultiplier(difficultyOffset);
	// Higher difficulty = lower multiplier = higher target RPM
	return Math.round(baseRPM / multiplier);
}

export function getTimerConfig(
	mode: TimerMode = 'session',
	basePerAttemptSeconds: number = 3,
	difficultyOffset: number = 0
): TimerConfig {
	const multiplier = calculateTimerMultiplier(difficultyOffset);
	return {
		mode,
		sessionSeconds: calculateSessionSeconds(),
		perAttemptSeconds: calculatePerAttemptSeconds(basePerAttemptSeconds, difficultyOffset),
		targetRPM: calculateTargetRPM(20, difficultyOffset),
		multiplier
	};
}

export function calculateThroughputRPM(completedCount: number, elapsedSeconds: number): number {
	if (elapsedSeconds <= 0) return 0;
	return Math.round((completedCount / elapsedSeconds) * 60);
}

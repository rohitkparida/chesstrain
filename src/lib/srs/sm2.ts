export interface SRSEntry {
  puzzleId: string;
  interval: number; // in days
  repetition: number;
  easeFactor: number;
  nextScheduledDate: number; // Epoch timestamp (ms)
}

export function calculateSRS(
  quality: number, // 0 to 5 (0=incorrect, 3=slow correct, 5=fast correct)
  prevRepetition: number,
  prevInterval: number,
  prevEaseFactor: number
): { interval: number; repetition: number; easeFactor: number; nextScheduledDate: number } {
  let easeFactor = prevEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  let repetition = prevRepetition;
  let interval = prevInterval;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(prevInterval * easeFactor);
    }
    repetition++;
  } else {
    repetition = 0;
    interval = 1;
  }

  const nextScheduledDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    interval,
    repetition,
    easeFactor,
    nextScheduledDate
  };
}

export function calculateEloDelta(
  userElo: number,
  puzzleElo: number,
  result: 1 | 0, // 1 = won, 0 = lost
  kFactor: number = 32
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (puzzleElo - userElo) / 400));
  return Math.round(kFactor * (result - expectedScore));
}

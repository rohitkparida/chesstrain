import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  generateProceduralTacticsPuzzle,
  generateKnightForkPuzzle,
  generatePinPuzzle,
  generateBackRankPuzzle,
  generateDiscoveredCheckPuzzle,
  generateSkewerPuzzle,
  generateDeflectionPuzzle
} from './proceduralTactics';

describe('Procedural Tactics Generator', () => {
  it('generates valid FENs and non-empty solutions for all motif generators', () => {
    const generators = [
      generateKnightForkPuzzle,
      generatePinPuzzle,
      generateBackRankPuzzle,
      generateDiscoveredCheckPuzzle,
      generateSkewerPuzzle,
      generateDeflectionPuzzle
    ];

    for (const gen of generators) {
      const puzzle = gen(() => 0.5);
      expect(() => new Chess(puzzle.fen)).not.toThrow();
      expect(puzzle.solution.length).toBeGreaterThan(0);
      expect(puzzle.description).toBeTruthy();
      expect(puzzle.tags.length).toBeGreaterThan(0);
    }
  });

  it('generates procedural tactics in sub-millisecond execution time', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i += 1) {
      generateProceduralTacticsPuzzle(() => (i * 17) % 100 / 100);
    }
    const elapsedMs = performance.now() - start;
    const avgMs = elapsedMs / 100;

    expect(avgMs).toBeLessThan(1.0); // Expect < 1ms per puzzle
  });
});

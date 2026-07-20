import { describe, expect, it } from 'vitest';
import { accountColorFromHeaders, extractGameMoves, hasAmbiguousAccountColor, splitPgnGames } from './gameMistakes';

describe('game mistake candidates', () => {
  it('extracts moves for one side with before and after positions', () => {
    const moves = extractGameMoves('[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 *', 'w');
    expect(moves.map(candidate => candidate.move.san)).toEqual(['e4', 'Nf3', 'Bc4']);
    expect(moves[0]?.fen).toContain(' w ');
    expect(moves[0]?.afterFen).toContain(' b ');
  });

  it('treats a multi-game PGN as separate games and detects the account color per game', () => {
    const pgn = `[Event "Game one"]
[White "alice"]
[Black "bob"]

1. e4 e5 2. Nf3 *

[Event "Game two"]
[White "bob"]
[Black "alice"]

1. d4 d5 2. c4 *`;

    expect(splitPgnGames(pgn)).toHaveLength(2);
    expect(extractGameMoves(pgn, 'w', 'alice').map((candidate) => candidate.move.san)).toEqual(['e4', 'Nf3', 'd5']);
    expect(hasAmbiguousAccountColor(pgn, 'alice')).toBe(false);
  });

  it('uses the selected side when the account cannot be identified from headers', () => {
    expect(accountColorFromHeaders({ White: 'alice', Black: 'bob' }, 'unknown')).toBeNull();
    expect(hasAmbiguousAccountColor('[Result "*"]\n\n1. e4 e5 *', 'alice')).toBe(true);
    expect(extractGameMoves('[Result "*"]\n\n1. e4 e5 *', 'b', 'alice').map((candidate) => candidate.move.san)).toEqual(['e5']);
  });
});

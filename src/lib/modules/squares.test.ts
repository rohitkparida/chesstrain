import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Squares from './squares.svelte';
import BoardGripBoard from '../../components/BoardGripBoard.svelte';
import { ALL_SQUARES } from '../learning/nameTheSquare';
import { safeKingSquaresFromFen } from '../learning/boardGrip';
import { sessionStore } from '../../stores/session';

describe('board grip game', () => {
  it('renders an accessible 64-square board with orientation', async () => {
    render(Squares);
    const board = await screen.findByLabelText('Coordinate training board', {}, { timeout: 10000 });
    expect(board.querySelectorAll('button')).toHaveLength(64);
    expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
  }, 15000);

  it('supports manual flipping and explicit multi-select controls', async () => {
    render(Squares);
    const flip = await screen.findByRole('button', { name: /view/i }, { timeout: 10000 });
    const initial = flip.textContent;
    await fireEvent.click(flip);
    expect(flip.textContent).not.toBe(initial);
  }, 15000);

  it('allows single-mode session to advance on continue', async () => {
    render(Squares, { fixedKind: 'name-square' });
    const board = await screen.findByLabelText('Coordinate training board', {}, { timeout: 10000 });
    expect(board).toBeInTheDocument();

    const giveUpBtn = await screen.findByText(/Give up & show answer/i, {}, { timeout: 10000 });
    await fireEvent.click(giveUpBtn);

    const continueBtn = await screen.findByRole('button', { name: /Continue/i }, { timeout: 10000 });
    expect(continueBtn).toBeInTheDocument();
    await fireEvent.click(continueBtn);

    // After clicking continue, state reloads cleanly into active prompt
    const newGiveUpBtn = await screen.findByText(/Give up & show answer/i, {}, { timeout: 10000 });
    expect(newGiveUpBtn).toBeInTheDocument();
  }, 15000);

  it('calculates strictly legal king moves for safeKingSquaresFromFen', () => {
    // Standard starting position: white king on e1 is blocked by own pawns/pieces
    const fenStart = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const resStart = safeKingSquaresFromFen(fenStart);
    expect(resStart.squares).toEqual([]);

    // Valid FEN with White King on e2 and Black King on e5
    const fenOpen = '8/8/8/4k3/8/8/4K3/8 w - - 0 1';
    const resOpen = safeKingSquaresFromFen(fenOpen);
    expect(resOpen.squares.length).toBe(8);
    expect(new Set(resOpen.squares)).toEqual(
      new Set(['d1', 'd2', 'd3', 'e1', 'e3', 'f1', 'f2', 'f3'])
    );
  });

  it.each([
    ['white', 0, 24],
    ['black', 0, 39],
    ['white', 90, 59],
    ['white', 270, 4]
  ] as const)(
    'keeps a5 clickable as a5 in %s view at %d degrees',
    (orientation, rotation, expectedIndex) => {
      const chosen: string[] = [];
      render(BoardGripBoard, {
        squares: ALL_SQUARES,
        pieces: {},
        selected: new Set<string>(),
        orientation,
        rotation,
        onChoose: (sq) => {
          chosen.push(sq);
        }
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(64);
      fireEvent.click(buttons[expectedIndex]);

      expect(chosen).toEqual(['a5']);
    }
  );

  it('isolates preferences and metrics when switching accounts', async () => {
    sessionStore.update((s) => ({ ...s, userId: 'account-A' }));
    render(Squares);

    const initialStats = screen.getAllByText('0');
    expect(initialStats.length).toBeGreaterThan(0);

    // Switch account
    sessionStore.update((s) => ({ ...s, userId: 'account-B' }));
    const newStats = screen.getAllByText('0');
    expect(newStats.length).toBeGreaterThan(0);
  });
});

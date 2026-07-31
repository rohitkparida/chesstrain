import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import MistakeReplayBoard from './MistakeReplayBoard.svelte';

describe('MistakeReplayBoard replay transitions', () => {
  const initialFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
  const step1Fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 4 4';
  const step2Fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 5 5';

  const arrows = [
    { from: 'g8', to: 'f6', tone: 'played' as const },
    { from: 'e8', to: 'g8', tone: 'engine' as const }
  ];

  const continuation = [
    { fen: step1Fen, move: 'O-O', label: 'O-O' },
    { fen: step2Fen, move: 'Nf6', label: 'Nf6' }
  ];

  it('renders original mistake FEN and arrows at step 0', () => {
    render(MistakeReplayBoard, {
      props: {
        fen: initialFen,
        arrows,
        continuation,
        step: 0
      }
    });

    // At step 0, prompt indicates line is ready to replay
    expect(screen.getByText('The engine line is ready to replay.')).toBeInTheDocument();
    expect(screen.getByText('Show engine continuation')).toBeInTheDocument();
  });

  it('renders continuation step 1 and advances label on step 1', () => {
    const handleNext = vi.fn();
    const { rerender } = render(MistakeReplayBoard, {
      props: {
        fen: initialFen,
        arrows,
        continuation,
        step: 0,
        onNext: handleNext
      }
    });

    // Click Show engine continuation
    fireEvent.click(screen.getByText('Show engine continuation'));
    expect(handleNext).toHaveBeenCalledTimes(1);

    // Rerender with step 1
    rerender({
      fen: initialFen,
      arrows,
      continuation,
      step: 1,
      onNext: handleNext
    });

    expect(screen.getByText('O-O')).toBeInTheDocument();
    expect(screen.getByText('Show next move')).toBeInTheDocument();
  });

  it('renders continuation step 2 and shows Finish replay on final step', () => {
    render(MistakeReplayBoard, {
      props: {
        fen: initialFen,
        arrows,
        continuation,
        step: 2
      }
    });

    expect(screen.getByText('Nf6')).toBeInTheDocument();
    expect(screen.getByText('Finish replay')).toBeInTheDocument();
  });
});

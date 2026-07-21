import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import BoardGripBoard from '../../components/BoardGripBoard.svelte';
import { ALL_SQUARES } from '../learning/nameTheSquare';
import Squares from './squares.svelte';

describe('board grip game', () => {
  it('renders an accessible 64-square board with orientation', () => {
    render(Squares);
    expect(screen.getByLabelText('Coordinate training board').querySelectorAll('button')).toHaveLength(64);
    expect(screen.getByRole('button', { name: /view/ })).toBeInTheDocument();
  });
  it('supports manual flipping and explicit multi-select controls', async () => {
    render(Squares);
    const flip = screen.getByRole('button', { name: /view/ });
    const initial = flip.textContent;
    await fireEvent.click(flip);
    expect(flip.textContent).not.toBe(initial);
    expect(screen.getByText(/One-tap answer|Multi-select answer/)).toBeInTheDocument();
  });

  it.each([
    ['white', 0, 24],
    ['black', 0, 39],
    ['white', 90, 59],
    ['white', 270, 4]
  ] as const)('keeps a5 clickable as a5 in %s view at %s degrees', async (orientation, rotation, screenIndex) => {
    const onChoose = vi.fn();
    render(BoardGripBoard, {
      squares: ALL_SQUARES,
      pieces: {},
      selected: new Set<string>(),
      orientation,
      rotation,
      onChoose
    });

    const buttons = screen.getByLabelText('Coordinate training board').querySelectorAll('button');
    expect(buttons[screenIndex]).toHaveAccessibleName('Square a5');
    await fireEvent.click(buttons[screenIndex]);
    expect(onChoose).toHaveBeenCalledWith('a5');
  });
});

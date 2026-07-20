import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Squares from './squares.svelte';

describe('board grip game', () => {
  it('renders an accessible 64-square board with orientation', () => {
    render(Squares);
    expect(screen.getByLabelText('Coordinate training board').querySelectorAll('button')).toHaveLength(64);
    expect(screen.getByRole('button', { name: /Facing (White|Black) \/ Flip/ })).toBeInTheDocument();
  });
  it('supports manual flipping and explicit multi-select controls', async () => {
    render(Squares);
    const flip = screen.getByRole('button', { name: /Facing (White|Black) \/ Flip/ });
    const initial = flip.textContent;
    await fireEvent.click(flip);
    expect(flip.textContent).not.toBe(initial);
    expect(screen.getByText(/One-tap answer|Select every/)).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TrainPage from './+page.svelte';

describe('train landing page', () => {
  it('groups drills and explains locked progression', () => {
    render(TrainPage);
    expect(screen.getByRole('heading', { name: 'See the Board' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose Better Moves' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Know the Position' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Board Vision/ })).toHaveAttribute('href', '/train/squares');
    expect(screen.getByLabelText('Calculation, locked')).toHaveAttribute('data-locked', 'true');
    expect(screen.getByRole('link', { name: /My Mistakes/ })).toHaveAttribute('href', '/train/mistakes');
  });
});

import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Opening from './opening.svelte';
import Calculation from './calculation.svelte';
import Positional from './positional.svelte';
import { get } from 'svelte/store';
import { sessionStore, resetSession } from '../../stores/session';

describe('module learning interactions', () => {
  it('records a committed calculation attempt in shared session state', async () => {
    resetSession();
    render(Calculation);
    await fireEvent.input(screen.getByPlaceholderText('e.g. Nf3 d5 Nxe5'), { target: { value: 'Nxf7 Rxf7 Qd4' } });
    await fireEvent.click(screen.getByText('Verify Line'));
    expect(get(sessionStore).trainingAttempts.some((attempt) => attempt.module === 'calculation')).toBe(true);
  });

  it('keeps the opening position intact after a deviation', async () => {
    render(Opening);
    expect(screen.queryByText(/Opponent played/)).not.toBeInTheDocument();
    await fireEvent.click(screen.getByLabelText('d2'));
    await fireEvent.click(screen.getByLabelText('d4'));
    expect(screen.getByText(/Deviation from repertoire/)).toBeInTheDocument();
    expect(screen.queryByText(/Expected d2 to d4/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('d2').querySelector('.piece')).not.toBeNull();
    expect(screen.getByLabelText('d4').querySelector('.piece')).toBeNull();
  });

  it('does not reveal the calculation solution for a partial line', async () => {
    render(Calculation);
    await fireEvent.input(screen.getByPlaceholderText('e.g. Nf3 d5 Nxe5'), { target: { value: 'Nxf7' } });
    await fireEvent.click(screen.getByText('Verify Line'));
    expect(screen.getByText(/incomplete/)).toBeInTheDocument();
    expect(screen.queryByText('Best path')).not.toBeInTheDocument();
  });

  it('keeps the positional task visually grounded in the board', async () => {
    render(Positional);
    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: /Check position review/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Chess board, White to move')).toBeInTheDocument();
  });
});

describe('engine-play modules', () => {
  it('blocks decision moves until the structured process is recorded', async () => {
    const Decision = (await import('./decision.svelte')).default;
    render(Decision);
    expect(screen.getByLabelText('e2')).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Threat choices' })).toBeInTheDocument();
    expect(screen.queryByText(/Engine candidate/)).not.toBeInTheDocument();
  });

  it('keeps endgame cues hidden before commitment', async () => {
    const Endgame = (await import('./endgame.svelte')).default;
    render(Endgame);
    expect(screen.queryByLabelText('Legal technique cue')).not.toBeInTheDocument();
    expect(screen.queryByText(/Expected result/)).not.toBeInTheDocument();
  });
});

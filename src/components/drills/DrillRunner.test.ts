import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DrillRunner from './DrillRunner.svelte';
import { DRILLS } from '$lib/drills/registry';
import type { DrillContext } from '$lib/drills/types';

const context: DrillContext = { userId: 'test', difficulty: 1200, random: () => 0.5 };

afterEach(() => {
  vi.useRealTimers();
});

describe('DrillRunner continuation flow', () => {
  it('keeps feedback visible by default until Continue is pressed', async () => {
    render(DrillRunner, { props: { entry: DRILLS['vision.name-square'], context } });
    const giveUp = await screen.findByRole('button', { name: /Give up & show answer/i }, { timeout: 10000 });
    await fireEvent.click(giveUp);
    expect(await screen.findByRole('button', { name: /Continue/i })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 950));
    expect(screen.getByRole('button', { name: /Continue/i })).toBeInTheDocument();
  }, 15000);

  it('auto-continues after feedback when enabled', async () => {
    render(DrillRunner, { props: { entry: DRILLS['vision.name-square'], context } });
    await fireEvent.click(await screen.findByRole('button', { name: /Give up & show answer/i }));
    await fireEvent.click(await screen.findByRole('checkbox', { name: /Auto-continue/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Give up & show answer/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 15000);

  it('allows Enter to skip the auto-continue delay', async () => {
    render(DrillRunner, { props: { entry: DRILLS['vision.name-square'], context } });
    await fireEvent.click(await screen.findByRole('button', { name: /Give up & show answer/i }));
    await fireEvent.click(await screen.findByRole('checkbox', { name: /Auto-continue/i }));
    await fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Give up & show answer/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 15000);

  it('continues when Enter comes from the disabled answer input', async () => {
    render(DrillRunner, { props: { entry: DRILLS['vision.name-square'], context } });
    const input = await screen.findByPlaceholderText(/type coordinate/i, {}, { timeout: 10000 });
    await fireEvent.input(input, { target: { value: 'a1' } });
    expect(await screen.findByRole('button', { name: /Continue/i })).toBeInTheDocument();
    await fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Give up & show answer/i })).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 15000);
});

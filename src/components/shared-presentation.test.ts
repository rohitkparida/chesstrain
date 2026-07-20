import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import TrainingModuleShell from './TrainingModuleShell.svelte';
import InstructionBanner from './InstructionBanner.svelte';
import ObjectiveMetrics from './ObjectiveMetrics.svelte';

describe('shared training presentation', () => {

  it('exposes the task-to-feedback workflow and keeps reset secondary', async () => {
    const onReset = vi.fn();
    render(TrainingModuleShell, {
      title: 'Calculation',
      task: 'Enter the line, then commit it.',
      onReset,
      children: createRawSnippet(() => ({ render: () => '<span>Practice content</span>' }))
    });

    expect(screen.getByRole('main')).toHaveAttribute('data-workflow', 'task-commit-feedback-continue');
    expect(screen.getByRole('heading', { name: 'Calculation' })).toBeInTheDocument();
    expect(screen.getByText('Practice content')).toBeInTheDocument();
    const reset = screen.getByRole('button', { name: 'Reset' });
    expect(reset).toHaveClass('quiet');
    await fireEvent.click(reset);
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('renders the task as a labeled section without a nested card', () => {
    render(InstructionBanner, { hint: 'Choose your move before checking.' });
    const task = screen.getByRole('region', { name: 'YOUR TASK' });
    expect(task).toHaveTextContent('Choose your move before checking.');
    expect(task.querySelector('.instruction-banner')).toBeNull();
  });

  it('labels metrics as feedback and defaults to a concise result', () => {
    render(ObjectiveMetrics, { items: [{ label: 'Accuracy', value: '80%' }] });
    expect(screen.getByRole('region', { name: 'Result' })).toHaveAttribute('data-stage', 'feedback');
    expect(screen.getByRole('heading', { name: 'Result' })).toBeInTheDocument();
  });
});

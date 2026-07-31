import type { Component } from 'svelte';
import SquareTapInteraction from './SquareTapInteraction.svelte';
import SquareSelectInteraction from './SquareSelectInteraction.svelte';
import TextEntryInteraction from './TextEntryInteraction.svelte';
import MoveInteraction from './MoveInteraction.svelte';
import type { InteractionKind } from '$lib/drills/types';

export { SquareTapInteraction, SquareSelectInteraction, TextEntryInteraction, MoveInteraction };

export interface GenericAdapterProps {
  data: Record<string, unknown>;
  reveal?: unknown;
  disabled?: boolean;
  onSubmit: (response: unknown) => void;
}

export type AdapterComponent = Component<GenericAdapterProps>;

export const INTERACTIONS: Record<InteractionKind, AdapterComponent> = {
  'square-tap': (SquareTapInteraction as unknown) as AdapterComponent,
  'square-select': (SquareSelectInteraction as unknown) as AdapterComponent,
  'text-entry': (TextEntryInteraction as unknown) as AdapterComponent,
  'move': (MoveInteraction as unknown) as AdapterComponent
};


import { createSelectionVisionDrill } from './visionHelpers';

export const drill = createSelectionVisionDrill({
	id: 'vision.square-control',
	label: 'Square Control',
	description: 'Select all squares attacking or defending the highlighted square.',
	kind: 'square-control',
	noneExpected: 'Incorrect. No squares attack or defend the target square.'
});

import { createSelectionVisionDrill } from './visionHelpers';

export const drill = createSelectionVisionDrill({
	id: 'vision.pinned-pieces',
	label: 'Pinned Pieces',
	description: 'Select all pinned pieces.',
	kind: 'pinned-pieces',
	noneExpected: 'Incorrect. There were no pinned pieces.'
});

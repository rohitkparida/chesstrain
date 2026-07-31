import { createSelectionVisionDrill } from './visionHelpers';

export const drill = createSelectionVisionDrill({
	id: 'vision.loose-pieces',
	label: 'Undefended Pieces',
	description: 'Select all undefended pieces and pawns.',
	kind: 'loose-pieces',
	noneExpected: 'Incorrect. There were no undefended pieces.'
});

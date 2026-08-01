import { DRILL_METADATA } from '../metadata';
import { createSelectionVisionDrill } from './visionHelpers';

export const drill = createSelectionVisionDrill({
	metadata: DRILL_METADATA['vision.pinned-pieces'],
	kind: 'pinned-pieces',
	noneExpected: 'Incorrect. There were no pinned pieces.'
});

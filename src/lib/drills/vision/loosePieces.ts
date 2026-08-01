import { DRILL_METADATA } from '../metadata';
import { createSelectionVisionDrill } from './visionHelpers';

export const drill = createSelectionVisionDrill({
	metadata: DRILL_METADATA['vision.loose-pieces'],
	kind: 'loose-pieces',
	noneExpected: 'Incorrect. There were no undefended pieces.'
});

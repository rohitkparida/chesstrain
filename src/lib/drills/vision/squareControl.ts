import { DRILL_METADATA } from '../metadata';
import { createSelectionVisionDrill } from './visionHelpers';

export const drill = createSelectionVisionDrill({
	metadata: DRILL_METADATA['vision.square-control'],
	kind: 'square-control',
	noneExpected: 'Incorrect. No squares attack or defend the target square.'
});

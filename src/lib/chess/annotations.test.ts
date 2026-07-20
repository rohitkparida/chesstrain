import { describe, expect, it } from 'vitest';
import { annotationPoint, transformAnnotations } from './annotations';

describe('board annotations', () => {
	it('transforms both ends of an annotation with board flip', () => {
		const annotations = transformAnnotations([{ from: 'e2', to: 'e4', kind: 'arrow' }], true);
		expect(annotations).toEqual([{ from: 'd7', to: 'd5', kind: 'arrow' }]);
	});

	it('keeps annotation geometry aligned after a flip', () => {
		expect(annotationPoint('a1', true)).toEqual({ x: 7.5, y: 0.5 });
		expect(annotationPoint('h8', true)).toEqual({ x: 0.5, y: 7.5 });
	});
});

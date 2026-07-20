import { orientSquare } from './board';

export type AnnotationKind = 'arrow' | 'highlight';

export interface BoardAnnotation {
	from: string;
	to?: string;
	color?: string;
	label?: string;
	kind?: AnnotationKind;
}

export interface AnnotationPoint {
	x: number;
	y: number;
}

export function transformAnnotation(annotation: BoardAnnotation, flipped: boolean): BoardAnnotation {
	return {
		...annotation,
		from: orientSquare(annotation.from, flipped),
		...(annotation.to ? { to: orientSquare(annotation.to, flipped) } : {})
	};
}

export function transformAnnotations(annotations: readonly BoardAnnotation[], flipped: boolean): BoardAnnotation[] {
	return annotations.map(annotation => transformAnnotation(annotation, flipped));
}

export function annotationPoint(square: string, flipped: boolean): AnnotationPoint {
	const visualSquare = orientSquare(square, flipped);
	return {
		x: (visualSquare.charCodeAt(0) - 96.5),
		y: 8.5 - Number(visualSquare[1])
	};
}

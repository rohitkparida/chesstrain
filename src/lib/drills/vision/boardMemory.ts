import { Chess, type PieceSymbol, type Color } from 'chess.js';
import type { DrillDefinition, DrillContext, GeneratedDrill, DrillAssessment, AssistanceLevel, BoardReconstructData, BoardReconstructResponse, BoardMemoryLevel } from '../types';
import { DRILL_METADATA } from '../metadata';
import { FILES } from '$lib/chess/board';

const meta = DRILL_METADATA['vision.board-memory'];
const VERSION = 1;

function randomElement<T>(arr: T[], random: () => number): T {
	return arr[Math.floor(random() * arr.length)] ?? arr[0];
}

const ALL_SQUARES = [
	'a1','b1','c1','d1','e1','f1','g1','h1',
	'a2','b2','c2','d2','e2','f2','g2','h2',
	'a3','b3','c3','d3','e3','f3','g3','h3',
	'a4','b4','c4','d4','e4','f4','g4','h4',
	'a5','b5','c5','d5','e5','f5','g5','h5',
	'a6','b6','c6','d6','e6','f6','g6','h6',
	'a7','b7','c7','d7','e7','f7','g7','h7',
	'a8','b8','c8','d8','e8','f8','g8','h8'
];

import {
	buildFenFromMap,
	generateRandomPosition,
	targetPieceCount,
	pieceCountForLevel,
	parseBoardPieces
} from './boardMemoryUtils';

export const drill: DrillDefinition<'board-reconstruct'> = {
	...meta,
	version: VERSION,

	generate(context: DrillContext): GeneratedDrill<'board-reconstruct'> {
		const targetCount = targetPieceCount(context.difficulty);
		const { fen, pieceCount } = generateRandomPosition(targetCount, context.random);
		const orientation = context.random() > 0.5 ? 'black' : 'white';

		const publicData: BoardReconstructData = {
			fen,
			memorizeSeconds: 3,
			orientation,
			pieceCount
		};

		const privateData = {
			targetFen: fen,
			pieceCount
		};

		return {
			id: `${meta.id}:${Date.now()}:${Math.floor(context.random() * 1000)}`,
			drillId: meta.id,
			prompt: `Memorize the position (${pieceCount} pieces)`,
			fen,
			publicData,
			privateData,
			fingerprint: `memory:${fen}`,
			definitionVersion: VERSION
		};
	},

	evaluate(
		privateData: { targetFen: string; pieceCount: number },
		response: BoardReconstructResponse | null,
		assistance: AssistanceLevel = 'none'
	): DrillAssessment {
		if (assistance === 'solution' || !response || !response.placedFen) {
			return {
				score: 0,
				correct: false,
				feedback: 'Given up. Review the actual piece positions.',
				reveal: { targetFen: privateData.targetFen }
			};
		}

		try {
			const targetMap = parseBoardPieces(privateData.targetFen);
			const placedMap = parseBoardPieces(response.placedFen);

			let correctCount = 0;
			let totalTargetPieces = targetMap.size;

			for (const [sq, targetPiece] of targetMap.entries()) {
				const placedPiece = placedMap.get(sq);
				if (placedPiece && placedPiece.color === targetPiece.color && placedPiece.type === targetPiece.type) {
					correctCount++;
				}
			}

			const accuracyPercent = Math.round((correctCount / Math.max(1, totalTargetPieces)) * 100);
			const isExactMatch = correctCount === totalTargetPieces && placedMap.size === totalTargetPieces;
			const isPassable = accuracyPercent >= 80;

			const score = isExactMatch ? 1.0 : isPassable ? 0.75 : 0.0;

			return {
				score,
				correct: isPassable,
				feedback: isExactMatch
					? `Perfect! All ${totalTargetPieces} pieces reconstructed accurately (100%).`
					: `Placed ${correctCount}/${totalTargetPieces} pieces correctly (${accuracyPercent}% accuracy).`,
				reveal: { targetFen: privateData.targetFen }
			};
		} catch {
			return {
				score: 0,
				correct: false,
				feedback: 'Could not grade the placed board position.',
				reveal: { targetFen: privateData.targetFen }
			};
		}
	}
};

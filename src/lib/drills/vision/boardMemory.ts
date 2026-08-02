import type { DrillDefinition, DrillContext, GeneratedDrill, DrillAssessment, AssistanceLevel, BoardReconstructData, BoardReconstructResponse } from '../types';
import { DRILL_METADATA } from '../metadata';
import {
	generateRandomPosition,
	targetPieceCount,
	parseBoardPieces
} from './boardMemoryUtils';

const meta = DRILL_METADATA['vision.board-memory'];
const VERSION = 1;

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

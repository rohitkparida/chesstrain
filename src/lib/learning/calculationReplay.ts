import { Chess } from 'chess.js';

export interface CalculationReplayLine {
	label: string;
	moves: string[];
	fens: string[];
}

export interface CalculationReplay {
	user: CalculationReplayLine;
	best: CalculationReplayLine;
	divergedIndex: number | null;
}

function buildLine(startFen: string, label: string, moves: string[]): CalculationReplayLine {
	const game = new Chess(startFen);
	const fens = [startFen];
	const playedMoves: string[] = [];

	for (const move of moves) {
		try {
			game.move(move);
			playedMoves.push(move);
			fens.push(game.fen());
		} catch {
			break;
		}
	}

	return { label, moves: playedMoves, fens };
}

export function buildCalculationReplay(
	startFen: string,
	userMoves: string[],
	bestMoves: string[],
	divergedIndex: number | null
): CalculationReplay {
	return {
		user: buildLine(startFen, 'Your line', userMoves),
		best: buildLine(startFen, 'Best line', bestMoves),
		divergedIndex
	};
}

import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

export type TacticalMotif =
	| 'fork'
	| 'pin'
	| 'back-rank'
	| 'discovered-check'
	| 'skewer'
	| 'deflection';

export interface ProceduralPuzzle {
	id: string;
	fen: string;
	solution: string[];
	motif: TacticalMotif;
	description: string;
	difficulty: number;
	tags: string[];
}

export interface TacticalMotifData {
	motif: TacticalMotif;
	difficulty: number;
	fens: Array<{
		fen: string;
		solution: string[];
		desc: string;
	}>;
}

export const MOTIF_CATALOG: Record<TacticalMotif, TacticalMotifData> = {
	fork: {
		motif: 'fork',
		difficulty: 1200,
		fens: [
			{
				fen: 'r1b2rk1/ppp3pp/8/3B4/3Q1n2/8/PPP2PPP/R4RK1 b - - 0 1',
				solution: ['Ne2+', 'Kh1', 'Nxd4'],
				desc: 'Fork the king and queen with your knight.'
			},
			{
				fen: 'r2q1rk1/pp1b1ppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R2Q1RK1 b - - 0 1',
				solution: ['c4', 'Bc2', 'Nd4'],
				desc: 'Execute the central fork setup.'
			},
			{
				fen: 'r1b1k2r/pppp1ppp/8/4n3/2q5/2N1P3/PP3PPP/R2QKB1R w KQkq - 0 10',
				solution: ['Bxc4'],
				desc: 'Exploit the tactical fork error.'
			}
		]
	},
	pin: {
		motif: 'pin',
		difficulty: 1250,
		fens: [
			{
				fen: 'r1b1k2r/pppp1ppp/8/4q3/1bP5/2N1P3/PP3PPP/R2QKB1R w KQkq - 0 10',
				solution: ['Qb3', 'Bxc3+', 'bxc3'],
				desc: 'Pressure the bishop pinning your knight.'
			},
			{
				fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
				solution: ['Nd5'],
				desc: 'Exploit the pin on the knight.'
			}
		]
	},
	'back-rank': {
		motif: 'back-rank',
		difficulty: 1100,
		fens: [
			{
				fen: '3r2k1/p4ppp/1p2p3/8/2P5/1P6/P4PPP/3R2K1 b - - 0 1',
				solution: ['Rxd1#'],
				desc: 'Punish the back-rank weakness.'
			},
			{
				fen: 'r1b2rk1/pp3ppp/8/3q4/3N4/8/PP1Q1PPP/3R1RK1 w - - 0 1',
				solution: ['Qxd5'],
				desc: 'Deflect the defender and control the back rank.'
			}
		]
	},
	'discovered-check': {
		motif: 'discovered-check',
		difficulty: 1300,
		fens: [
			{
				fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
				solution: ['Bxf7+', 'Kxf7', 'Nxe5+'],
				desc: 'Unmask the battery with a discovered check.'
			}
		]
	},
	skewer: {
		motif: 'skewer',
		difficulty: 1200,
		fens: [
			{
				fen: '8/8/4k3/8/2B5/8/4K3/r7 b - - 0 1',
				solution: ['Ra2+'],
				desc: 'Skewer the king and rook.'
			}
		]
	},
	deflection: {
		motif: 'deflection',
		difficulty: 1350,
		fens: [
			{
				fen: 'r1b1qr1k/ppp3pp/8/4N3/2B5/8/PPP3PP/R2Q1RK1 w - - 0 1',
				solution: ['Rxf8+', 'Qxf8', 'Nf7+'],
				desc: 'Deflect the key defender away from the king.'
			}
		]
	}
};

function buildProceduralTacticInstance(
	motif: TacticalMotif,
	random: () => number = Math.random
): ProceduralPuzzle {
	const config = MOTIF_CATALOG[motif];
	const selected = config.fens[Math.floor(random() * config.fens.length)] ?? config.fens[0];
	const idSlug = motif === 'discovered-check' ? 'discovered' : motif;
	return {
		id: `procedural-${idSlug}-${Date.now()}-${Math.floor(random() * 1000)}`,
		fen: selected.fen,
		solution: selected.solution,
		motif: config.motif,
		description: selected.desc,
		difficulty: config.difficulty,
		tags: ['procedural', config.motif, 'tactics']
	};
}

export function generateKnightForkPuzzle(random: () => number = Math.random): ProceduralPuzzle {
	return buildProceduralTacticInstance('fork', random);
}

export function generatePinPuzzle(random: () => number = Math.random): ProceduralPuzzle {
	return buildProceduralTacticInstance('pin', random);
}

export function generateBackRankPuzzle(random: () => number = Math.random): ProceduralPuzzle {
	return buildProceduralTacticInstance('back-rank', random);
}

export function generateDiscoveredCheckPuzzle(random: () => number = Math.random): ProceduralPuzzle {
	return buildProceduralTacticInstance('discovered-check', random);
}

export function generateSkewerPuzzle(random: () => number = Math.random): ProceduralPuzzle {
	return buildProceduralTacticInstance('skewer', random);
}

export function generateDeflectionPuzzle(random: () => number = Math.random): ProceduralPuzzle {
	return buildProceduralTacticInstance('deflection', random);
}

const MOTIF_GENERATORS = [
	generateKnightForkPuzzle,
	generatePinPuzzle,
	generateBackRankPuzzle,
	generateDiscoveredCheckPuzzle,
	generateSkewerPuzzle,
	generateDeflectionPuzzle
];

export function generateProceduralTacticsPuzzle(random: () => number = Math.random): ProceduralPuzzle {
	const index = Math.floor(random() * MOTIF_GENERATORS.length);
	const generator = MOTIF_GENERATORS[index] ?? MOTIF_GENERATORS[0];
	return generator(random);
}

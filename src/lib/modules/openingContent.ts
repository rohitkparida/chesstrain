import type { OpeningLine } from '../learning/openingPractice';

export const OPENING_LINES: readonly OpeningLine[] = [
	{ id: 'ruy-lopez', name: 'Ruy Lopez', moves: [
		{ from: 'e2', to: 'e4', replyFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', replyText: 'Opponent played 1... e5. Now play 2. Nf3.' },
		{ from: 'g1', to: 'f3', replyFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', replyText: 'Opponent played 2... Nc6. Now play 3. Bb5 (Ruy Lopez).' },
		{ from: 'f1', to: 'b5', replyFen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', replyText: 'Excellent! Repertoire goal reached. Ruy Lopez main line set.' }
	] },
	{ id: 'italian', name: 'Italian Game', moves: [
		{ from: 'e2', to: 'e4', replyFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', replyText: 'Opponent played 1... e5. Now recall 2. Nf3.' },
		{ from: 'g1', to: 'f3', replyFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', replyText: 'Opponent played 2... Nc6. Now recall 3. Bc4 (Italian Game).' },
		{ from: 'f1', to: 'c4', replyFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', replyText: 'Italian Game line complete. Restart to practice the other line.' }
	] }
];

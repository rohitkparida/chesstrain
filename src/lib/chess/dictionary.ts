export type DictionaryVisual = 'board' | 'pin' | 'arrow' | 'balance' | 'flow';

export interface ChessTermDefinition {
	id: string;
	term: string;
	aliases: readonly string[];
	shortDefinition: string;
	definition: string;
	example: string;
	visual: DictionaryVisual;
	visualCaption: string;
}

export const CHESS_DICTIONARY: readonly ChessTermDefinition[] = [
	{
		id: 'square-control', term: 'Square control', aliases: ['square control', 'controlling'],
		shortDefinition: 'Which pieces attack a square.',
		definition: 'A square is controlled by every piece that could legally capture something on that square. Both sides can control the same square.',
		example: 'A knight on f3 controls e5, d4, d2, e1, g1, h2, h4, and g5.', visual: 'board', visualCaption: 'Highlighted squares are controlled by the knight.'
	},
	{
		id: 'loose-piece', term: 'Loose piece', aliases: ['loose piece', 'loose pieces'],
		shortDefinition: 'A piece that is not adequately defended.',
		definition: 'A loose piece can often be won because it has no defender, or because its defenders are not enough to make an exchange safe.',
		example: 'Before attacking, scan for pieces that are left loose.', visual: 'board', visualCaption: 'The marked piece has no friendly defender.'
	},
	{
		id: 'pin', term: 'Pin', aliases: ['pin', 'pinned'],
		shortDefinition: 'A piece cannot move safely because something behind it would be exposed.',
		definition: 'In an absolute pin, moving the piece would expose the king. In a relative pin, moving it would expose a more valuable piece, often the queen.',
		example: 'A bishop can pin a knight to the king.', visual: 'pin', visualCaption: 'The front piece is between the attacker and the king.'
	},
	{
		id: 'pawn-break', term: 'Pawn break', aliases: ['pawn break', 'pawn breaks'],
		shortDefinition: 'A pawn move that challenges the opponent’s pawn structure.',
		definition: 'A pawn break opens lines, creates exchanges, or changes the shape of the centre or a wing.',
		example: 'Playing c4 can challenge the opponent’s central pawns.', visual: 'arrow', visualCaption: 'The arrow shows the pawn move that opens a new line.'
	},
	{
		id: 'open-file', term: 'Open file', aliases: ['open file', 'open files'],
		shortDefinition: 'A file with no pawns on it.',
		definition: 'Open files give rooks and queens a clear route toward the opponent’s pieces or king.',
		example: 'A rook often belongs on an open file.', visual: 'board', visualCaption: 'The highlighted file is clear for a rook.'
	},
	{
		id: 'weak-square', term: 'Weak square', aliases: ['weak square', 'weak squares'],
		shortDefinition: 'A square that is difficult to defend or challenge with a pawn.',
		definition: 'A weak square can become a strong outpost for an enemy piece, especially when your pawns cannot chase that piece away.',
		example: 'A knight on a weak central square can become a long-term problem.', visual: 'board', visualCaption: 'The marked square is a possible outpost.'
	},
	{
		id: 'tempo', term: 'Tempo', aliases: ['tempo'],
		shortDefinition: 'One move of useful time.',
		definition: 'You gain a tempo when a move makes a useful threat and forces the opponent to respond instead of following their plan.',
		example: 'Developing with a tempo means developing while attacking something.', visual: 'arrow', visualCaption: 'One move develops a piece and creates a threat.'
	},
	{
		id: 'initiative', term: 'Initiative', aliases: ['initiative'],
		shortDefinition: 'The ability to keep making threats.',
		definition: 'The player with the initiative asks the questions and makes the opponent spend moves responding.',
		example: 'Active development can give White the initiative.', visual: 'flow', visualCaption: 'Threat, reply, new threat.'
	},
	{
		id: 'candidate-move', term: 'Candidate move', aliases: ['candidate move', 'candidate moves', 'candidates'],
		shortDefinition: 'A move worth serious consideration.',
		definition: 'Instead of looking at every legal move, choose a short list of promising moves and compare them carefully.',
		example: 'Checks, captures, threats, and useful improvements are common candidates.', visual: 'flow', visualCaption: 'Compare a few serious choices before playing.'
	},
	{
		id: 'refutation', term: 'Refutation', aliases: ['refutation', 'refutations'],
		shortDefinition: 'The strongest way to show that a move or plan does not work.',
		definition: 'A refutation is usually the opponent’s strongest reply, not just any legal response.',
		example: 'Before playing a move, ask what the opponent’s strongest reply would be.', visual: 'flow', visualCaption: 'Your idea is tested by the opponent’s best reply.'
	},
	{
		id: 'repertoire', term: 'Repertoire', aliases: ['repertoire'],
		shortDefinition: 'The openings and plans you choose to play.',
		definition: 'Your repertoire is your personal collection of opening lines and the ideas you know how to use after them.',
		example: 'Your repertoire might include the Italian Game as White.', visual: 'flow', visualCaption: 'An opening line becomes part of your saved choices.'
	},
	{
		id: 'line', term: 'Line', aliases: ['line', 'main line', 'solution line', 'engine line'],
		shortDefinition: 'A sequence of moves.',
		definition: 'A line is a possible sequence of moves that explains an idea, tests a plan, or shows an opening variation.',
		example: 'Calculate the line 1. Nxf7 Rxf7 2. Qd5+.', visual: 'arrow', visualCaption: 'The arrows show a move sequence, one move at a time.'
	},
	{
		id: 'calculation', term: 'Calculation', aliases: ['calculation'],
		shortDefinition: 'Thinking through future moves before playing.',
		definition: 'Calculation means visualizing a few likely moves, checking the opponent’s replies, and comparing the resulting positions.',
		example: 'Good calculation asks what happens after your move and the opponent’s best reply.', visual: 'flow', visualCaption: 'Move, reply, continuation, evaluation.'
	},
	{
		id: 'evaluation', term: 'Evaluation', aliases: ['evaluation', 'evaluate', 'evaluation band'],
		shortDefinition: 'An estimate of who stands better and why.',
		definition: 'Evaluation combines material, king safety, activity, pawn structure, and long-term plans. It is not a guarantee of the final result.',
		example: 'A position can be equal even when both sides have different strengths.', visual: 'balance', visualCaption: 'Evaluation compares the whole position, not just material.'
	},
	{
		id: 'space', term: 'Space', aliases: ['space advantage', 'spatial advantage', 'space'],
		shortDefinition: 'How much room your pieces have to move.',
		definition: 'A space advantage usually comes from pawns controlling territory. More space can make it easier to improve pieces, but it can also create targets.',
		example: 'A pawn on e5 may give White more space in the centre.', visual: 'balance', visualCaption: 'More controlled squares give pieces more room.'
	},
	{
		id: 'development', term: 'Development', aliases: ['development', 'develop'],
		shortDefinition: 'Bringing your pieces into useful positions.',
		definition: 'Early development usually means moving minor pieces, castling, and connecting the rooks so the army can work together.',
		example: 'Nf3 develops a knight and helps control the centre.', visual: 'flow', visualCaption: 'Pieces leave their starting squares and join the game.'
	},
	{
		id: 'king-safety', term: 'King safety', aliases: ['king safety'],
		shortDefinition: 'How protected your king is from attack.',
		definition: 'King safety depends on pawn cover, nearby defenders, open lines, and how quickly the opponent can create threats.',
		example: 'Castling often improves king safety and connects the rooks.', visual: 'board', visualCaption: 'The king is safer behind a pawn shield.'
	},
	{
		id: 'endgame-technique', term: 'Endgame technique', aliases: ['technical position', 'technical positions', 'endgame technique', 'convert'],
		shortDefinition: 'The method used to turn an endgame advantage into a result.',
		definition: 'Endgame technique means using repeatable methods such as improving the king, creating zugzwang, stopping counterplay, and avoiding stalemate.',
		example: 'A winning rook ending still requires accurate technique.', visual: 'flow', visualCaption: 'Improve, restrict, create a passed pawn, finish.'
	},
	{
		id: 'stalemate', term: 'Stalemate', aliases: ['stalemate', 'stalemated'],
		shortDefinition: 'The player to move has no legal move but is not in check.',
		definition: 'Stalemate is a draw. In queen-and-king endings, avoid trapping the enemy king with no legal move before your king is close enough.',
		example: 'A winning position can become a draw if the last move causes stalemate.', visual: 'board', visualCaption: 'The king has no move, but it is not in check.'
	},
	{
		id: 'checkmate', term: 'Checkmate', aliases: ['checkmate', 'mated'],
		shortDefinition: 'The king is in check and has no legal escape.',
		definition: 'Checkmate ends the game immediately. The attacked king cannot move, capture the attacker, or block the check.',
		example: 'A back-rank checkmate works when the king has no escape square.', visual: 'board', visualCaption: 'The king is attacked and every escape is covered.'
	}
];

const byId = new Map(CHESS_DICTIONARY.map((entry) => [entry.id, entry]));

export function dictionaryEntry(id: string): ChessTermDefinition | undefined {
	return byId.get(id);
}

const glossaryAliases = CHESS_DICTIONARY
	.flatMap((entry) => entry.aliases.map((alias) => ({ alias, entry })))
	.sort((left, right) => right.alias.length - left.alias.length);

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface GlossarySegment {
	text: string;
	termId?: string;
}

export function glossarySegments(text: string): GlossarySegment[] {
	if (!text) return [];
	const pattern = glossaryAliases.map(({ alias }) => escapeRegExp(alias)).join('|');
	const matcher = new RegExp(`\\b(${pattern})\\b`, 'gi');
	const segments: GlossarySegment[] = [];
	let cursor = 0;
	for (const match of text.matchAll(matcher)) {
		const index = match.index ?? 0;
		if (index > cursor) segments.push({ text: text.slice(cursor, index) });
		const found = glossaryAliases.find(({ alias }) => alias.toLowerCase() === match[0].toLowerCase());
		segments.push({ text: match[0], termId: found?.entry.id });
		cursor = index + match[0].length;
	}
	if (cursor < text.length) segments.push({ text: text.slice(cursor) });
	return segments;
}

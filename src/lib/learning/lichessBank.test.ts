import { describe, expect, it } from 'vitest';
import { createLichessPuzzleBank, lichessRecordToPuzzle, parseLichessPuzzleCsv } from './lichessBank';

const csv = `PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
p1,6k1/8/8/8/8/8/8/6K1 w - - 0 1,g1f2 g8f7 f2g3,1100,80,90,20,fork middlegame,https://lichess.org/game#1,`;

describe('separate Lichess puzzle bank', () => {
	it('parses the public CSV format and converts the opponent setup', () => {
		const records = parseLichessPuzzleCsv(csv);
		expect(records[0]).toMatchObject({ id: 'p1', rating: 1100, themes: ['fork', 'middlegame'] });
		const puzzle = lichessRecordToPuzzle(records[0]);
		expect(puzzle).toMatchObject({ id: 'lichess:p1', elo: 1100, solution: ['Kf7', 'Kg3'] });
	});

	it('selects near the target while keeping the bank isolated', () => {
		const records = parseLichessPuzzleCsv(csv);
		const bank = createLichessPuzzleBank(records);
		expect(bank.select(1080)?.id).toBe('p1');
		expect(bank.select(1080, ['mate']) ).toBeNull();
	});
});

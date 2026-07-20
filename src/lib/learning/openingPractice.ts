export interface OpeningLine {
	readonly id: string;
	readonly name: string;
	readonly moves: ReadonlyArray<{
		readonly from: string;
		readonly to: string;
		readonly replyFen: string;
		readonly replyText: string;
	}>;
}

export function chooseInterleavedLine(lines: readonly OpeningLine[], previousId?: string): OpeningLine | null {
	if (lines.length === 0) return null;
	const alternatives = lines.filter((line) => line.id !== previousId);
	const pool = alternatives.length > 0 ? alternatives : lines;
	return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export interface PuzzleData {
  id: string;
  fen: string;
  solution: string[];
  elo: number;
  tags: string[];
  description?: string;
}

export const mockPuzzles: PuzzleData[] = [
  {
    id: "p1",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
    solution: ["Nf6", "Ng5", "d5"],
    elo: 1000,
    tags: ["opening", "two-knights"],
    description: "Standard defense challenge."
  },
  {
    id: "p2",
    fen: "3r2k1/p4ppp/1p2p3/8/2P5/1P6/P4PPP/3R2K1 b - - 0 1",
    solution: ["Rxd1#"],
    elo: 800,
    tags: ["back-rank", "mate-in-1"],
    description: "Punish the back-rank weakness."
  }
];

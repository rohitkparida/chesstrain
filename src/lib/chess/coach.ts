import { StockfishEngine, type EngineEval } from './engine';

export interface CoachResult {
	bestMove: string;
	evalCp: number;
	cpLoss: number;
	explanation: string;
	correct: boolean;
}

class CoachService {
	private engine: StockfishEngine | null = null;

	init() {
		if (typeof window !== 'undefined' && !this.engine) this.engine = new StockfishEngine();
	}

	private getEngine(): StockfishEngine {
		this.init();
		if (!this.engine) throw new Error('Chess engine unavailable.');
		return this.engine;
	}

	async getPreMoveEval(fen: string): Promise<EngineEval> {
		return this.getEngine().getEval(fen);
	}

	async explain(params: {
		preMoveEval: EngineEval;
		userMove: string;
		newFen: string;
		correct: boolean;
	}): Promise<CoachResult> {
		const postMoveEval = await this.getEngine().getEval(params.newFen);
		const cpLoss = Math.max(0, params.preMoveEval.evalCp - (-postMoveEval.evalCp)) / 100;
		return {
			bestMove: params.preMoveEval.bestMove,
			evalCp: postMoveEval.evalCp,
			cpLoss,
			explanation: this.templateFallback({
				userMove: params.userMove,
				bestMove: params.preMoveEval.bestMove,
				cpLoss,
				correct: params.correct
			}),
			correct: params.correct
		};
	}

	private templateFallback(params: { userMove: string; bestMove: string; cpLoss: number; correct: boolean }): string {
		if (params.correct) return `${params.userMove} is the best move. The engine agrees.`;
		if (params.cpLoss < 0.5) return `${params.userMove} is close, but ${params.bestMove} is more accurate.`;
		if (params.cpLoss < 2) return `${params.userMove} loses ${params.cpLoss.toFixed(1)} pawns. Try ${params.bestMove} next time.`;
		return `${params.userMove} is a serious mistake. The engine prefers ${params.bestMove}.`;
	}

	terminate() {
		this.engine?.terminate();
		this.engine = null;
	}
}

export const coach = new CoachService();

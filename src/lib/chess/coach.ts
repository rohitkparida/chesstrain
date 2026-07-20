// coach.ts — combines Stockfish eval + LLM explanation into one async call
// Usage: const result = await coach.explain(fen, userMove, isCorrect);

import { StockfishEngine, type EngineEval } from './engine';
import { RequestBroker } from './requestBroker';

export interface CoachResult {
  bestMove: string;
  evalCp: number;
  cpLoss: number;        // how much the user's move cost vs best
  explanation: string;   // LLM-generated coaching sentence
  correct: boolean;
}

class CoachService {
  private engine: StockfishEngine | null = null;
  private llmWorker: Worker | null = null;
  private llmReady = false;
  private pendingExplains = new RequestBroker<string>();

  init() {
    if (typeof window === 'undefined') return;
    if (this.engine) return;

    this.engine = new StockfishEngine();

    // Spawn LLM worker
    this.llmWorker = new Worker(
      new URL('./llmWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.llmWorker.onmessage = (e) => {
      const { type, text, requestId } = e.data;
      if (type === 'ready') {
        this.llmReady = true;
      }
      if (type === 'explanation') {
        this.pendingExplains.resolve(requestId, text ?? 'No explanation available.');
      }
    };

    // Pre-warm: start loading the model immediately in background
    this.llmWorker.postMessage({ type: 'init' });
  }

  get modelStatus(): 'loading' | 'ready' | 'unavailable' {
    if (!this.llmWorker) return 'unavailable';
    if (this.llmReady) return 'ready';
    return 'loading';
  }

  /** Evaluate position before user moves — call BEFORE the move is made */
  async getPreMoveEval(fen: string): Promise<EngineEval> {
    return this.engine!.getEval(fen);
  }

  /** After user moves: get eval of new position + LLM explanation */
  async explain(params: {
    preMoveEval: EngineEval;   // eval before user moved
    userMove: string;          // e.g. "e2e4"
    newFen: string;            // FEN after user's move
    correct: boolean;
  }): Promise<CoachResult> {
    // Get engine's eval of position AFTER user's move
    const postMoveEval = await this.engine!.getEval(params.newFen);

    // cpLoss = how much worse the position got for the side that just moved
    // preMoveEval is from the perspective of the side about to move
    // postMoveEval is from the perspective of the opponent (negated)
    const cpLoss = Math.max(0, params.preMoveEval.evalCp - (-postMoveEval.evalCp));

    // Get LLM explanation
    const explanation = await this.getLLMExplanation({
      userMove: params.userMove,
      bestMove: params.preMoveEval.bestMove,
      cpLoss: cpLoss / 100, // convert to pawns
      correct: params.correct,
      fen: params.newFen,
    });

    return {
      bestMove: params.preMoveEval.bestMove,
      evalCp: postMoveEval.evalCp,
      cpLoss: cpLoss / 100,
      explanation,
      correct: params.correct,
    };
  }

  private getLLMExplanation(payload: {
    userMove: string;
    bestMove: string;
    cpLoss: number;
    correct: boolean;
    fen: string;
  }): Promise<string> {
    if (!this.llmWorker) {
      return Promise.resolve(this.templateFallback(payload));
    }

    return new Promise((resolve) => {
      let requestId = '';
      // Timeout fallback: if LLM takes >8s, use template
      const timeout = setTimeout(() => {
        this.pendingExplains.delete(requestId);
        resolve(this.templateFallback(payload));
      }, 8000);

      requestId = this.pendingExplains.register((text) => {
        clearTimeout(timeout);
        resolve(text || this.templateFallback(payload));
      });

      this.llmWorker!.postMessage({ type: 'explain', requestId, payload });
    });
  }

  /** Rule-based fallback if LLM is still loading or times out */
  private templateFallback(p: {
    userMove: string;
    bestMove: string;
    cpLoss: number;
    correct: boolean;
  }): string {
    if (p.correct) return `${p.userMove} is the best move — engine agrees.`;
    if (p.cpLoss < 0.5) return `${p.userMove} is close but ${p.bestMove} was slightly more accurate.`;
    if (p.cpLoss < 2) return `${p.userMove} loses ${p.cpLoss.toFixed(1)} pawns of advantage. Try ${p.bestMove} next time.`;
    return `${p.userMove} is a serious mistake (−${p.cpLoss.toFixed(1)}). The engine plays ${p.bestMove} instead.`;
  }

  terminate() {
    this.engine?.terminate();
    this.llmWorker?.terminate();
  }
}

// Singleton — one coach per app session
export const coach = new CoachService();

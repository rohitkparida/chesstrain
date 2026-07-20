// llmWorker.ts — runs Qwen 0.5B-Instruct in a Web Worker via transformers.js
// Caches the model to IndexedDB on first load (offline capable after that)

import { pipeline, env, type TextGenerationPipelineType } from '@xenova/transformers';

// Use local cache only after first download — works offline
env.allowRemoteModels = true;
env.useBrowserCache = true;

interface ModelProgress {
  status?: unknown;
  loaded?: unknown;
  total?: unknown;
}

interface ExplainPayload {
  userMove: string;
  bestMove: string;
  cpLoss: number;
  correct: boolean;
  fen: string;
}

let generator: TextGenerationPipelineType | null = null;
let loading = false;

async function ensureModel() {
  if (generator) return;
  if (loading) return;
  loading = true;

  self.postMessage({ type: 'status', text: 'Loading chess coach model (first time only)...' });

  try {
    generator = await pipeline(
      'text-generation',
      'Xenova/Qwen2.5-0.5B-Instruct',
      {
        progress_callback: (progress: ModelProgress) => {
          if (
            progress.status === 'downloading'
            && typeof progress.loaded === 'number'
            && typeof progress.total === 'number'
            && progress.total > 0
          ) {
            const pct = Math.round((progress.loaded / progress.total) * 100);
            self.postMessage({ type: 'status', text: `Downloading model: ${pct}%` });
          }
        }
      }
    );
    self.postMessage({ type: 'ready' });
  } catch (error: unknown) {
    generator = null;
    const message = error instanceof Error ? error.message : 'Model unavailable';
    self.postMessage({ type: 'status', text: `Coach model unavailable: ${message}` });
  } finally {
    loading = false;
  }
}

// System prompt — kept tiny for 0.5B reliability
const SYSTEM = `You are a chess coach. Give ONE short sentence (max 20 words) explaining why a move is good or bad. Be concrete and reference the pieces involved.`;

function buildPrompt(data: ExplainPayload) {
  if (data.correct) {
    return `<|im_start|>system\n${SYSTEM}\n<|im_end|>\n<|im_start|>user\nPlayer played ${data.userMove}. This is the best move (engine agrees). Explain briefly why it is strong.\n<|im_end|>\n<|im_start|>assistant\n`;
  }
  return `<|im_start|>system\n${SYSTEM}\n<|im_end|>\n<|im_start|>user\nPlayer played ${data.userMove} but engine prefers ${data.bestMove} (${data.cpLoss.toFixed(1)} pawns better). Explain in one sentence why ${data.bestMove} is stronger.\n<|im_end|>\n<|im_start|>assistant\n`;
}

self.onmessage = async (e: MessageEvent) => {
  if (typeof e.data !== 'object' || e.data === null) return;
  const { type, payload, requestId } = e.data;

  if (type === 'init') {
    await ensureModel();
    return;
  }

  if (type === 'explain') {
    await ensureModel();
    if (!generator) {
      self.postMessage({ type: 'explanation', requestId, text: null, error: 'Model not loaded' });
      return;
    }

    try {
      const prompt = buildPrompt(payload as ExplainPayload);
      const result = await generator(prompt, {
        max_new_tokens: 40,
        temperature: 0.4,
        repetition_penalty: 1.3,
        do_sample: true,
      });

      // Extract only the assistant's reply
      const first = Array.isArray(result[0]) ? result[0][0] : result[0];
      const raw = typeof first?.generated_text === 'string' ? first.generated_text : '';
      const afterPrompt = raw.slice(prompt.length).split('<|im_end|>')[0].trim();

      self.postMessage({ type: 'explanation', requestId, text: afterPrompt });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Explanation unavailable';
      self.postMessage({ type: 'explanation', requestId, text: null, error: message });
    }
  }
};

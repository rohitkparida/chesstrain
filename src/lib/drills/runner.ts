import type {
  DrillDefinition,
  GeneratedDrill,
  DrillAssessment,
  InteractionContracts,
  AssistanceLevel
} from './types';

export type RunnerStatus = 'loading' | 'active' | 'evaluating' | 'feedback';

export interface RunnerState<K extends keyof InteractionContracts = keyof InteractionContracts> {
  status: RunnerStatus;
  instance: GeneratedDrill<K> | null;
  definition: DrillDefinition<K> | null;
  startTimeMs: number | null;
  elapsedMs: number;
  response: InteractionContracts[K]['response'] | null;
  assessment: DrillAssessment | null;
  assistance: AssistanceLevel;
  error: string | null;
}

export type RunnerListener<K extends keyof InteractionContracts = keyof InteractionContracts> = (
  state: RunnerState<K>
) => void;

export interface AttemptRecordEvent<K extends keyof InteractionContracts = keyof InteractionContracts> {
  drillId: string;
  fingerprint: string;
  score: number;
  correct: boolean;
  timeMs: number;
  assistance: AssistanceLevel;
  assessment: DrillAssessment;
  response: InteractionContracts[K]['response'] | null;
}

export class DrillRunnerMachine<K extends keyof InteractionContracts = keyof InteractionContracts> {
  private state: RunnerState<K>;
  private listeners: Set<RunnerListener<K>> = new Set();
  private cancelEngineCallback?: (() => void) | null;
  private onRecordAttempt?: (event: AttemptRecordEvent<K>) => void;
  private attemptRecorded = false;
  private runToken = 0;

  constructor(options?: {
    onRecordAttempt?: (event: AttemptRecordEvent<K>) => void;
    cancelEngine?: () => void;
  }) {
    this.onRecordAttempt = options?.onRecordAttempt;
    this.cancelEngineCallback = options?.cancelEngine;
    this.state = {
      status: 'loading',
      instance: null,
      definition: null,
      startTimeMs: null,
      elapsedMs: 0,
      response: null,
      assessment: null,
      assistance: 'none',
      error: null
    };
  }

  public getState(): RunnerState<K> {
    return { ...this.state };
  }

  public subscribe(listener: RunnerListener<K>): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const current = this.getState();
    for (const listener of this.listeners) {
      listener(current);
    }
  }

  private invalidateRun(): number {
    this.runToken += 1;
    if (this.cancelEngineCallback) {
      this.cancelEngineCallback();
      this.cancelEngineCallback = null;
    }
    return this.runToken;
  }

  public start(definition: DrillDefinition<K>, instance: GeneratedDrill<K>) {
    this.invalidateRun();
    this.attemptRecorded = false;
    this.state = {
      status: 'active',
      definition,
      instance,
      startTimeMs: Date.now(),
      elapsedMs: 0,
      response: null,
      assessment: null,
      assistance: 'none',
      error: null
    };
    this.notify();
  }

  public async submit(response: InteractionContracts[K]['response']): Promise<DrillAssessment | null> {
    const currentToken = this.runToken;
    const def = this.state.definition;
    const inst = this.state.instance;

    if (this.state.status !== 'active' || !def || !inst) {
      return null;
    }

    const elapsed = this.state.startTimeMs ? Date.now() - this.state.startTimeMs : 0;
    this.state = {
      ...this.state,
      status: 'evaluating',
      response,
      elapsedMs: elapsed
    };
    this.notify();

    try {
      const assessment = await def.evaluate(inst.privateData, response, 'none');

      // Abort if a state transition occurred while evaluation was pending
      if (this.runToken !== currentToken) {
        return null;
      }

      this.state = {
        ...this.state,
        status: 'feedback',
        assessment
      };

      this.recordAttemptOnce(assessment, 'none');
      this.notify();
      return assessment;
    } catch (err: unknown) {
      if (this.runToken !== currentToken) {
        return null;
      }
      const message = err instanceof Error ? err.message : 'Evaluation failed';
      this.state = {
        ...this.state,
        status: 'active',
        error: message
      };
      this.notify();
      return null;
    }
  }

  public skip() {
    this.invalidateRun();
    this.state = {
      ...this.state,
      status: 'loading',
      instance: null,
      response: null,
      assessment: null
    };
    this.notify();
  }

  public async giveUp(): Promise<DrillAssessment | null> {
    const def = this.state.definition;
    const inst = this.state.instance;

    if (this.state.status !== 'active' || !def || !inst) {
      return null;
    }

    const currentToken = this.invalidateRun();

    const elapsed = this.state.startTimeMs ? Date.now() - this.state.startTimeMs : 0;

    try {
      const assessment = await def.evaluate(inst.privateData, null, 'solution');

      if (this.runToken !== currentToken) {
        return null;
      }

      this.state = {
        ...this.state,
        status: 'feedback',
        elapsedMs: elapsed,
        assistance: 'solution',
        assessment
      };

      this.recordAttemptOnce(assessment, 'solution');
      this.notify();
      return assessment;
    } catch (err: unknown) {
      if (this.runToken !== currentToken) {
        return null;
      }
      const message = err instanceof Error ? err.message : 'Give up failed';
      this.state = {
        ...this.state,
        status: 'active',
        error: message
      };
      this.notify();
      return null;
    }
  }

  public reset() {
    this.invalidateRun();
    if (this.state.instance && this.state.definition) {
      this.start(this.state.definition, this.state.instance);
    }
  }

  private recordAttemptOnce(assessment: DrillAssessment, assistance: AssistanceLevel) {
    if (this.attemptRecorded || !this.state.instance) return;
    this.attemptRecorded = true;
    if (this.onRecordAttempt) {
      this.onRecordAttempt({
        drillId: this.state.instance.drillId,
        fingerprint: this.state.instance.fingerprint,
        score: assessment.score,
        correct: assessment.correct,
        timeMs: this.state.elapsedMs,
        assistance,
        assessment,
        response: this.state.response
      });
    }
  }
}

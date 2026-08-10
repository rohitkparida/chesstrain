<script lang="ts">
  import ChessBoard from '../../components/ChessBoard.svelte';
  import ObjectiveMetrics from '../../components/ObjectiveMetrics.svelte';
  import TrainingModuleShell from '../../components/TrainingModuleShell.svelte';
  import { accuracyPercent } from '../learning/objectiveScoring';
  import { chooseInterleavedLine } from '../learning/openingPractice';
  import { OPENING_LINES } from './openingContent';
  import { STARTING_FEN } from '../chess/constants';
  import { recordModuleAttempt } from '../../stores/session';
  
  let currentStep = $state(0);
  let lineId = $state('ruy-lopez');
  let feedback = $state('');
  let fen = $state(STARTING_FEN);
  let attempts = $state(0);
  let correctMoves = $state(0);
  
  // Repertoire tree
  let moves = $derived(OPENING_LINES.find((line) => line.id === lineId)?.moves ?? []);

  function handleMove(from: string, to: string) {
    if (currentStep >= moves.length) return false;
    
    const step = moves[currentStep];
    attempts++;
    if (from === step.from && to === step.to) {
      fen = step.replyFen;
      feedback = step.replyText;
      currentStep++;
      correctMoves++;
      if (currentStep === moves.length) recordModuleAttempt({ exerciseId: `opening:${lineId}`, module: 'openings', correctness: correctMoves / Math.max(1, attempts), startedAt: Date.now() - attempts * 1000, tags: ['repertoire'], source: 'repertoire', positionFingerprint: STARTING_FEN });
      return true;
    } else {
      feedback = 'Deviation from repertoire. Try the move again without revealing the line.';
      return false;
    }
  }

  function reset() {
    const nextLine = chooseInterleavedLine(OPENING_LINES, lineId);
    lineId = nextLine?.id ?? OPENING_LINES[0].id;
    currentStep = 0;
    fen = STARTING_FEN;
      feedback = 'Line selected. Make the next move.';
    attempts = 0;
    correctMoves = 0;
  }
</script>

<TrainingModuleShell
  title="Opening Prep Repertoire Trainer"
  task="Play through your opening repertoire."
  taskKeywords={['opening repertoire']}
  resetLabel="Restart opening line"
  onReset={reset}
  onSkip={reset}
  onContinue={reset}
  continueVisible={currentStep >= moves.length}
  continueLabel="Continue to another line"
>
  
  <div class="board-layout">
    <ChessBoard
      {fen}
      onMove={handleMove}
      playable={currentStep < moves.length}
      showUndo={false}
      inactiveLabel="Line complete. Reset to practice again."
    />
  </div>

  {#if attempts > 0}
    <ObjectiveMetrics
      title="Opening results"
      items={[
        { label: 'Move accuracy', value: `${accuracyPercent(correctMoves, attempts) ?? 0}%` },
        { label: 'Correct moves', value: `${correctMoves}/${attempts}` },
        { label: 'Line progress', value: `${currentStep}/${moves.length}` }
      ]}
      note="This measures recall of the selected repertoire line, not whether other legal moves are bad."
    />
  {/if}

  <p class="status-text">{feedback}</p>
</TrainingModuleShell>

<style>
  .board-layout {
    display: flex;
    justify-content: center;
  }
  .status-text {
    margin: 0;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
    font-size: 0.98rem;
    color: var(--accent);
    font-weight: 500;
  }
</style>

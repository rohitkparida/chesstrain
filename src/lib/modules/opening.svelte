<script lang="ts">
  import ChessBoard from '../../components/ChessBoard.svelte';
  import ObjectiveMetrics from '../../components/ObjectiveMetrics.svelte';
  import TrainingModuleShell from '../../components/TrainingModuleShell.svelte';
  import { accuracyPercent } from '../learning/objectiveScoring';
  import { chooseInterleavedLine, type OpeningLine } from '../learning/openingPractice';
  import { STARTING_FEN } from '../chess/constants';
  import { recordTrainingAttempt } from '../../stores/session';
  
  let currentStep = $state(0);
  let lineId = $state('ruy-lopez');
  let feedback = $state('');
  let fen = $state(STARTING_FEN);
  let attempts = $state(0);
  let correctMoves = $state(0);
  
  // Repertoire tree
  const lines: OpeningLine[] = [
  { id: 'ruy-lopez', name: 'Ruy Lopez', moves: [
    { from: "e2", to: "e4", replyFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", replyText: "Opponent played 1... e5. Now play 2. Nf3." },
    { from: "g1", to: "f3", replyFen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", replyText: "Opponent played 2... Nc6. Now play 3. Bb5 (Ruy Lopez)." },
    { from: "f1", to: "b5", replyFen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3", replyText: "Excellent! Repertoire goal reached. Ruy Lopez main line set." }
  ] },
  { id: 'italian', name: 'Italian Game', moves: [
    { from: 'e2', to: 'e4', replyFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', replyText: 'Opponent played 1... e5. Now recall 2. Nf3.' },
    { from: 'g1', to: 'f3', replyFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', replyText: 'Opponent played 2... Nc6. Now recall 3. Bc4 (Italian Game).' },
    { from: 'f1', to: 'c4', replyFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', replyText: 'Italian Game line complete. Restart to practice the other line.' }
  ] }
  ];
  let moves = $derived(lines.find((line) => line.id === lineId)?.moves ?? []);

  function handleMove(from: string, to: string) {
    if (currentStep >= moves.length) return false;
    
    const step = moves[currentStep];
    attempts++;
    if (from === step.from && to === step.to) {
      fen = step.replyFen;
      feedback = step.replyText;
      currentStep++;
      correctMoves++;
      if (currentStep === moves.length) recordTrainingAttempt({ exerciseId: `opening:${lineId}`, module: 'openings', correctness: correctMoves / Math.max(1, attempts), startedAt: Date.now() - attempts * 1000, tags: ['repertoire'], source: 'repertoire', positionFingerprint: STARTING_FEN });
      return true;
    } else {
      feedback = 'Deviation from repertoire. Try the move again without revealing the line.';
      return false;
    }
  }

  function reset() {
    const nextLine = chooseInterleavedLine(lines, lineId);
    lineId = nextLine?.id ?? lines[0].id;
    currentStep = 0;
    fen = STARTING_FEN;
      feedback = 'Line selected. Make the next move.';
    attempts = 0;
    correctMoves = 0;
  }
</script>

<TrainingModuleShell
  title="Opening Prep Repertoire Trainer"
  task="Recall the line and commit each move."
  taskKeywords={['Recall', 'commit']}
  resetLabel="Restart opening line"
  onReset={reset}
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
  {#if currentStep >= moves.length}<button class="continue" onclick={reset}>Continue to another line</button>{/if}
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

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Flashcard } from '../../types/quizzino';
import { checkWrittenAnswer, getDisplayMeaningsList, speakText } from '../../utils/tts';
import { sfx } from '../../utils/soundEffects';

interface BlocksModeProps {
  deck: Deck;
  onBack: () => void;
  onRecordBlocksScore: (score: number) => void;
}

// 8x8 Block Puzzle Grid
const GRID_SIZE = 8;

interface PieceTemplate {
  shape: number[][]; // 2D array: 1 = block, 0 = empty
  colorClass: string;
  name: string;
  weight: number; // Frequenza di comparsa
}

// Funzioni per generare geometricamente tutte le rotazioni e riflessioni
function rotateMatrix(m: number[][]): number[][] {
  const R = m.length;
  const C = m[0].length;
  const res: number[][] = Array.from({ length: C }, () => Array(R).fill(0));
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      res[c][R - 1 - r] = m[r][c];
    }
  }
  return res;
}

function mirrorMatrix(m: number[][]): number[][] {
  return m.map((row) => [...row].reverse());
}

function getUniqueRotationsAndMirrors(base: number[][], includeMirror = false): number[][][] {
  const shapes: number[][][] = [];
  const pushIfUnique = (candidate: number[][]) => {
    const key = JSON.stringify(candidate);
    if (!shapes.some((s) => JSON.stringify(s) === key)) {
      shapes.push(candidate);
    }
  };

  let cur = base;
  for (let i = 0; i < 4; i++) {
    pushIfUnique(cur);
    cur = rotateMatrix(cur);
  }

  if (includeMirror) {
    let mir = mirrorMatrix(base);
    for (let i = 0; i < 4; i++) {
      pushIfUnique(mir);
      mir = rotateMatrix(mir);
    }
  }

  return shapes;
}

interface FamilyDef {
  name: string;
  baseShape: number[][];
  colorClass: string;
  weight: number;
  includeMirror?: boolean;
  colorByOrientation?: {
    horizontal: string;
    vertical: string;
  };
}

const FAMILIES: FamilyDef[] = [
  // 1. Puntino singolo 1x1
  {
    name: 'dot_1x1',
    baseShape: [[1]],
    colorClass: 'bg-emerald-500 shadow-emerald-500/40',
    weight: 5,
  },
  // 2. Linea da 2 blocchi (orizzontale + verticale)
  {
    name: 'line_2',
    baseShape: [[1, 1]],
    colorClass: 'bg-sky-500 shadow-sky-500/40',
    weight: 5,
    colorByOrientation: {
      horizontal: 'bg-sky-500 shadow-sky-500/40',
      vertical: 'bg-fuchsia-500 shadow-fuchsia-500/40',
    },
  },
  // 3. Linea da 3 blocchi (orizzontale + verticale)
  {
    name: 'line_3',
    baseShape: [[1, 1, 1]],
    colorClass: 'bg-sky-500 shadow-sky-500/40',
    weight: 4,
    colorByOrientation: {
      horizontal: 'bg-sky-500 shadow-sky-500/40',
      vertical: 'bg-fuchsia-500 shadow-fuchsia-500/40',
    },
  },
  // 4. Linea da 4 blocchi (orizzontale + verticale)
  {
    name: 'line_4',
    baseShape: [[1, 1, 1, 1]],
    colorClass: 'bg-sky-500 shadow-sky-500/40',
    weight: 2,
    colorByOrientation: {
      horizontal: 'bg-sky-500 shadow-sky-500/40',
      vertical: 'bg-fuchsia-500 shadow-fuchsia-500/40',
    },
  },
  // 5. Linea da 5 blocchi (orizzontale + verticale)
  {
    name: 'line_5',
    baseShape: [[1, 1, 1, 1, 1]],
    colorClass: 'bg-sky-500 shadow-sky-500/40',
    weight: 1,
    colorByOrientation: {
      horizontal: 'bg-sky-500 shadow-sky-500/40',
      vertical: 'bg-fuchsia-500 shadow-fuchsia-500/40',
    },
  },
  // 6. Quadrato 2x2
  {
    name: 'square_2x2',
    baseShape: [[1, 1], [1, 1]],
    colorClass: 'bg-emerald-500 shadow-emerald-500/40',
    weight: 4,
  },
  // 7. Angoli 3-blocchi (2x2 corner in tutte le 4 rotazioni)
  {
    name: 'corner_3',
    baseShape: [[1, 0], [1, 1]],
    colorClass: 'bg-rose-500 shadow-rose-500/40',
    weight: 4,
  },
  // 8. Forme L e J da 4 blocchi (tutte le 8 rotazioni/riflessioni)
  {
    name: 'l_4',
    baseShape: [[1, 0], [1, 0], [1, 1]],
    colorClass: 'bg-amber-500 shadow-amber-500/40',
    weight: 3,
    includeMirror: true,
  },
  // 9. Forme a T da 4 blocchi (tutte le 4 rotazioni)
  {
    name: 't_4',
    baseShape: [[1, 1, 1], [0, 1, 0]],
    colorClass: 'bg-indigo-500 shadow-indigo-500/40',
    weight: 2,
  },
  // 10. Forme a Z e S da 4 blocchi (tutte le 4 rotazioni/riflessioni)
  {
    name: 'z_4',
    baseShape: [[1, 1, 0], [0, 1, 1]],
    colorClass: 'bg-teal-500 shadow-teal-500/40',
    weight: 2,
    includeMirror: true,
  },
  // 11. Big Corner 3x3 a 5 blocchi (tutte le 4 rotazioni)
  {
    name: 'big_corner_3x3',
    baseShape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]],
    colorClass: 'bg-purple-600 shadow-purple-600/40',
    weight: 1,
  },
];

// Generazione completa di tutti i pezzi e delle loro rotazioni
const PIECE_TEMPLATES: PieceTemplate[] = FAMILIES.flatMap((family) => {
  const uniqueShapes = getUniqueRotationsAndMirrors(family.baseShape, family.includeMirror);

  return uniqueShapes.map((shape, idx) => {
    let color = family.colorClass;
    if (family.colorByOrientation) {
      const isHorizontal = shape[0].length > shape.length;
      color = isHorizontal
        ? family.colorByOrientation.horizontal
        : family.colorByOrientation.vertical;
    }

    return {
      name: `${family.name}_rot${idx}`,
      shape,
      colorClass: color,
      weight: family.weight,
    };
  });
});

interface ActivePiece {
  id: string;
  template: PieceTemplate;
}

// Estrazione casuale ponderata dei pezzi (favorisce i pezzi base e compatti)
function getRandomPieces(): ActivePiece[] {
  const weightedPool: PieceTemplate[] = [];
  for (const t of PIECE_TEMPLATES) {
    for (let k = 0; k < t.weight; k++) {
      weightedPool.push(t);
    }
  }

  const pieces: ActivePiece[] = [];
  for (let i = 0; i < 3; i++) {
    const template = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    pieces.push({
      id: `piece-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      template,
    });
  }
  return pieces;
}

// Algoritmo Fisher-Yates per mescolare in modo uniforme le carte all'avvio e ad ogni restart
function shuffleCards(cards: Flashcard[]): Flashcard[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const BlocksMode: React.FC<BlocksModeProps> = ({
  deck,
  onBack,
  onRecordBlocksScore,
}) => {
  // Grid: 8x8. null = empty, string = colorClass
  const [grid, setGrid] = useState<(string | null)[][]>(() =>
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );

  const [availablePieces, setAvailablePieces] = useState<ActivePiece[]>(() => getRandomPieces());
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  const [draggingPieceIndex, setDraggingPieceIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [ghostCellSize, setGhostCellSize] = useState<number>(36);
  const boardGridRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [peekBoard, setPeekBoard] = useState(false);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [isClearing, setIsClearing] = useState(false);
  const [soundMuted, setSoundMuted] = useState(!sfx.isEnabled());

  // Question Time Modal State: Coda di carte mescolata casualmente
  const [isQuestionTime, setIsQuestionTime] = useState(false);
  const [questionQueue, setQuestionQueue] = useState<Flashcard[]>(() => shuffleCards(deck.cards));
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [userAnswer, setUserAnswer] = useState('');
  const [revealedAnswer, setRevealedAnswer] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const questionInputRef = useRef<HTMLInputElement>(null);

  // Rimescola le carte ogni volta che si cambia o ricarica il mazzo
  useEffect(() => {
    setQuestionQueue(shuffleCards(deck.cards));
    setCurrentCardIndex(0);
  }, [deck]);

  const currentCard: Flashcard | undefined = questionQueue[currentCardIndex];

  // Helper: check if a piece fits at (startR, startC)
  const canPlacePiece = (
    currentGrid: (string | null)[][],
    shape: number[][],
    startR: number,
    startC: number
  ): boolean => {
    const pRows = shape.length;
    const pCols = shape[0].length;

    if (startR + pRows > GRID_SIZE || startC + pCols > GRID_SIZE) {
      return false;
    }

    for (let r = 0; r < pRows; r++) {
      for (let c = 0; c < pCols; c++) {
        if (shape[r][c] === 1) {
          if (currentGrid[startR + r][startC + c] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  };

  // Helper: check if a piece can fit ANYWHERE on the board
  const pieceCanFitAnywhere = (
    currentGrid: (string | null)[][],
    shape: number[][]
  ): boolean => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlacePiece(currentGrid, shape, r, c)) {
          return true;
        }
      }
    }
    return false;
  };

  // Check Game Over
  const checkGameOver = (
    currentGrid: (string | null)[][],
    pieces: ActivePiece[]
  ) => {
    if (pieces.length === 0) return false;
    for (const p of pieces) {
      if (pieceCanFitAnywhere(currentGrid, p.template.shape)) {
        return false;
      }
    }
    return true;
  };

  // Place Selected Piece onto the Grid
  const handlePlacePiece = (targetR: number, targetC: number, pieceIdx: number | null = selectedPieceIndex) => {
    if (pieceIdx === null || !availablePieces[pieceIdx] || isQuestionTime || isGameOver || isClearing) {
      return;
    }

    const piece = availablePieces[pieceIdx];
    if (!canPlacePiece(grid, piece.template.shape, targetR, targetC)) {
      return; // Non entra qui
    }

    // 1. Applica il pezzo sulla griglia
    const newGrid = grid.map((row) => [...row]);
    const shape = piece.template.shape;
    let blockCount = 0;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] === 1) {
          newGrid[targetR + r][targetC + c] = piece.template.colorClass;
          blockCount++;
        }
      }
    }

    // Punti per il posizionamento del pezzo
    let pointsEarned = blockCount * 10;

    // 2. Controlla righe e colonne completate contemporaneamente
    const fullRows: number[] = [];
    const fullCols: number[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      if (newGrid[r].every((cell) => cell !== null)) {
        fullRows.push(r);
      }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (newGrid[r][c] === null) {
          full = false;
          break;
        }
      }
      if (full) fullCols.push(c);
    }

    const linesCleared = fullRows.length + fullCols.length;

    // 3. Rimuovi il pezzo usato dai disponibili
    const remainingPieces = availablePieces.filter((_, idx) => idx !== pieceIdx);
    setSelectedPieceIndex(null);
    setDraggingPieceIndex(null);
    setDragPos(null);
    setHoverRow(null);
    setHoverCol(null);

    if (linesCleared > 0) {
      // Calcola le coordinate di tutte le celle da distruggere
      const destroyedSet = new Set<string>();
      for (const r of fullRows) {
        for (let c = 0; c < GRID_SIZE; c++) {
          destroyedSet.add(`${r}-${c}`);
        }
      }
      for (const c of fullCols) {
        for (let r = 0; r < GRID_SIZE; r++) {
          destroyedSet.add(`${r}-${c}`);
        }
      }

      setIsClearing(true);
      setClearingCells(destroyedSet);
      setGrid(newGrid); // Mostra il pezzo posizionato e la riga/colonna completata

      // La combo scatta ESCLUSIVAMENTE quando un singolo pezzo distrugge 2 o più linee contemporaneamente!
      if (linesCleared > 1) {
        sfx.playCombo();
        setCombo(linesCleared);
        // Bonus moltiplicatore per distruzione simultanea (es: 2 righe = 2*100*2 = 400pt, 3 righe = 3*100*3 = 900pt)
        pointsEarned += linesCleared * 100 * linesCleared;
      } else {
        sfx.playClear();
        setCombo(0);
        // Distruzione di 1 sola linea: 100 punti standard, nessuna combo
        pointsEarned += 100;
      }

      // Effetto coriandoli per celebrare la distruzione
      confetti({
        particleCount: Math.min(25 * linesCleared, 60),
        spread: 65,
        origin: { y: 0.6 },
        ticks: 120,
      });

      const newScore = score + pointsEarned;
      setScore(newScore);

      // Dopo 340ms (durata dell'animazione CSS), rimuovi fisicamente i blocchi
      setTimeout(() => {
        const clearedGrid = newGrid.map((row, r) =>
          row.map((cell, c) => (destroyedSet.has(`${r}-${c}`) ? null : cell))
        );
        setGrid(clearedGrid);
        setClearingCells(new Set());
        setIsClearing(false);

        // 4. Se sono finiti i 3 pezzi -> Question Time!
        if (remainingPieces.length === 0) {
          setIsQuestionTime(true);
          setAttemptsLeft(3);
          setUserAnswer('');
          setRevealedAnswer(false);
          setQuestionError(null);
          return;
        }

        setAvailablePieces(remainingPieces);

        // 5. Verifica se i pezzi rimasti possono ancora entrare sulla griglia
        if (checkGameOver(clearedGrid, remainingPieces)) {
          setIsGameOver(true);
          if (!deck.bestBlocksScore || newScore > deck.bestBlocksScore) {
            setIsNewRecord(true);
            sfx.playVictory();
          } else {
            sfx.playGameOver();
          }
          onRecordBlocksScore(newScore);
        }
      }, 340);
    } else {
      // Posizionamento singolo senza distruzione
      sfx.playPlace();
      setCombo(0);
      setGrid(newGrid);
      const newScore = score + pointsEarned;
      setScore(newScore);

      // 4. Se sono finiti i 3 pezzi -> Question Time!
      if (remainingPieces.length === 0) {
        setIsQuestionTime(true);
        setAttemptsLeft(3);
        setUserAnswer('');
        setRevealedAnswer(false);
        setQuestionError(null);
        return;
      }

      setAvailablePieces(remainingPieces);

      // 5. Verifica se i pezzi rimasti possono ancora entrare sulla griglia
      if (checkGameOver(newGrid, remainingPieces)) {
        setIsGameOver(true);
        if (!deck.bestBlocksScore || newScore > deck.bestBlocksScore) {
          setIsNewRecord(true);
          sfx.playVictory();
        } else {
          sfx.playGameOver();
        }
        onRecordBlocksScore(newScore);
      }
    }
  };

  // Drag & Drop: gestione fluida del trascinamento del pezzo con mouse o touch
  useEffect(() => {
    if (draggingPieceIndex === null) return;

    const piece = availablePieces[draggingPieceIndex];
    if (!piece) return;

    const onPointerMove = (e: PointerEvent) => {
      hasDraggedRef.current = true;
      const isTouch = e.pointerType === 'touch';
      // Su touch solleviamo il pezzo di ~75px sopra il dito per non coprire né il pezzo né la griglia
      const offsetY = isTouch ? 75 : 0;
      const targetX = e.clientX;
      const targetY = e.clientY - offsetY;
      setDragPos({ x: targetX, y: targetY });

      if (!boardGridRef.current) return;
      const rect = boardGridRef.current.getBoundingClientRect();
      const cellW = rect.width / GRID_SIZE;
      const cellH = rect.height / GRID_SIZE;

      const shape = piece.template.shape;
      const R = shape.length;
      const C = shape[0].length;

      // Centro del pezzo allineato con (targetX, targetY)
      const pieceLeft = targetX - (C * cellW) / 2;
      const pieceTop = targetY - (R * cellH) / 2;

      const col = Math.round((pieceLeft - rect.left) / cellW);
      const row = Math.round((pieceTop - rect.top) / cellH);

      if (row >= 0 && row + R <= GRID_SIZE && col >= 0 && col + C <= GRID_SIZE) {
        setHoverRow(row);
        setHoverCol(col);
      } else {
        setHoverRow(null);
        setHoverCol(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (boardGridRef.current) {
        const isTouch = e.pointerType === 'touch';
        const offsetY = isTouch ? 75 : 0;
        const targetX = e.clientX;
        const targetY = e.clientY - offsetY;

        const rect = boardGridRef.current.getBoundingClientRect();
        const cellW = rect.width / GRID_SIZE;
        const cellH = rect.height / GRID_SIZE;

        const shape = piece.template.shape;
        const R = shape.length;
        const C = shape[0].length;

        const pieceLeft = targetX - (C * cellW) / 2;
        const pieceTop = targetY - (R * cellH) / 2;

        const col = Math.round((pieceLeft - rect.left) / cellW);
        const row = Math.round((pieceTop - rect.top) / cellH);

        if (row >= 0 && row + R <= GRID_SIZE && col >= 0 && col + C <= GRID_SIZE) {
          if (canPlacePiece(grid, shape, row, col)) {
            if ('vibrate' in navigator) {
              try { navigator.vibrate(20); } catch {}
            }
            handlePlacePiece(row, col, draggingPieceIndex);
          }
        }
      }

      setDraggingPieceIndex(null);
      setDragPos(null);
      setHoverRow(null);
      setHoverCol(null);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [draggingPieceIndex, availablePieces, grid, isQuestionTime, isGameOver, isClearing]);

  // Avanza alla domanda successiva nella coda mescolata (rimescola se finisce il mazzo)
  const advanceToNextQuestion = () => {
    setCurrentCardIndex((prev) => {
      const next = prev + 1;
      if (next >= questionQueue.length) {
        setQuestionQueue(shuffleCards(deck.cards));
        return 0;
      }
      return next;
    });
    setAttemptsLeft(3);
    setUserAnswer('');
    setRevealedAnswer(false);
    setQuestionError(null);
  };

  // Question Time: Verifica Risposta
  const handleVerifyQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard || revealedAnswer || !userAnswer.trim()) return;

    // Accetta sia match con definizione che con termine in caso di flessibilità
    const check = checkWrittenAnswer(userAnswer, currentCard.definition);
    const checkInverse = checkWrittenAnswer(userAnswer, currentCard.term);

    if (check.closeMatch || checkInverse.closeMatch) {
      // Risposta CORRETTA!
      sfx.playCorrect();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      const newPieces = getRandomPieces();
      setAvailablePieces(newPieces);
      setIsQuestionTime(false);
      advanceToNextQuestion();

      // Controlla se con i nuovi 3 pezzi siamo in game over
      if (checkGameOver(grid, newPieces)) {
        setIsGameOver(true);
        if (!deck.bestBlocksScore || score > deck.bestBlocksScore) {
          setIsNewRecord(true);
          sfx.playVictory();
        } else {
          sfx.playGameOver();
        }
        onRecordBlocksScore(score);
      }
    } else {
      // Errore: riduci tentativi
      sfx.playWrong();
      const nextAttempts = attemptsLeft - 1;
      setAttemptsLeft(nextAttempts);

      if (nextAttempts <= 0) {
        setRevealedAnswer(true);
        // Penalità per 3 errori consecutivi: -100 punti
        const penalty = 100;
        setScore((prev) => Math.max(0, prev - penalty));
        setQuestionError(`Tentativi esauriti (-${penalty} pt)! Ecco la risposta corretta:`);
      } else {
        setQuestionError(`Risposta non esatta. Hai ancora ${nextAttempts} ${nextAttempts === 1 ? 'tentativo' : 'tentativi'}.`);
        setUserAnswer('');
        setTimeout(() => questionInputRef.current?.focus(), 50);
      }
    }
  };

  // Salta/Prosegui dopo risposta mostrata
  const handleProceedAfterReveal = () => {
    const newPieces = getRandomPieces();
    setAvailablePieces(newPieces);
    setIsQuestionTime(false);
    advanceToNextQuestion();

    if (checkGameOver(grid, newPieces)) {
      setIsGameOver(true);
      if (!deck.bestBlocksScore || score > deck.bestBlocksScore) {
        setIsNewRecord(true);
      }
      onRecordBlocksScore(score);
    }
  };

  // Salta domanda con icona aggiornamento (↺) con penalità punteggio
  const handleSkipQuestion = () => {
    // Penalità per cambio domanda: -50 punti
    const penalty = 50;
    setScore((prev) => Math.max(0, prev - penalty));
    sfx.playWrong();
    advanceToNextQuestion();
  };

  // Riavvia Partita
  const handleRestart = () => {
    setGrid(Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)));
    const initialPieces = getRandomPieces();
    setAvailablePieces(initialPieces);
    setSelectedPieceIndex(null);
    setScore(0);
    setCombo(0);
    setIsGameOver(false);
    setIsNewRecord(false);
    setIsQuestionTime(false);
    setPeekBoard(false);
    setClearingCells(new Set());
    setIsClearing(false);
    // Rimescola completamente le carte ad ogni nuova partita
    setQuestionQueue(shuffleCards(deck.cards));
    setCurrentCardIndex(0);
    setAttemptsLeft(3);
    setUserAnswer('');
    setRevealedAnswer(false);
    setQuestionError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-6 py-3 sm:py-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer truncate max-w-[150px] sm:max-w-none"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">{deck.title}</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Toggle Audio SFX */}
          <button
            onClick={() => {
              const next = sfx.toggle();
              setSoundMuted(!next);
            }}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
            title={soundMuted ? 'Attiva effetti audio' : 'Disattiva effetti audio'}
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
            title="Come si gioca"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Record Personale */}
          <div className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Record: {deck.bestBlocksScore || 0}</span>
          </div>

          {/* Punteggio Attuale */}
          <div className="px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl bg-indigo-600 text-white font-extrabold text-xs sm:text-base shadow-md">
            Punti: {score}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-4 sm:gap-8 w-full">
        {/* 8x8 Board Container */}
        <div className="relative p-2 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900 border-2 sm:border-4 border-slate-800 shadow-2xl select-none">
          {combo > 1 && (
            <div className="absolute -top-3 right-3 sm:-top-3.5 sm:right-4 z-20 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[11px] sm:text-xs font-extrabold shadow-lg animate-bounce">
              COMBO x{combo}!
            </div>
          )}

          <div
            ref={boardGridRef}
            className="grid grid-cols-8 gap-1 sm:gap-1.5 touch-none"
            onMouseLeave={() => {
              if (draggingPieceIndex === null) {
                setHoverRow(null);
                setHoverCol(null);
              }
            }}
          >
            {grid.map((row, rIdx) =>
              row.map((cellColor, cIdx) => {
                // Calcola se la cella fa parte dell'anteprima del pezzo selezionato/trascinato
                let isPreview = false;
                let isValidPlacement = false;
                const activePieceIdx = draggingPieceIndex !== null ? draggingPieceIndex : selectedPieceIndex;

                if (activePieceIdx !== null && availablePieces[activePieceIdx] && hoverRow !== null && hoverCol !== null) {
                  const piece = availablePieces[activePieceIdx];
                  const shape = piece.template.shape;
                  isValidPlacement = canPlacePiece(grid, shape, hoverRow, hoverCol);

                  const relR = rIdx - hoverRow;
                  const relC = cIdx - hoverCol;

                  if (relR >= 0 && relR < shape.length && relC >= 0 && relC < shape[0].length) {
                    if (shape[relR][relC] === 1) {
                      isPreview = true;
                    }
                  }
                }

                const isClearingCell = clearingCells.has(`${rIdx}-${cIdx}`);
                const activePiece = activePieceIdx !== null ? availablePieces[activePieceIdx] : null;

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => handlePlacePiece(rIdx, cIdx)}
                    disabled={isClearing}
                    onMouseEnter={() => {
                      if (activePieceIdx !== null && !isClearing && draggingPieceIndex === null) {
                        setHoverRow(rIdx);
                        setHoverCol(cIdx);
                      }
                    }}
                    className={`w-8 h-8 min-[380px]:w-9 min-[380px]:h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg transition-all duration-150 flex items-center justify-center cursor-pointer relative ${
                      isClearingCell
                        ? `${cellColor} animate-block-destroy ring-2 ring-white/90 shadow-lg shadow-white/50 z-20`
                        : cellColor
                        ? `${cellColor} shadow-inner`
                        : isPreview
                        ? isValidPlacement
                          ? `${activePiece ? activePiece.template.colorClass : 'bg-indigo-400'} opacity-75 scale-95 ring-2 ring-white shadow-md z-10`
                          : 'bg-rose-500/60 scale-95 ring-2 ring-rose-400 z-10'
                        : 'bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700/30'
                    }`}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* 3 Available Pieces Tray */}
        <div className="flex flex-row lg:flex-col items-center justify-center gap-2.5 sm:gap-4 w-full lg:w-48">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center w-full hidden lg:block">
            I tuoi pezzi ({availablePieces.length}/3)
          </div>

          <div className="flex lg:flex-col gap-2 sm:gap-3 justify-center items-center w-full">
            {availablePieces.map((piece, pIdx) => {
              const isSelected = selectedPieceIndex === pIdx;
              const isDragging = draggingPieceIndex === pIdx;
              const fits = pieceCanFitAnywhere(grid, piece.template.shape);

              return (
                <div
                  key={piece.id}
                  onPointerDown={(e) => {
                    if (!fits || isClearing || isQuestionTime || isGameOver) return;
                    hasDraggedRef.current = false;
                    const isTouch = e.pointerType === 'touch';
                    const offsetY = isTouch ? 75 : 0;

                    setDraggingPieceIndex(pIdx);
                    setSelectedPieceIndex(pIdx);
                    setDragPos({ x: e.clientX, y: e.clientY - offsetY });

                    if (boardGridRef.current) {
                      const rect = boardGridRef.current.getBoundingClientRect();
                      setGhostCellSize(rect.width / GRID_SIZE);
                    }
                  }}
                  onClick={() => {
                    if (!hasDraggedRef.current) {
                      setSelectedPieceIndex((prev) => (prev === pIdx ? null : pIdx));
                    }
                  }}
                  className={`p-2 sm:p-3 rounded-2xl border-2 transition-all flex items-center justify-center cursor-pointer min-h-[82px] min-w-[82px] sm:min-h-[100px] sm:min-w-[100px] touch-none select-none ${
                    isDragging
                      ? 'opacity-25 scale-90 border-dashed border-indigo-400 bg-indigo-500/10'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-500/20 scale-105 shadow-lg'
                      : fits
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 active:scale-95'
                      : 'border-rose-300 dark:border-rose-900 bg-rose-50/20 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="flex flex-col gap-1 pointer-events-none">
                    {piece.template.shape.map((row, r) => (
                      <div key={r} className="flex gap-1">
                        {row.map((cell, c) => (
                          <div
                            key={c}
                            className={`w-3.5 h-3.5 min-[380px]:w-4 min-[380px]:h-4 sm:w-5 sm:h-5 rounded-[3px] sm:rounded-md ${
                              cell === 1 ? piece.template.colorClass : 'opacity-0'
                            }`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 text-center max-w-xs">
            Trascina il pezzo con il dito sulla griglia o tocca per posizionarlo!
          </div>
        </div>
      </div>

      {/* GHOST PIECE TRASCINATO FLUTTUANTE */}
      {draggingPieceIndex !== null && dragPos && availablePieces[draggingPieceIndex] && createPortal(
        <div
          className="fixed pointer-events-none z-[9999] select-none transition-transform"
          style={{
            left: `${dragPos.x}px`,
            top: `${dragPos.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex flex-col gap-1 p-1">
            {availablePieces[draggingPieceIndex].template.shape.map((row, r) => (
              <div key={r} className="flex gap-1">
                {row.map((cell, c) => (
                  <div
                    key={c}
                    style={{
                      width: `${ghostCellSize}px`,
                      height: `${ghostCellSize}px`,
                    }}
                    className={`rounded-lg transition-colors ${
                      cell === 1
                        ? `${availablePieces[draggingPieceIndex].template.colorClass} shadow-2xl shadow-indigo-950/90 ring-2 ring-white/95 scale-95`
                        : 'opacity-0'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* QUESTION TIME MODAL */}
      {isQuestionTime && currentCard && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-indigo-500 rounded-2xl sm:rounded-3xl w-full max-w-[340px] sm:max-w-md p-4 sm:p-6 shadow-2xl space-y-4 my-auto mx-auto text-left relative">
            {/* Header: Badge & Pulsante Cambia */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide bg-violet-950 text-violet-300">
                ⭐ Question Time
              </span>

              {/* Pulsante cambia domanda (↺) */}
              <button
                type="button"
                onClick={handleSkipQuestion}
                title="Cambia domanda (-50 pt)"
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs">Cambia <span className="text-rose-400 font-bold">(-50 pt)</span></span>
              </button>
            </div>

            {/* Domanda / Termine */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Termine / Domanda:
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="text-lg sm:text-2xl font-extrabold text-white leading-snug break-words flex-1 min-w-0">
                  {currentCard.term}
                </div>
                <button
                  type="button"
                  onClick={() => speakText(currentCard.term, deck.termLang)}
                  title="Ascolta pronuncia"
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition cursor-pointer shrink-0 mt-0.5"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              {currentCard.hint && (
                <div className="text-xs text-amber-400 font-medium">
                  💡 {currentCard.hint}
                </div>
              )}
            </div>

            {!revealedAnswer ? (
              <form onSubmit={handleVerifyQuestion} className="space-y-3 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-400">
                      Significato:
                    </span>
                    <span className="font-bold text-indigo-400">
                      {attemptsLeft} {attemptsLeft === 1 ? 'tentativo rimasto' : 'tentativi rimasti'}
                    </span>
                  </div>
                  <input
                    ref={questionInputRef}
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Digita il significato..."
                    autoFocus
                    className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-amber-950/20 border-2 border-amber-700 text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>

                {questionError && (
                  <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-bold leading-relaxed">
                    {questionError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm sm:text-base shadow-md shadow-indigo-500/20 transition cursor-pointer"
                >
                  Verifica e Continua
                </button>
              </form>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-amber-950/60 border border-amber-700 text-amber-200">
                  <div className="text-xs font-bold flex items-center gap-1.5 mb-1 text-amber-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Risposta Corretta:</span>
                  </div>
                  <div className="text-base sm:text-lg font-extrabold break-words">
                    {getDisplayMeaningsList(currentCard.definition).join('  /  ')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedAfterReveal}
                  className="w-full py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <span>Ho capito, sblocca i 3 pezzi</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* GAME OVER MODAL TRASPARENTE CON SCHEMA VISIBILE IN SOTTOFONDO */}
      {isGameOver && createPortal(
        <div
          className={`fixed inset-0 z-[9999] transition-all duration-300 flex items-center justify-center p-3 sm:p-4 overflow-y-auto ${
            peekBoard
              ? 'bg-black/10'
              : 'bg-slate-950/30 backdrop-blur-[1.5px]'
          }`}
        >
          <div
            className={`transition-all duration-300 rounded-2xl sm:rounded-3xl w-full max-w-[340px] sm:max-w-md p-5 sm:p-7 shadow-2xl text-center space-y-4 my-auto mx-auto relative border border-rose-500/60 shadow-rose-950/30 ${
              peekBoard
                ? 'opacity-25 hover:opacity-100 bg-slate-900/50 backdrop-blur-sm scale-95'
                : 'opacity-100 bg-slate-900/80 backdrop-blur-md scale-100'
            }`}
          >
            {/* Tasto per osservare la griglia completa in trasparenza */}
            <div className="flex justify-end -mb-2">
              <button
                type="button"
                onClick={() => setPeekBoard((prev) => !prev)}
                title={peekBoard ? 'Mostra dettagli punteggio' : 'Sfumatura trasparente per guardare la griglia'}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-300 text-[11px] font-semibold transition cursor-pointer"
              >
                {peekBoard ? <EyeOff className="w-3.5 h-3.5 text-indigo-400" /> : <Eye className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{peekBoard ? 'Mostra' : 'Vedi griglia'}</span>
              </button>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-amber-950/80 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30">
              <Trophy className="w-7 h-7" />
            </div>

            <div>
              {isNewRecord && (
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-950/90 text-emerald-300 text-xs font-extrabold uppercase tracking-wider mb-2 border border-emerald-500/30">
                  🎉 Nuovo Record Personale!
                </span>
              )}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {score} Punti!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Non c'è più spazio sulla griglia per posizionare i pezzi rimanenti.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={handleRestart}
                className="w-full py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Gioca Ancora</span>
              </button>
              <button
                onClick={onBack}
                className="w-full py-2.5 rounded-xl sm:rounded-2xl border border-slate-700/90 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-bold text-sm transition cursor-pointer"
              >
                Torna al Mazzo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HOW TO PLAY MODAL */}
      {showHowToPlay && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-[340px] sm:max-w-lg p-5 sm:p-7 shadow-2xl space-y-4 my-auto mx-auto relative">
            <h3 className="text-xl font-extrabold text-white">
              Come giocare a Blocchi
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Blocchi è un rilassante gioco di puzzle che ti aiuta a studiare mentre giochi.
            </p>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400 list-disc list-inside">
              <li>
                <strong>Posiziona i pezzi</strong>: seleziona un pezzo e toccalo sulla griglia 8x8.
              </li>
              <li>
                <strong>Cancella righe o colonne</strong>: completando una riga o una colonna intera la cancelli e guadagni punti.
              </li>
              <li>
                <strong>Question Time</strong>: posizionati tutti e 3 i pezzi, rispondi alla domanda per guadagnarne altri tre!
              </li>
              <li>
                <strong>Fai il record</strong>: continua a giocare finché non esaurisci lo spazio sulla griglia.
              </li>
            </ul>
            <button
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm cursor-pointer mt-4"
            >
              Ho capito
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Brain,
  Volume2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ArrowLeftRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Flashcard, SM2Grade } from '../../types/quizzino';
import {
  checkWrittenAnswer,
  getDisplayMeaningsList,
  speakText,
} from '../../utils/tts';
import { sfx } from '../../utils/soundEffects';

interface LearnModeProps {
  deck: Deck;
  onBack: () => void;
  onGradeCardSM2: (cardId: string, grade: SM2Grade) => void;
  onCompleteQuiz: (totalAnswered: number) => void;
}

type QuestionType = 'multiple' | 'truefalse' | 'written';
type AskDirection = 'ask_definition' | 'ask_term';

interface LearnQuestion {
  card: Flashcard;
  type: QuestionType;
  direction: AskDirection;
  promptText: string;
  expectedRaw: string;
  options?: string[];
  tfDisplayedAnswer?: string;
  tfIsTrue?: boolean;
}

function pickSingleMeaning(rawText: string): string {
  const meanings = getDisplayMeaningsList(rawText);
  if (meanings.length <= 1) return rawText.trim();
  return meanings[Math.floor(Math.random() * meanings.length)];
}

function buildQuestion(
  card: Flashcard,
  allCards: Flashcard[],
  allowedTypes: QuestionType[],
  direction: AskDirection
): LearnQuestion {
  const chosenType =
    allowedTypes[Math.floor(Math.random() * allowedTypes.length)];

  const promptRaw =
    direction === 'ask_definition' ? card.term : card.definition;
  const promptText = pickSingleMeaning(promptRaw);
  const expectedRaw =
    direction === 'ask_definition' ? card.definition : card.term;

  const getAnswerField = (c: Flashcard) =>
    direction === 'ask_definition' ? c.definition : c.term;

  if (chosenType === 'truefalse' && allCards.length >= 2) {
    const isTrue = Math.random() > 0.5;
    if (isTrue) {
      return {
        card,
        type: 'truefalse',
        direction,
        promptText,
        expectedRaw,
        tfDisplayedAnswer: pickSingleMeaning(expectedRaw),
        tfIsTrue: true,
      };
    } else {
      const others = allCards.filter((c) => c.id !== card.id);
      const randomOther = others[Math.floor(Math.random() * others.length)];
      const otherText = pickSingleMeaning(getAnswerField(randomOther));
      // Verifica che il distrattore non coincida per caso con uno dei significati validi della carta!
      const accidentallyValid = checkWrittenAnswer(otherText, expectedRaw).exact;
      return {
        card,
        type: 'truefalse',
        direction,
        promptText,
        expectedRaw,
        tfDisplayedAnswer: otherText,
        tfIsTrue: accidentallyValid ? true : false,
      };
    }
  }

  if (chosenType === 'multiple' || allCards.length < 2) {
    const targetOption = pickSingleMeaning(expectedRaw);

    const distractors = allCards
      .filter((c) => c.id !== card.id)
      .map((c) => pickSingleMeaning(getAnswerField(c)))
      .filter((opt) => !checkWrittenAnswer(opt, expectedRaw).exact)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [...distractors, targetOption].sort(
      () => Math.random() - 0.5
    );

    return {
      card,
      type: 'multiple',
      direction,
      promptText,
      expectedRaw,
      options,
    };
  }

  return {
    card,
    type: 'written',
    direction,
    promptText,
    expectedRaw,
  };
}

export const LearnMode: React.FC<LearnModeProps> = ({
  deck,
  onBack,
  onGradeCardSM2,
  onCompleteQuiz,
}) => {
  const sessionCardsRef = useRef<Flashcard[]>(deck.cards);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [selectedSize, setSelectedSize] = useState<number>(() =>
    Math.min(10, deck.cards.length)
  );
  const [enableWritten, setEnableWritten] = useState(true);
  const [direction, setDirection] = useState<AskDirection>('ask_definition');
  const [activeSubset, setActiveSubset] = useState<Flashcard[]>([]);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<LearnQuestion | null>(null);
  const [writtenInput, setWrittenInput] = useState('');
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    closeTypo?: boolean;
    userResponse: string;
    expected: string;
    otherMeanings?: string[];
  } | null>(null);
  const [correctFirstTryCount, setCorrectFirstTryCount] = useState(0);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const startSession = (size: number) => {
    // Ordina preferendo le carte con review più imminente (SM-2) o mescola
    const shuffled = [...deck.cards].sort((a, b) => {
      const aDue = a.sm2.nextReview;
      const bDue = b.sm2.nextReview;
      if (aDue !== bDue) return aDue - bDue;
      return Math.random() - 0.5;
    });

    const subset = size >= deck.cards.length ? shuffled : shuffled.slice(0, size);
    sessionCardsRef.current = subset;
    setActiveSubset(subset);
    setQueue(subset);
    setCurrentIdx(0);
    setCorrectFirstTryCount(0);
    setSeenIds([]);
    setIsCompleted(false);
    setFeedback(null);
    setWrittenInput('');

    if (subset[0]) {
      setCurrentQuestion(
        buildQuestion(
          subset[0],
          subset,
          enableWritten
            ? ['multiple', 'multiple', 'truefalse', 'written']
            : ['multiple', 'truefalse'],
          direction
        )
      );
    }
    setSessionStarted(true);
  };

  const currentCard = queue[currentIdx];

  const getAllowedTypes = (withWritten: boolean): QuestionType[] =>
    withWritten
      ? ['multiple', 'multiple', 'truefalse', 'written']
      : ['multiple', 'truefalse'];

  const handleToggleWritten = (checked: boolean) => {
    setEnableWritten(checked);
    if (!feedback && currentCard) {
      setCurrentQuestion(
        buildQuestion(
          currentCard,
          sessionCardsRef.current,
          getAllowedTypes(checked),
          direction
        )
      );
    }
  };

  const handleToggleDirection = () => {
    const nextDir: AskDirection =
      direction === 'ask_definition' ? 'ask_term' : 'ask_definition';
    setDirection(nextDir);
    if (!feedback && currentCard) {
      setCurrentQuestion(
        buildQuestion(
          currentCard,
          sessionCardsRef.current,
          getAllowedTypes(enableWritten),
          nextDir
        )
      );
    }
  };

  const handleAnswer = (
    isCorrect: boolean,
    userResponse: string,
    expected: string,
    closeTypo = false,
    otherMeanings: string[] = []
  ) => {
    if (!currentCard || feedback) return;

    if (isCorrect) {
      sfx.playCorrect();
    } else {
      sfx.playWrong();
    }

    const firstTimeSeeing = !seenIds.includes(currentCard.id);
    if (firstTimeSeeing) {
      setSeenIds((prev) => [...prev, currentCard.id]);
      if (isCorrect) {
        setCorrectFirstTryCount((prev) => prev + 1);
      }
    }

    onGradeCardSM2(currentCard.id, isCorrect ? 2 : 0);

    if (!isCorrect) {
      setQueue((prev) => [...prev, currentCard]);
    }

    setFeedback({
      correct: isCorrect,
      closeTypo,
      userResponse,
      expected,
      otherMeanings,
    });
  };

  const handleOverrideAsCorrect = () => {
    if (!currentCard || !feedback) return;
    const updatedQueue = queue.slice(0, -1);
    setQueue(updatedQueue);
    onGradeCardSM2(currentCard.id, 2);
    advanceToIndex(currentIdx + 1, updatedQueue);
  };

  const advanceToIndex = (nextIdx: number, activeQueue: Flashcard[]) => {
    setFeedback(null);
    setWrittenInput('');
    if (nextIdx < activeQueue.length) {
      setCurrentIdx(nextIdx);
      setCurrentQuestion(
        buildQuestion(
          activeQueue[nextIdx],
          sessionCardsRef.current,
          getAllowedTypes(enableWritten),
          direction
        )
      );
    } else {
      sfx.playVictory();
      setIsCompleted(true);
      onCompleteQuiz(activeQueue.length);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleNextQuestion = () => {
    advanceToIndex(currentIdx + 1, queue);
  };

  const handleRestart = () => {
    setSessionStarted(false);
  };

  // 1. Schermata iniziale di configurazione lunghezza sessione
  if (!sessionStarted) {
    const totalCards = deck.cards.length;
    const presets = [5, 10, 15, 20, 30].filter((n) => n < totalCards);

    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Torna al mazzo</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
              {totalCards} carte disponibili
            </span>
          </div>

          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
              <Brain className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Modalità Impara
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Scegli quante carte vuoi studiare in questa sessione per <strong>{deck.title}</strong>
            </p>
          </div>

          {/* Scelta preset */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
              Quante carte vuoi ripassare?
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {presets.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSelectedSize(count)}
                  className={`py-3 rounded-2xl border-2 text-sm font-extrabold transition cursor-pointer ${
                    selectedSize === count
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-violet-400 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {count} carte
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedSize(totalCards)}
                className={`py-3 rounded-2xl border-2 text-sm font-extrabold transition cursor-pointer ${
                  selectedSize === totalCards
                    ? 'border-violet-600 bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-violet-400 text-slate-700 dark:text-slate-300'
                }`}
              >
                Tutte ({totalCards})
              </button>
            </div>
          </div>

          {/* Opzioni veloci */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300">Direzione domande</span>
              <button
                type="button"
                onClick={handleToggleDirection}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-violet-600 dark:text-violet-400 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{direction === 'ask_definition' ? 'Chiedi: Definizione' : 'Chiedi: Termine'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-600 dark:text-slate-300">Includi risposta scritta</span>
              <input
                type="checkbox"
                checked={enableWritten}
                onChange={(e) => setEnableWritten(e.target.checked)}
                className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => startSession(selectedSize)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-violet-500/25 transition cursor-pointer"
          >
            Inizia Sessione ({selectedSize} carte)
          </button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    const totalInSet = activeSubset.length || deck.cards.length;
    const scorePct = Math.round(
      (correctFirstTryCount / Math.max(1, totalInSet)) * 100
    );

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">
              Sessione completata con successo!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Hai padroneggiato tutte le <strong>{totalInSet} carte</strong> della sessione.
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Precisione al primo tentativo: <strong>{scorePct}%</strong> ({correctFirstTryCount}/{totalInSet})
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleRestart}
              className="px-5 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Nuova Sessione</span>
            </button>
            <button
              onClick={onBack}
              className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Torna al Mazzo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="truncate max-w-[240px] sm:max-w-none">{deck.title}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleToggleDirection}
            title="Cambia direzione della domanda"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:border-violet-500 transition cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-violet-500" />
            <span>
              {direction === 'ask_definition'
                ? 'Chiedi: Definizione'
                : 'Chiedi: Termine'}
            </span>
          </button>

          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={enableWritten}
              onChange={(e) => handleToggleWritten(e.target.checked)}
              className="rounded text-violet-600 focus:ring-violet-500"
            />
            <span>Risposta Scritta</span>
          </label>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
            <Brain className="w-4 h-4 shrink-0" />
            <span>Impara Adattivo</span>
          </span>
          <span className="text-slate-500">
            Quesito {currentIdx + 1} di {queue.length}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / queue.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-8 shadow-lg space-y-5 sm:space-y-6">
          <div className="flex items-start justify-between gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-300 leading-tight">
              {currentQuestion.type === 'multiple'
                ? 'Scelta Multipla'
                : currentQuestion.type === 'truefalse'
                ? 'Vero o Falso'
                : currentQuestion.direction === 'ask_definition'
                ? 'Scrivi il Significato'
                : 'Scrivi il Termine'}
            </span>
            <button
              onClick={() =>
                speakText(
                  currentQuestion.promptText,
                  currentQuestion.direction === 'ask_definition'
                    ? deck.termLang
                    : deck.defLang
                )
              }
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:text-violet-600 transition cursor-pointer shrink-0"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Prompt */}
          <div>
            <div className="text-xs font-bold uppercase text-slate-400 mb-1">
              {currentQuestion.direction === 'ask_definition'
                ? 'Termine:'
                : 'Definizione:'}
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white break-words">
              {currentQuestion.promptText}
            </div>
          </div>

          {/* 1. MULTIPLE CHOICE */}
          {currentQuestion.type === 'multiple' && currentQuestion.options && (
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = feedback?.userResponse === opt;
                const checkOpt = checkWrittenAnswer(
                  opt,
                  currentQuestion.expectedRaw
                );
                const isOptionValid = checkOpt.exact;

                let btnClass =
                  'border-slate-200 dark:border-slate-800 hover:border-violet-500 bg-slate-50/70 dark:bg-slate-800/40';
                if (feedback) {
                  if (isOptionValid) {
                    btnClass =
                      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200';
                  } else if (isSelected && !feedback.correct) {
                    btnClass =
                      'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200';
                  }
                }

                return (
                  <button
                    key={i}
                    disabled={!!feedback}
                    onClick={() =>
                      handleAnswer(
                        isOptionValid,
                        opt,
                        currentQuestion.expectedRaw,
                        false,
                        checkOpt.otherMeanings
                      )
                    }
                    className={`w-full text-left p-4 rounded-2xl border-2 text-sm sm:text-base font-semibold transition flex items-center gap-3 cursor-pointer ${btnClass}`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                      {i + 1}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. TRUE / FALSE */}
          {currentQuestion.type === 'truefalse' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold uppercase text-slate-400 mb-1">
                  {currentQuestion.direction === 'ask_definition'
                    ? 'Definizione proposta:'
                    : 'Termine proposto:'}
                </div>
                <div className="text-base sm:text-lg font-semibold">
                  {currentQuestion.tfDisplayedAnswer}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={!!feedback}
                  onClick={() =>
                    handleAnswer(
                      currentQuestion.tfIsTrue === true,
                      'Vero',
                      currentQuestion.expectedRaw,
                      false,
                      getDisplayMeaningsList(currentQuestion.expectedRaw)
                    )
                  }
                  className={`py-3.5 px-4 rounded-2xl border-2 font-extrabold transition cursor-pointer ${
                    feedback
                      ? currentQuestion.tfIsTrue === true
                        ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200'
                        : feedback.userResponse === 'Vero'
                        ? 'border-rose-500 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 opacity-90'
                        : 'border-slate-200 dark:border-slate-800 opacity-40'
                      : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  Vero
                </button>
                <button
                  disabled={!!feedback}
                  onClick={() =>
                    handleAnswer(
                      currentQuestion.tfIsTrue === false,
                      'Falso',
                      currentQuestion.expectedRaw,
                      false,
                      getDisplayMeaningsList(currentQuestion.expectedRaw)
                    )
                  }
                  className={`py-3.5 px-4 rounded-2xl border-2 font-extrabold transition cursor-pointer ${
                    feedback
                      ? currentQuestion.tfIsTrue === false
                        ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200'
                        : feedback.userResponse === 'Falso'
                        ? 'border-rose-500 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 opacity-90'
                        : 'border-slate-200 dark:border-slate-800 opacity-40'
                      : 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  Falso
                </button>
              </div>
            </div>
          )}

          {/* 3. WRITTEN ANSWER */}
          {currentQuestion.type === 'written' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!writtenInput.trim() || feedback) return;
                const check = checkWrittenAnswer(
                  writtenInput,
                  currentQuestion.expectedRaw
                );
                handleAnswer(
                  check.closeMatch,
                  writtenInput,
                  currentQuestion.expectedRaw,
                  !check.exact && check.closeMatch,
                  check.otherMeanings
                );
              }}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  disabled={!!feedback}
                  value={writtenInput}
                  onChange={(e) => setWrittenInput(e.target.value)}
                  placeholder={
                    currentQuestion.direction === 'ask_definition'
                      ? 'Scrivi uno dei significati...'
                      : 'Scrivi il termine...'
                  }
                  autoFocus
                  className="w-full flex-1 min-w-0 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {!feedback && (
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition cursor-pointer shrink-0 shadow-md shadow-violet-500/20"
                  >
                    Verifica
                  </button>
                )}
              </div>
              {getDisplayMeaningsList(currentQuestion.expectedRaw).length > 1 &&
                !feedback && (
                  <div className="text-xs text-slate-400 font-medium">
                    💡 Questa carta ha{' '}
                    <strong>
                      {getDisplayMeaningsList(currentQuestion.expectedRaw).length}{' '}
                      significati accettati
                    </strong>
                    : basta scriverne uno qualsiasi!
                  </div>
                )}
            </form>
          )}

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                feedback.correct
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="font-extrabold flex items-center gap-2">
                  {feedback.correct ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>
                        {feedback.closeTypo
                          ? 'Corretto! (Piccolo errore di battitura tollerato)'
                          : 'Ottimo lavoro! Risposta esatta.'}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      <span>Non proprio! La ripasseremo tra poco.</span>
                    </>
                  )}
                </div>

                {(!feedback.correct || feedback.closeTypo) && (
                  <div className="text-xs sm:text-sm break-words">
                    Risposte accettate:{' '}
                    <strong>
                      {getDisplayMeaningsList(feedback.expected).join('  •  ')}
                    </strong>
                  </div>
                )}

                {feedback.correct &&
                  !feedback.closeTypo &&
                  feedback.otherMeanings &&
                  feedback.otherMeanings.length > 0 && (
                    <div className="text-xs sm:text-sm opacity-90 break-words">
                      Altri significati validi:{' '}
                      <strong>{feedback.otherMeanings.join('  •  ')}</strong>
                    </div>
                  )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-current/10">
                {!feedback.correct && (
                  <button
                    type="button"
                    onClick={handleOverrideAsCorrect}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 text-xs font-bold hover:bg-white/50 transition cursor-pointer text-center"
                  >
                    Segna come corretta
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  autoFocus
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>Continua</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

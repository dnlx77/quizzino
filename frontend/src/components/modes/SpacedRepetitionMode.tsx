import React, { useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Volume2,
  RotateCw,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Flashcard, SM2Grade } from '../../types/quizzino';
import { isCardDue, previewNextIntervalLabel } from '../../utils/sm2';
import { speakText } from '../../utils/tts';

interface SpacedRepetitionModeProps {
  deck: Deck;
  onBack: () => void;
  onGradeCardSM2: (cardId: string, grade: SM2Grade) => void;
  onCompleteSession: (cardsReviewed: number) => void;
}

export const SpacedRepetitionMode: React.FC<SpacedRepetitionModeProps> = ({
  deck,
  onBack,
  onGradeCardSM2,
  onCompleteSession,
}) => {
  const initialDue = deck.cards.filter((c) => isCardDue(c.sm2));
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>(
    initialDue.length > 0 ? initialDue : deck.cards
  );
  const [studyingAhead] = useState(initialDue.length === 0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const currentCard = reviewQueue[currentIdx];

  const handleGrade = (grade: SM2Grade) => {
    if (!currentCard) return;
    onGradeCardSM2(currentCard.id, grade);
    setReviewedCount((prev) => prev + 1);
    setShowAnswer(false);

    // Se l'utente clicca "Ripeti" (grade 0), rimettiamo la carta in coda a fine sessione
    if (grade === 0) {
      setReviewQueue((prev) => [...prev, currentCard]);
    }

    if (currentIdx + 1 < reviewQueue.length + (grade === 0 ? 1 : 0)) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setIsDone(true);
      onCompleteSession(reviewedCount + 1);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  };

  if (isDone) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">
              Ripasso Giornaliero SM-2 Completato!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Hai consolidato {reviewedCount} carte con l’algoritmo SuperMemo SM-2. Gli intervalli di revisione sono stati aggiornati.
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition cursor-pointer"
          >
            Torna al Mazzo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{deck.title}</span>
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
          <CalendarClock className="w-4 h-4" />
          <span>
            {studyingAhead
              ? 'Studio anticipato SM-2'
              : `Coda SM-2: ${currentIdx + 1} / ${reviewQueue.length}`}
          </span>
        </div>
      </div>

      {/* Card Box */}
      {currentCard && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl space-y-8">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Ease Factor: {currentCard.sm2.easeFactor} • Intervallo attuale:{' '}
                {currentCard.sm2.interval}g
              </span>
              {currentCard.conceptOnly && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <BookOpen className="w-2.5 h-2.5" />
                  <span>Concetto</span>
                </span>
              )}
            </div>
            <button
              onClick={() => speakText(currentCard.term, deck.termLang)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:text-indigo-600 transition cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center py-6 space-y-3">
            <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-500">
              Termine da ricordare
            </div>
            <div className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {currentCard.term}
            </div>
            {currentCard.hint && (
              <div className="text-xs sm:text-sm text-slate-400">
                💡 {currentCard.hint}
              </div>
            )}
          </div>

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Mostra Risposta</span>
            </button>
          ) : (
            <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-500">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Definizione</span>
                  <button
                    onClick={() =>
                      speakText(currentCard.definition, deck.defLang)
                    }
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {currentCard.definition}
                </div>
              </div>

              {/* 4 SM-2 Grading Buttons */}
              <div className="space-y-2">
                <div className="text-center text-xs font-bold text-slate-400">
                  Quanto è stato facile ricordare questa carta?
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleGrade(0)}
                    className="p-3 rounded-2xl border-2 border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-center transition cursor-pointer"
                  >
                    <div className="text-xs opacity-75 font-semibold">
                      {previewNextIntervalLabel(currentCard.sm2, 0)}
                    </div>
                    <div className="font-extrabold text-sm mt-0.5">Ripeti</div>
                  </button>

                  <button
                    onClick={() => handleGrade(1)}
                    className="p-3 rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-center transition cursor-pointer"
                  >
                    <div className="text-xs opacity-75 font-semibold">
                      {previewNextIntervalLabel(currentCard.sm2, 1)}
                    </div>
                    <div className="font-extrabold text-sm mt-0.5">Difficile</div>
                  </button>

                  <button
                    onClick={() => handleGrade(2)}
                    className="p-3 rounded-2xl border-2 border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-center transition cursor-pointer"
                  >
                    <div className="text-xs opacity-75 font-semibold">
                      {previewNextIntervalLabel(currentCard.sm2, 2)}
                    </div>
                    <div className="font-extrabold text-sm mt-0.5">Buono</div>
                  </button>

                  <button
                    onClick={() => handleGrade(3)}
                    className="p-3 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-center transition cursor-pointer"
                  >
                    <div className="text-xs opacity-75 font-semibold">
                      {previewNextIntervalLabel(currentCard.sm2, 3)}
                    </div>
                    <div className="font-extrabold text-sm mt-0.5">Facile</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

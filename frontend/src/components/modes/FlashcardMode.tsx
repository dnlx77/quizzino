import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCw,
  Volume2,
  Shuffle,
  ArrowLeftRight,
  Star,
  Check,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck, Flashcard, SM2Grade } from '../../types/quizzino';
import { speakText } from '../../utils/tts';

interface FlashcardModeProps {
  deck: Deck;
  onBack: () => void;
  onToggleStarCard: (cardId: string) => void;
  onGradeCardSM2: (cardId: string, grade: SM2Grade) => void;
  onCompleteSession: (cardsStudied: number) => void;
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({
  deck,
  onBack,
  onToggleStarCard,
  onGradeCardSM2,
  onCompleteSession,
}) => {
  const [studyCards, setStudyCards] = useState<Flashcard[]>(deck.cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [invertSides, setInvertSides] = useState(false);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const [reviewAgainIds, setReviewAgainIds] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentCard = studyCards[currentIndex];

  const frontText = currentCard
    ? invertSides
      ? currentCard.definition
      : currentCard.term
    : '';
  const backText = currentCard
    ? invertSides
      ? currentCard.term
      : currentCard.definition
    : '';
  const frontLang = invertSides ? deck.defLang : deck.termLang;
  const backLang = invertSides ? deck.termLang : deck.defLang;

  const handleMarkCard = useCallback(
    (knewIt: boolean) => {
      if (!currentCard || isFinished) return;

      if (knewIt) {
        setKnownIds((prev) => [...prev, currentCard.id]);
        onGradeCardSM2(currentCard.id, 2); // Buono
      } else {
        setReviewAgainIds((prev) => [...prev, currentCard.id]);
        onGradeCardSM2(currentCard.id, 0); // Da ripassare
      }

      setIsFlipped(false);

      if (currentIndex + 1 < studyCards.length) {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 120);
      } else {
        setIsFinished(true);
        onCompleteSession(studyCards.length);
        if (knewIt && reviewAgainIds.length === 0) {
          confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
        }
      }
    },
    [
      currentCard,
      currentIndex,
      isFinished,
      onCompleteSession,
      onGradeCardSM2,
      reviewAgainIds.length,
      studyCards.length,
    ]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isFinished || !currentCard) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleMarkCard(true);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleMarkCard(false);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        speakText(
          isFlipped ? backText : frontText,
          isFlipped ? backLang : frontLang
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    backLang,
    backText,
    currentCard,
    frontLang,
    frontText,
    handleMarkCard,
    isFinished,
    isFlipped,
  ]);

  const handleShuffle = () => {
    const shuffled = [...studyCards].sort(() => Math.random() - 0.5);
    setStudyCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds([]);
    setReviewAgainIds([]);
    setIsFinished(false);
  };

  const handleToggleStarFilter = () => {
    const nextOnlyStarred = !onlyStarred;
    const filtered = nextOnlyStarred
      ? deck.cards.filter((c) => c.starred)
      : deck.cards;
    if (filtered.length === 0) return;
    setOnlyStarred(nextOnlyStarred);
    setStudyCards(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds([]);
    setReviewAgainIds([]);
    setIsFinished(false);
  };

  const handleRestartAll = () => {
    setStudyCards(
      onlyStarred ? deck.cards.filter((c) => c.starred) : deck.cards
    );
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds([]);
    setReviewAgainIds([]);
    setIsFinished(false);
  };

  const handleStudyMissedOnly = () => {
    const missedCards = deck.cards.filter((c) => reviewAgainIds.includes(c.id));
    if (missedCards.length === 0) return;
    setStudyCards(missedCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownIds([]);
    setReviewAgainIds([]);
    setIsFinished(false);
  };

  if (isFinished) {
    const accuracy = Math.round(
      (knownIds.length / Math.max(1, studyCards.length)) * 100
    );

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">Sessione Flashcard Completata!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Hai passato in rassegna {studyCards.length} carte di <strong>{deck.title}</strong>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {knownIds.length}
              </div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Sapevo già
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {reviewAgainIds.length}
              </div>
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Da ripassare
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800">
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {accuracy}%
              </div>
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                Padronanza
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {reviewAgainIds.length > 0 && (
              <button
                onClick={handleStudyMissedOnly}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition cursor-pointer"
              >
                Ripassa solo le {reviewAgainIds.length} carte non sapute
              </button>
            )}
            <button
              onClick={handleRestartAll}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ricomincia tutto il mazzo</span>
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

  const liveCardInDeck =
    deck.cards.find((c) => c.id === currentCard?.id) ?? currentCard;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="truncate max-w-[240px] sm:max-w-none">{deck.title}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleShuffle}
            title="Mescola le carte"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:border-indigo-500 transition cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mescola</span>
          </button>

          <button
            onClick={() => {
              setInvertSides(!invertSides);
              setIsFlipped(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              invertSides
                ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-400 text-indigo-600 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{invertSides ? 'Retro → Fronte' : 'Fronte → Retro'}</span>
          </button>

          <button
            onClick={handleToggleStarFilter}
            disabled={deck.cards.filter((c) => c.starred).length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold disabled:opacity-40 transition cursor-pointer ${
              onlyStarred
                ? 'bg-amber-50 dark:bg-amber-950 border-amber-400 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Difficili</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Counters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-amber-600 dark:text-amber-400">
            Da ripassare: {reviewAgainIds.length}
          </span>
          <span className="text-slate-500">
            Carta {currentIndex + 1} di {studyCards.length}
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            Lo so: {knownIds.length}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / studyCards.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* 3D Interactive Flashcard */}
      {currentCard && (
        <div className="perspective-1000 w-full h-72 sm:h-96">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`relative w-full h-full rounded-3xl transition-transform duration-500 transform-style-3d cursor-pointer select-none ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
          >
            {/* FRONT FACE */}
            <div className="absolute inset-0 backface-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 shadow-xl p-5 sm:p-10 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {invertSides ? 'Definizione' : 'Termine'}
                </span>

                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => speakText(frontText, frontLang)}
                    title="Ascolta audio (Tasto S)"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:text-indigo-600 transition cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggleStarCard(currentCard.id)}
                    title="Segna come difficile/preferita"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 transition cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        liveCardInDeck?.starred
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="my-auto text-center px-2">
                <div className="text-xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-snug break-words">
                  {frontText}
                </div>
                {currentCard.hint && !invertSides && (
                  <div className="text-xs sm:text-sm text-slate-400 mt-3 break-words">
                    💡 Suggerimento: {currentCard.hint}
                  </div>
                )}
              </div>

              <div className="text-center text-[11px] sm:text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 shrink-0" />
                <span>Tocca la carta per girarla</span>
              </div>
            </div>

            {/* BACK FACE */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 text-white border-2 border-indigo-500/50 shadow-xl p-5 sm:p-10 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {invertSides ? 'Termine' : 'Definizione'}
                </span>

                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => speakText(backText, backLang)}
                    title="Ascolta audio (Tasto S)"
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="my-auto text-center px-2">
                <div className="text-lg sm:text-3xl font-bold leading-relaxed break-words">
                  {backText}
                </div>
              </div>

              <div className="text-center text-[11px] sm:text-xs font-semibold text-indigo-300/80 flex items-center justify-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 shrink-0" />
                <span>Tocca per tornare al fronte</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons: Review Again vs Got It */}
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
        <button
          onClick={() => handleMarkCard(false)}
          className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-extrabold text-sm transition cursor-pointer"
        >
          <X className="w-5 h-5" />
          <span>Da ripassare (←)</span>
        </button>

        <button
          onClick={() => handleMarkCard(true)}
          className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm transition cursor-pointer"
        >
          <Check className="w-5 h-5" />
          <span>Lo so! (→)</span>
        </button>
      </div>
    </div>
  );
};

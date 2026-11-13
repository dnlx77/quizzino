import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Zap,
  Trophy,
  RotateCcw,
  Timer,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Deck } from '../../types/quizzino';
import { getDisplayMeaningsList } from '../../utils/tts';
import { sfx } from '../../utils/soundEffects';

interface MatchModeProps {
  deck: Deck;
  onBack: () => void;
  onRecordMatchTime: (timeMs: number) => void;
}

interface MatchTile {
  tileId: string;
  cardId: string;
  text: string;
  kind: 'term' | 'definition';
  matched: boolean;
}

function pickOneMeaning(raw: string): string {
  const list = getDisplayMeaningsList(raw);
  if (list.length <= 1) return raw.trim();
  return list[Math.floor(Math.random() * list.length)];
}

function createMatchTiles(deck: Deck): MatchTile[] {
  const playable = deck.cards.filter((c) => !c.conceptOnly);
  const subset = [...playable]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(6, playable.length));

  const tiles: MatchTile[] = [];
  for (const card of subset) {
    tiles.push({
      tileId: `term-${card.id}`,
      cardId: card.id,
      text: pickOneMeaning(card.term),
      kind: 'term',
      matched: false,
    });
    tiles.push({
      tileId: `def-${card.id}`,
      cardId: card.id,
      text: pickOneMeaning(card.definition),
      kind: 'definition',
      matched: false,
    });
  }

  return tiles.sort(() => Math.random() - 0.5);
}

export const MatchMode: React.FC<MatchModeProps> = ({
  deck,
  onBack,
  onRecordMatchTime,
}) => {
  const playableCards = useMemo(
    () => deck.cards.filter((c) => !c.conceptOnly),
    [deck.cards]
  );
  const [tiles, setTiles] = useState<MatchTile[]>(() => createMatchTiles(deck));
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [wrongPairIds, setWrongPairIds] = useState<string[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [penaltyMs, setPenaltyMs] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const totalTimeMs = elapsedMs + penaltyMs;

  useEffect(() => {
    if (!isRunning || isFinished) return;
    const start = performance.now() - elapsedMs;
    const interval = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - start));
    }, 50);
    return () => clearInterval(interval);
  }, [isRunning, isFinished, elapsedMs]);

  const handleRestart = useCallback(() => {
    setTiles(createMatchTiles(deck));
    setSelectedTileId(null);
    setWrongPairIds([]);
    setElapsedMs(0);
    setPenaltyMs(0);
    setIsFinished(false);
    setIsNewRecord(false);
    setIsRunning(true);
  }, [deck]);

  const handleSelectTile = (tile: MatchTile) => {
    if (tile.matched || wrongPairIds.length > 0 || isFinished) return;

    if (!selectedTileId) {
      sfx.playPlace();
      setSelectedTileId(tile.tileId);
      return;
    }

    if (selectedTileId === tile.tileId) {
      setSelectedTileId(null);
      return;
    }

    const firstTile = tiles.find((t) => t.tileId === selectedTileId);
    if (!firstTile) return;

    // Check if they belong to the same card and are opposite types (term vs definition)
    if (firstTile.cardId === tile.cardId && firstTile.kind !== tile.kind) {
      sfx.playMatch();
      const updated = tiles.map((t) =>
        t.cardId === tile.cardId ? { ...t, matched: true } : t
      );
      setTiles(updated);
      setSelectedTileId(null);

      // Check victory
      if (updated.every((t) => t.matched)) {
        sfx.playVictory();
        setIsRunning(false);
        setIsFinished(true);
        const finalTime = elapsedMs + penaltyMs;
        if (!deck.bestMatchTimeMs || finalTime < deck.bestMatchTimeMs) {
          setIsNewRecord(true);
        }
        onRecordMatchTime(finalTime);
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }
    } else {
      // Mismatch! Penalty +1.0s & shake
      sfx.playWrong();
      setWrongPairIds([firstTile.tileId, tile.tileId]);
      setPenaltyMs((prev) => prev + 1000);
      setSelectedTileId(null);
      setTimeout(() => {
        setWrongPairIds([]);
      }, 450);
    }
  };

  if (playableCards.length < 2) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Carte insufficienti per Abbina
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Servono almeno 2 carte non contrassegnate come <strong>Concetto / Teoria</strong> per poter giocare ad Abbina.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition cursor-pointer"
        >
          Torna al mazzo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-6 py-2 sm:py-6 space-y-2.5 sm:space-y-5">
      {/* Header & Live Stopwatch */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition cursor-pointer truncate max-w-[140px] sm:max-w-none"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">{deck.title}</span>
        </button>

        <div className="flex items-center gap-2">
          {penaltyMs > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-[10px] sm:text-xs font-bold shrink-0">
              <AlertTriangle className="w-3 h-3" />+{(penaltyMs / 1000).toFixed(0)}s
            </span>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono font-extrabold text-sm sm:text-lg shrink-0">
            <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            <span>{(totalTimeMs / 1000).toFixed(1)}s</span>
          </div>

          {deck.bestMatchTimeMs && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <Trophy className="w-4 h-4 text-emerald-500" />
              <span>Record: {(deck.bestMatchTimeMs / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>
      </div>

      {isFinished ? (
        <div className="max-w-xl mx-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center shadow-xl space-y-6 my-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-500 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            {isNewRecord && (
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold uppercase tracking-wider mb-2">
                🎉 Nuovo Record Personale!
              </span>
            )}
            <h2 className="text-3xl font-extrabold">
              {(totalTimeMs / 1000).toFixed(1)} secondi!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Hai abbinato tutte le coppie di <strong>{deck.title}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleRestart}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Gioca ancora (Batti il record)</span>
            </button>
            <button
              onClick={onBack}
              className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Torna al Mazzo
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1 truncate">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Abbina ogni Termine con la sua Definizione! (Errore = +1s)</span>
            </span>
          </div>

          {/* 12-Tile Match Grid: 3 colonne su mobile (3x4), 4 colonne su desktop (4x3) */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-3">
            {tiles.map((tile) => {
              const isSelected = selectedTileId === tile.tileId;
              const isWrong = wrongPairIds.includes(tile.tileId);

              if (tile.matched) {
                return (
                  <div
                    key={tile.tileId}
                    className="h-20 min-[380px]:h-22 sm:h-32 md:h-36 rounded-xl sm:rounded-2xl border-2 border-dashed border-emerald-300/30 dark:border-emerald-800/30 bg-emerald-50/10 flex items-center justify-center opacity-10 transition-all duration-300 scale-95"
                  />
                );
              }

              return (
                <button
                  key={tile.tileId}
                  onClick={() => handleSelectTile(tile)}
                  className={`h-20 min-[380px]:h-22 sm:h-32 md:h-36 p-1.5 min-[380px]:p-2 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-center flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                    isWrong
                      ? 'animate-shake border-rose-500 bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-200'
                      : isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-200 scale-[1.03] shadow-lg'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 shadow-sm'
                  }`}
                >
                  <span
                    className={`text-[8px] min-[380px]:text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider mb-0.5 sm:mb-1 ${
                      tile.kind === 'term'
                        ? 'text-indigo-500'
                        : 'text-violet-500'
                    }`}
                  >
                    {tile.kind === 'term' ? 'Termine' : 'Definizione'}
                  </span>
                  <span className="text-[11px] min-[380px]:text-xs sm:text-sm font-bold line-clamp-3 sm:line-clamp-4 leading-tight sm:leading-snug break-words">
                    {tile.text}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

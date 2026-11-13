import React, { useState } from 'react';
import {
  ArrowLeft,
  Layers,
  Brain,
  Zap,
  CalendarClock,
  Volume2,
  Star,
  Edit3,
  Search,
  Trophy,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  Puzzle,
  BookOpen,
} from 'lucide-react';
import { Deck, StudyMode } from '../types/quizzino';
import { speakText } from '../utils/tts';
import { isCardDue, isCardMastered } from '../utils/sm2';

interface DeckDetailProps {
  deck: Deck;
  onBack: () => void;
  onStartMode: (mode: StudyMode) => void;
  onEditDeck: () => void;
  onToggleStarCard: (cardId: string) => void;
  onToggleConceptCard: (cardId: string) => void;
}

export const DeckDetail: React.FC<DeckDetailProps> = ({
  deck,
  onBack,
  onStartMode,
  onEditDeck,
  onToggleStarCard,
  onToggleConceptCard,
}) => {
  const [filterText, setFilterText] = useState('');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [onlyConcepts, setOnlyConcepts] = useState(false);

  const dueCount = deck.cards.filter((c) => isCardDue(c.sm2)).length;
  const starredCount = deck.cards.filter((c) => c.starred).length;
  const conceptCount = deck.cards.filter((c) => c.conceptOnly).length;

  const visibleCards = deck.cards.filter((card) => {
    if (onlyStarred && !card.starred) return false;
    if (onlyConcepts && !card.conceptOnly) return false;
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      card.term.toLowerCase().includes(q) ||
      card.definition.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna ai mazzi</span>
        </button>

        <button
          onClick={onEditDeck}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 text-xs sm:text-sm font-bold transition cursor-pointer"
        >
          <Edit3 className="w-4 h-4 text-indigo-500" />
          <span>Modifica / Aggiungi Carte</span>
        </button>
      </div>

      {/* Deck Info Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {deck.isSyncedWithDb ? (
            <span
              title="Mazzo salvato nel database MariaDB"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
            >
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sincronizzato su MariaDB</span>
            </span>
          ) : (
            <span
              title="Mazzo presente solo nella memoria locale del browser"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
            >
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Solo Locale</span>
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
            {deck.category}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {deck.cards.length} carte
          </span>
          {deck.bestMatchTimeMs && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
              <Trophy className="w-3.5 h-3.5" />
              Record Abbina: {(deck.bestMatchTimeMs / 1000).toFixed(1)}s
            </span>
          )}
          {deck.bestBlocksScore ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-fuchsia-50 dark:bg-fuchsia-950/70 text-fuchsia-700 dark:text-fuchsia-300">
              <Trophy className="w-3.5 h-3.5 text-fuchsia-500" />
              Record Blocchi: {deck.bestBlocksScore} pts
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          {deck.title}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
          {deck.description}
        </p>

        {/* The 5 Study Modes (Quizlet-style Launchpad) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-7">
          <button
            onClick={() => onStartMode('flashcards')}
            className="group text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-base">Flashcard 3D</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gira le carte, ascolta la pronuncia e separa ciò che sai da ciò che devi ripassare.
            </p>
          </button>

          <button
            onClick={() => onStartMode('learn')}
            className="group text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-violet-50/40 dark:hover:bg-violet-950/30 transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Brain className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-base">Modalità Impara</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Quiz adattivo con Vero/Falso, Scelta Multipla e Risposta Scritta intelligente.
            </p>
          </button>

          <button
            onClick={() => onStartMode('match')}
            className="group text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <div className="font-extrabold text-base">Gioco Abbina</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sfida contro il cronometro: fai sparire tutte le coppie termine-definizione!
            </p>
          </button>

          <button
            onClick={() => onStartMode('blocks')}
            className="group text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-fuchsia-500 dark:hover:border-fuchsia-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-fuchsia-50/40 dark:hover:bg-fuchsia-950/30 transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Puzzle className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base">Gioco Blocchi</span>
              {deck.bestBlocksScore ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-500 text-white">
                  {deck.bestBlocksScore} pts
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Posiziona le forme, cancella righe e sblocca nuovi pezzi rispondendo alle domande!
            </p>
          </button>

          <button
            onClick={() => onStartMode('sm2')}
            className="group text-left p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-base">Ripasso SM-2</span>
              {dueCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white">
                  {dueCount} oggi
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ripetizione dilazionata stile Anki per fissare i concetti nella memoria a lungo termine.
            </p>
          </button>
        </div>
      </div>

      {/* Cards List in this Deck */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">
            Termini in questo mazzo ({visibleCards.length})
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filtra carte..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() => {
                setOnlyStarred(!onlyStarred);
                if (!onlyStarred) setOnlyConcepts(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                onlyStarred
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  onlyStarred ? 'fill-amber-400 text-amber-500' : ''
                }`}
              />
              <span>Difficili ({starredCount})</span>
            </button>

            <button
              onClick={() => {
                setOnlyConcepts(!onlyConcepts);
                if (!onlyConcepts) setOnlyStarred(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                onlyConcepts
                  ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <BookOpen
                className={`w-3.5 h-3.5 ${
                  onlyConcepts ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'
                }`}
              />
              <span>Concetti ({conceptCount})</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {visibleCards.map((card) => {
            const mastered = isCardMastered(card.sm2);
            const due = isCardDue(card.sm2);

            return (
              <div
                key={card.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-4 py-3.5 sm:px-5 sm:py-4 grid grid-cols-1 sm:grid-cols-12 items-center gap-3 sm:gap-4 hover:border-indigo-400/50 transition"
              >
                {/* Colonna 1: Termine (larghezza fissa 4/12 su desktop) */}
                <div className="sm:col-span-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => speakText(card.term, deck.termLang)}
                    title="Ascolta pronuncia termine"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <div className="leading-snug break-words flex items-center gap-2 flex-wrap">
                      <span>{card.term}</span>
                      {card.conceptOnly && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80">
                          <BookOpen className="w-2.5 h-2.5" />
                          <span>Concetto</span>
                        </span>
                      )}
                    </div>
                    {card.hint && (
                      <div className="text-xs font-normal text-slate-400 mt-0.5">
                        💡 {card.hint}
                      </div>
                    )}
                  </div>
                </div>

                {/* Colonna 2: Definizione (larghezza fissa 5/12 su desktop, divisore sempre allineato) */}
                <div className="sm:col-span-5 text-sm text-slate-600 dark:text-slate-300 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-5 flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => speakText(card.definition, deck.defLang)}
                    title="Ascolta pronuncia definizione"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition shrink-0 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <span className="leading-snug break-words">{card.definition}</span>
                </div>

                {/* Colonna 3: Stato SM-2 + Concetto + Preferito (larghezza fissa 3/12 su desktop) */}
                <div className="sm:col-span-3 flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {mastered ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Padroneggiata ({card.sm2.interval}g)</span>
                    </span>
                  ) : due ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>Da ripassare</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 px-2 py-1 whitespace-nowrap">
                      Tra {card.sm2.interval}g
                    </span>
                  )}

                  <button
                    onClick={() => onToggleConceptCard(card.id)}
                    title={
                      card.conceptOnly
                        ? 'Contrassegnata come Concetto/Teoria (esclusa da Impara, Abbina e Blocchi). Clicca per riabilitarla nei giochi.'
                        : 'Segna come Concetto/Teoria (verrà proposta solo in Flashcard e SM-2, esclusa da Impara, Abbina e Blocchi)'
                    }
                    className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
                      card.conceptOnly
                        ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 hover:bg-purple-200'
                        : 'text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onToggleStarCard(card.id)}
                    title={
                      card.starred
                        ? 'Rimuovi dalle carte difficili/preferite'
                        : 'Segna come difficile/preferita'
                    }
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        card.starred
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

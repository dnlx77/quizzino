import React, { useState } from 'react';
import {
  Search,
  Layers,
  Brain,
  Zap,
  CalendarClock,
  Trophy,
  Plus,
  Sparkles,
  Edit3,
  Trash2,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Database,
  HardDrive,
  Puzzle,
} from 'lucide-react';
import { Deck, StudyMode, UserStats, DECK_CATEGORIES } from '../types/quizzino';
import { isCardDue, isCardMastered } from '../utils/sm2';

interface DashboardProps {
  decks: Deck[];
  stats: UserStats;
  onSelectDeck: (deckId: string, mode?: StudyMode) => void;
  onCreateDeck: (initialTab?: 'manual' | 'import' | 'ai') => void;
  onEditDeck: (deck: Deck) => void;
  onDeleteDeck: (deckId: string) => void;
  onResetDemo: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  decks,
  stats,
  onSelectDeck,
  onCreateDeck,
  onEditDeck,
  onDeleteDeck,
  onResetDemo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutte');

  const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0);
  const masteredCards = decks.reduce(
    (acc, d) => acc + d.cards.filter((c) => isCardMastered(c.sm2)).length,
    0
  );
  const dueCards = decks.reduce(
    (acc, d) => acc + d.cards.filter((c) => isCardDue(c.sm2)).length,
    0
  );

  const filteredDecks = decks.filter((deck) => {
    const matchesCategory =
      selectedCategory === 'Tutte' || deck.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesCategory;
    const inTitle = deck.title.toLowerCase().includes(q);
    const inDesc = deck.description.toLowerCase().includes(q);
    const inCards = deck.cards.some(
      (c) =>
        c.term.toLowerCase().includes(q) ||
        c.definition.toLowerCase().includes(q)
    );
    return matchesCategory && (inTitle || inDesc || inCards);
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Hero Banner & Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white p-5 sm:p-8 shadow-xl shadow-indigo-500/15">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] sm:text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Studio Smart • Quiz Adattivo • SM-2</span>
            </div>
            <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Cosa impariamo oggi su Quizzino?
            </h1>
            <p className="text-indigo-100 text-xs sm:text-base leading-relaxed">
              Crea i tuoi mazzi manualmente, importa da CSV/testo in un secondo oppure genera flashcard automatiche dai tuoi appunti con l’intelligenza artificiale.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <button
              onClick={() => onCreateDeck('ai')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm shadow-lg transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span>Genera con AI / Appunti</span>
            </button>
            <button
              onClick={() => onCreateDeck('import')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/45 border border-white/25 text-white font-semibold text-sm backdrop-blur-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Importa CSV / Testo</span>
            </button>
          </div>
        </div>

        {/* Stat Pills inside Hero */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7 pt-6 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5">
            <div className="text-indigo-200 text-xs font-medium">Mazzi & Carte</div>
            <div className="text-xl sm:text-2xl font-extrabold mt-0.5">
              {decks.length} mazzi <span className="text-sm font-normal text-indigo-200">({totalCards} carte)</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5">
            <div className="text-indigo-200 text-xs font-medium">Da ripassare oggi (SM-2)</div>
            <div className="text-xl sm:text-2xl font-extrabold mt-0.5 flex items-center gap-2">
              <span>{dueCards}</span>
              {dueCards > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-semibold">
                  Pronte
                </span>
              )}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5">
            <div className="text-indigo-200 text-xs font-medium">Carte padroneggiate</div>
            <div className="text-xl sm:text-2xl font-extrabold mt-0.5">
              {masteredCards}{' '}
              <span className="text-sm font-normal text-indigo-200">
                ({totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5">
            <div className="text-indigo-200 text-xs font-medium">Sessioni completate</div>
            <div className="text-xl sm:text-2xl font-extrabold mt-0.5">
              {stats.totalQuizzesCompleted + stats.totalMatchGamesPlayed}{' '}
              <span className="text-sm font-normal text-indigo-200">
                ({stats.totalCardsStudied} risposte)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca mazzo, termine o definizione..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['Tutte', ...DECK_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div className="text-center py-16 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-indigo-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-lg font-bold">Nessun mazzo trovato</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Crea un nuovo mazzo da zero, incolla i tuoi appunti o ripristina i mazzi dimostrativi.
          </p>
          <div className="flex justify-center gap-3 mt-5">
            <button
              onClick={() => onCreateDeck('manual')}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition cursor-pointer"
            >
              Crea Mazzo
            </button>
            <button
              onClick={onResetDemo}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ripristina Mazzi Demo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDecks.map((deck) => {
            const deckDue = deck.cards.filter((c) => isCardDue(c.sm2)).length;
            const deckMastered = deck.cards.filter((c) => isCardMastered(c.sm2)).length;
            const masteryPct =
              deck.cards.length > 0
                ? Math.round((deckMastered / deck.cards.length) * 100)
                : 0;

            return (
              <div
                key={deck.id}
                className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges & Edit/Delete */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Badge Storage: MariaDB vs Locale */}
                      {deck.isSyncedWithDb ? (
                        <span
                          title="Sincronizzato sul database MariaDB"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                        >
                          <Database className="w-3 h-3 text-emerald-500" />
                          <span>DB MariaDB</span>
                        </span>
                      ) : (
                        <span
                          title="Salvato solo in locale nel browser"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                        >
                          <HardDrive className="w-3 h-3 text-slate-400" />
                          <span>Solo Locale</span>
                        </span>
                      )}

                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                        {deck.category}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {deck.cards.length} carte
                      </span>
                      {deckDue > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
                          {deckDue} da ripassare
                        </span>
                      )}
                      {deck.bestMatchTimeMs && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <Trophy className="w-3 h-3 text-emerald-500" />
                          {(deck.bestMatchTimeMs / 1000).toFixed(1)}s
                        </span>
                      )}
                      {deck.bestBlocksScore ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300">
                          <Trophy className="w-3 h-3 text-fuchsia-500" />
                          {deck.bestBlocksScore} pts
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditDeck(deck)}
                        title="Modifica mazzo o aggiungi carte"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteDeck(deck.id)}
                        title="Elimina mazzo"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <button
                    onClick={() => onSelectDeck(deck.id, 'overview')}
                    className="text-left block w-full group/title cursor-pointer"
                  >
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 transition">
                      {deck.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {deck.description || 'Nessuna descrizione.'}
                    </p>
                  </button>

                  {/* Mastery Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Padronanza SM-2
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {masteryPct}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${masteryPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Study Mode Launchers */}
                <div className="grid grid-cols-5 gap-1.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => onSelectDeck(deck.id, 'flashcards')}
                    title="Flashcard 3D"
                    className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 text-[11px] sm:text-xs font-bold transition cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span className="truncate">Carte</span>
                  </button>
                  <button
                    onClick={() => onSelectDeck(deck.id, 'learn')}
                    title="Modalità Impara"
                    className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-violet-50 dark:hover:bg-violet-950/60 hover:text-violet-600 dark:hover:text-violet-300 text-[11px] sm:text-xs font-bold transition cursor-pointer"
                  >
                    <Brain className="w-4 h-4 text-violet-500" />
                    <span className="truncate">Impara</span>
                  </button>
                  <button
                    onClick={() => onSelectDeck(deck.id, 'match')}
                    title="Gioco Abbina"
                    className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-600 dark:hover:text-amber-300 text-[11px] sm:text-xs font-bold transition cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="truncate">Abbina</span>
                  </button>
                  <button
                    onClick={() => onSelectDeck(deck.id, 'blocks')}
                    title="Gioco Blocchi"
                    className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/60 hover:text-fuchsia-600 dark:hover:text-fuchsia-300 text-[11px] sm:text-xs font-bold transition cursor-pointer"
                  >
                    <Puzzle className="w-4 h-4 text-fuchsia-500" />
                    <span className="truncate">Blocchi</span>
                  </button>
                  <button
                    onClick={() => onSelectDeck(deck.id, 'sm2')}
                    title="Ripasso SM-2"
                    className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-300 text-[11px] sm:text-xs font-bold transition cursor-pointer"
                  >
                    <CalendarClock className="w-4 h-4 text-emerald-500" />
                    <span className="truncate">SM-2</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

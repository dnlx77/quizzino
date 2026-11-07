import React, { useState, useEffect } from 'react';
import { KeyRound, X, Check, ExternalLink, CloudUpload } from 'lucide-react';
import { Deck, StudyMode, SM2Grade, UserStats } from './types/quizzino';
import { SEED_DECKS } from './data/seedDecks';
import { calculateNextSM2, isCardDue } from './utils/sm2';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { DeckDetail } from './components/DeckDetail';
import { DeckEditorModal } from './components/DeckEditorModal';
import { AuthModal } from './components/AuthModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { FlashcardMode } from './components/modes/FlashcardMode';
import { LearnMode } from './components/modes/LearnMode';
import { MatchMode } from './components/modes/MatchMode';
import { BlocksMode } from './components/modes/BlocksMode';
import { SpacedRepetitionMode } from './components/modes/SpacedRepetitionMode';
import { api, AuthUser } from './services/api';

const STORAGE_KEYS = {
  DECKS: 'quizzino_decks_v1',
  STATS: 'quizzino_stats_v1',
  THEME: 'quizzino_theme_v1',
  GEMINI_KEY: 'quizzino_gemini_key_v1',
};

const DEFAULT_STATS: UserStats = {
  streakDays: 1,
  lastStudyDate: new Date().toISOString().slice(0, 10),
  totalCardsStudied: 0,
  totalQuizzesCompleted: 0,
  totalMatchGamesPlayed: 0,
};

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [decks, setDecks] = useState<Deck[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DECKS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback to seed decks
    }
    return SEED_DECKS;
  });

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_STATS;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    return saved ? saved === 'dark' : true;
  });

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) ?? '';
  });

  // Navigation state
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<StudyMode>('overview');

  // Modals state
  const [editorState, setEditorState] = useState<{
    open: boolean;
    deck?: Deck | null;
    initialTab?: 'manual' | 'import' | 'ai';
  }>({ open: false });

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Caricamento profilo utente all'avvio se è presente un token JWT
  useEffect(() => {
    if (api.isAuthenticated()) {
      api.getMe()
        .then((res) => {
          setCurrentUser(res.user);
          if (res.stats) {
            setStats(res.stats);
          }
          // Carica i mazzi remoti da MariaDB
          loadRemoteDecks();
        })
        .catch(() => {
          api.logout();
          setCurrentUser(null);
        });
    }
  }, []);

  const loadRemoteDecks = async () => {
    try {
      const remoteDecks = await api.getDecks();
      if (Array.isArray(remoteDecks)) {
        // Contrassegna i mazzi che provengono da MariaDB
        const withFlag = remoteDecks.map((d) => ({ ...d, isSyncedWithDb: true }));
        setDecks(withFlag);
      }
    } catch (err: any) {
      console.warn('Errore nel caricamento mazzi remoti:', err.message);
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
  }, [decks]);

  useEffect(() => {
    if (!currentUser) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    }
  }, [stats, currentUser]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_KEYS.THEME, 'light');
    }
  }, [darkMode]);

  const recordStudyActivity = (
    cardsCount = 0,
    quizCompleted = false,
    matchPlayed = false
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    setStats((prev) => {
      let nextStreak = prev.streakDays;
      if (prev.lastStudyDate !== today) {
        const yesterday = new Date(Date.now() - 86400000)
          .toISOString()
          .slice(0, 10);
        nextStreak = prev.lastStudyDate === yesterday ? prev.streakDays + 1 : 1;
      }
      return {
        streakDays: nextStreak,
        lastStudyDate: today,
        totalCardsStudied: prev.totalCardsStudied + cardsCount,
        totalQuizzesCompleted:
          prev.totalQuizzesCompleted + (quizCompleted ? 1 : 0),
        totalMatchGamesPlayed:
          prev.totalMatchGamesPlayed + (matchPlayed ? 1 : 0),
      };
    });

    if (currentUser) {
      api.recordActivity({
        cardsStudied: cardsCount,
        quizCompleted,
        matchPlayed,
      }).catch(console.error);
    }
  };

  const selectedDeck = decks.find((d) => d.id === selectedDeckId) ?? null;

  const totalDueCount = decks.reduce(
    (acc, d) => acc + d.cards.filter((c) => isCardDue(c.sm2)).length,
    0
  );

  const handleSaveDeck = async (savedDeck: Deck) => {
    const deckToSave: Deck = {
      ...savedDeck,
      isSyncedWithDb: !!currentUser,
    };

    setDecks((prev) => {
      const exists = prev.some((d) => d.id === deckToSave.id);
      if (exists) {
        return prev.map((d) => (d.id === deckToSave.id ? deckToSave : d));
      }
      return [deckToSave, ...prev];
    });

    if (currentUser) {
      try {
        await api.saveDeck(deckToSave);
      } catch (err: any) {
        showToast(`Attenzione: ${err.message}`);
      }
    }

    setEditorState({ open: false });
    setSelectedDeckId(deckToSave.id);
    setActiveMode('overview');
    showToast(`Mazzo "${deckToSave.title}" salvato con successo!`);
  };

  const handleDeleteDeck = async (deckId: string) => {
    const target = decks.find((d) => d.id === deckId);
    if (!target) return;
    if (!window.confirm(`Vuoi davvero eliminare il mazzo "${target.title}"?`)) {
      return;
    }

    const updatedDecks = decks.filter((d) => d.id !== deckId);
    setDecks(updatedDecks);
    localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(updatedDecks));

    if (selectedDeckId === deckId) {
      setSelectedDeckId(null);
      setActiveMode('overview');
    }

    if (currentUser) {
      try {
        await api.deleteDeck(deckId);
      } catch (err: any) {
        showToast(`Errore eliminazione server: ${err.message}`);
      }
    }
    showToast('Mazzo eliminato.');
  };

  const handleToggleStarCard = (deckId: string, cardId: string) => {
    setDecks((prev) =>
      prev.map((d) => {
        if (d.id !== deckId) return d;
        return {
          ...d,
          cards: d.cards.map((c) =>
            c.id === cardId ? { ...c, starred: !c.starred } : c
          ),
        };
      })
    );

    if (currentUser) {
      api.toggleCardStar(deckId, cardId).catch(console.error);
    }
  };

  const handleGradeCardSM2 = (
    deckId: string,
    cardId: string,
    grade: SM2Grade
  ) => {
    let newSM2State: any = null;

    setDecks((prev) =>
      prev.map((d) => {
        if (d.id !== deckId) return d;
        return {
          ...d,
          cards: d.cards.map((c) => {
            if (c.id === cardId) {
              const updatedSM2 = calculateNextSM2(c.sm2, grade);
              newSM2State = updatedSM2;
              return { ...c, sm2: updatedSM2 };
            }
            return c;
          }),
        };
      })
    );

    if (currentUser && newSM2State) {
      api.updateCardGrade(deckId, cardId, newSM2State).catch(console.error);
    }
  };

  const handleRecordMatchTime = (deckId: string, timeMs: number) => {
    recordStudyActivity(6, false, true);
    let isBest = false;
    setDecks((prev) =>
      prev.map((d) => {
        if (d.id !== deckId) return d;
        isBest = !d.bestMatchTimeMs || timeMs < d.bestMatchTimeMs;
        return {
          ...d,
          bestMatchTimeMs: isBest ? timeMs : d.bestMatchTimeMs,
        };
      })
    );
    if (currentUser) {
      api.recordDeckScore(deckId, { bestMatchTimeMs: timeMs }).catch(console.error);
    }
  };

  const handleRecordBlocksScore = (deckId: string, score: number) => {
    recordStudyActivity(3, false, true);
    let isBest = false;
    setDecks((prev) =>
      prev.map((d) => {
        if (d.id !== deckId) return d;
        isBest = !d.bestBlocksScore || score > d.bestBlocksScore;
        return {
          ...d,
          bestBlocksScore: isBest ? score : d.bestBlocksScore,
        };
      })
    );
    if (currentUser) {
      api.recordDeckScore(deckId, { bestBlocksScore: score }).catch(console.error);
    }
  };

  const handleExportJson = () => {
    const payload = {
      app: 'Quizzino',
      exportedAt: new Date().toISOString(),
      decks,
      stats,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quizzino-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON esportato!');
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedDecks: Deck[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.decks)
        ? parsed.decks
        : [];
      if (importedDecks.length === 0) {
        alert('Il file JSON selezionato non contiene mazzi validi.');
        return;
      }
      setDecks(importedDecks);
      if (parsed.stats) {
        setStats(parsed.stats);
      }
      if (currentUser) {
        api.syncDecks(importedDecks).catch(console.error);
      }
      setSelectedDeckId(null);
      showToast(`Importati ${importedDecks.length} mazzi con successo!`);
    } catch {
      alert('Errore nella lettura del file JSON di backup.');
    }
  };

  const handleAuthSuccess = async (user: AuthUser, message: string) => {
    setCurrentUser(user);
    showToast(message);
    // Recupera mazzi dal server MariaDB
    try {
      const remote = await api.getDecks();
      if (Array.isArray(remote) && remote.length > 0) {
        setDecks(remote.map((d) => ({ ...d, isSyncedWithDb: true })));
      } else if (decks.length > 0) {
        // Se il nuovo account è vuoto, sincronizziamo i mazzi correnti sul DB
        await api.syncDecks(decks);
        setDecks((prev) => prev.map((d) => ({ ...d, isSyncedWithDb: true })));
        showToast('I tuoi mazzi locali sono stati salvati su MariaDB!');
      }
    } catch (err: any) {
      console.warn(err);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setDecks((prev) => prev.map((d) => ({ ...d, isSyncedWithDb: false })));
    showToast('Disconnessione effettuata. Modalità locale attiva.');
  };

  const handleManualSyncToMariaDb = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      await api.syncDecks(decks);
      setDecks((prev) => prev.map((d) => ({ ...d, isSyncedWithDb: true })));
      showToast('Tutti i mazzi sincronizzati con MariaDB!');
    } catch (err: any) {
      showToast(`Errore sincronizzazione: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        stats={stats}
        totalDueCount={totalDueCount}
        darkMode={darkMode}
        hasApiKey={!!geminiApiKey.trim()}
        user={currentUser}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onGoHome={() => {
          setSelectedDeckId(null);
          setActiveMode('overview');
        }}
        onCreateDeck={() =>
          setEditorState({ open: true, deck: null, initialTab: 'manual' })
        }
        onOpenAiModal={() => {
          setTempApiKey(geminiApiKey);
          setShowApiKeyModal(true);
        }}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenChangePasswordModal={() => setShowChangePasswordModal(true)}
        onLogout={handleLogout}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* MariaDB Sync Banner for logged in user */}
      {currentUser && (
        <div className="bg-indigo-600/10 dark:bg-indigo-500/10 border-b border-indigo-200 dark:border-indigo-900/50 py-1.5 px-3 sm:px-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5 truncate max-w-[240px] sm:max-w-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">
                MariaDB: <strong>{currentUser.username}</strong>
              </span>
            </span>
            <button
              onClick={handleManualSyncToMariaDb}
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer text-[11px] sm:text-xs shrink-0"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>Sincronizza</span>
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-bold shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {!selectedDeck ? (
          <Dashboard
            decks={decks}
            stats={stats}
            onSelectDeck={(deckId, mode = 'overview') => {
              setSelectedDeckId(deckId);
              setActiveMode(mode);
            }}
            onCreateDeck={(initialTab = 'manual') =>
              setEditorState({ open: true, deck: null, initialTab })
            }
            onEditDeck={(deck) =>
              setEditorState({ open: true, deck, initialTab: 'manual' })
            }
            onDeleteDeck={handleDeleteDeck}
            onResetDemo={() => {
              setDecks(SEED_DECKS);
              showToast('Mazzi dimostrativi ripristinati!');
            }}
          />
        ) : activeMode === 'overview' ? (
          <DeckDetail
            deck={selectedDeck}
            onBack={() => setSelectedDeckId(null)}
            onStartMode={(mode) => setActiveMode(mode)}
            onEditDeck={() =>
              setEditorState({
                open: true,
                deck: selectedDeck,
                initialTab: 'manual',
              })
            }
            onToggleStarCard={(cardId) =>
              handleToggleStarCard(selectedDeck.id, cardId)
            }
          />
        ) : activeMode === 'flashcards' ? (
          <FlashcardMode
            deck={selectedDeck}
            onBack={() => setActiveMode('overview')}
            onToggleStarCard={(cardId) =>
              handleToggleStarCard(selectedDeck.id, cardId)
            }
            onGradeCardSM2={(cardId, grade) =>
              handleGradeCardSM2(selectedDeck.id, cardId, grade)
            }
            onCompleteSession={(count) =>
              recordStudyActivity(count, false, false)
            }
          />
        ) : activeMode === 'learn' ? (
          <LearnMode
            deck={selectedDeck}
            onBack={() => setActiveMode('overview')}
            onGradeCardSM2={(cardId, grade) =>
              handleGradeCardSM2(selectedDeck.id, cardId, grade)
            }
            onCompleteQuiz={(count) => recordStudyActivity(count, true, false)}
          />
        ) : activeMode === 'match' ? (
          <MatchMode
            deck={selectedDeck}
            onBack={() => setActiveMode('overview')}
            onRecordMatchTime={(timeMs) =>
              handleRecordMatchTime(selectedDeck.id, timeMs)
            }
          />
        ) : activeMode === 'blocks' ? (
          <BlocksMode
            deck={selectedDeck}
            onBack={() => setActiveMode('overview')}
            onRecordBlocksScore={(score) =>
              handleRecordBlocksScore(selectedDeck.id, score)
            }
          />
        ) : (
          <SpacedRepetitionMode
            deck={selectedDeck}
            onBack={() => setActiveMode('overview')}
            onGradeCardSM2={(cardId, grade) =>
              handleGradeCardSM2(selectedDeck.id, cardId, grade)
            }
            onCompleteSession={(count) =>
              recordStudyActivity(count, true, false)
            }
          />
        )}
      </main>

      {/* Deck Editor / Importer / AI Generator Modal */}
      {editorState.open && (
        <DeckEditorModal
          initialDeck={editorState.deck}
          initialTab={editorState.initialTab}
          geminiApiKey={geminiApiKey}
          onSaveDeck={handleSaveDeck}
          onClose={() => setEditorState({ open: false })}
          onOpenApiKeySettings={() => {
            setTempApiKey(geminiApiKey);
            setShowApiKeyModal(true);
          }}
        />
      )}

      {/* User Login / Register Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={(msg) => showToast(msg)}
      />

      {/* Gemini API Key Settings Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-lg">
                <KeyRound className="w-5 h-5 text-indigo-500" />
                <span>Google Gemini API Key</span>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Inserisci una chiave gratuita di <strong>Google AI Studio (Gemini)</strong> per generare mazzi completi a partire da qualsiasi argomento. La chiave resta salvata <strong>esclusivamente nel tuo browser</strong>.
            </p>

            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>Ottieni chiave gratis</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Chiudi
                </button>
                <button
                  onClick={() => {
                    const clean = tempApiKey.trim();
                    setGeminiApiKey(clean);
                    localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, clean);
                    setShowApiKeyModal(false);
                    showToast(
                      clean
                        ? 'Chiave Gemini AI salvata nel browser!'
                        : 'Chiave Gemini AI rimossa.'
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                >
                  Salva Chiave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

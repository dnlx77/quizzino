export interface SM2Data {
  interval: number;       // Intervallo in giorni (0 = non ancora consolidata)
  repetitions: number;    // Ripetizioni consecutive corrette
  easeFactor: number;     // Fattore di facilità (default 2.5, min 1.3)
  nextReview: number;     // Timestamp (ms) della prossima revisione
  lastReviewed?: number;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  hint?: string;
  starred?: boolean;
  sm2: SM2Data;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  category: string;
  termLang: string;
  defLang: string;
  cards: Flashcard[];
  bestMatchTimeMs?: number;
  bestBlocksScore?: number;
  createdAt: number;
  updatedAt: number;
  isSyncedWithDb?: boolean;
}

export interface UserStats {
  streakDays: number;
  lastStudyDate: string; // YYYY-MM-DD
  totalCardsStudied: number;
  totalQuizzesCompleted: number;
  totalMatchGamesPlayed: number;
}

export type StudyMode = 'overview' | 'flashcards' | 'learn' | 'match' | 'sm2' | 'blocks';

export type SM2Grade = 0 | 1 | 2 | 3; // 0 = Ripeti, 1 = Difficile, 2 = Buono, 3 = Facile

export const SUPPORTED_LANGUAGES = [
  { code: 'it-IT', label: '🇮🇹 Italiano' },
  { code: 'en-US', label: '🇬🇧 Inglese' },
  { code: 'es-ES', label: '🇪🇸 Spagnolo' },
  { code: 'fr-FR', label: '🇫🇷 Francese' },
  { code: 'de-DE', label: '🇩🇪 Tedesco' },
];

export const DECK_CATEGORIES = [
  'Lingue',
  'Informatica',
  'Storia & Cultura',
  'Scienze',
  'Economia & Diritto',
  'Altro',
];

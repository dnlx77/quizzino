import React, { useRef, useState } from 'react';
import {
  Sparkles,
  Flame,
  CalendarClock,
  Download,
  Upload,
  Sun,
  Moon,
  Plus,
  Layers,
  KeyRound,
  User,
  LogOut,
  LogIn,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { UserStats } from '../types/quizzino';
import { AuthUser } from '../services/api';
import { sfx } from '../utils/soundEffects';

interface NavbarProps {
  stats: UserStats;
  totalDueCount: number;
  darkMode: boolean;
  hasApiKey: boolean;
  user: AuthUser | null;
  onToggleDarkMode: () => void;
  onGoHome: () => void;
  onCreateDeck: () => void;
  onOpenAiModal: () => void;
  onOpenAuthModal: () => void;
  onOpenChangePasswordModal: () => void;
  onLogout: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  totalDueCount,
  darkMode,
  hasApiKey,
  user,
  onToggleDarkMode,
  onGoHome,
  onCreateDeck,
  onOpenAiModal,
  onOpenAuthModal,
  onOpenChangePasswordModal,
  onLogout,
  onExportJson,
  onImportJson,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(sfx.isEnabled());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 text-left group focus:outline-none cursor-pointer shrink-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Quizzino
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              Studio Smart
            </span>
          </div>
        </button>

        {/* Quick Status & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Streak Badge */}
          <div
            title="Giorni consecutivi di studio"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-bold"
          >
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{stats.streakDays} {stats.streakDays === 1 ? 'giorno' : 'giorni'}</span>
          </div>

          {/* SM-2 Due Today Badge */}
          <div
            title="Carte da ripassare oggi (Spaced Repetition SM-2)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold"
          >
            <CalendarClock className="w-4 h-4 text-indigo-500" />
            <span>{totalDueCount} da ripassare</span>
          </div>

          {/* User Account Button */}
          {user ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenChangePasswordModal}
                title={`Account: ${user.username} (tocca per gestire password)`}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition hover:border-indigo-400 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                <span className="max-w-[65px] sm:max-w-[120px] truncate">{user.username}</span>
              </button>
              <button
                onClick={onLogout}
                title="Disconnetti account"
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 text-slate-400 hover:text-rose-500 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              title="Accedi o registrati per sincronizzare con MariaDB"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
              <span>Accedi</span>
            </button>
          )}

          {/* AI Settings Button */}
          <button
            onClick={onOpenAiModal}
            title="Configura Google Gemini API Key (opzionale)"
            className={`hidden md:flex p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-semibold items-center gap-1.5 transition cursor-pointer ${
              hasApiKey
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden lg:inline">
              {hasApiKey ? 'AI Gemini Attiva' : 'Chiave AI'}
            </span>
          </button>

          {/* Export / Import Backup */}
          <div className="hidden md:flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 p-0.5">
            <button
              onClick={onExportJson}
              title="Esporta tutti i mazzi e progressi in JSON"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Importa backup JSON"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Sound Effects Toggle */}
          <button
            onClick={() => {
              const next = sfx.toggle();
              setSoundEnabled(next);
            }}
            title={soundEnabled ? 'Disattiva effetti sonori' : 'Attiva effetti sonori'}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400 transition cursor-pointer"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Primary CTA: Create / AI Deck */}
          <button
            onClick={onCreateDeck}
            title="Crea nuovo mazzo"
            className="flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo Mazzo</span>
            <Sparkles className="w-3.5 h-3.5 hidden sm:inline opacity-90" />
          </button>
        </div>
      </div>
    </header>
  );
};

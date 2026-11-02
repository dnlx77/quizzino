import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  ArrowLeftRight,
  Check,
  Upload,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  Deck,
  Flashcard,
  DECK_CATEGORIES,
  SUPPORTED_LANGUAGES,
} from '../types/quizzino';
import {
  parseDelimitedText,
  extractSmartCardsFromNotes,
  generateCardsWithGemini,
  draftsToFlashcards,
} from '../utils/aiGenerator';
import { createInitialSM2 } from '../utils/sm2';

interface DeckEditorModalProps {
  initialDeck?: Deck | null;
  initialTab?: 'manual' | 'import' | 'ai';
  geminiApiKey: string;
  onSaveDeck: (deck: Deck) => void;
  onClose: () => void;
  onOpenApiKeySettings: () => void;
}

export const DeckEditorModal: React.FC<DeckEditorModalProps> = ({
  initialDeck,
  initialTab = 'manual',
  geminiApiKey,
  onSaveDeck,
  onClose,
  onOpenApiKeySettings,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'ai'>(
    initialTab
  );

  const [title, setTitle] = useState(initialDeck?.title ?? '');
  const [description, setDescription] = useState(
    initialDeck?.description ?? ''
  );
  const [category, setCategory] = useState(
    initialDeck?.category ?? DECK_CATEGORIES[0]
  );
  const [termLang, setTermLang] = useState(initialDeck?.termLang ?? 'it-IT');
  const [defLang, setDefLang] = useState(initialDeck?.defLang ?? 'it-IT');

  const [cards, setCards] = useState<Flashcard[]>(
    initialDeck?.cards && initialDeck.cards.length > 0
      ? initialDeck.cards
      : [
          {
            id: `card-${Date.now()}-1`,
            term: '',
            definition: '',
            hint: '',
            starred: false,
            sm2: createInitialSM2(true),
          },
          {
            id: `card-${Date.now()}-2`,
            term: '',
            definition: '',
            hint: '',
            starred: false,
            sm2: createInitialSM2(true),
          },
        ]
  );

  // Import CSV/Text state
  const [importText, setImportText] = useState('');
  const [termDefSep, setTermDefSep] = useState<'auto' | '\t' | ' - ' | ';'>('auto');

  // AI / Smart Notes state
  const [aiInput, setAiInput] = useState('');
  const [aiCardCount, setAiCardCount] = useState(8);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewImported = parseDelimitedText(importText, termDefSep, '\n');

  const handleUpdateCard = (
    index: number,
    field: 'term' | 'definition' | 'hint',
    value: string
  ) => {
    setCards((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, [field]: value } : c))
    );
  };

  const handleAddEmptyCard = () => {
    setCards((prev) => [
      ...prev,
      {
        id: `card-${Date.now()}-${prev.length + 1}`,
        term: '',
        definition: '',
        hint: '',
        starred: false,
        sm2: createInitialSM2(true),
      },
    ]);
  };

  const handleRemoveCard = (index: number) => {
    if (cards.length <= 1) return;
    setCards((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSwapAllTermsAndDefs = () => {
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        term: c.definition,
        definition: c.term,
      }))
    );
    const oldTermLang = termLang;
    setTermLang(defLang);
    setDefLang(oldTermLang);
  };

  const appendDraftsToDeck = (newCards: Flashcard[]) => {
    setCards((prev) => {
      const nonEmptyExisting = prev.filter(
        (c) => c.term.trim() !== '' || c.definition.trim() !== ''
      );
      return [...nonEmptyExisting, ...newCards];
    });
    setActiveTab('manual');
  };

  const handleConfirmImport = () => {
    if (previewImported.length === 0) return;
    const newFlashcards = draftsToFlashcards(previewImported);
    appendDraftsToDeck(newFlashcards);
    setImportText('');
  };

  const handleTextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (activeTab === 'import') {
      setImportText(text);
    } else {
      setAiInput(text);
    }
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
    e.target.value = '';
  };

  const handleRunSmartLocalExtractor = () => {
    setErrorMsg(null);
    setAiMessage(null);
    if (!aiInput.trim()) {
      setErrorMsg('Incolla prima i tuoi appunti o un testo da analizzare.');
      return;
    }
    const extracted = extractSmartCardsFromNotes(aiInput);
    if (extracted.length === 0) {
      setErrorMsg(
        'Non sono riuscito a individuare definizioni nel testo. Prova il formato "Termine: Definizione" o usa Gemini AI.'
      );
      return;
    }
    appendDraftsToDeck(draftsToFlashcards(extracted));
  };

  const handleRunGeminiGeneration = async () => {
    setErrorMsg(null);
    setAiMessage(null);
    if (!aiInput.trim()) {
      setErrorMsg('Inserisci un argomento (es. "Rivoluzione Francese") o incolla i tuoi appunti.');
      return;
    }
    if (!geminiApiKey.trim()) {
      setErrorMsg(
        'Per generare da zero con Google Gemini serve una API Key (oppure usa il pulsante "Estrai da Appunti Offline" qui accanto).'
      );
      return;
    }

    try {
      setAiLoading(true);
      const generated = await generateCardsWithGemini({
        apiKey: geminiApiKey,
        promptOrNotes: aiInput,
        count: aiCardCount,
        termLang,
        defLang,
      });
      if (!title.trim() && aiInput.trim().length < 60) {
        setTitle(aiInput.trim());
      }
      appendDraftsToDeck(draftsToFlashcards(generated));
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Errore durante la generazione AI.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validCards = cards.filter(
      (c) => c.term.trim() !== '' && c.definition.trim() !== ''
    );

    if (!title.trim()) {
      setErrorMsg('Inserisci un titolo per il mazzo.');
      return;
    }
    if (validCards.length < 2) {
      setErrorMsg('Inserisci almeno 2 carte complete (termine e definizione).');
      return;
    }

    const now = Date.now();
    const savedDeck: Deck = {
      id: initialDeck?.id ?? `deck-${now}`,
      title: title.trim(),
      description:
        description.trim() || `Mazzo di studio con ${validCards.length} carte.`,
      category,
      termLang,
      defLang,
      cards: validCards,
      bestMatchTimeMs: initialDeck?.bestMatchTimeMs,
      createdAt: initialDeck?.createdAt ?? now,
      updatedAt: now,
    };

    onSaveDeck(savedDeck);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold">
              {initialDeck ? 'Modifica Mazzo' : 'Crea Nuovo Mazzo'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggiungi carte manualmente, importa da CSV/Quizlet o genera con AI
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50/60 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            1. Carte del Mazzo ({cards.filter((c) => c.term.trim() && c.definition.trim()).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Importa CSV / Testo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ai'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span>3. Generatore AI & Appunti</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Deck Metadata (always visible) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Titolo del Mazzo *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Biologia Molecolare - Capitolo 3"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DECK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Lingua Audio (Termine / Def)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={termLang}
                  onChange={(e) => setTermLang(e.target.value)}
                  className="px-2 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <select
                  value={defLang}
                  onChange={(e) => setDefLang(e.target.value)}
                  className="px-2 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-12">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrizione opzionale (es. Preparazione esame universitario)..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* TAB 1: MANUAL EDITOR */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Elenco Flashcard ({cards.length})
                </span>
                <button
                  type="button"
                  onClick={handleSwapAllTermsAndDefs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:border-indigo-500 transition cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Inverti tutti i Termini / Definizioni</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-xs text-indigo-700 dark:text-indigo-300">
                💡 <strong>Parola con più significati?</strong> Separali nella definizione con{' '}
                <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-bold">/</code>{' '}
                oppure{' '}
                <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-bold">;</code>{' '}
                o{' '}
                <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-bold">,</code>{' '}
                (es. <em>correre / gestire / dirigere</em>). Nel quiz basterà scriverne <strong>uno qualsiasi</strong> perché la risposta sia accettata come buona!
              </div>

              <div className="space-y-3">
                {cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>CARTA #{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(index)}
                        disabled={cards.length <= 1}
                        className="text-slate-400 hover:text-rose-500 disabled:opacity-30 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={card.term}
                          onChange={(e) =>
                            handleUpdateCard(index, 'term', e.target.value)
                          }
                          placeholder="Termine o domanda (Fronte)"
                          className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={card.definition}
                          onChange={(e) =>
                            handleUpdateCard(index, 'definition', e.target.value)
                          }
                          placeholder="Definizione (usa / o ; per più significati)"
                          className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      value={card.hint ?? ''}
                      onChange={(e) =>
                        handleUpdateCard(index, 'hint', e.target.value)
                      }
                      placeholder="Suggerimento opzionale o esempio d'uso..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddEmptyCard}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Aggiungi Carta</span>
              </button>
            </div>
          )}

          {/* TAB 2: IMPORT CSV / QUIZLET TEXT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Copia e incolla da Word, Excel, Google Docs o Quizlet (una carta per riga).
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition">
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Carica file .CSV / .TXT</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv,.md"
                    onChange={handleTextFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-500">Separatore Termine/Definizione:</span>
                {[
                  { val: 'auto', label: 'Automatico (-, :, Tab, ;)' },
                  { val: '\t', label: 'Tab (Excel / Quizlet)' },
                  { val: ' - ', label: 'Trattino ( - )' },
                  { val: ';', label: 'Punto e virgola (;)' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setTermDefSep(opt.val as typeof termDefSep)}
                    className={`px-2.5 py-1 rounded-lg font-semibold border cursor-pointer ${
                      termDefSep === opt.val
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={7}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`Esempio:\nTo figure out - Capire o risolvere un problema\nMitocondrio: Organello che produce ATP\n Fotosintesi ; Processo chimico delle piante`}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Anteprima riconosciuta: {previewImported.length} carte
                </span>
                <button
                  type="button"
                  disabled={previewImported.length === 0}
                  onClick={handleConfirmImport}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Aggiungi {previewImported.length} carte al mazzo</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AI & SMART NOTES GENERATOR */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs sm:text-sm">
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    Doppia modalità intelligente:
                  </span>{' '}
                  puoi estrarre carte <strong>offline gratis</strong> dai tuoi appunti oppure generare mazzi completi da qualsiasi argomento con <strong>Google Gemini AI</strong>.
                </div>
                <button
                  type="button"
                  onClick={onOpenApiKeySettings}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 hover:border-indigo-500 transition cursor-pointer"
                >
                  {geminiApiKey ? '✓ Gemini Key Configurata' : 'Configura Gemini Key'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Argomento o Appunti da trasformare in Flashcard
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-violet-500" />
                  <span>Carica file appunti (.txt / .md)</span>
                  <input
                    type="file"
                    accept=".txt,.md,.csv"
                    onChange={handleTextFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={6}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={`Scrivi un argomento (es. "I 10 verbi più usati in spagnolo" o "Sistema Solare") per Gemini AI,\nOPPURE incolla qui un paragrafo dei tuoi appunti:\n\nL'osmosi è definita come la diffusione del solvente attraverso una membrana semipermeabile.\nLa mitosi rappresenta il processo di divisione cellulare delle cellule eucariotiche...`}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span>Numero carte AI:</span>
                  {[5, 8, 12, 15].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAiCardCount(n)}
                      className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                        aiCardCount === n
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunSmartLocalExtractor}
                    className="px-4 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-bold hover:bg-indigo-100 transition cursor-pointer"
                  >
                    Estrai da Appunti (Offline)
                  </button>

                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleRunGeminiGeneration}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Genera con Gemini AI</span>
                  </button>
                </div>
              </div>
              {aiMessage && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  {aiMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            Salva Mazzo ({cards.filter((c) => c.term.trim() && c.definition.trim()).length} carte)
          </button>
        </div>
      </div>
    </div>
  );
};

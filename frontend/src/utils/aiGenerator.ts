import { Flashcard } from '../types/quizzino';
import { createInitialSM2 } from './sm2';

export interface ParsedCardDraft {
  term: string;
  definition: string;
  hint?: string;
}

/**
 * Parser stile Quizlet per importare testo/CSV con separatori personalizzabili.
 */
export function parseDelimitedText(
  rawText: string,
  termDefSeparator: string = 'auto',
  rowSeparator: string = '\n'
): ParsedCardDraft[] {
  if (!rawText.trim()) return [];

  const rows =
    rowSeparator === '\n'
      ? rawText.split(/\r?\n/)
      : rawText.split(rowSeparator);

  const results: ParsedCardDraft[] = [];

  for (const rawRow of rows) {
    const line = rawRow.trim().replace(/^[-*•\d+.)\s]+/, '');
    if (!line) continue;

    let parts: string[] = [];

    if (termDefSeparator !== 'auto') {
      const idx = line.indexOf(termDefSeparator);
      if (idx !== -1) {
        parts = [line.slice(0, idx), line.slice(idx + termDefSeparator.length)];
      }
    } else {
      // Auto-detect: Tab -> " - " -> " : " -> ";" -> ","
      if (line.includes('\t')) {
        const idx = line.indexOf('\t');
        parts = [line.slice(0, idx), line.slice(idx + 1)];
      } else if (line.includes(' - ')) {
        const idx = line.indexOf(' - ');
        parts = [line.slice(0, idx), line.slice(idx + 3)];
      } else if (line.includes(' – ')) {
        const idx = line.indexOf(' – ');
        parts = [line.slice(0, idx), line.slice(idx + 3)];
      } else if (line.includes(': ')) {
        const idx = line.indexOf(': ');
        parts = [line.slice(0, idx), line.slice(idx + 2)];
      } else if (line.includes(';')) {
        const idx = line.indexOf(';');
        parts = [line.slice(0, idx), line.slice(idx + 1)];
      } else if (line.includes(',')) {
        const idx = line.indexOf(',');
        parts = [line.slice(0, idx), line.slice(idx + 1)];
      }
    }

    if (parts.length === 2) {
      const term = parts[0].trim().replace(/^["']|["']$/g, '');
      const definition = parts[1].trim().replace(/^["']|["']$/g, '');
      if (term && definition) {
        results.push({ term, definition });
      }
    }
  }

  return results;
}

/**
 * Estrattore Smart Locale (Zero-Key AI):
 * Analizza appunti discorsivi, elenchi o paragrafi e genera flashcard senza necessità di API esterna.
 */
export function extractSmartCardsFromNotes(notes: string): ParsedCardDraft[] {
  const firstPass = parseDelimitedText(notes, 'auto', '\n');
  if (firstPass.length >= 2) {
    return firstPass;
  }

  const cards: ParsedCardDraft[] = [];
  const sentences = notes
    .split(/(?<=[.!?])\s+|\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const connectorRegex =
    /^(.{3,65}?)\s+(?:è definito come|è definita come|significa|indica|consiste in|rappresenta|è un|è una|è il|è la|sono i|sono le|chiamato|chiamata)\s+(.{8,250})$/i;

  for (const sentence of sentences) {
    const clean = sentence.replace(/^[-*•\d+.)\s]+/, '').replace(/\.$/, '');
    const match = clean.match(connectorRegex);
    if (match) {
      const term = match[1].trim();
      const definition =
        match[2].trim().charAt(0).toUpperCase() + match[2].trim().slice(1);
      cards.push({ term, definition });
      continue;
    }

    if (clean.includes(':')) {
      const [left, ...rest] = clean.split(':');
      const right = rest.join(':').trim();
      if (left.trim().length >= 2 && left.trim().length <= 70 && right.length >= 4) {
        cards.push({ term: left.trim(), definition: right });
      }
    }
  }

  // Fallback se il testo è composto da frasi libere senza connettori espliciti
  if (cards.length === 0 && sentences.length > 0) {
    for (const s of sentences.slice(0, 15)) {
      const words = s.replace(/\.$/, '').split(/\s+/);
      if (words.length >= 6) {
        const term = words.slice(0, Math.min(4, Math.floor(words.length / 3))).join(' ');
        const definition = words.slice(Math.min(4, Math.floor(words.length / 3))).join(' ');
        cards.push({ term, definition });
      }
    }
  }

  return cards;
}

/**
 * Generazione tramite Google Gemini API (gemini-2.5-flash)
 */
export async function generateCardsWithGemini(params: {
  apiKey: string;
  promptOrNotes: string;
  count: number;
  termLang: string;
  defLang: string;
}): Promise<ParsedCardDraft[]> {
  const { apiKey, promptOrNotes, count, termLang, defLang } = params;

  const systemInstruction = `Sei un assistente didattico esperto per l'app Quizzino (stile Quizlet/Anki).
Genera esattamente ${count} flashcard di studio chiare, concise e accurate basate sull'input dell'utente.
Lingua del termine (fronte): ${termLang}. Lingua della definizione (retro): ${defLang}.
Rispondi ESCLUSIVAMENTE con un array JSON valido di oggetti con chiavi: "term", "definition", "hint" (opzionale, breve suggerimento).`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey.trim()
    )}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            parts: [
              {
                text: `Argomento o appunti da trasformare in ${count} flashcard:\n\n${promptOrNotes}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Errore Gemini API (${response.status}): ${errText.slice(0, 160)}`);
  }

  const data = await response.json();
  const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error('Risposta vuota dal modello Gemini.');
  }

  const parsed = JSON.parse(rawJson);
  if (!Array.isArray(parsed)) {
    throw new Error('Formato JSON non valido restituito da Gemini.');
  }

  return parsed
    .filter((item) => item && typeof item.term === 'string' && typeof item.definition === 'string')
    .map((item) => ({
      term: item.term.trim(),
      definition: item.definition.trim(),
      hint: typeof item.hint === 'string' ? item.hint.trim() : undefined,
    }));
}

export function draftsToFlashcards(drafts: ParsedCardDraft[]): Flashcard[] {
  return drafts.map((d, idx) => ({
    id: `card-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    term: d.term,
    definition: d.definition,
    hint: d.hint,
    starred: false,
    sm2: createInitialSM2(true),
  }));
}

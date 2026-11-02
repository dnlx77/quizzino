export function speakText(text: string, lang = 'it-IT') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignora se il browser blocca l'audio
  }
}

/**
 * Calcola la distanza di Levenshtein per tollerare piccoli errori di battitura
 * nella modalità Risposta Scritta.
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  const dp: number[][] = Array.from({ length: s1.length + 1 }, () =>
    Array(s2.length + 1).fill(0)
  );

  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[s1.length][s2.length];
}

function normalizeAnswerText(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[.,;:/|!?-]+|[.,;:/|!?-]+$/g, '')
    .trim();
}

/**
 * Estrae tutti i singoli significati validi da una definizione o termine.
 * Supporta i separatori: "/" , ";" , "|" , ","
 * Inoltre genera varianti senza eventuali note tra parentesi, es: "correre (veloce)" -> "correre".
 */
export function extractValidMeanings(rawExpected: string): string[] {
  const meaningsSet = new Set<string>();

  const fullNormalized = normalizeAnswerText(rawExpected);
  if (fullNormalized) {
    meaningsSet.add(fullNormalized);
  }

  // Divide sui separatori principali: / ; | ,
  const rawParts = rawExpected
    .split(/[\/;|,]/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of rawParts) {
    const normPart = normalizeAnswerText(part);
    if (normPart) {
      meaningsSet.add(normPart);
    }
    // Variante senza parentesi, es. "to run (verb)" -> "to run"
    const withoutParens = normalizeAnswerText(
      part.replace(/\([^)]*\)/g, '')
    );
    if (withoutParens && withoutParens.length >= 2) {
      meaningsSet.add(withoutParens);
    }
  }

  return Array.from(meaningsSet);
}

/**
 * Restituisce l'elenco pulito dei significati separati per mostrarli nella UI.
 */
export function getDisplayMeaningsList(rawExpected: string): string[] {
  const parts = rawExpected
    .split(/[\/;|,]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [rawExpected.trim()];
}

export function checkWrittenAnswer(
  userAnswer: string,
  expectedAnswer: string
): {
  exact: boolean;
  closeMatch: boolean;
  matchedMeaning?: string;
  otherMeanings: string[];
} {
  const normUser = normalizeAnswerText(userAnswer);
  const allDisplayMeanings = getDisplayMeaningsList(expectedAnswer);

  if (!normUser) {
    return { exact: false, closeMatch: false, otherMeanings: allDisplayMeanings };
  }

  const validCandidates = extractValidMeanings(expectedAnswer);

  // 1. Controllo match esatto con uno qualsiasi dei significati validi
  for (const cand of validCandidates) {
    if (normUser === cand) {
      const others = allDisplayMeanings.filter(
        (m) => normalizeAnswerText(m) !== normUser &&
               normalizeAnswerText(m.replace(/\([^)]*\)/g, '')) !== normUser
      );
      return {
        exact: true,
        closeMatch: true,
        matchedMeaning: cand,
        otherMeanings: others,
      };
    }
  }

  // 2. Se l'utente ha scritto più significati separati da virgola/slash (es. "correre, gestire"),
  // controlliamo se TUTTI quelli che ha scritto sono presenti tra i significati validi!
  const userSubParts = userAnswer
    .split(/[\/;|,]/)
    .map((p) => normalizeAnswerText(p))
    .filter(Boolean);

  if (
    userSubParts.length > 1 &&
    userSubParts.every((up) => validCandidates.includes(up))
  ) {
    const others = allDisplayMeanings.filter(
      (m) => !userSubParts.includes(normalizeAnswerText(m))
    );
    return {
      exact: true,
      closeMatch: true,
      matchedMeaning: userSubParts.join(', '),
      otherMeanings: others,
    };
  }

  // 3. Controllo con tolleranza errori di battitura (Levenshtein) su ciascun significato
  for (const cand of validCandidates) {
    if (cand.length >= 5) {
      const dist = levenshteinDistance(normUser, cand);
      const maxAllowed = cand.length > 12 ? 2 : 1;
      if (dist <= maxAllowed) {
        const others = allDisplayMeanings.filter(
          (m) => normalizeAnswerText(m) !== cand
        );
        return {
          exact: false,
          closeMatch: true,
          matchedMeaning: cand,
          otherMeanings: others,
        };
      }
    }
  }

  return {
    exact: false,
    closeMatch: false,
    otherMeanings: allDisplayMeanings,
  };
}

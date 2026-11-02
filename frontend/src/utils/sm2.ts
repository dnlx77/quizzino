import { SM2Data, SM2Grade } from '../types/quizzino';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createInitialSM2(dueImmediately = true): SM2Data {
  return {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    nextReview: dueImmediately ? Date.now() : Date.now() + DAY_MS,
  };
}

/**
 * Calcola il nuovo stato SM-2 in base al voto scelto dall'utente:
 * 0 = Ripeti (Subito / < 10m)
 * 1 = Difficile
 * 2 = Buono
 * 3 = Facile
 */
export function calculateNextSM2(current: SM2Data, grade: SM2Grade, now = Date.now()): SM2Data {
  let { interval, repetitions, easeFactor } = current;

  if (grade === 0) {
    // Ripeti: azzera le ripetizioni e riprogramma tra 5 minuti (o nella stessa sessione)
    repetitions = 0;
    interval = 0;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    return {
      interval,
      repetitions,
      easeFactor: Number(easeFactor.toFixed(2)),
      nextReview: now + 5 * 60 * 1000, // 5 minuti
      lastReviewed: now,
    };
  }

  if (grade === 1) {
    // Difficile
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 2;
    } else {
      interval = Math.max(interval + 1, Math.round(interval * 1.2));
    }
    repetitions += 1;
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (grade === 2) {
    // Buono
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 4;
    } else {
      interval = Math.max(interval + 1, Math.round(interval * easeFactor));
    }
    repetitions += 1;
  } else if (grade === 3) {
    // Facile
    if (repetitions === 0) {
      interval = 3;
    } else if (repetitions === 1) {
      interval = 7;
    } else {
      interval = Math.max(interval + 2, Math.round(interval * easeFactor * 1.3));
    }
    repetitions += 1;
    easeFactor = Math.min(3.2, easeFactor + 0.15);
  }

  return {
    interval,
    repetitions,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReview: now + interval * DAY_MS,
    lastReviewed: now,
  };
}

export function previewNextIntervalLabel(current: SM2Data, grade: SM2Grade): string {
  if (grade === 0) return '< 10 min';
  const next = calculateNextSM2(current, grade);
  if (next.interval === 1) return '1 giorno';
  return `${next.interval} giorni`;
}

export function isCardDue(sm2: SM2Data, now = Date.now()): boolean {
  return sm2.nextReview <= now;
}

export function isCardMastered(sm2: SM2Data): boolean {
  return sm2.repetitions >= 2 && sm2.interval >= 3;
}

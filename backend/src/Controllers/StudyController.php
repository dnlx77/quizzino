<?php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Utils/Response.php';

class StudyController {
    public static function updateCardGrade(array $authUser): void {
        $userId = $authUser['user_id'];
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $cardId = trim($data['cardId'] ?? '');
        $deckId = trim($data['deckId'] ?? '');
        $sm2 = $data['sm2'] ?? null;

        if (!$cardId || !$deckId || !$sm2) {
            Response::error('Dati mancanti per aggiornare il punteggio SM-2.', 422);
        }

        $pdo = Database::getConnection();

        // Verifica che il mazzo appartenga all'utente corrente
        $check = $pdo->prepare('SELECT id FROM decks WHERE id = :deck_id AND user_id = :uid LIMIT 1');
        $check->execute(['deck_id' => $deckId, 'uid' => $userId]);
        if (!$check->fetch()) {
            Response::error('Non autorizzato.', 403);
        }

        $stmt = $pdo->prepare('
            UPDATE cards 
            SET interval_days = :interval_days, repetitions = :repetitions, 
                ease_factor = :ease_factor, next_review = :next_review, last_reviewed = :last_reviewed 
            WHERE id = :id AND deck_id = :deck_id
        ');

        $stmt->execute([
            'interval_days' => (int)($sm2['interval'] ?? 0),
            'repetitions'   => (int)($sm2['repetitions'] ?? 0),
            'ease_factor'   => (float)($sm2['easeFactor'] ?? 2.50),
            'next_review'   => (float)($sm2['nextReview'] ?? round(microtime(true) * 1000)),
            'last_reviewed' => round(microtime(true) * 1000),
            'id'            => $cardId,
            'deck_id'       => $deckId,
        ]);

        Response::success(null, 'Progresso SM-2 salvato');
    }

    public static function toggleCardStar(array $authUser): void {
        $userId = $authUser['user_id'];
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $cardId = trim($data['cardId'] ?? '');
        $deckId = trim($data['deckId'] ?? '');

        if (!$cardId || !$deckId) {
            Response::error('Dati mancanti.', 422);
        }

        $pdo = Database::getConnection();
        $check = $pdo->prepare('SELECT id FROM decks WHERE id = :deck_id AND user_id = :uid LIMIT 1');
        $check->execute(['deck_id' => $deckId, 'uid' => $userId]);
        if (!$check->fetch()) {
            Response::error('Non autorizzato.', 403);
        }

        $stmt = $pdo->prepare('UPDATE cards SET starred = NOT starred WHERE id = :id AND deck_id = :deck_id');
        $stmt->execute(['id' => $cardId, 'deck_id' => $deckId]);

        Response::success(null, 'Stato preferita aggiornato');
    }

    public static function toggleCardConceptOnly(array $authUser): void {
        $userId = $authUser['user_id'];
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $cardId = trim($data['cardId'] ?? '');
        $deckId = trim($data['deckId'] ?? '');

        if (!$cardId || !$deckId) {
            Response::error('Dati mancanti.', 422);
        }

        $pdo = Database::getConnection();
        $check = $pdo->prepare('SELECT id FROM decks WHERE id = :deck_id AND user_id = :uid LIMIT 1');
        $check->execute(['deck_id' => $deckId, 'uid' => $userId]);
        if (!$check->fetch()) {
            Response::error('Non autorizzato.', 403);
        }

        $stmt = $pdo->prepare('UPDATE cards SET concept_only = NOT concept_only WHERE id = :id AND deck_id = :deck_id');
        $stmt->execute(['id' => $cardId, 'deck_id' => $deckId]);

        Response::success(null, 'Stato concetto aggiornato');
    }

    public static function recordActivity(array $authUser): void {
        $userId = $authUser['user_id'];
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $cardsStudied = (int)($data['cardsStudied'] ?? 0);
        $quizCompleted = !empty($data['quizCompleted']) ? 1 : 0;
        $matchPlayed = !empty($data['matchPlayed']) ? 1 : 0;
        $today = date('Y-m-d');

        $pdo = Database::getConnection();

        // Recupera statistiche attuali per calcolare streak
        $stmt = $pdo->prepare('SELECT streak_days, last_study_date, total_cards_studied, total_quizzes_completed, total_match_games_played FROM user_stats WHERE user_id = :uid LIMIT 1');
        $stmt->execute(['uid' => $userId]);
        $stats = $stmt->fetch();

        if ($stats) {
            $streak = (int)$stats['streak_days'];
            $lastDate = $stats['last_study_date'];

            if ($lastDate !== $today) {
                $yesterday = date('Y-m-d', strtotime('-1 day'));
                $streak = ($lastDate === $yesterday) ? $streak + 1 : 1;
            }

            $update = $pdo->prepare('
                UPDATE user_stats 
                SET streak_days = :streak, last_study_date = :today, 
                    total_cards_studied = total_cards_studied + :cards,
                    total_quizzes_completed = total_quizzes_completed + :quiz,
                    total_match_games_played = total_match_games_played + :match
                WHERE user_id = :uid
            ');
            $update->execute([
                'streak' => $streak,
                'today'  => $today,
                'cards'  => $cardsStudied,
                'quiz'   => $quizCompleted,
                'match'  => $matchPlayed,
                'uid'    => $userId,
            ]);
        } else {
            $insert = $pdo->prepare('
                INSERT INTO user_stats (user_id, streak_days, last_study_date, total_cards_studied, total_quizzes_completed, total_match_games_played)
                VALUES (:uid, 1, :today, :cards, :quiz, :match)
            ');
            $insert->execute([
                'uid'   => $userId,
                'today' => $today,
                'cards' => $cardsStudied,
                'quiz'  => $quizCompleted,
                'match' => $matchPlayed,
            ]);
        }

        Response::success(null, 'Attività registrata');
    }
}

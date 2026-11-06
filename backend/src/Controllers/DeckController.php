<?php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Utils/Response.php';

class DeckController {
    public static function index(array $authUser): void {
        $userId = $authUser['user_id'];
        $pdo = Database::getConnection();

        // Recupera mazzi dell'utente
        $stmt = $pdo->prepare('SELECT * FROM decks WHERE user_id = :uid ORDER BY updated_at DESC');
        $stmt->execute(['uid' => $userId]);
        $decks = $stmt->fetchAll();

        // Recupera tutte le carte per i mazzi dell'utente
        $cardsStmt = $pdo->prepare('
            SELECT c.* FROM cards c 
            INNER JOIN decks d ON c.deck_id = d.id 
            WHERE d.user_id = :uid
        ');
        $cardsStmt->execute(['uid' => $userId]);
        $allCards = $cardsStmt->fetchAll();

        // Raggruppa carte per mazzo
        $cardsByDeck = [];
        foreach ($allCards as $c) {
            $deckId = $c['deck_id'];
            if (!isset($cardsByDeck[$deckId])) {
                $cardsByDeck[$deckId] = [];
            }
            $cardsByDeck[$deckId][] = [
                'id'         => $c['id'],
                'term'       => $c['term'],
                'definition' => $c['definition'],
                'hint'       => !empty($c['hint']) ? $c['hint'] : null,
                'starred'    => (bool)$c['starred'],
                'sm2'        => [
                    'interval'     => (int)$c['interval_days'],
                    'repetitions'  => (int)$c['repetitions'],
                    'easeFactor'   => (float)$c['ease_factor'],
                    'nextReview'   => (float)$c['next_review'],
                    'lastReviewed' => $c['last_reviewed'] ? (float)$c['last_reviewed'] : null,
                ],
            ];
        }

        $formattedDecks = [];
        foreach ($decks as $d) {
            $dId = $d['id'];
            $formattedDecks[] = [
                'id'              => $dId,
                'title'           => $d['title'],
                'description'     => $d['description'] ?? '',
                'category'        => $d['category'],
                'termLang'        => $d['term_lang'],
                'defLang'         => $d['def_lang'],
                'bestMatchTimeMs' => $d['best_match_time_ms'] ? (int)$d['best_match_time_ms'] : null,
                'bestBlocksScore' => $d['best_blocks_score'] ? (int)$d['best_blocks_score'] : null,
                'createdAt'       => (float)$d['created_at'],
                'updatedAt'       => (float)$d['updated_at'],
                'cards'           => $cardsByDeck[$dId] ?? [],
            ];
        }

        Response::success($formattedDecks);
    }

    public static function save(array $authUser): void {
        $userId = $authUser['user_id'];
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $deckId = trim($data['id'] ?? '');
        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $category = trim($data['category'] ?? 'Altro');
        $termLang = trim($data['termLang'] ?? 'it-IT');
        $defLang = trim($data['defLang'] ?? 'it-IT');
        $bestMatchTimeMs = isset($data['bestMatchTimeMs']) ? (int)$data['bestMatchTimeMs'] : null;
        $bestBlocksScore = isset($data['bestBlocksScore']) ? (int)$data['bestBlocksScore'] : null;
        $createdAt = isset($data['createdAt']) ? (float)$data['createdAt'] : round(microtime(true) * 1000);
        $updatedAt = round(microtime(true) * 1000);
        $cards = is_array($data['cards'] ?? null) ? $data['cards'] : [];

        if (empty($title)) {
            Response::error('Il titolo del mazzo è obbligatorio.', 422);
        }

        if (empty($deckId)) {
            $deckId = 'deck-' . round(microtime(true) * 1000) . '-' . substr(bin2hex(random_bytes(3)), 0, 5);
        }

        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        try {
            // Upsert mazzo con verifica user_id per prevenire IDOR
            $check = $pdo->prepare('SELECT user_id FROM decks WHERE id = :id LIMIT 1');
            $check->execute(['id' => $deckId]);
            $existing = $check->fetch();

            if ($existing && (int)$existing['user_id'] !== $userId) {
                Response::error('Non hai i permessi per modificare questo mazzo.', 403);
            }

            if ($existing) {
                $stmt = $pdo->prepare('
                    UPDATE decks 
                    SET title = :title, description = :description, category = :category, 
                        term_lang = :term_lang, def_lang = :def_lang, best_match_time_ms = :best_match_time_ms,
                        best_blocks_score = :best_blocks_score, updated_at = :updated_at 
                    WHERE id = :id AND user_id = :uid
                ');
                $stmt->execute([
                    'title'              => $title,
                    'description'        => $description,
                    'category'           => $category,
                    'term_lang'          => $termLang,
                    'def_lang'           => $defLang,
                    'best_match_time_ms' => $bestMatchTimeMs,
                    'best_blocks_score'  => $bestBlocksScore,
                    'updated_at'         => $updatedAt,
                    'id'                 => $deckId,
                    'uid'                => $userId,
                ]);
            } else {
                $stmt = $pdo->prepare('
                    INSERT INTO decks (id, user_id, title, description, category, term_lang, def_lang, best_match_time_ms, best_blocks_score, created_at, updated_at) 
                    VALUES (:id, :uid, :title, :description, :category, :term_lang, :def_lang, :best_match_time_ms, :best_blocks_score, :created_at, :updated_at)
                ');
                $stmt->execute([
                    'id'                 => $deckId,
                    'uid'                => $userId,
                    'title'              => $title,
                    'description'        => $description,
                    'category'           => $category,
                    'term_lang'          => $termLang,
                    'def_lang'           => $defLang,
                    'best_match_time_ms' => $bestMatchTimeMs,
                    'best_blocks_score'  => $bestBlocksScore,
                    'created_at'         => $createdAt,
                    'updated_at'         => $updatedAt,
                ]);
            }

            // Cancella e reinserisce le carte associate
            $delCards = $pdo->prepare('DELETE FROM cards WHERE deck_id = :deck_id');
            $delCards->execute(['deck_id' => $deckId]);

            $cardInsert = $pdo->prepare('
                INSERT INTO cards (id, deck_id, term, definition, hint, starred, interval_days, repetitions, ease_factor, next_review, last_reviewed)
                VALUES (:id, :deck_id, :term, :definition, :hint, :starred, :interval_days, :repetitions, :ease_factor, :next_review, :last_reviewed)
            ');

            foreach ($cards as $idx => $c) {
                $cId = !empty($c['id']) ? $c['id'] : "card-{$deckId}-{$idx}";
                $term = trim($c['term'] ?? '');
                $definition = trim($c['definition'] ?? '');
                if ($term === '' && $definition === '') continue;

                $sm2 = $c['sm2'] ?? [];
                $cardInsert->execute([
                    'id'            => $cId,
                    'deck_id'       => $deckId,
                    'term'          => $term,
                    'definition'    => $definition,
                    'hint'          => !empty($c['hint']) ? trim($c['hint']) : null,
                    'starred'       => !empty($c['starred']) ? 1 : 0,
                    'interval_days' => (int)($sm2['interval'] ?? 0),
                    'repetitions'   => (int)($sm2['repetitions'] ?? 0),
                    'ease_factor'   => (float)($sm2['easeFactor'] ?? 2.50),
                    'next_review'   => (float)($sm2['nextReview'] ?? round(microtime(true) * 1000)),
                    'last_reviewed' => !empty($sm2['lastReviewed']) ? (float)$sm2['lastReviewed'] : null,
                ]);
            }

            $pdo->commit();

            Response::success([
                'id'              => $deckId,
                'title'           => $title,
                'description'     => $description,
                'category'        => $category,
                'termLang'        => $termLang,
                'defLang'         => $defLang,
                'bestMatchTimeMs' => $bestMatchTimeMs,
                'bestBlocksScore' => $bestBlocksScore,
                'createdAt'       => $createdAt,
                'updatedAt'       => $updatedAt,
                'cards'           => $cards,
            ], 'Mazzo salvato correttamente!');
        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Errore nel salvataggio del mazzo: ' . $e->getMessage(), 500);
        }
    }

    public static function delete(array $authUser, string $deckId): void {
        $userId = $authUser['user_id'];
        $pdo = Database::getConnection();

        // Controllo proprietà mazzo
        $stmt = $pdo->prepare('DELETE FROM decks WHERE id = :id AND user_id = :uid');
        $stmt->execute(['id' => $deckId, 'uid' => $userId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Mazzo non trovato o non autorizzato.', 404);
        }

        Response::success(null, 'Mazzo eliminato con successo!');
    }

    public static function syncAll(array $authUser): void {
        $userId = $authUser['user_id'];
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];
        $decks = is_array($data['decks'] ?? null) ? $data['decks'] : [];

        $pdo = Database::getConnection();
        $pdo->beginTransaction();

        try {
            foreach ($decks as $deck) {
                // Riutilizza logica di salvataggio per ogni mazzo
                $deckId = $deck['id'];
                $check = $pdo->prepare('SELECT user_id FROM decks WHERE id = :id LIMIT 1');
                $check->execute(['id' => $deckId]);
                $existing = $check->fetch();

                if ($existing && (int)$existing['user_id'] !== $userId) {
                    continue; // Salta mazzi appartenenti ad altri
                }

                $stmt = $pdo->prepare('
                    INSERT INTO decks (id, user_id, title, description, category, term_lang, def_lang, best_match_time_ms, best_blocks_score, created_at, updated_at) 
                    VALUES (:id, :uid, :title, :description, :category, :term_lang, :def_lang, :best_match_time_ms, :best_blocks_score, :created_at, :updated_at)
                    ON DUPLICATE KEY UPDATE 
                        title = VALUES(title), description = VALUES(description), category = VALUES(category),
                        term_lang = VALUES(term_lang), def_lang = VALUES(def_lang), 
                        best_match_time_ms = VALUES(best_match_time_ms),
                        best_blocks_score = VALUES(best_blocks_score),
                        updated_at = VALUES(updated_at)
                ');
                $stmt->execute([
                    'id'                 => $deckId,
                    'uid'                => $userId,
                    'title'              => $deck['title'],
                    'description'        => $deck['description'] ?? '',
                    'category'           => $deck['category'] ?? 'Altro',
                    'term_lang'          => $deck['termLang'] ?? 'it-IT',
                    'def_lang'           => $deck['defLang'] ?? 'it-IT',
                    'best_match_time_ms' => $deck['bestMatchTimeMs'] ?? null,
                    'best_blocks_score'  => $deck['bestBlocksScore'] ?? null,
                    'created_at'         => $deck['createdAt'] ?? round(microtime(true) * 1000),
                    'updated_at'         => $deck['updatedAt'] ?? round(microtime(true) * 1000),
                ]);

                // Carte
                $delCards = $pdo->prepare('DELETE FROM cards WHERE deck_id = :deck_id');
                $delCards->execute(['deck_id' => $deckId]);

                $cardInsert = $pdo->prepare('
                    INSERT INTO cards (id, deck_id, term, definition, hint, starred, interval_days, repetitions, ease_factor, next_review, last_reviewed)
                    VALUES (:id, :deck_id, :term, :definition, :hint, :starred, :interval_days, :repetitions, :ease_factor, :next_review, :last_reviewed)
                ');

                foreach ($deck['cards'] ?? [] as $c) {
                    $sm2 = $c['sm2'] ?? [];
                    $cardInsert->execute([
                        'id'            => $c['id'],
                        'deck_id'       => $deckId,
                        'term'          => $c['term'],
                        'definition'    => $c['definition'],
                        'hint'          => $c['hint'] ?? null,
                        'starred'       => !empty($c['starred']) ? 1 : 0,
                        'interval_days' => (int)($sm2['interval'] ?? 0),
                        'repetitions'   => (int)($sm2['repetitions'] ?? 0),
                        'ease_factor'   => (float)($sm2['easeFactor'] ?? 2.50),
                        'next_review'   => (float)($sm2['nextReview'] ?? round(microtime(true) * 1000)),
                        'last_reviewed' => !empty($sm2['lastReviewed']) ? (float)$sm2['lastReviewed'] : null,
                    ]);
                }
            }

            $pdo->commit();
            Response::success(null, 'Tutti i mazzi sono stati sincronizzati nel tuo account MariaDB!');
        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Errore durante la sincronizzazione mazzi: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Aggiorna atomicamente e leggermente i record (bestBlocksScore, bestMatchTimeMs)
     */
    public static function recordScore(array $authUser): void
    {
        $userId = (int)$authUser['uid'];
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $deckId = trim($data['deckId'] ?? '');

        if (empty($deckId)) {
            Response::error('ID mazzo obbligatorio.', 400);
        }

        $bestBlocksScore = isset($data['bestBlocksScore']) && is_numeric($data['bestBlocksScore']) ? (int)$data['bestBlocksScore'] : null;
        $bestMatchTimeMs = isset($data['bestMatchTimeMs']) && is_numeric($data['bestMatchTimeMs']) ? (int)$data['bestMatchTimeMs'] : null;

        if ($bestBlocksScore === null && $bestMatchTimeMs === null) {
            Response::error('Nessun punteggio fornito.', 400);
        }

        $pdo = Database::getConnection();

        $clauses = [];
        $params = ['id' => $deckId, 'uid' => $userId];

        if ($bestBlocksScore !== null) {
            $clauses[] = 'best_blocks_score = CASE WHEN best_blocks_score IS NULL OR :blocks_score > best_blocks_score THEN :blocks_score ELSE best_blocks_score END';
            $params['blocks_score'] = $bestBlocksScore;
        }

        if ($bestMatchTimeMs !== null) {
            $clauses[] = 'best_match_time_ms = CASE WHEN best_match_time_ms IS NULL OR :match_time < best_match_time_ms THEN :match_time ELSE best_match_time_ms END';
            $params['match_time'] = $bestMatchTimeMs;
        }

        $clauses[] = 'updated_at = :updated_at';
        $params['updated_at'] = round(microtime(true) * 1000);

        $sql = 'UPDATE decks SET ' . implode(', ', $clauses) . ' WHERE id = :id AND user_id = :uid';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        Response::json(['message' => 'Record aggiornato con successo.']);
    }
}

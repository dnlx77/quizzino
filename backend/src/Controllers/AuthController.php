<?php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Utils/Response.php';
require_once __DIR__ . '/../Utils/Jwt.php';

class AuthController {
    public static function register(): void {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $username = trim($data['username'] ?? '');
        $email    = trim(strtolower($data['email'] ?? ''));
        $password = $data['password'] ?? '';

        if (strlen($username) < 3 || strlen($username) > 50) {
            Response::error('Il nome utente deve essere compreso tra 3 e 50 caratteri.', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Indirizzo email non valido.', 422);
        }

        if (strlen($password) < 6) {
            Response::error('La password deve contenere almeno 6 caratteri.', 422);
        }

        $pdo = Database::getConnection();

        // Controllo se username o email esistono già
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username OR email = :email LIMIT 1');
        $stmt->execute(['username' => $username, 'email' => $email]);
        if ($stmt->fetch()) {
            Response::error('Nome utente o email già registrati.', 409);
        }

        // Hashing sicuro password con algoritmo Argon2id / Bcrypt
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $pdo->beginTransaction();
        try {
            $insert = $pdo->prepare('INSERT INTO users (username, email, password_hash) VALUES (:username, :email, :password_hash)');
            $insert->execute([
                'username'      => $username,
                'email'         => $email,
                'password_hash' => $passwordHash,
            ]);
            $userId = (int)$pdo->lastInsertId();

            // Inizializza statistiche utente
            $today = date('Y-m-d');
            $statsStmt = $pdo->prepare('INSERT INTO user_stats (user_id, streak_days, last_study_date) VALUES (:uid, 1, :today)');
            $statsStmt->execute(['uid' => $userId, 'today' => $today]);

            $pdo->commit();

            $token = Jwt::generate([
                'user_id'  => $userId,
                'username' => $username,
                'email'    => $email,
            ]);

            Response::success([
                'user'  => ['id' => $userId, 'username' => $username, 'email' => $email],
                'token' => $token,
            ], 'Registrazione completata con successo!', 201);
        } catch (Exception $e) {
            $pdo->rollBack();
            Response::error('Errore durante la registrazione: ' . $e->getMessage(), 500);
        }
    }

    public static function login(): void {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $loginIdentifier = trim($data['login'] ?? $data['email'] ?? $data['username'] ?? '');
        $password = $data['password'] ?? '';

        if (empty($loginIdentifier) || empty($password)) {
            Response::error('Inserisci username/email e password.', 422);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id, username, email, password_hash FROM users WHERE username = :login_user OR email = :login_email LIMIT 1');
        $stmt->execute(['login_user' => $loginIdentifier, 'login_email' => $loginIdentifier]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Credenziali non valide. Controlla username e password.', 401);
        }

        $token = Jwt::generate([
            'user_id'  => (int)$user['id'],
            'username' => $user['username'],
            'email'    => $user['email'],
        ]);

        Response::success([
            'user'  => [
                'id'       => (int)$user['id'],
                'username' => $user['username'],
                'email'    => $user['email'],
            ],
            'token' => $token,
        ], 'Accesso eseguito con successo!');
    }

    public static function me(array $authUser): void {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id, username, email, created_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $authUser['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Utente non trovato.', 404);
        }

        // Recupera statistiche
        $statsStmt = $pdo->prepare('SELECT streak_days, last_study_date, total_cards_studied, total_quizzes_completed, total_match_games_played FROM user_stats WHERE user_id = :id LIMIT 1');
        $statsStmt->execute(['id' => $authUser['user_id']]);
        $stats = $statsStmt->fetch() ?: [
            'streak_days'              => 1,
            'last_study_date'          => date('Y-m-d'),
            'total_cards_studied'      => 0,
            'total_quizzes_completed'  => 0,
            'total_match_games_played' => 0,
        ];

        Response::success([
            'user'  => $user,
            'stats' => [
                'streakDays'            => (int)$stats['streak_days'],
                'lastStudyDate'         => $stats['last_study_date'],
                'totalCardsStudied'     => (int)$stats['total_cards_studied'],
                'totalQuizzesCompleted' => (int)$stats['total_quizzes_completed'],
                'totalMatchGamesPlayed' => (int)$stats['total_match_games_played'],
            ],
        ]);
    }

    public static function changePassword(array $authUser): void {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?: [];

        $currentPassword = $data['currentPassword'] ?? '';
        $newPassword     = $data['newPassword'] ?? '';

        if (empty($currentPassword) || empty($newPassword)) {
            Response::error('Inserisci sia la password attuale che la nuova password.', 422);
        }

        if (strlen($newPassword) < 6) {
            Response::error('La nuova password deve contenere almeno 6 caratteri.', 422);
        }

        $userId = (int)$authUser['user_id'];
        $pdo = Database::getConnection();

        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            Response::error('La password attuale inserita non è corretta.', 401);
        }

        if (password_verify($newPassword, $user['password_hash'])) {
            Response::error('La nuova password non può essere identica a quella attuale.', 422);
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $updateStmt = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
        $updateStmt->execute(['hash' => $newHash, 'id' => $userId]);

        Response::success(null, 'Password aggiornata con successo!');
    }
}

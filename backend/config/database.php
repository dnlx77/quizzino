<?php

require_once __DIR__ . '/../src/Utils/Env.php';

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $host = Env::get('DB_HOST', '127.0.0.1');
            $port = Env::get('DB_PORT', '3306');
            $db   = Env::get('DB_NAME', 'quizzino_db');
            $user = Env::get('DB_USER', 'root');
            $pass = Env::get('DB_PASS', '');

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // Massima sicurezza contro SQL Injection
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
                // Auto-migrazione leggera per nuove colonne
                try {
                    self::$instance->exec("ALTER TABLE `cards` ADD COLUMN IF NOT EXISTS `concept_only` TINYINT(1) NOT NULL DEFAULT 0");
                } catch (Throwable $e) {
                    // Ignora se la tabella non esiste ancora o se già presente
                }
            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'success' => false,
                    'error'   => 'Errore di connessione al database.'
                ]);
                exit;
            }
        }
        return self::$instance;
    }
}

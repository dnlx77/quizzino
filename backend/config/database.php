<?php

class Database {
    private static ?PDO $instance = null;

    private static function loadEnv(): void {
        $paths = [__DIR__ . '/../.env', __DIR__ . '/../../.env'];
        foreach ($paths as $path) {
            if (file_exists($path)) {
                $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || str_starts_with($line, '#')) continue;
                    if (strpos($line, '=') !== false) {
                        [$name, $value] = explode('=', $line, 2);
                        $name = trim($name);
                        $value = trim($value, " \t\n\r\0\x0B\"'");
                        if (!isset($_SERVER[$name]) && getenv($name) === false) {
                            putenv("{$name}={$value}");
                            $_ENV[$name] = $value;
                            $_SERVER[$name] = $value;
                        }
                    }
                }
                break;
            }
        }
    }

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            self::loadEnv();

            $host = $_SERVER['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1';
            $port = $_SERVER['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
            $db   = $_SERVER['DB_NAME'] ?? getenv('DB_NAME') ?: 'quizzino_db';
            $user = $_SERVER['DB_USER'] ?? getenv('DB_USER') ?: 'root';
            $pass = $_SERVER['DB_PASS'] ?? (getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
            
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // Massima sicurezza contro SQL Injection
            ];

            try {
                self::$instance = new PDO($dsn, $user, $pass, $options);
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

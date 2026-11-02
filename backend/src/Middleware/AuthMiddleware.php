<?php

require_once __DIR__ . '/../Utils/Response.php';
require_once __DIR__ . '/../Utils/Jwt.php';

class AuthMiddleware {
    public static function authenticate(): array {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            Response::error('Autenticazione richiesta. Token mancante o non valido.', 401);
        }

        $token = $matches[1];
        $payload = Jwt::verify($token);

        if (!$payload || !isset($payload['user_id'])) {
            Response::error('Sessione scaduta o non valida. Effettua nuovamente il login.', 401);
        }

        return $payload;
    }
}

<?php

class Response {
    public static function json(array $data, int $statusCode = 200): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $message, int $statusCode = 400, ?array $details = null): void {
        $payload = [
            'success' => false,
            'error'   => $message
        ];
        if ($details !== null) {
            $payload['details'] = $details;
        }
        self::json($payload, $statusCode);
    }

    public static function success(mixed $data = null, string $message = 'Operazione completata con successo', int $statusCode = 200): void {
        $payload = [
            'success' => true,
            'message' => $message
        ];
        if ($data !== null) {
            $payload['data'] = $data;
        }
        self::json($payload, $statusCode);
    }
}

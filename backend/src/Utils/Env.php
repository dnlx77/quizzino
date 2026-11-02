<?php

class Env {
    private static bool $loaded = false;

    public static function load(): void {
        if (self::$loaded) return;
        self::$loaded = true;

        $paths = [
            __DIR__ . '/../../.env',
            dirname(__DIR__, 2) . '/.env'
        ];

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
                        putenv("{$name}={$value}");
                        $_ENV[$name] = $value;
                        $_SERVER[$name] = $value;
                    }
                }
                break;
            }
        }
    }

    public static function get(string $key, ?string $default = null): ?string {
        self::load();
        $val = $_SERVER[$key] ?? $_ENV[$key] ?? getenv($key);
        return ($val !== false && $val !== null) ? (string)$val : $default;
    }
}

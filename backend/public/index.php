<?php

require_once __DIR__ . '/../src/Utils/Env.php';
Env::load();

require_once __DIR__ . '/../src/Middleware/CorsMiddleware.php';
require_once __DIR__ . '/../src/Middleware/AuthMiddleware.php';
require_once __DIR__ . '/../src/Controllers/AuthController.php';
require_once __DIR__ . '/../src/Controllers/DeckController.php';
require_once __DIR__ . '/../src/Controllers/StudyController.php';
require_once __DIR__ . '/../src/Utils/Response.php';

// Applica intestazioni CORS e gestione pre-flight OPTIONS
CorsMiddleware::handle();

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Rimuove eventuali prefissi di sottocartella (es: /quizzino/backend/public o /api)
$uri = preg_replace('#^.*?/api#', '', $uri);
$uri = preg_replace('#^/index\.php#', '', $uri);
$uri = '/' . trim($uri, '/');

// Router API REST
switch (true) {
    // Health check
    case $uri === '/' || $uri === '/health':
        Response::success(['status' => 'online', 'service' => 'Quizzino REST API', 'php' => PHP_VERSION]);
        break;

    // Autenticazione
    case $uri === '/auth/register' && $method === 'POST':
        AuthController::register();
        break;

    case $uri === '/auth/login' && $method === 'POST':
        AuthController::login();
        break;

    case $uri === '/auth/me' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        AuthController::me($user);
        break;

    case $uri === '/auth/change-password' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        AuthController::changePassword($user);
        break;

    // Mazzi e Carte
    case $uri === '/decks' && $method === 'GET':
        $user = AuthMiddleware::authenticate();
        DeckController::index($user);
        break;

    case $uri === '/decks' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        DeckController::save($user);
        break;

    case preg_match('#^/decks/([^/]+)$#', $uri, $matches) && $method === 'DELETE':
        $user = AuthMiddleware::authenticate();
        DeckController::delete($user, $matches[1]);
        break;

    case $uri === '/decks/sync' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        DeckController::syncAll($user);
        break;

    case $uri === '/decks/record' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        DeckController::recordScore($user);
        break;

    // Studio & SM-2
    case $uri === '/study/grade' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudyController::updateCardGrade($user);
        break;

    case $uri === '/study/star' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudyController::toggleCardStar($user);
        break;

    case $uri === '/study/activity' && $method === 'POST':
        $user = AuthMiddleware::authenticate();
        StudyController::recordActivity($user);
        break;

    default:
        Response::error("Endpoint {$method} {$uri} non trovato.", 404);
}

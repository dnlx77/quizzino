-- Quizzino MariaDB Schema
CREATE DATABASE IF NOT EXISTS `quizzino_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `quizzino_db`;

-- Tabella Utenti
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(190) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Mazzi
CREATE TABLE IF NOT EXISTS `decks` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `category` VARCHAR(60) NOT NULL DEFAULT 'Altro',
  `term_lang` VARCHAR(10) NOT NULL DEFAULT 'it-IT',
  `def_lang` VARCHAR(10) NOT NULL DEFAULT 'it-IT',
  `best_match_time_ms` INT NULL,
  `best_blocks_score` INT NULL,
  `created_at` BIGINT NOT NULL,
  `updated_at` BIGINT NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Carte / Flashcard
CREATE TABLE IF NOT EXISTS `cards` (
  `id` VARCHAR(64) PRIMARY KEY,
  `deck_id` VARCHAR(64) NOT NULL,
  `term` TEXT NOT NULL,
  `definition` TEXT NOT NULL,
  `hint` TEXT NULL,
  `starred` TINYINT(1) NOT NULL DEFAULT 0,
  `interval_days` INT NOT NULL DEFAULT 0,
  `repetitions` INT NOT NULL DEFAULT 0,
  `ease_factor` DECIMAL(4,2) NOT NULL DEFAULT 2.50,
  `next_review` BIGINT NOT NULL,
  `last_reviewed` BIGINT NULL,
  FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabella Statistiche Utente
CREATE TABLE IF NOT EXISTS `user_stats` (
  `user_id` INT PRIMARY KEY,
  `streak_days` INT NOT NULL DEFAULT 1,
  `last_study_date` VARCHAR(10) NOT NULL,
  `total_cards_studied` INT NOT NULL DEFAULT 0,
  `total_quizzes_completed` INT NOT NULL DEFAULT 0,
  `total_match_games_played` INT NOT NULL DEFAULT 0,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

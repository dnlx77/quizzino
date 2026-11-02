-- Quizzino Production Dump
-- Generated: 2026-11-02 14:28:14

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET NAMES utf8mb4;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for `users` (1 rows)
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `created_at`) VALUES
(1, 'Daniele Massari', 'dnlx77@gmail.com', '$2y$10$cBeHNN.yU6dZ8JuW74yNQ.lF6F4XvAKICE/9pTx7QCul3r2vT.DCu', '2026-10-30 22:04:40');

DROP TABLE IF EXISTS `decks`;
CREATE TABLE `decks` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Altro',
  `term_lang` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'it-IT',
  `def_lang` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'it-IT',
  `best_match_time_ms` int(11) DEFAULT NULL,
  `best_blocks_score` int(11) DEFAULT NULL,
  `created_at` bigint(20) NOT NULL,
  `updated_at` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `decks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for `decks` (2 rows)
INSERT INTO `decks` (`id`, `user_id`, `title`, `description`, `category`, `term_lang`, `def_lang`, `best_match_time_ms`, `best_blocks_score`, `created_at`, `updated_at`) VALUES
('deck-1793380643297', 1, 'Idioms', 'Mazzo di studio con 30 carte.', 'Lingue', 'en-US', 'it-IT', 14849, 950, 1793380643297, 1793567380740),
('deck-1793394596717', 1, 'Vocabolario inglese', 'Mazzo di studio con 51 carte.', 'Lingue', 'en-US', 'it-IT', 9114, 5000, 1793394596717, 1793616365423);

DROP TABLE IF EXISTS `cards`;
CREATE TABLE `cards` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deck_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `term` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `definition` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `hint` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `starred` tinyint(1) NOT NULL DEFAULT 0,
  `interval_days` int(11) NOT NULL DEFAULT 0,
  `repetitions` int(11) NOT NULL DEFAULT 0,
  `ease_factor` decimal(4,2) NOT NULL DEFAULT 2.50,
  `next_review` bigint(20) NOT NULL,
  `last_reviewed` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `deck_id` (`deck_id`),
  CONSTRAINT `cards_ibfk_1` FOREIGN KEY (`deck_id`) REFERENCES `decks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for `cards` (81 rows)
INSERT INTO `cards` (`id`, `deck_id`, `term`, `definition`, `hint`, `starred`, `interval_days`, `repetitions`, `ease_factor`, `next_review`, `last_reviewed`) VALUES
('card-1793380642162-0-090a7', 'deck-1793380643297', 'to become blue in face', 'arrabbiarsi', NULL, 0, 4, 2, '2.50', 1793816121072, 1793470521080),
('card-1793380642162-1-gamem', 'deck-1793380643297', 'spill the beans', 'vuota il sacco/sputa il rospo', NULL, 0, 4, 2, '2.50', 1793816125094, 1793470525099),
('card-1793380642162-10-qci8r', 'deck-1793380643297', 'that\'s alright', 'va bene', NULL, 0, 0, 0, '2.10', 1793470830116, 1793470530125),
('card-1793380642162-11-cf1fl', 'deck-1793380643297', 'from what i gather', 'da quello che ho capito', NULL, 0, 4, 2, '2.50', 1793816133346, 1793470533369),
('card-1793380642162-12-bdhv7', 'deck-1793380643297', 'to have a hard time', 'avere difficoltà', NULL, 0, 4, 2, '2.30', 1793816144761, 1793470544768),
('card-1793380642162-13-q6sxt', 'deck-1793380643297', 'it is worth it', 'ne vale la pena', NULL, 0, 0, 0, '2.30', 1793470849360, 1793470549365),
('card-1793380642162-14-2bjcq', 'deck-1793380643297', 'help yourself', 'serviti pure', NULL, 0, 0, 0, '2.30', 1793470854612, 1793470554620),
('card-1793380642162-15-xmpxq', 'deck-1793380643297', 'to paint the town', 'ubriacarsi', NULL, 0, 4, 2, '2.50', 1793816158254, 1793470558274),
('card-1793380642162-16-0iabt', 'deck-1793380643297', 'have some pity', 'abbi pietà', NULL, 0, 4, 2, '2.50', 1793816161103, 1793470561132),
('card-1793380642162-17-4v36z', 'deck-1793380643297', 'bite the bullet', 'cogliere l\'occasione al volo', NULL, 0, 4, 2, '2.65', 1793816164726, 1793470564731),
('card-1793380642162-18-hfi8c', 'deck-1793380643297', 'break a leg', 'buona fortuna/inbocca al lupo', NULL, 0, 4, 2, '2.65', 1793816168651, 1793470568666),
('card-1793380642162-19-2n0sj', 'deck-1793380643297', 'get out of hand', 'andare fuori controllo', NULL, 0, 0, 0, '2.45', 1793470873852, 1793470573861),
('card-1793380642162-2-qfmj1', 'deck-1793380643297', 'to be over the moon', 'essere esaltati', NULL, 0, 4, 2, '2.50', 1793816180468, 1793470580475),
('card-1793380642162-20-a1tq6', 'deck-1793380643297', 'kick the bucket', 'morire', NULL, 0, 4, 2, '2.35', 1793816184650, 1793470584655),
('card-1793380642162-21-ekcd0', 'deck-1793380643297', 'make a long story short', 'accorciare qualcosa', NULL, 0, 4, 2, '2.50', 1793816187996, 1793470588004),
('card-1793380642162-22-lbdvq', 'deck-1793380643297', 'gut feeling', 'sesto senso', NULL, 0, 4, 2, '2.35', 1793816190027, 1793470590032),
('card-1793380642162-23-mbmfr', 'deck-1793380643297', 'on the ball', 'stare sul pezzo', NULL, 0, 0, 0, '2.30', 1793470894330, 1793470594337),
('card-1793380642162-24-4jmlc', 'deck-1793380643297', 'that\'s the last straw', 'è l\'ultima goccia', NULL, 0, 4, 2, '2.30', 1793816197939, 1793470597944),
('card-1793380642162-25-au3dw', 'deck-1793380643297', 'it\'s not my cup of tea', 'non fa per me', NULL, 0, 0, 0, '2.10', 1793470901965, 1793470601972),
('card-1793380642162-26-2p936', 'deck-1793380643297', 'widespread backlash', 'ampie polemiche', NULL, 0, 4, 2, '2.50', 1793816205598, 1793470605615),
('card-1793380642162-27-o4crp', 'deck-1793380643297', 'to make matters worse', 'peggiorare le cose', NULL, 0, 0, 0, '2.30', 1793470912916, 1793470612946),
('card-1793380642162-28-ndcm0', 'deck-1793380643297', 'you are on thin ice', 'sei su un terreno scivoloso', NULL, 0, 4, 2, '2.50', 1793816218303, 1793470618310),
('card-1793380642162-29-y5mb6', 'deck-1793380643297', 'under the weather', 'essere ammalato', NULL, 0, 4, 2, '2.30', 1793816221395, 1793470621400),
('card-1793380642162-3-z0xhu', 'deck-1793380643297', 'a blessing in disguise', 'non tutti i mali vengono per nuocere', NULL, 0, 4, 2, '2.50', 1793816226727, 1793470626755),
('card-1793380642162-4-ai45d', 'deck-1793380643297', 'speak of the devil', 'parli del diavolo', NULL, 0, 4, 2, '2.65', 1793816228116, 1793470628142),
('card-1793380642162-5-8foiq', 'deck-1793380643297', 'call it a day', 'finirla qui', NULL, 0, 0, 0, '2.30', 1793470932731, 1793470632738),
('card-1793380642162-6-itolc', 'deck-1793380643297', 'cut someone\'s some slack', 'dare tregua a qualcuno', NULL, 0, 4, 2, '2.65', 1793816236531, 1793470636536),
('card-1793380642162-7-0cj1e', 'deck-1793380643297', 'cutting corners', 'approssimare', NULL, 0, 4, 2, '2.65', 1793816241832, 1793470641840),
('card-1793380642162-8-rauwi', 'deck-1793380643297', 'on the cuff', 'a braccio', NULL, 0, 4, 2, '2.65', 1793816243811, 1793470643814),
('card-1793380642162-9-bm98l', 'deck-1793380643297', 'we\'re halfway there', 'ci siamo quasi', NULL, 0, 0, 0, '2.15', 1793470948195, 1793470648205),
('card-1793394593697-0-oukod', 'deck-1793394596717', 'employee', 'impiegato', NULL, 0, 13, 3, '2.65', 1794593412559, 1793470212580),
('card-1793394593697-1-pc6ui', 'deck-1793394596717', 'so far', 'finora', NULL, 0, 1, 1, '2.00', 1793661721483, 1793575321509),
('card-1793394593697-10-6jjb0', 'deck-1793394596717', 'middle school', 'scuola media', NULL, 0, 39, 4, '2.80', 1796940669782, 1793571069787),
('card-1793394593697-11-kxkrf', 'deck-1793394596717', 'nevermind', 'non fa niente', NULL, 0, 1, 1, '1.95', 1793661725029, 1793575325036),
('card-1793394593697-12-jq5tv', 'deck-1793394596717', 'chop', 'tagliare/affettare/tritare', NULL, 0, 39, 4, '2.80', 1796940677749, 1793571077754),
('card-1793394593697-13-e8rmk', 'deck-1793394596717', 'to fix', 'aggiustare', NULL, 0, 34, 4, '2.65', 1796508678519, 1793571078524),
('card-1793394593697-14-uyzvs', 'deck-1793394596717', 'come out', 'uscire', NULL, 0, 34, 4, '2.65', 1796508681199, 1793571081228),
('card-1793394593697-15-4w4vl', 'deck-1793394596717', 'to portray', 'interpretare', NULL, 0, 39, 4, '2.80', 1796940682171, 1793571082192),
('card-1793394593697-16-y96i4', 'deck-1793394596717', 'set', 'ambientato', NULL, 0, 39, 4, '2.80', 1796940686582, 1793571086597),
('card-1793394593697-17-65m57', 'deck-1793394596717', 'science fiction', 'fantascienza', NULL, 0, 39, 4, '2.80', 1796940687518, 1793571087546),
('card-1793394593697-18-s71mk', 'deck-1793394596717', 'pace', 'ritmo', NULL, 0, 39, 4, '2.80', 1796940688700, 1793571088728),
('card-1793394593697-19-g73hw', 'deck-1793394596717', 'lately', 'ultimamente', NULL, 0, 21, 4, '2.35', 1795385493277, 1793571093308),
('card-1793394593697-2-voj2z', 'deck-1793394596717', 'marvellous', 'meraviglioso', NULL, 0, 34, 4, '2.65', 1796508694418, 1793571094438),
('card-1793394593697-20-elh68', 'deck-1793394596717', 'late', 'tardi', NULL, 0, 29, 4, '2.65', 1796076695814, 1793571095818),
('card-1793394593697-21-rhqbg', 'deck-1793394596717', 'later', 'più tardi', NULL, 0, 1, 1, '2.45', 1793661735011, 1793575335040),
('card-1793394593697-22-7g5cq', 'deck-1793394596717', 'at all', 'per niente/affatto', NULL, 0, 1, 1, '1.60', 1793661829368, 1793575429395),
('card-1793394593697-23-605fk', 'deck-1793394596717', 'right away', 'subito', NULL, 0, 1, 1, '2.15', 1793661755477, 1793575355509),
('card-1793394593697-24-mr4fl', 'deck-1793394596717', 'flaw', 'difetto', NULL, 0, 34, 4, '2.65', 1796508711361, 1793571111386),
('card-1793394593697-25-dsxzy', 'deck-1793394596717', 'heat', 'riscaldamento', NULL, 0, 34, 4, '2.65', 1796508712344, 1793571112369),
('card-1793394593697-26-dx0v6', 'deck-1793394596717', 'gut', 'budella/istinto', NULL, 0, 25, 4, '2.50', 1795731118125, 1793571118133),
('card-1793394593697-27-cn656', 'deck-1793394596717', 'sample', 'campione', NULL, 0, 34, 4, '2.65', 1796508719437, 1793571119457),
('card-1793394593697-28-umjfg', 'deck-1793394596717', 'whether', 'se', NULL, 0, 28, 5, '2.35', 1795990320577, 1793571120582),
('card-1793394593697-29-jy13a', 'deck-1793394596717', 'as well', 'anche', NULL, 0, 1, 1, '1.95', 1793661759448, 1793575359476),
('card-1793394593697-3-z8jnh', 'deck-1793394596717', 'here and there', 'di sfuggita', NULL, 0, 1, 1, '2.15', 1793661762119, 1793575362146),
('card-1793394593697-30-g1s3i', 'deck-1793394596717', 'wary', 'prudente', NULL, 0, 1, 1, '2.10', 1793661766177, 1793575366182),
('card-1793394593697-31-61577', 'deck-1793394596717', 'straw', 'paglia/cannuccia', NULL, 0, 34, 4, '2.65', 1796508736180, 1793571136185),
('card-1793394593697-32-terca', 'deck-1793394596717', 'mourn', 'lutto', NULL, 0, 34, 4, '2.65', 1796508737245, 1793571137271),
('card-1793394593697-33-q720o', 'deck-1793394596717', 'carving', 'intagliare', NULL, 0, 34, 4, '2.65', 1796508738642, 1793571138647),
('card-1793394593697-34-c45by', 'deck-1793394596717', 'to bake', 'cuocere al forno', NULL, 0, 39, 4, '2.80', 1796940739610, 1793571139635),
('card-1793394593697-35-jwnum', 'deck-1793394596717', 'plot', 'trama', NULL, 0, 29, 4, '2.65', 1796076740795, 1793571140817),
('card-1793394593697-36-awaks', 'deck-1793394596717', 'to highlight', 'evidenziare', NULL, 0, 20, 3, '2.80', 1795299141872, 1793571141891),
('card-1793394593697-37-35j7k', 'deck-1793394596717', 'to sue', 'denunciare', NULL, 0, 21, 4, '2.30', 1795385543977, 1793571143983),
('card-1793394593697-38-k3bdo', 'deck-1793394596717', 'to praise', 'lodare', NULL, 0, 1, 1, '2.15', 1793661770625, 1793575370649),
('card-1793394593697-39-d83q8', 'deck-1793394596717', 'praised', 'lodato', NULL, 0, 1, 1, '2.15', 1793661774032, 1793575374037),
('card-1793394593697-4-aa1bb', 'deck-1793394596717', 'mandatory', 'obbligatorio', NULL, 0, 34, 4, '2.65', 1796508752353, 1793571152375),
('card-1793394593697-40-hsddr', 'deck-1793394596717', 'backlash', 'polemica', NULL, 0, 25, 4, '2.50', 1795731154164, 1793571154185),
('card-1793394593697-41-n70o2', 'deck-1793394596717', 'to brag', 'vantarsi', NULL, 0, 1, 1, '2.15', 1793661778481, 1793575378489),
('card-1793394593697-42-uheti', 'deck-1793394596717', 'former', 'ex', NULL, 0, 25, 4, '2.50', 1795731159162, 1793571159181),
('card-1793394593697-43-t3kmp', 'deck-1793394596717', 'echo', 'eco', NULL, 0, 29, 4, '2.45', 1796076760021, 1793571160047),
('card-1793394593697-44-wlxhq', 'deck-1793394596717', 'to appoint', 'nominare', NULL, 0, 1, 1, '2.15', 1793661781259, 1793575381275),
('card-1793394593697-45-ddpis', 'deck-1793394596717', 'to cancel', 'annullare', NULL, 0, 34, 4, '2.65', 1796508765932, 1793571165943),
('card-1793394593697-46-c017s', 'deck-1793394596717', 'statement', 'dichiarazione', NULL, 0, 1, 1, '1.95', 1793661832097, 1793575432103),
('card-1793394593697-47-63fik', 'deck-1793394596717', 'blatant', 'palese', NULL, 0, 1, 1, '1.60', 1793661820202, 1793575420213),
('card-1793394593697-48-fyigq', 'deck-1793394596717', 'lawful', 'legale', NULL, 0, 25, 4, '2.50', 1795731177319, 1793571177325),
('card-1793394593697-49-2vqfy', 'deck-1793394596717', 'to file', 'archiviare', NULL, 0, 25, 4, '2.50', 1795731180146, 1793571180174),
('card-1793394593697-5-oy165', 'deck-1793394596717', 'to gather', 'cogliere', NULL, 0, 1, 1, '2.00', 1793661825127, 1793575425142),
('card-1793394593697-50-vw7xq', 'deck-1793394596717', 'filing', 'documento depositato', NULL, 0, 0, 0, '2.15', 1793571488323, 1793571188356),
('card-1793394593697-6-svt6d', 'deck-1793394596717', 'spill', 'versare', NULL, 0, 13, 4, '2.50', 1794694390337, 1793571190364),
('card-1793394593697-7-jtz6h', 'deck-1793394596717', 'disguise', 'travestimento/maschera', NULL, 0, 34, 4, '2.65', 1796508794392, 1793571194411),
('card-1793394593697-8-f235e', 'deck-1793394596717', 'gap', 'spazio vuoto', NULL, 0, 29, 4, '2.45', 1796076799765, 1793571199790),
('card-1793394593697-9-k0i4r', 'deck-1793394596717', 'gap year', 'anno sabatico', NULL, 0, 34, 4, '2.65', 1796508801788, 1793571201809);

DROP TABLE IF EXISTS `user_stats`;
CREATE TABLE `user_stats` (
  `user_id` int(11) NOT NULL,
  `streak_days` int(11) NOT NULL DEFAULT 1,
  `last_study_date` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_cards_studied` int(11) NOT NULL DEFAULT 0,
  `total_quizzes_completed` int(11) NOT NULL DEFAULT 0,
  `total_match_games_played` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_stats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for `user_stats` (1 rows)
INSERT INTO `user_stats` (`user_id`, `streak_days`, `last_study_date`, `total_cards_studied`, `total_quizzes_completed`, `total_match_games_played`) VALUES
(1, 4, '2026-11-02', 393, 9, 17);

SET FOREIGN_KEY_CHECKS=1;

-- Section « Jeux » (Pac-Man, Tetris) : un parent ouvre chaque jeu, enfant par enfant, avec
-- une condition éventuelle (quiz terminés, moyenne, série de jours : lib/games.js) et une
-- durée maximale de jeu par jour. Le temps de jeu est compté par le serveur.
-- Idempotente : rejouable sans effet.

-- Règle d'accès d'un enfant à un jeu. Sans ligne, le jeu est fermé.
CREATE TABLE IF NOT EXISTS game_access_rules (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_key VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- none, quizzes_today, quizzes_week, average_score_week, daily_streak
  condition_type VARCHAR(50) NOT NULL DEFAULT 'none',
  condition_value INTEGER NOT NULL DEFAULT 0 CHECK (condition_value >= 0),
  -- Minutes de jeu par jour pour ce jeu ; NULL = sans limite
  daily_limit_minutes INTEGER CHECK (daily_limit_minutes IS NULL OR daily_limit_minutes > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT game_access_rules_profile_game_key UNIQUE (profile_id, game_key)
);

-- Parties jouées. duration_seconds n'augmente qu'avec les signaux de vie du client
-- (écart borné par HEARTBEAT_MAX_GAP_SECONDS) : une partie abandonnée ne compte pas au-delà.
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_key VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0)
);

-- Temps joué aujourd'hui et meilleur score, par enfant et par jeu
CREATE INDEX IF NOT EXISTS idx_game_sessions_profile_game_started
  ON game_sessions(profile_id, game_key, started_at);

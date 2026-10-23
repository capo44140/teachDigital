-- ============================================================================
-- 0001 — Schéma de référence TeachDigital (baseline)
--
-- Regroupe tout ce qui créait le schéma jusqu'ici : frontend/scripts/*.sql,
-- frontend/scripts/migrate-*.js / migrate-*.cjs / init-db.js / fix-lessons-sequence.js,
-- le DDL exécuté au démarrage par server.js et backend/tests/schema.sql.
-- En cas de divergence, ce sont les requêtes du code de production qui font foi.
--
-- IDEMPOTENT : s'exécute sans erreur ni perte de données
--   - sur une base vide (création complète) ;
--   - sur la base de production existante (tables déjà créées au fil du temps) :
--     CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, élargissements gardés.
-- Aucune table / colonne existante n'est supprimée ni rétrécie.
-- Les noms de tables ne sont pas préfixés par « public. » : le schéma courant
-- (search_path) est utilisé, ce qui permet aussi de tester ce fichier dans un schéma isolé.
--
-- Exécuté dans une transaction par lib/migrate.js (ne pas ajouter BEGIN / COMMIT ici).
-- ============================================================================

-- --- Profils ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'child',
  is_admin BOOLEAN DEFAULT FALSE,
  is_child BOOLEAN DEFAULT FALSE,
  is_teen BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  color VARCHAR(50) DEFAULT 'purple',
  avatar_class TEXT,
  avatar_content TEXT,
  image_url TEXT,
  image_data TEXT,
  image_type VARCHAR(50),
  level VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colonnes ajoutées au fil du temps (migrate-images.js, migrate-profile-level.js, profils ados...)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'child';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_child BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_teen BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'purple';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_class TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_content TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS image_type VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- --- Codes PIN (hachés) -------------------------------------------------------
CREATE TABLE IF NOT EXISTS pin_codes (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  pin_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pin_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pin_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Index sur profile_id : fourni par la contrainte UNIQUE (profile_id) de 0101_pin_codes_unique_profile.sql
-- (l'ancien idx_pin_codes_profile_id créé par migrate-database.js reste en place s'il existe).

-- --- Code d'entrée familial (une seule ligne) ---------------------------------
CREATE TABLE IF NOT EXISTS family_gate (
  id INTEGER PRIMARY KEY DEFAULT 1,
  pin_hash TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE family_gate ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
COMMENT ON TABLE family_gate IS 'Code d''entrée familial unique (hash PIN) pour accéder à la sélection de profils';

-- --- Leçons / quiz ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  -- Enfant ciblé (NULL = quiz visible par tous les enfants)
  target_profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  level VARCHAR(50),
  image_filename VARCHAR(255),
  image_data TEXT,
  quiz_data JSONB NOT NULL,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS target_profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS level VARCHAR(50);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS image_filename VARCHAR(255);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_lessons_profile ON lessons(profile_id);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(is_published);
CREATE INDEX IF NOT EXISTS idx_lessons_profile_published ON lessons(profile_id, is_published);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_target_profile_id ON lessons(target_profile_id);

-- --- Pages de cours HTML publiées pour un enfant ------------------------------
CREATE TABLE IF NOT EXISTS course_pages (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  target_profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100),
  description TEXT,
  html_content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_pages_target_published ON course_pages(target_profile_id, is_published);

-- --- Résultats (quiz de leçon ou session de révision d'une page de cours) -----
CREATE TABLE IF NOT EXISTS quiz_results (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  course_page_id INTEGER REFERENCES course_pages(id) ON DELETE CASCADE,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  answers JSONB NOT NULL,
  -- Sauvegardes intermédiaires d'une page de cours : exclues des badges tant que la
  -- session n'est pas terminée (les résultats existants sont considérés comme terminés)
  is_completed BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS course_page_id INTEGER REFERENCES course_pages(id) ON DELETE CASCADE;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Les résultats de page de cours n'ont pas de leçon
ALTER TABLE quiz_results ALTER COLUMN lesson_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_results_lesson ON quiz_results(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_profile ON quiz_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_course_page ON quiz_results(course_page_id);
-- Résumé de progression, historique, séries de jours (tri par date pour un enfant)
CREATE INDEX IF NOT EXISTS idx_quiz_results_profile_completed ON quiz_results(profile_id, completed_at DESC);

-- --- Badges -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  condition_value INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  color VARCHAR(50) DEFAULT 'yellow',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE badges ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'yellow';
ALTER TABLE badges ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);

CREATE TABLE IF NOT EXISTS profile_badges (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_id, badge_id)
);

ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMP;
ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE profile_badges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Requis par l'UPSERT de lib/badgeService.js (ON CONFLICT (profile_id, badge_id)).
-- Même nom que la contrainte UNIQUE créée par migrate-badges.js : rien n'est créé si elle existe.
CREATE UNIQUE INDEX IF NOT EXISTS profile_badges_profile_id_badge_id_key ON profile_badges(profile_id, badge_id);
CREATE INDEX IF NOT EXISTS idx_profile_badges_profile ON profile_badges(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_badges_badge ON profile_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_profile_badges_unlocked ON profile_badges(is_unlocked);

-- --- Notifications ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_notifications_profile_created ON notifications(profile_id, created_at DESC);

-- --- Activités (devoirs / tâches) ---------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  child_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  type VARCHAR(50) NOT NULL DEFAULT 'task',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  difficulty_level VARCHAR(20) DEFAULT 'medium',
  estimated_duration INTEGER DEFAULT 30,
  target_age_group VARCHAR(20) DEFAULT '6-12',
  subject_area VARCHAR(100) DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bases créées avec l'ancienne version de la table (sans ces colonnes)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'task';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS child_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS difficulty_level VARCHAR(20) DEFAULT 'medium';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS estimated_duration INTEGER DEFAULT 30;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_age_group VARCHAR(20) DEFAULT '6-12';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS subject_area VARCHAR(100) DEFAULT 'general';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE activities ALTER COLUMN type SET DEFAULT 'task';
ALTER TABLE activities ALTER COLUMN description SET DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_activities_child ON activities(child_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_due_date ON activities(due_date);

-- --- Vidéos YouTube -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS youtube_videos (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  video_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  age_group VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (video_id)
);

ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS age_group VARCHAR(50);
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE youtube_videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS youtube_videos_video_id_key ON youtube_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_category ON youtube_videos(category);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_age_group ON youtube_videos(age_group);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_is_active ON youtube_videos(is_active);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_created_at ON youtube_videos(created_at);

-- --- Journal d'audit ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  user_id INTEGER, -- NULL pour les logs système / pré-authentification
  category VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- migrate-audit-logs-allow-null-user-id.sql
ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_category ON audit_logs(user_id, category);

-- --- Réglages IA enregistrés depuis l'interface (clés API chiffrées, modèles...) -
CREATE TABLE IF NOT EXISTS ai_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --- Élargissements (jamais de rétrécissement) --------------------------------
-- Anciennes tables : pin_code trop court pour un hash (migrate-database.js),
-- video_id / age_group plus courts que ce qu'accepte l'API (lib/schemas.js : 64 / 50).
DO $$
DECLARE
  target RECORD;
  current_length INTEGER;
BEGIN
  FOR target IN
    SELECT * FROM (VALUES
      ('pin_codes', 'pin_code', 255),
      ('youtube_videos', 'video_id', 64),
      ('youtube_videos', 'age_group', 50)
    ) AS t(table_name, column_name, wanted_length)
  LOOP
    SELECT c.character_maximum_length INTO current_length
    FROM information_schema.columns c
    WHERE c.table_schema = current_schema()
      AND c.table_name = target.table_name
      AND c.column_name = target.column_name
      AND c.data_type = 'character varying';

    IF current_length IS NOT NULL AND current_length < target.wanted_length THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE VARCHAR(%s)',
        target.table_name, target.column_name, target.wanted_length);
    END IF;
  END LOOP;
END $$;

-- --- Séquences des clés primaires ---------------------------------------------
-- Remplace frontend/scripts/fix-lessons-sequence.js et la resynchronisation de migrate-lessons.js :
-- après un import de données avec des id explicites, la séquence peut être en retard sur
-- MAX(id) (erreur « duplicate key value violates unique constraint ..._pkey »).
-- La séquence n'est jamais reculée : elle est seulement avancée jusqu'à MAX(id) si besoin.
DO $$
DECLARE
  table_name TEXT;
  sequence_name TEXT;
  max_id BIGINT;
  last_value BIGINT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'pin_codes', 'lessons', 'course_pages', 'quiz_results', 'badges',
    'profile_badges', 'notifications', 'activities', 'youtube_videos', 'audit_logs'
  ]
  LOOP
    sequence_name := pg_get_serial_sequence(quote_ident(table_name), 'id');
    CONTINUE WHEN sequence_name IS NULL;

    EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', table_name) INTO max_id;
    EXECUTE format('SELECT last_value FROM %s', sequence_name) INTO last_value;

    IF max_id > 0 AND max_id >= last_value THEN
      PERFORM setval(sequence_name, max_id, true);
    END IF;
  END LOOP;
END $$;

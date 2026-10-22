-- Schéma minimal et idempotent pour les tests d'intégration backend.
-- Utilisé par tests/init-test-db.js avec TEST_DATABASE_URL (jamais la base de prod).
-- Les colonnes reprennent celles utilisées par les contrôleurs et les helpers de test.

DROP TABLE IF EXISTS profile_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS quiz_results CASCADE;
DROP TABLE IF EXISTS course_pages CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS youtube_videos CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS family_gate CASCADE;
DROP TABLE IF EXISTS pin_codes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
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

CREATE TABLE pin_codes (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  pin_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE family_gate (
  id INTEGER PRIMARY KEY DEFAULT 1,
  pin_hash TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE course_pages (
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

CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
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

CREATE TABLE quiz_results (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  course_page_id INTEGER REFERENCES course_pages(id) ON DELETE CASCADE,
  profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  answers JSONB NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE badges (
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

CREATE TABLE profile_badges (
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

CREATE TABLE notifications (
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

CREATE TABLE activities (
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

CREATE TABLE youtube_videos (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  video_id VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  age_group VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  user_id INTEGER,
  category VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

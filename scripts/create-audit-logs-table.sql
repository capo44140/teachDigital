-- Script SQL pour créer la table audit_logs
-- Usage: Exécuter ce script directement dans votre base de données PostgreSQL

-- Créer la table audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  user_id INTEGER, -- NULL pour les logs système
  category VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_category ON audit_logs(user_id, category);

-- Vérifier que la table a été créée
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;


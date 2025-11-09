-- Script SQL pour modifier la colonne user_id dans audit_logs pour permettre NULL
-- Cela permet d'enregistrer des logs système sans user_id

-- Modifier la colonne user_id pour permettre NULL
ALTER TABLE audit_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- Vérifier la modification
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs' 
  AND column_name = 'user_id';


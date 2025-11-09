-- Script pour ajouter les index optimisés pour les requêtes de leçons
-- À exécuter directement sur la base de données PostgreSQL

-- Index composite pour optimiser les requêtes avec profile_id ET is_published
CREATE INDEX IF NOT EXISTS idx_lessons_profile_published ON lessons(profile_id, is_published);

-- Index pour optimiser le tri par created_at DESC
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);

-- Vérifier les index créés
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'lessons' 
ORDER BY indexname;


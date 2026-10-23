-- Badges « temps d'apprentissage » (condition_type = 'learning_time') : le temps passé
-- n'est pas enregistré par l'application, ces badges ne peuvent jamais être débloqués.
-- Ils sont masqués (is_active = false) au lieu d'être affichés aux enfants comme
-- atteignables. Les badges déjà débloqués (profile_badges) sont conservés.
-- Idempotent : rejouable sans effet.
UPDATE badges
SET is_active = false
WHERE condition_type = 'learning_time' AND is_active = true;

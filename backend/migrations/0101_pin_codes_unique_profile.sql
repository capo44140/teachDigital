-- Un seul code PIN par profil (le changement de PIN fait un INSERT ... ON CONFLICT).
-- 1. Dédoublonnage : on garde, par profil, la ligne utilisée par la connexion
--    (created_at le plus récent, puis id le plus grand).
-- 2. Contrainte UNIQUE (profile_id), sauf si un index unique équivalent existe déjà.
-- Idempotente : rejouable sans effet.

DELETE FROM pin_codes
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY profile_id
        ORDER BY created_at DESC NULLS LAST, id DESC
      ) AS rank
    FROM pin_codes
    WHERE profile_id IS NOT NULL
  ) ranked
  WHERE ranked.rank > 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
    WHERE i.indrelid = 'pin_codes'::regclass
      AND i.indisunique
      AND i.indnkeyatts = 1
      AND i.indpred IS NULL
      AND a.attname = 'profile_id'
  ) THEN
    ALTER TABLE pin_codes ADD CONSTRAINT pin_codes_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

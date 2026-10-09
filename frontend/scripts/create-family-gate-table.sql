-- Table pour le code d'entrée familial (Option B - code dédié)
-- Une seule ligne : id=1, pin_hash, updated_at

CREATE TABLE IF NOT EXISTS family_gate (
  id INTEGER PRIMARY KEY DEFAULT 1,
  pin_hash TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);
cd backend
-- Commentaire pour documentation
COMMENT ON TABLE family_gate IS 'Code d''entrée familial unique (hash PIN) pour accéder à la sélection de profils';

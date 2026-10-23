-- Révocation des jetons JWT (lib/auth.js) : chaque jeton porte la version courante.
-- - profiles.token_version : incrémentée au changement de PIN, de type ou à la désactivation ;
-- - family_gate.token_version : incrémentée au changement du code d'entrée familial.
-- Les jetons émis avant cette migration (sans claim) valent la version 0 : les sessions
-- existantes restent valides.
-- Idempotente : rejouable sans effet.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE family_gate ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

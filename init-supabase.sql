-- Initialisation Supabase (stack optionnelle docker-compose.yml)
-- Ce script doit être exécuté avec psql dans la base PostgreSQL, en passant le mot de
-- passe du rôle `authenticator` (le même que AUTHENTICATOR_PASSWORD du compose) :
--
--   psql -h localhost -U postgres -d postgres \
--        -v authenticator_password="$AUTHENTICATOR_PASSWORD" -f init-supabase.sql
--
-- Aucun mot de passe ne doit être écrit en dur dans ce fichier.

\set ON_ERROR_STOP on

\if :{?authenticator_password}
\else
  \echo 'ERREUR : passez -v authenticator_password=... (cf. en-tete du fichier)'
  \quit
\endif

-- Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Créer les rôles Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN;
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
  END IF;
END
$$;

-- Mot de passe du rôle authenticator (variable psql, hors bloc DO pour être interpolée)
ALTER ROLE authenticator WITH PASSWORD :'authenticator_password';

-- Donner les permissions de base
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;

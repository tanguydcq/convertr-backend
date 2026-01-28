-- 00_init_roles.sql

-- Create Roles (Idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin WITH  INHERIT CREATEROLE; -- Owner role
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_client') THEN
    CREATE ROLE app_client WITH NOINHERIT LOGIN PASSWORD 'public_password_placeholder'; -- Public API role
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_internal') THEN
    CREATE ROLE app_internal WITH NOINHERIT LOGIN PASSWORD 'internal_password_placeholder'; -- Worker role
  END IF;
END
$$;
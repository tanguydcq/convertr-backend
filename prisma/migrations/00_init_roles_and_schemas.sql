-- 00_init_roles_and_schemas.sql

-- 1. Create Schemas
CREATE SCHEMA IF NOT EXISTS auth;

CREATE SCHEMA IF NOT EXISTS crm;

CREATE SCHEMA IF NOT EXISTS ads;

CREATE SCHEMA IF NOT EXISTS secrets;

CREATE SCHEMA IF NOT EXISTS internal;

CREATE SCHEMA IF NOT EXISTS analytics;

-- 2. Create Roles (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin WITH  INHERIT CREATEROLE; -- Owner role, can manage others
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_client') THEN
    CREATE ROLE app_client WITH NOINHERIT LOGIN PASSWORD 'public_password_placeholder'; -- Public API role
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_internal') THEN
    CREATE ROLE app_internal WITH NOINHERIT LOGIN PASSWORD 'internal_password_placeholder'; -- Worker/Internal service role
  END IF;
END
$$;

-- 3. Grant Usage on Schemas
-- app_client: Needs access to public-facing schemas but NOT secrets or internal
GRANT USAGE ON SCHEMA auth,
crm,
ads,
analytics TO app_client;

-- app_internal: Needs access to EVERYTHING
GRANT USAGE ON SCHEMA auth,
crm,
ads,
secrets,
internal,
analytics TO app_internal;

-- 4. Grant Table Permissions (Future tables)
-- app_client can read/write data in allowed schemas. 
-- Note: RLS will further restrict access in 'crm'.
ALTER DEFAULT PRIVILEGES IN SCHEMA auth,
crm,
ads,
analytics
GRANT
SELECT, INSERT,
UPDATE, DELETE ON TABLES TO app_client;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth,
crm,
ads,
analytics
GRANT USAGE,
SELECT ON SEQUENCES TO app_client;

-- app_internal has full access
ALTER DEFAULT PRIVILEGES IN SCHEMA auth,
crm,
ads,
secrets,
internal,
analytics
GRANT ALL ON TABLES TO app_internal;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth,
crm,
ads,
secrets,
internal,
analytics
GRANT ALL ON SEQUENCES TO app_internal;

-- 5. Revoke dangerous defaults
REVOKE ALL ON SCHEMA public
FROM PUBLIC;

REVOKE ALL ON SCHEMA secrets
FROM app_client;

-- Explicit deny
REVOKE ALL ON SCHEMA internal
FROM app_client;

-- Explicit deny
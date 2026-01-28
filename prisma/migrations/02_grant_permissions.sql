-- 02_grant_permissions.sql

-- 1. Grant Usage on Schemas (Now they exist, created by Prisma)
-- app_client: Public access
GRANT USAGE ON SCHEMA auth, crm, ads, analytics TO app_client;
-- app_internal: Full access
GRANT USAGE ON SCHEMA auth,
crm,
ads,
secrets,
internal,
analytics TO app_internal;

-- 2. Grant Table Permissions
-- app_client
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

-- app_internal
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

-- 3. Revoke dangerous defaults
REVOKE ALL ON SCHEMA public FROM PUBLIC;

REVOKE ALL ON SCHEMA secrets FROM app_client;

REVOKE ALL ON SCHEMA internal FROM app_client;
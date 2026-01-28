-- cleanup.sql
-- Drop application schemas
DROP SCHEMA IF EXISTS auth CASCADE;

DROP SCHEMA IF EXISTS crm CASCADE;

DROP SCHEMA IF EXISTS ads CASCADE;

DROP SCHEMA IF EXISTS secrets CASCADE;

DROP SCHEMA IF EXISTS internal CASCADE;

DROP SCHEMA IF EXISTS analytics CASCADE;

-- Drop public schema and recreate it to remove any default migration history or leftovers
-- Drop public schema
DROP SCHEMA IF EXISTS public CASCADE;
-- check_and_drop_public.sql
DO $$
BEGIN
    -- Check if _prisma_migrations exists in public
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
    ) THEN
        RAISE NOTICE 'WARNING: _prisma_migrations found in public schema. MIGRATION HISTORY MIGHT BE LOST.';
    ELSE
        RAISE NOTICE 'No migration history in public. Safe to drop.';
    END IF;

    -- Drop schema
    DROP SCHEMA IF EXISTS public CASCADE;
    RAISE NOTICE 'Schema public dropped.';
END $$;
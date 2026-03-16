-- ============================================================
-- Migration 025: Drop CHECK constraints on cargo_ministerial and status
-- Allows dynamic cargo/status values managed via configuracoes table
-- Date: 2026-03-15
-- ============================================================

-- Find and drop the CHECK constraint on cargo_ministerial
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'missionarios'
    AND con.contype = 'c'
    AND att.attname = 'cargo_ministerial'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE missionarios DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint % on cargo_ministerial', constraint_name;
  ELSE
    RAISE NOTICE 'No CHECK constraint found on cargo_ministerial';
  END IF;
END $$;

-- Find and drop the CHECK constraint on status
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'missionarios'
    AND con.contype = 'c'
    AND att.attname = 'status'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE missionarios DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint % on status', constraint_name;
  ELSE
    RAISE NOTICE 'No CHECK constraint found on status';
  END IF;
END $$;

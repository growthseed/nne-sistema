-- =============================================
-- Migration 023: Fix RLS for cadastro_respostas — allow anon INSERT
-- Fixes: "new row violates row-level security policy for table cadastro_respostas"
-- The public survey form runs as anon (no login), so it needs INSERT permission.
-- Date: 2026-03-15
-- =============================================

-- 1. DROP all existing anon policies to avoid conflicts
DROP POLICY IF EXISTS "cadastro_insert_anon" ON cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_update_anon" ON cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_select_anon" ON cadastro_respostas;

-- 2. Allow anon INSERT (public form creates new responses)
CREATE POLICY "cadastro_insert_anon" ON cadastro_respostas
  FOR INSERT TO anon
  WITH CHECK (true);

-- 3. Allow anon UPDATE on incomplete records (auto-save drafts)
CREATE POLICY "cadastro_update_anon" ON cadastro_respostas
  FOR UPDATE TO anon
  USING (completo = false);

-- 4. Allow anon SELECT on incomplete records (resume draft)
CREATE POLICY "cadastro_select_anon" ON cadastro_respostas
  FOR SELECT TO anon
  USING (completo = false);

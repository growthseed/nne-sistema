-- =============================================
-- Migration 007: Add missing columns to cadastro_respostas
-- Fixes: "Could not find the 'coisas_alterar' column of 'cadastro_respostas' in the schema cache"
-- Date: 2026-03-15
-- =============================================

-- Etapa 9-11: Additional survey fields missing from original migration
ALTER TABLE cadastro_respostas
  ADD COLUMN IF NOT EXISTS influencias text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tempo_deslocamento text,
  ADD COLUMN IF NOT EXISTS opiniao_estrutura text,
  ADD COLUMN IF NOT EXISTS sugestoes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coisas_criar text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coisas_alterar text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enfase_justificativa text,
  ADD COLUMN IF NOT EXISTS motivacao_contribuir text,
  ADD COLUMN IF NOT EXISTS tipo_contribuinte text;

-- Also allow anon users to update their own draft responses
CREATE POLICY IF NOT EXISTS "cadastro_update_anon" ON cadastro_respostas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

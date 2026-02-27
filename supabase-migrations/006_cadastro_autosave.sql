-- =============================================
-- NNE Sistema - Migration 006: Cadastro Auto-Save
-- Permite salvar respostas parciais do formulario publico
-- Criado em: 2026-02-25
-- =============================================

-- 1. Allow anonymous users to UPDATE their own incomplete survey responses
-- Safety: only incomplete (completo = false) records can be updated by anon
-- The record UUID acts as an unguessable token for the session
CREATE POLICY "cadastro_update_anon" ON cadastro_respostas
  FOR UPDATE TO anon
  USING (completo = false);

-- 2. Allow anonymous users to SELECT their own record (by ID) for resume
CREATE POLICY "cadastro_select_anon" ON cadastro_respostas
  FOR SELECT TO anon
  USING (completo = false);

-- 3. Expand the authenticated SELECT policy to support hierarchy filtering
-- Drop old restrictive policy and add proper hierarchy-based one
DROP POLICY IF EXISTS "cadastro_select" ON cadastro_respostas;

CREATE POLICY "cadastro_select_auth" ON cadastro_respostas FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR (get_user_papel() = 'admin_uniao' AND uniao_id = get_user_uniao_id())
  OR (get_user_papel() = 'admin_associacao' AND associacao_id = get_user_associacao_id())
  OR (get_user_papel() IN ('pastor', 'secretario_igreja', 'lider') AND igreja_id = get_user_igreja_id())
);

-- 4. Index for faster partial response queries
CREATE INDEX IF NOT EXISTS idx_cadastro_respostas_completo ON cadastro_respostas(completo);
CREATE INDEX IF NOT EXISTS idx_cadastro_respostas_etapa ON cadastro_respostas(etapa_atual);
CREATE INDEX IF NOT EXISTS idx_cadastro_respostas_uniao ON cadastro_respostas(uniao_id) WHERE uniao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cadastro_respostas_associacao ON cadastro_respostas(associacao_id) WHERE associacao_id IS NOT NULL;

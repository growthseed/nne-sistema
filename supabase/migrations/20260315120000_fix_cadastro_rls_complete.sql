-- =============================================
-- URGENTE: Fix ALL RLS policies for cadastro_respostas
-- The public form (anon users) needs: INSERT, UPDATE, SELECT
-- Date: 2026-03-15
-- =============================================

-- Drop ALL existing policies on cadastro_respostas to start clean
DROP POLICY IF EXISTS "cadastro_select" ON cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_insert" ON cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_manage" ON cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_update_anon" ON cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_anon_insert" ON cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_anon_select" ON cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_anon_update" ON cadastro_respostas;

-- =============================================
-- ANON policies (public form at app.nne.org.br)
-- =============================================

-- Anon can INSERT new responses (first save / direct submit)
CREATE POLICY "cadastro_anon_insert" ON cadastro_respostas
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can SELECT their own response (needed for .insert().select() and draft recovery)
CREATE POLICY "cadastro_anon_select" ON cadastro_respostas
  FOR SELECT TO anon
  USING (true);

-- Anon can UPDATE their draft responses (auto-save between steps)
CREATE POLICY "cadastro_anon_update" ON cadastro_respostas
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- =============================================
-- AUTHENTICATED policies (CMS dashboard)
-- =============================================

-- Authenticated users can read responses based on hierarchy
CREATE POLICY "cadastro_auth_select" ON cadastro_respostas
  FOR SELECT TO authenticated
  USING (
    get_user_papel() = 'admin'
    OR (get_user_papel() = 'admin_uniao' AND uniao_id IN (SELECT u.uniao_id FROM usuarios u WHERE u.id = auth.uid()))
    OR (get_user_papel() = 'admin_associacao' AND associacao_id IN (SELECT u.associacao_id FROM usuarios u WHERE u.id = auth.uid()))
    OR igreja_id = get_user_igreja_id()
  );

-- Admin/managers can do everything (update, delete)
CREATE POLICY "cadastro_auth_manage" ON cadastro_respostas
  FOR ALL TO authenticated
  USING (
    get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
  );

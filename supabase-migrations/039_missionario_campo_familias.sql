-- ============================================================
-- Migration 039: Missionário em campo — pessoas, famílias e igrejas
--
-- Contexto: can_manage_scope_secure (20260612000001) já resolve o escopo do
-- missionário (igrejas_responsavel + missionario_igrejas ativas), mas as
-- policies base de pessoas/familias/igrejas nunca foram atualizadas para
-- usá-la — um missionário logado não enxergava membros nem famílias.
--
-- O que faz:
--   1. pessoas: SELECT + INSERT/UPDATE para missionário nas igrejas do seu
--      campo (cadastro complementar de familiares: esposa/filhos fora do censo).
--   2. pessoas.origem_cadastro: marca a origem do registro (auditoria e
--      transparência na contagem).
--   3. familias: SELECT + manage para missionário; corrige também a lacuna de
--      admin_uniao/admin_associacao não enxergarem famílias (policy antiga só
--      cobria admin e a própria igreja).
--   4. igrejas: SELECT para missionário nas igrejas do campo.
--   5. relatorios_missionarios: self-service pelo vínculo missionario_id
--      (a policy antiga usava um self-check inócuo via pessoas.id = auth.uid()).
-- ============================================================

-- 1/2. pessoas -------------------------------------------------------------
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS origem_cadastro text
  CHECK (origem_cadastro IN ('secretaria', 'censo', 'missionario', 'importacao'));

COMMENT ON COLUMN public.pessoas.origem_cadastro IS
  'Origem do registro: secretaria (CRUD interno), censo (formulário público), missionario (cadastro complementar em campo), importacao (scripts/legado).';

DROP POLICY IF EXISTS "pessoas_missionario_select" ON public.pessoas;
CREATE POLICY "pessoas_missionario_select" ON public.pessoas
  FOR SELECT TO authenticated
  USING (
    public.get_user_papel() = 'missionario'
    AND public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
  );

DROP POLICY IF EXISTS "pessoas_missionario_insert" ON public.pessoas;
CREATE POLICY "pessoas_missionario_insert" ON public.pessoas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_papel() = 'missionario'
    AND public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
  );

DROP POLICY IF EXISTS "pessoas_missionario_update" ON public.pessoas;
CREATE POLICY "pessoas_missionario_update" ON public.pessoas
  FOR UPDATE TO authenticated
  USING (
    public.get_user_papel() = 'missionario'
    AND public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
  )
  WITH CHECK (
    public.get_user_papel() = 'missionario'
    AND public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
  );
-- (sem DELETE: exclusão de pessoas continua restrita à secretaria/admin)

-- 3. familias ---------------------------------------------------------------
-- Corrige a lacuna hierárquica: a policy antiga só liberava admin e a própria
-- igreja; admin_uniao/admin_associacao ficavam de fora.
DROP POLICY IF EXISTS "familias_hierarquia_select" ON public.familias;
CREATE POLICY "familias_hierarquia_select" ON public.familias
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.igrejas ig
      WHERE ig.id = familias.igreja_id
        AND (
          (public.get_user_papel() = 'admin_uniao' AND ig.uniao_id = public.get_user_uniao_id())
          OR (public.get_user_papel() = 'admin_associacao' AND ig.associacao_id = public.get_user_associacao_id())
        )
    )
  );

DROP POLICY IF EXISTS "familias_missionario" ON public.familias;
CREATE POLICY "familias_missionario" ON public.familias
  FOR ALL TO authenticated
  USING (
    public.get_user_papel() = 'missionario'
    AND public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
  )
  WITH CHECK (
    public.get_user_papel() = 'missionario'
    AND public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
  );

-- 4. igrejas ----------------------------------------------------------------
DROP POLICY IF EXISTS "igrejas_missionario_select" ON public.igrejas;
CREATE POLICY "igrejas_missionario_select" ON public.igrejas
  FOR SELECT TO authenticated
  USING (
    public.get_user_papel() = 'missionario'
    AND public.can_manage_scope_secure(NULL, NULL, id, NULL)
  );

-- 5. relatorios_missionarios --------------------------------------------------
DROP POLICY IF EXISTS "relatorios_missionario_self" ON public.relatorios_missionarios;
CREATE POLICY "relatorios_missionario_self" ON public.relatorios_missionarios
  FOR ALL TO authenticated
  USING (
    missionario_id IN (SELECT m.id FROM public.missionarios m WHERE m.usuario_id = auth.uid())
  )
  WITH CHECK (
    missionario_id IN (SELECT m.id FROM public.missionarios m WHERE m.usuario_id = auth.uid())
  );

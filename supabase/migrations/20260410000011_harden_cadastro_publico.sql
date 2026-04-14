-- =============================================
-- Harden public cadastro flow
-- Public writes must go through an Edge Function using a draft token.
-- Direct anon access to cadastro_respostas is removed from RLS.
-- =============================================

ALTER TABLE public.cadastro_respostas
  ADD COLUMN IF NOT EXISTS draft_token uuid DEFAULT gen_random_uuid();

UPDATE public.cadastro_respostas
SET draft_token = gen_random_uuid()
WHERE draft_token IS NULL;

ALTER TABLE public.cadastro_respostas
  ALTER COLUMN draft_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cadastro_respostas_draft_token
  ON public.cadastro_respostas(draft_token);

ALTER TABLE public.cadastro_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cadastro_select" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_insert" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_manage" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_update_anon" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_anon_insert" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_anon_select" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_anon_update" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_select_anon" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_select_auth" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_auth_select" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_auth_manage" ON public.cadastro_respostas;
DROP POLICY IF EXISTS "cadastro_service_role_all" ON public.cadastro_respostas;

CREATE POLICY "cadastro_service_role_all"
ON public.cadastro_respostas
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "cadastro_auth_select_secure"
ON public.cadastro_respostas
FOR SELECT
TO authenticated
USING (
  public.can_manage_scope_secure(uniao_id, associacao_id, igreja_id, NULL)
);

CREATE POLICY "cadastro_auth_insert_secure"
ON public.cadastro_respostas
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_scope_secure(uniao_id, associacao_id, igreja_id, NULL)
);

CREATE POLICY "cadastro_auth_update_secure"
ON public.cadastro_respostas
FOR UPDATE
TO authenticated
USING (
  public.can_manage_scope_secure(uniao_id, associacao_id, igreja_id, NULL)
)
WITH CHECK (
  public.can_manage_scope_secure(uniao_id, associacao_id, igreja_id, NULL)
);

CREATE POLICY "cadastro_auth_delete_secure"
ON public.cadastro_respostas
FOR DELETE
TO authenticated
USING (
  public.can_manage_scope_secure(uniao_id, associacao_id, igreja_id, NULL)
);

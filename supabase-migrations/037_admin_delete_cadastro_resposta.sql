-- ============================================================
-- Migration 037: RPC admin_delete_cadastro_resposta
-- Permite admins apagarem respostas do censo, incluindo:
--   - respostas duplicadas
--   - respostas marcadas erradas (escolheram igreja/associação errada)
--   - respostas órfãs (fake/bot que abandonou antes de selecionar igreja)
--
-- A policy RLS atual (can_manage_scope_secure) bloqueia órfãs porque
-- exige uniao_id/associacao_id/igreja_id IS NOT NULL.
-- Esta RPC, SECURITY DEFINER, faz a checagem manualmente e libera:
--   - admin: qualquer resposta
--   - admin_uniao: respostas da sua união OU órfãs (uniao_id NULL)
--   - admin_associacao: respostas da sua associação OU órfãs
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_cadastro_resposta(
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_papel       text;
  v_caller_uniao_id    uuid;
  v_caller_assoc_id    uuid;
  v_row                public.cadastro_respostas%ROWTYPE;
  v_can                boolean := false;
BEGIN
  -- 1) Autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;

  -- 2) Papel + escopo do chamador
  SELECT papel, uniao_id, associacao_id
    INTO v_caller_papel, v_caller_uniao_id, v_caller_assoc_id
    FROM public.usuarios
   WHERE id = auth.uid() AND ativo = true;

  IF v_caller_papel IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado ou inativo'
      USING ERRCODE = '42501';
  END IF;

  IF v_caller_papel NOT IN ('admin', 'admin_uniao', 'admin_associacao') THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem excluir respostas'
      USING ERRCODE = '42501';
  END IF;

  -- 3) Existe?
  SELECT * INTO v_row FROM public.cadastro_respostas WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resposta não encontrada: %', p_id USING ERRCODE = 'P0002';
  END IF;

  -- 4) Autorização: admin master pode tudo. Admins de escopo podem dentro
  --    do escopo OU em respostas órfãs (que não tem escopo definido).
  IF v_caller_papel = 'admin' THEN
    v_can := true;
  ELSIF v_caller_papel = 'admin_uniao' THEN
    v_can := v_row.uniao_id IS NULL                          -- órfã
         OR v_row.uniao_id = v_caller_uniao_id;              -- dentro da minha união
  ELSIF v_caller_papel = 'admin_associacao' THEN
    v_can := v_row.associacao_id IS NULL                     -- órfã
         OR v_row.uniao_id IS NULL                            -- bot que não chegou nem na união
         OR v_row.associacao_id = v_caller_assoc_id;         -- dentro da minha associação
  END IF;

  IF NOT v_can THEN
    RAISE EXCEPTION 'Permissão negada: esta resposta está fora do seu escopo'
      USING ERRCODE = '42501';
  END IF;

  -- 5) Apaga
  DELETE FROM public.cadastro_respostas WHERE id = p_id;

  RETURN jsonb_build_object(
    'id',            p_id,
    'nome',          v_row.nome,
    'igreja_id',     v_row.igreja_id,
    'associacao_id', v_row.associacao_id,
    'uniao_id',      v_row.uniao_id,
    'deleted_at',    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_cadastro_resposta(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.admin_delete_cadastro_resposta(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_delete_cadastro_resposta IS
  'Exclui resposta do Censo. Admin master apaga qualquer uma; admin_uniao/admin_associacao apagam do seu escopo + órfãs (bots/abandonos antes de escolher igreja). SECURITY DEFINER para passar pela RLS rígida.';

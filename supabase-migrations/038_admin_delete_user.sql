-- ============================================================
-- Migration 038: RPC admin_delete_user
-- Permite admins removerem usuários do sistema (auth.users + identities + public.usuarios).
--
-- Regras:
--   - Só admins (master/uniao/associacao) executam
--   - Admin master apaga qualquer um (menos a si mesmo)
--   - Admin União apaga usuários da sua união, exceto outros admins/admin_uniao
--   - Admin Associação apaga usuários da sua associação, exceto admins/admin_uniao/admin_associacao
--   - Ninguém apaga a si mesmo (proteção contra lock-out)
--
-- SECURITY DEFINER para conseguir tocar em auth.*
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_papel    text;
  v_caller_uniao    uuid;
  v_caller_assoc    uuid;
  v_target_papel    text;
  v_target_uniao    uuid;
  v_target_assoc    uuid;
  v_target_email    text;
  v_target_nome     text;
  v_can             boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'ID do usuário obrigatório' USING ERRCODE = '22023';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir a si mesmo' USING ERRCODE = '42501';
  END IF;

  -- Quem está chamando
  SELECT papel, uniao_id, associacao_id
    INTO v_caller_papel, v_caller_uniao, v_caller_assoc
    FROM public.usuarios
   WHERE id = auth.uid() AND ativo = true;

  IF v_caller_papel IS NULL
     OR v_caller_papel NOT IN ('admin', 'admin_uniao', 'admin_associacao') THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem excluir usuários'
      USING ERRCODE = '42501';
  END IF;

  -- Alvo
  SELECT papel, uniao_id, associacao_id, email, nome
    INTO v_target_papel, v_target_uniao, v_target_assoc, v_target_email, v_target_nome
    FROM public.usuarios
   WHERE id = p_user_id;

  IF v_target_papel IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', p_user_id USING ERRCODE = 'P0002';
  END IF;

  -- Autorização hierárquica
  IF v_caller_papel = 'admin' THEN
    v_can := true;
  ELSIF v_caller_papel = 'admin_uniao' THEN
    v_can := v_target_uniao IS NOT NULL
         AND v_target_uniao = v_caller_uniao
         AND v_target_papel NOT IN ('admin', 'admin_uniao');
  ELSIF v_caller_papel = 'admin_associacao' THEN
    v_can := v_target_assoc IS NOT NULL
         AND v_target_assoc = v_caller_assoc
         AND v_target_papel NOT IN ('admin', 'admin_uniao', 'admin_associacao');
  END IF;

  IF NOT v_can THEN
    RAISE EXCEPTION 'Permissão negada: você não pode excluir este usuário (escopo ou hierarquia)'
      USING ERRCODE = '42501';
  END IF;

  -- Apaga em cascata: identities → auth.users → public.usuarios
  -- (public.usuarios geralmente tem FK ON DELETE CASCADE para auth.users)
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM public.usuarios WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'id',         p_user_id,
    'email',      v_target_email,
    'nome',       v_target_nome,
    'papel',      v_target_papel,
    'deleted_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_delete_user IS
  'Remove usuário do sistema (auth.users + identities + public.usuarios). Hierarquia: admin master apaga qualquer um; admin_uniao apaga usuários da sua união (não admins); admin_associacao apaga usuários da sua associação (não admins). Ninguém apaga a si mesmo.';

-- ============================================================
-- Migration 036: Add 'missionario' role
--
-- Adds 'missionario' as a new value for usuarios.papel.
-- Updates:
--   1. CHECK constraint on usuarios.papel
--   2. admin_create_user RPC validation list
-- ============================================================

-- 1. Drop old CHECK and recreate with 'missionario' included
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_papel_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_papel_check
  CHECK (papel IN (
    'admin', 'admin_uniao', 'admin_associacao',
    'diretor_es', 'professor_es', 'secretario_es',
    'tesoureiro', 'secretario_igreja',
    'missionario', 'membro'
  ));

-- 2. Update admin_create_user to accept 'missionario'
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email         text,
  p_password      text,
  p_nome          text,
  p_papel         text  DEFAULT 'membro',
  p_associacao_id uuid  DEFAULT NULL,
  p_uniao_id      uuid  DEFAULT NULL,
  p_igreja_id     uuid  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_papel text;
  v_user_id      uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000';
  END IF;

  SELECT papel INTO v_caller_papel
    FROM public.usuarios
   WHERE id = auth.uid() AND ativo = true;

  IF v_caller_papel IS NULL
     OR v_caller_papel NOT IN ('admin', 'admin_uniao', 'admin_associacao') THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem criar usuários'
      USING ERRCODE = '42501';
  END IF;

  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'Senha deve ter ao menos 6 caracteres' USING ERRCODE = '22023';
  END IF;
  IF p_nome IS NULL OR p_nome = '' THEN
    RAISE EXCEPTION 'Nome obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_papel NOT IN (
    'admin','admin_uniao','admin_associacao','secretario_igreja',
    'tesoureiro','diretor_es','professor_es','secretario_es',
    'missionario','membro'
  ) THEN
    RAISE EXCEPTION 'Papel inválido: %', p_papel USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Já existe um usuário com este email: %', p_email
      USING ERRCODE = '23505';
  END IF;

  IF v_caller_papel <> 'admin' AND p_papel IN ('admin', 'admin_uniao') THEN
    RAISE EXCEPTION 'Apenas admin master pode criar usuários admin/admin_uniao'
      USING ERRCODE = '42501';
  END IF;
  IF v_caller_papel = 'admin_associacao' AND p_papel = 'admin_associacao' THEN
    RAISE EXCEPTION 'admin_associacao não pode criar outro admin_associacao'
      USING ERRCODE = '42501';
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, aud, role,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, email_change,
    phone_change, phone_change_token, reauthentication_token,
    is_sso_user, is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome),
    'authenticated', 'authenticated',
    '', '', '', '', '', '', '', '',
    false, false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', p_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    v_user_id::text,
    now(), now(), now()
  );

  INSERT INTO public.usuarios (
    id, nome, email, papel,
    associacao_id, uniao_id, igreja_id,
    ativo, created_at, updated_at
  ) VALUES (
    v_user_id, p_nome, p_email, p_papel,
    p_associacao_id, p_uniao_id, p_igreja_id,
    true, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome          = EXCLUDED.nome,
    email         = EXCLUDED.email,
    papel         = EXCLUDED.papel,
    associacao_id = EXCLUDED.associacao_id,
    uniao_id      = EXCLUDED.uniao_id,
    igreja_id     = EXCLUDED.igreja_id,
    ativo         = true,
    updated_at    = now();

  RETURN jsonb_build_object(
    'id', v_user_id,
    'email', p_email,
    'nome', p_nome,
    'papel', p_papel
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user(text,text,text,text,uuid,uuid,uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.admin_create_user(text,text,text,text,uuid,uuid,uuid) TO authenticated;

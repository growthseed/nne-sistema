-- =============================================
-- Migration 018: Função para auto-criar perfil de usuário
-- Resolve o erro 406 quando auth user existe mas perfil não
-- =============================================

-- 1. Criar função RPC que pode ser chamada pelo usuário autenticado
-- Esta função roda com SECURITY DEFINER (bypass RLS)
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_nome text;
  v_profile json;
BEGIN
  -- Pegar o ID do usuário autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se já existe perfil
  SELECT row_to_json(u) INTO v_profile
  FROM usuarios u
  WHERE u.id = v_user_id;

  IF v_profile IS NOT NULL THEN
    RETURN v_profile;
  END IF;

  -- Buscar dados do auth
  SELECT email, COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1))
  INTO v_email, v_nome
  FROM auth.users
  WHERE id = v_user_id;

  -- Criar o perfil
  INSERT INTO usuarios (id, nome, email, papel, ativo, created_at, updated_at)
  VALUES (v_user_id, v_nome, v_email, 'admin', true, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    ativo = true,
    updated_at = now()
  RETURNING row_to_json(usuarios.*) INTO v_profile;

  RETURN v_profile;
END;
$$;

-- 2. Dar permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- 3. Criar trigger para auto-criar perfil quando novo usuário é criado no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, papel, ativo, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. INSERIR O PERFIL DO HEBER AGORA (para resolver imediatamente)
INSERT INTO public.usuarios (id, nome, email, papel, ativo, created_at, updated_at)
VALUES (
  'e705cf7b-e7d9-4d2f-a30b-917756bb6ee3',
  'Heber Silva Gomes',
  'hebersilvagomes@yahoo.com.br',
  'admin',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  papel = 'admin',
  ativo = true,
  nome = 'Heber Silva Gomes',
  updated_at = now();

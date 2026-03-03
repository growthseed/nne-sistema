-- =============================================
-- Migration 017: Criar usuário admin Heber Silva Gomes
-- Email: hebersilvagomes@yahoo.com.br
-- Papel: admin (Administrador Geral)
-- =============================================

-- PASSO 1: Criar o usuário na autenticação do Supabase (auth.users)
-- NOTA: Este comando deve ser executado via Supabase Dashboard > Authentication > Users > Add User
-- Ou via API com a service_role key.
-- Email: hebersilvagomes@yahoo.com.br
-- Senha: Mordomo2026

-- PASSO 2: Após o usuário ser criado no auth, inserir na tabela usuarios
-- O ID será obtido automaticamente via trigger ou deve ser o mesmo UUID do auth.users

-- Se o usuário já existir no auth, use este INSERT com o UUID correto:
-- (Substitua 'AUTH_USER_UUID' pelo UUID real gerado no Supabase Auth)

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verificar se já existe um usuário com este email no auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'hebersilvagomes@yahoo.com.br';

  IF v_user_id IS NULL THEN
    -- Criar usuário no auth.users (apenas funciona com permissão de superuser/service_role)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'hebersilvagomes@yahoo.com.br',
      crypt('Mordomo2026', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"nome": "Heber Silva Gomes"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      ''
    )
    RETURNING id INTO v_user_id;

    -- Criar identidade para o usuário
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'hebersilvagomes@yahoo.com.br'),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;

  -- Inserir ou atualizar na tabela de usuarios do sistema
  INSERT INTO usuarios (id, nome, email, papel, ativo, created_at, updated_at)
  VALUES (
    v_user_id,
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

  RAISE NOTICE 'Usuário admin criado com sucesso! ID: %', v_user_id;
END $$;

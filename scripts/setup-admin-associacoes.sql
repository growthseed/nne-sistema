-- ============================================================
-- Script: Criar/atualizar admins por associação
-- CAMISE: Thiago Benicio Santos (thiagobenicio61336@gmail.com)
-- ARAM: Adriano Fernando de Aguiar Cardoso (adrianocardoso2009@hotmail.com)
--
-- EXECUTAR NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/prqxiqykkijzpwdpqujv/sql/new
-- ============================================================

-- Passo 1: Criar usuários no auth.users (se não existirem)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'thiagobenicio61336@gmail.com',
    crypt('NNE2026!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Thiago Benicio Santos"}'::jsonb,
    'authenticated', 'authenticated'
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'adrianocardoso2009@hotmail.com',
    crypt('NNE2026!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Adriano Fernando de Aguiar Cardoso"}'::jsonb,
    'authenticated', 'authenticated'
  )
ON CONFLICT (email) DO NOTHING;

-- Passo 2: Criar identidades (necessário para login funcionar)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT id, id,
  json_build_object('sub', id::text, 'email', email)::jsonb,
  'email', id::text, now(), now(), now()
FROM auth.users
WHERE email IN ('thiagobenicio61336@gmail.com', 'adrianocardoso2009@hotmail.com')
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Passo 3: Criar/atualizar perfis na tabela usuarios com associação vinculada
-- CAMISE: associacao_id via sigla
-- ARAM: associacao_id via sigla
INSERT INTO usuarios (id, nome, email, papel, associacao_id, uniao_id, ativo, created_at, updated_at)
SELECT
  au.id,
  'Thiago Benicio Santos',
  'thiagobenicio61336@gmail.com',
  'admin_associacao',
  (SELECT id FROM associacoes WHERE sigla = 'CAMISE' LIMIT 1),
  (SELECT uniao_id FROM associacoes WHERE sigla = 'CAMISE' LIMIT 1),
  true,
  now(),
  now()
FROM auth.users au
WHERE au.email = 'thiagobenicio61336@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  papel = 'admin_associacao',
  associacao_id = (SELECT id FROM associacoes WHERE sigla = 'CAMISE' LIMIT 1),
  uniao_id = (SELECT uniao_id FROM associacoes WHERE sigla = 'CAMISE' LIMIT 1),
  updated_at = now();

INSERT INTO usuarios (id, nome, email, papel, associacao_id, uniao_id, ativo, created_at, updated_at)
SELECT
  au.id,
  'Adriano Fernando de Aguiar Cardoso',
  'adrianocardoso2009@hotmail.com',
  'admin_associacao',
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  (SELECT uniao_id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  true,
  now(),
  now()
FROM auth.users au
WHERE au.email = 'adrianocardoso2009@hotmail.com'
ON CONFLICT (id) DO UPDATE SET
  papel = 'admin_associacao',
  associacao_id = (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  uniao_id = (SELECT uniao_id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  updated_at = now();

-- Verificação: listar os admins criados
SELECT u.nome, u.email, u.papel, a.sigla as associacao, u.ativo
FROM usuarios u
LEFT JOIN associacoes a ON a.id = u.associacao_id
WHERE u.email IN ('thiagobenicio61336@gmail.com', 'adrianocardoso2009@hotmail.com');

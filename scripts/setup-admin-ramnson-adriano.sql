-- ============================================================
-- Script: Criar/atualizar admins por associação
-- ANOB: Ramnson Paula de Freitas (ranmson@gmail.com)
-- ARAM: Adriano Fernando de Aguiar Cardoso — garantir vinculo
--       (usuário pode já existir mas sem identity/perfil completo)
--
-- EXECUTAR NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/prqxiqykkijzpwdpqujv/sql/new
-- ============================================================

-- ------------------------------------------------------------
-- PASSO 1: Criar Ramnson (ANOB) no auth.users se não existir
-- ------------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
)
VALUES
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'ranmson@gmail.com',
    crypt('NNE2026!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nome":"Ramnson Paula de Freitas"}'::jsonb,
    'authenticated', 'authenticated'
  )
ON CONFLICT (email) DO NOTHING;

-- ------------------------------------------------------------
-- PASSO 2: Recriar Adriano (ARAM) caso não exista
-- (Adriano aparecia como inexistente no login)
-- ------------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
)
VALUES
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
ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('NNE2026!', gen_salt('bf')),
  email_confirmed_at = now(),
  raw_user_meta_data = '{"nome":"Adriano Fernando de Aguiar Cardoso"}'::jsonb,
  updated_at = now();

-- Mesma garantia para o Thiago (CAMISE) - reset de senha se preciso
UPDATE auth.users
   SET encrypted_password = crypt('NNE2026!', gen_salt('bf')),
       email_confirmed_at = COALESCE(email_confirmed_at, now()),
       updated_at = now()
 WHERE email = 'thiagobenicio61336@gmail.com';

-- ------------------------------------------------------------
-- PASSO 3: Garantir identities (essencial para login)
-- Remove e recria para Ramnson, Adriano e Thiago
-- ------------------------------------------------------------
DELETE FROM auth.identities
 WHERE user_id IN (
   SELECT id FROM auth.users
    WHERE email IN (
      'ranmson@gmail.com',
      'adrianocardoso2009@hotmail.com',
      'thiagobenicio61336@gmail.com'
    )
 );

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  u.id::text,
  now(), now(), now()
FROM auth.users u
WHERE u.email IN (
  'ranmson@gmail.com',
  'adrianocardoso2009@hotmail.com',
  'thiagobenicio61336@gmail.com'
);

-- ------------------------------------------------------------
-- PASSO 4: Criar/atualizar perfis em public.usuarios
-- ------------------------------------------------------------
-- Ramnson → ANOB
INSERT INTO usuarios (id, nome, email, papel, associacao_id, uniao_id, ativo, created_at, updated_at)
SELECT
  au.id,
  'Ramnson Paula de Freitas',
  'ranmson@gmail.com',
  'admin_associacao',
  (SELECT id FROM associacoes WHERE sigla = 'ANOB' LIMIT 1),
  (SELECT uniao_id FROM associacoes WHERE sigla = 'ANOB' LIMIT 1),
  true,
  now(),
  now()
FROM auth.users au
WHERE au.email = 'ranmson@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = 'admin_associacao',
  associacao_id = (SELECT id FROM associacoes WHERE sigla = 'ANOB' LIMIT 1),
  uniao_id = (SELECT uniao_id FROM associacoes WHERE sigla = 'ANOB' LIMIT 1),
  ativo = true,
  updated_at = now();

-- Adriano → ARAM
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
  nome = EXCLUDED.nome,
  papel = 'admin_associacao',
  associacao_id = (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  uniao_id = (SELECT uniao_id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  ativo = true,
  updated_at = now();

-- Thiago → CAMISE (garantia)
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
  ativo = true,
  updated_at = now();

-- ------------------------------------------------------------
-- VERIFICAÇÃO FINAL
-- ------------------------------------------------------------
SELECT u.nome, u.email, u.papel, a.sigla AS associacao, u.ativo
  FROM usuarios u
  LEFT JOIN associacoes a ON a.id = u.associacao_id
 WHERE u.email IN (
   'ranmson@gmail.com',
   'adrianocardoso2009@hotmail.com',
   'thiagobenicio61336@gmail.com'
 )
 ORDER BY a.sigla;

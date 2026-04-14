-- Step 0: Clear FK references
UPDATE classes_biblicas SET instrutor_id = NULL WHERE instrutor_id IN ('580e566b-34b7-47e6-a1c3-62a32d36ef81', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b');

-- Step 1: Delete old broken users completely
DELETE FROM auth.identities WHERE user_id IN ('580e566b-34b7-47e6-a1c3-62a32d36ef81', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b');
DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id IN ('580e566b-34b7-47e6-a1c3-62a32d36ef81', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b'));
DELETE FROM auth.sessions WHERE user_id IN ('580e566b-34b7-47e6-a1c3-62a32d36ef81', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b');
DELETE FROM auth.mfa_factors WHERE user_id IN ('580e566b-34b7-47e6-a1c3-62a32d36ef81', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b');
DELETE FROM usuarios WHERE id IN ('580e566b-34b7-47e6-a1c3-62a32d36ef81', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b');
DELETE FROM auth.users WHERE id IN ('580e566b-34b7-47e6-a1c3-62a32d36ef81', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b');

-- Step 2: Recreate users with all columns properly set (confirmed_at is generated)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role, is_sso_user, is_anonymous, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, email_change_confirm_status, phone, phone_change, phone_change_token, reauthentication_token)
VALUES
  ('580e566b-34b7-47e6-a1c3-62a32d36ef81', '00000000-0000-0000-0000-000000000000', 'thiagobenicio61336@gmail.com', crypt('NNE2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, 'authenticated', 'authenticated', false, false, '', '', '', '', '', 0, null, '', '', ''),
  ('b2ff9706-0a72-4eaa-8c56-da3077d0072b', '00000000-0000-0000-0000-000000000000', 'adrianocardoso2009@hotmail.com', crypt('NNE2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"email_verified":true}'::jsonb, 'authenticated', 'authenticated', false, false, '', '', '', '', '', 0, null, '', '', '');

-- Step 3: Create identities
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '580e566b-34b7-47e6-a1c3-62a32d36ef81', jsonb_build_object('sub', '580e566b-34b7-47e6-a1c3-62a32d36ef81', 'email', 'thiagobenicio61336@gmail.com', 'email_verified', false, 'phone_verified', false), 'email', '580e566b-34b7-47e6-a1c3-62a32d36ef81', now(), now(), now()),
  (gen_random_uuid(), 'b2ff9706-0a72-4eaa-8c56-da3077d0072b', jsonb_build_object('sub', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b', 'email', 'adrianocardoso2009@hotmail.com', 'email_verified', false, 'phone_verified', false), 'email', 'b2ff9706-0a72-4eaa-8c56-da3077d0072b', now(), now(), now());

-- Step 4: Usuarios profiles (trigger handles this but ensure correct values)
INSERT INTO usuarios (id, nome, email, papel, associacao_id, uniao_id, ativo, created_at, updated_at)
SELECT '580e566b-34b7-47e6-a1c3-62a32d36ef81', 'Thiago Benicio Santos', 'thiagobenicio61336@gmail.com', 'admin_associacao', (SELECT id FROM associacoes WHERE sigla = 'CAMISE' LIMIT 1), (SELECT uniao_id FROM associacoes WHERE sigla = 'CAMISE' LIMIT 1), true, now(), now()
ON CONFLICT (id) DO UPDATE SET papel = 'admin_associacao', associacao_id = EXCLUDED.associacao_id, uniao_id = EXCLUDED.uniao_id;

INSERT INTO usuarios (id, nome, email, papel, associacao_id, uniao_id, ativo, created_at, updated_at)
SELECT 'b2ff9706-0a72-4eaa-8c56-da3077d0072b', 'Adriano Fernando de Aguiar Cardoso', 'adrianocardoso2009@hotmail.com', 'admin_associacao', (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1), (SELECT uniao_id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1), true, now(), now()
ON CONFLICT (id) DO UPDATE SET papel = 'admin_associacao', associacao_id = EXCLUDED.associacao_id, uniao_id = EXCLUDED.uniao_id;

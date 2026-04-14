UPDATE auth.users SET
  raw_user_meta_data = jsonb_build_object('email_verified', true, 'nome', 'Thiago Benicio Santos'),
  confirmation_token = '',
  recovery_token = '',
  updated_at = now()
WHERE email = 'thiagobenicio61336@gmail.com';

UPDATE auth.users SET
  raw_user_meta_data = jsonb_build_object('email_verified', true, 'nome', 'Adriano Fernando de Aguiar Cardoso'),
  confirmation_token = '',
  recovery_token = '',
  updated_at = now()
WHERE email = 'adrianocardoso2009@hotmail.com';

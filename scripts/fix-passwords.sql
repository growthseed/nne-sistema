-- Template seguro para redefinir senha manualmente.
-- Nunca commite e-mails reais ou senhas reais neste arquivo.
--
-- Uso com psql:
--   \set target_email 'usuario@dominio.com'
--   \set new_password 'gere-uma-senha-forte-aqui'
--
-- Depois execute:
--   psql "$env:PGURI" -f scripts/fix-passwords.sql

DO $$
BEGIN
  IF current_setting('app.target_email', true) IS NULL THEN
    RAISE NOTICE 'Defina as variáveis target_email e new_password no cliente SQL antes de executar este template.';
  END IF;
END $$;

UPDATE auth.users
SET encrypted_password = crypt(:'new_password', gen_salt('bf')),
    updated_at = now()
WHERE email = :'target_email';

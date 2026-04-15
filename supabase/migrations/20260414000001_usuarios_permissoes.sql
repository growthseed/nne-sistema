-- =============================================================
-- Permissões granulares por usuário (override por rota/módulo)
-- NULL  = usa as permissões derivadas do papel (roles)
-- ARRAY = lista explícita de AccessRuleKeys habilitadas,
--         sempre unida com o que o papel já garante.
-- =============================================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS permissoes jsonb;

COMMENT ON COLUMN public.usuarios.permissoes IS
  'Override de permissões granulares. NULL = usa defaults do papel. Array de AccessRuleKey string para liberar acesso extra.';

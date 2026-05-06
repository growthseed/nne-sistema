-- =============================================
-- Public anonymous read for associacoes
-- =============================================
-- Necessário para que o formulário público (CadastroPublicoPage) consiga
-- listar associações no step 1. Hoje a tabela tem RLS habilitado e o role
-- `anon` está sendo bloqueado silenciosamente (count = 0 sem erro).
--
-- Dados de associações são públicos (nome/sigla/uniao_id) — não há razão
-- de bloquear leitura. Mantemos escrita restrita ao service_role e admins.
-- =============================================

ALTER TABLE public.associacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "associacoes_public_read" ON public.associacoes;
DROP POLICY IF EXISTS "associacoes_anon_select" ON public.associacoes;

CREATE POLICY "associacoes_public_read"
ON public.associacoes
FOR SELECT
TO anon, authenticated
USING (true);

-- Garantir que service_role mantém acesso total (idempotente)
DROP POLICY IF EXISTS "associacoes_service_role_all" ON public.associacoes;
CREATE POLICY "associacoes_service_role_all"
ON public.associacoes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

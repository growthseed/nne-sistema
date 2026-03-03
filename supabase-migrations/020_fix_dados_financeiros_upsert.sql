-- =============================================
-- Migration 020: Fix dados_financeiros para permitir UPSERT
-- Adiciona UNIQUE constraint em (igreja_id, mes, ano)
-- e policies de INSERT/UPDATE para admin
-- =============================================

-- 1. Remover duplicatas antes de criar a constraint
-- (mantém apenas o registro mais recente por igreja/mes/ano)
DELETE FROM public.dados_financeiros a
USING public.dados_financeiros b
WHERE a.id < b.id
  AND a.igreja_id = b.igreja_id
  AND a.mes = b.mes
  AND a.ano = b.ano;

-- 2. Adicionar UNIQUE constraint
ALTER TABLE public.dados_financeiros
  DROP CONSTRAINT IF EXISTS dados_financeiros_igreja_mes_ano_key;

ALTER TABLE public.dados_financeiros
  ADD CONSTRAINT dados_financeiros_igreja_mes_ano_key
  UNIQUE (igreja_id, mes, ano);

-- 3. Garantir que updated_at existe
ALTER TABLE public.dados_financeiros
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. RLS: permitir que admin autenticado possa INSERT e UPDATE
-- (se já existir policy, o DO NOTHING evita erro)

-- Verifica se RLS está habilitado
ALTER TABLE public.dados_financeiros ENABLE ROW LEVEL SECURITY;

-- Policy de SELECT para todos autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dados_financeiros' AND policyname = 'dados_financeiros_select_all'
  ) THEN
    CREATE POLICY dados_financeiros_select_all ON public.dados_financeiros
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Policy de INSERT para admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dados_financeiros' AND policyname = 'dados_financeiros_insert_admin'
  ) THEN
    CREATE POLICY dados_financeiros_insert_admin ON public.dados_financeiros
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('admin', 'admin_uniao', 'admin_associacao'))
      );
  END IF;
END $$;

-- Policy de UPDATE para admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dados_financeiros' AND policyname = 'dados_financeiros_update_admin'
  ) THEN
    CREATE POLICY dados_financeiros_update_admin ON public.dados_financeiros
      FOR UPDATE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel IN ('admin', 'admin_uniao', 'admin_associacao'))
      );
  END IF;
END $$;

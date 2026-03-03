-- ============================================================
-- Migration 007: Campo Territorial + Snapshots Historicos
-- Adiciona tabela de vinculo missionario-igreja (com funcao)
-- e tabela de snapshots mensais para evolucao historica
-- ============================================================

-- ============================================================
-- TABELA: missionario_igrejas (Campo Territorial)
-- Quais igrejas cada missionario atende e com qual funcao
-- Substitui o array igrejas_responsavel com dados mais ricos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.missionario_igrejas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  missionario_id UUID NOT NULL REFERENCES public.missionarios(id) ON DELETE CASCADE,
  igreja_id UUID NOT NULL REFERENCES public.igrejas(id) ON DELETE CASCADE,
  funcao TEXT NOT NULL DEFAULT 'Pastor',
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  principal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(missionario_id, igreja_id)
);

-- ============================================================
-- TABELA: missionario_snapshots (Historico Mensal)
-- Base para graficos de evolucao do campo do missionario
-- ============================================================
CREATE TABLE IF NOT EXISTS public.missionario_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  missionario_id UUID NOT NULL REFERENCES public.missionarios(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  total_membros INTEGER DEFAULT 0,
  total_batismos INTEGER DEFAULT 0,
  total_interessados INTEGER DEFAULT 0,
  total_dizimos DECIMAL(12,2) DEFAULT 0,
  total_ofertas DECIMAL(12,2) DEFAULT 0,
  total_primicias DECIMAL(12,2) DEFAULT 0,
  total_igrejas INTEGER DEFAULT 0,
  media_idade_membros DECIMAL(5,2),
  alunos_classe_biblica INTEGER DEFAULT 0,
  presenca_media DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(missionario_id, mes, ano)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_missionario_igrejas_missionario
  ON public.missionario_igrejas(missionario_id);
CREATE INDEX IF NOT EXISTS idx_missionario_igrejas_igreja
  ON public.missionario_igrejas(igreja_id);
CREATE INDEX IF NOT EXISTS idx_missionario_igrejas_ativo
  ON public.missionario_igrejas(missionario_id) WHERE data_fim IS NULL;
CREATE INDEX IF NOT EXISTS idx_missionario_snapshots_lookup
  ON public.missionario_snapshots(missionario_id, ano, mes);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.missionario_igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missionario_snapshots ENABLE ROW LEVEL SECURITY;

-- missionario_igrejas: leitura para autenticados
CREATE POLICY "missionario_igrejas_select"
  ON public.missionario_igrejas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "missionario_igrejas_insert"
  ON public.missionario_igrejas FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "missionario_igrejas_update"
  ON public.missionario_igrejas FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "missionario_igrejas_delete"
  ON public.missionario_igrejas FOR DELETE
  TO authenticated USING (true);

-- missionario_snapshots: leitura para autenticados
CREATE POLICY "missionario_snapshots_select"
  ON public.missionario_snapshots FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "missionario_snapshots_insert"
  ON public.missionario_snapshots FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "missionario_snapshots_update"
  ON public.missionario_snapshots FOR UPDATE
  TO authenticated USING (true);

-- ============================================================
-- POPULAR missionario_igrejas a partir de igrejas_responsavel
-- (migra dados existentes do array para a tabela de vinculo)
-- ============================================================
INSERT INTO public.missionario_igrejas (missionario_id, igreja_id, funcao, principal)
SELECT
  m.id AS missionario_id,
  unnest(m.igrejas_responsavel) AS igreja_id,
  'Pastor' AS funcao,
  FALSE AS principal
FROM public.missionarios m
WHERE m.igrejas_responsavel IS NOT NULL
  AND array_length(m.igrejas_responsavel, 1) > 0
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- Marcar a primeira igreja de cada missionario como principal
UPDATE public.missionario_igrejas mi
SET principal = TRUE
WHERE mi.id IN (
  SELECT DISTINCT ON (missionario_id) id
  FROM public.missionario_igrejas
  ORDER BY missionario_id, created_at ASC
);

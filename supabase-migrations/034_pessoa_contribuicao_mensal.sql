-- ============================================================
-- Migration 034: Contribuições financeiras por pessoa
-- - Tabela pessoa_contribuicao_mensal: 1 linha por recibo
-- - View pessoa_renda_estimada: agregação 12 meses + renda mensal estimada (dízimo × 10)
-- - Match nome→pessoa via fuzzy + igreja_id; valores_raw preservado em JSONB para re-parse
-- Date: 2026-04-06
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pessoa_contribuicao_mensal (
  id              bigserial PRIMARY KEY,
  pessoa_id       uuid REFERENCES public.pessoas(id) ON DELETE SET NULL,  -- nullable when fuzzy fails
  pessoa_nome_legado text NOT NULL,                                       -- raw name from recibo, for debug
  igreja_id       uuid REFERENCES public.igrejas(id) ON DELETE SET NULL,
  igreja_id_legado integer,                                                -- gs_id of igreja for traceability
  mes             integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano             integer NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  recibo_numero   text,                                                    -- e.g. "206.00318"
  data_recibo     date,                                                    -- DD/MM (year inferred from mes/ano)
  -- Financial breakdown (heuristic parsing of valores_raw)
  dizimo          numeric(12,2) DEFAULT 0,
  primicias       numeric(12,2) DEFAULT 0,
  ofertas         numeric(12,2) DEFAULT 0,
  outros          numeric(12,2) DEFAULT 0,
  total           numeric(12,2) DEFAULT 0,
  valores_raw     jsonb,                                                   -- preserve original ["250,00","75,00","325,00"] for re-parse
  -- Match metadata
  fonte           text DEFAULT 'legado_scraper',
  match_method    text,                                                    -- 'gs_id' | 'exact_normalized' | 'fuzzy' | 'none'
  match_confidence numeric(3,2),                                           -- 0.00 - 1.00
  observacao      text,
  importado_em    timestamptz DEFAULT now()
);

-- Indexes para os queries do dashboard de segmentação
CREATE INDEX IF NOT EXISTS idx_pcm_pessoa_periodo
  ON public.pessoa_contribuicao_mensal (pessoa_id, ano DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_pcm_igreja_periodo
  ON public.pessoa_contribuicao_mensal (igreja_id, ano DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_pcm_periodo
  ON public.pessoa_contribuicao_mensal (ano DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_pcm_unmatched
  ON public.pessoa_contribuicao_mensal (pessoa_nome_legado)
  WHERE pessoa_id IS NULL;

-- Idempotency: same recibo + nome can't be inserted twice
-- (we use this combo because recibo_numero is per-igreja, but nome avoids collisions
-- when the same recibo number exists in different periods)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pcm_unique_recibo
  ON public.pessoa_contribuicao_mensal (recibo_numero, pessoa_nome_legado, mes, ano)
  WHERE recibo_numero IS NOT NULL;

COMMENT ON TABLE public.pessoa_contribuicao_mensal IS
  'Contribuições financeiras nominais por pessoa, importadas do sistema legado (secretaria.org.br). '
  'Usada para estimativa de renda (dízimo × 10) e segmentação para eventos.';

COMMENT ON COLUMN public.pessoa_contribuicao_mensal.valores_raw IS
  'Array original dos valores do recibo, ex ["250,00","75,00","325,00"]. '
  'Preservado para re-processamento quando o parser do legado for melhorado.';

COMMENT ON COLUMN public.pessoa_contribuicao_mensal.match_method IS
  'gs_id = matched by pessoas.gs_id | exact_normalized = uppercase+sem-acentos | fuzzy = Levenshtein | none = unmatched';

-- ============================================================
-- VIEW: pessoa_renda_estimada
-- Aggregation over the last 12 months (rolling) — useful for segmentation queries.
-- Renda mensal = média dos dízimos dos meses ativos × 10 (assumindo dízimo = 10% da renda)
-- ============================================================
CREATE OR REPLACE VIEW public.pessoa_renda_estimada AS
WITH base AS (
  SELECT
    pessoa_id,
    dizimo,
    primicias,
    ofertas,
    total,
    (ano * 100 + mes) AS yyyymm
  FROM public.pessoa_contribuicao_mensal
  WHERE pessoa_id IS NOT NULL
    AND (ano * 100 + mes) >= (
      EXTRACT(YEAR FROM (now() - interval '12 months'))::int * 100
      + EXTRACT(MONTH FROM (now() - interval '12 months'))::int
    )
)
SELECT
  pessoa_id,
  COUNT(DISTINCT yyyymm) FILTER (WHERE dizimo > 0)            AS meses_com_dizimo_12m,
  SUM(dizimo)                                                  AS dizimo_12m_total,
  SUM(primicias)                                               AS primicias_12m_total,
  SUM(ofertas)                                                 AS ofertas_12m_total,
  SUM(total)                                                   AS contribuicao_12m_total,
  -- Renda mensal estimada: média dos dízimos nos meses ativos × 10
  CASE
    WHEN COUNT(DISTINCT yyyymm) FILTER (WHERE dizimo > 0) > 0
    THEN ROUND(
      (SUM(dizimo) / COUNT(DISTINCT yyyymm) FILTER (WHERE dizimo > 0))::numeric * 10,
      2
    )
    ELSE NULL
  END AS renda_mensal_estimada,
  MAX(yyyymm) AS ultimo_yyyymm
FROM base
GROUP BY pessoa_id;

COMMENT ON VIEW public.pessoa_renda_estimada IS
  'Agregado dos últimos 12 meses por pessoa: total dízimos, ofertas, e estimativa de renda mensal '
  '(média do dízimo × 10). Usado para segmentar membros para eventos por faixa de renda.';

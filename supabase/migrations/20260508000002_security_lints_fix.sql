-- =============================================
-- Correções dos Database Linter Errors do Supabase:
--   - 0010 SECURITY DEFINER VIEW (eb_resumos_aula, pessoa_renda_estimada)
--   - 0013 RLS DISABLED IN PUBLIC (pessoa_contribuicao_mensal)
--
-- Estratégia:
--   1. Recriar as views com `WITH (security_invoker = on)` (Postgres 15+)
--      para que respeitem o RLS do usuário que consulta, não o do criador.
--   2. Habilitar RLS em pessoa_contribuicao_mensal e adicionar policies por escopo
--      (admin master, admin União, admin associação, secretário/pastor da igreja),
--      mais service_role para ETL.
-- =============================================

-- ─── 1. eb_resumos_aula → security_invoker ────────────────────────────────
-- Mantém o SQL exato da view original (ver 20260325000001_escola_biblica_content).
DROP VIEW IF EXISTS public.eb_resumos_aula;

CREATE VIEW public.eb_resumos_aula
WITH (security_invoker = on) AS
SELECT
  a.classe_id,
  a.ponto_numero,
  a.ponto_titulo,
  a.data_aula,
  a.questionario_liberado,
  COUNT(DISTINCT p.id) FILTER (WHERE p.presente = true)  AS presentes,
  COUNT(DISTINCT p.id) FILTER (WHERE p.presente = false) AS ausentes,
  COUNT(DISTINCT r.id)                                   AS respostas_enviadas,
  COALESCE(AVG(r.percentual_acerto), 0)                  AS media_acerto
FROM public.classe_biblica_aulas a
LEFT JOIN public.classe_biblica_aula_presenca p ON p.aula_id   = a.id
LEFT JOIN public.classe_biblica_respostas      r ON r.classe_id = a.classe_id
                                                AND r.ponto_numero = a.ponto_numero
GROUP BY a.id, a.classe_id, a.ponto_numero, a.ponto_titulo, a.data_aula, a.questionario_liberado;

COMMENT ON VIEW public.eb_resumos_aula IS
  'Resumo agregado por aula (presença, respostas, média). security_invoker=on garante que o RLS do usuário corrente seja aplicado.';


-- ─── 2. pessoa_renda_estimada → security_invoker ──────────────────────────
-- Mantém o SQL exato da view original (ver 034_pessoa_contribuicao_mensal).
DROP VIEW IF EXISTS public.pessoa_renda_estimada;

CREATE VIEW public.pessoa_renda_estimada
WITH (security_invoker = on) AS
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
  COUNT(DISTINCT yyyymm) FILTER (WHERE dizimo > 0) AS meses_com_dizimo_12m,
  SUM(dizimo)                                       AS dizimo_12m_total,
  SUM(primicias)                                    AS primicias_12m_total,
  SUM(ofertas)                                      AS ofertas_12m_total,
  SUM(total)                                        AS contribuicao_12m_total,
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
  'Agregado dos últimos 12 meses por pessoa (dízimo, oferta, total, renda estimada). security_invoker=on para respeitar RLS do consultante.';


-- ─── 3. RLS em pessoa_contribuicao_mensal ────────────────────────────────
ALTER TABLE public.pessoa_contribuicao_mensal ENABLE ROW LEVEL SECURITY;

-- Policies idempotentes
DROP POLICY IF EXISTS "pcm_service_role_all"   ON public.pessoa_contribuicao_mensal;
DROP POLICY IF EXISTS "pcm_auth_select_secure" ON public.pessoa_contribuicao_mensal;
DROP POLICY IF EXISTS "pcm_auth_insert_secure" ON public.pessoa_contribuicao_mensal;
DROP POLICY IF EXISTS "pcm_auth_update_secure" ON public.pessoa_contribuicao_mensal;
DROP POLICY IF EXISTS "pcm_auth_delete_secure" ON public.pessoa_contribuicao_mensal;

-- Service role: ETL/scraper sempre passa
CREATE POLICY "pcm_service_role_all"
ON public.pessoa_contribuicao_mensal
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Usuários autenticados: só veem contribuições da sua hierarquia
-- (admin master vê tudo; admin_uniao vê todas as igrejas da sua união;
-- admin_associacao vê só as da sua associação; pastor/secretário só sua igreja).
-- A função can_manage_scope_secure já lida com cada caso.
CREATE POLICY "pcm_auth_select_secure"
ON public.pessoa_contribuicao_mensal
FOR SELECT
TO authenticated
USING (
  igreja_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.igrejas i
    WHERE i.id = pessoa_contribuicao_mensal.igreja_id
      AND public.can_manage_scope_secure(i.uniao_id, i.associacao_id, i.id, NULL)
  )
);

-- Insert/Update/Delete só para quem gerencia o escopo daquela igreja
CREATE POLICY "pcm_auth_insert_secure"
ON public.pessoa_contribuicao_mensal
FOR INSERT
TO authenticated
WITH CHECK (
  igreja_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.igrejas i
    WHERE i.id = pessoa_contribuicao_mensal.igreja_id
      AND public.can_manage_scope_secure(i.uniao_id, i.associacao_id, i.id, NULL)
  )
);

CREATE POLICY "pcm_auth_update_secure"
ON public.pessoa_contribuicao_mensal
FOR UPDATE
TO authenticated
USING (
  igreja_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.igrejas i
    WHERE i.id = pessoa_contribuicao_mensal.igreja_id
      AND public.can_manage_scope_secure(i.uniao_id, i.associacao_id, i.id, NULL)
  )
)
WITH CHECK (
  igreja_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.igrejas i
    WHERE i.id = pessoa_contribuicao_mensal.igreja_id
      AND public.can_manage_scope_secure(i.uniao_id, i.associacao_id, i.id, NULL)
  )
);

CREATE POLICY "pcm_auth_delete_secure"
ON public.pessoa_contribuicao_mensal
FOR DELETE
TO authenticated
USING (
  igreja_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.igrejas i
    WHERE i.id = pessoa_contribuicao_mensal.igreja_id
      AND public.can_manage_scope_secure(i.uniao_id, i.associacao_id, i.id, NULL)
  )
);

COMMENT ON TABLE public.pessoa_contribuicao_mensal IS
  'Contribuições financeiras nominais por pessoa, importadas do legado. RLS por escopo via igreja_id; service_role mantém ETL.';

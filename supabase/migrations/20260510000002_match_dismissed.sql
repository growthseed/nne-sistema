-- =============================================
-- Tabela de pares "dispensados" da reconciliação
-- Quando o admin diz "são pessoas diferentes", grava aqui para não reaparecer.
-- =============================================

CREATE TABLE IF NOT EXISTS public.pessoa_match_dismissed (
  canonical_id  uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  duplicate_id  uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  dismissed_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (canonical_id, duplicate_id)
);

ALTER TABLE public.pessoa_match_dismissed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_dismissed_service" ON public.pessoa_match_dismissed;
DROP POLICY IF EXISTS "match_dismissed_auth_all" ON public.pessoa_match_dismissed;

CREATE POLICY "match_dismissed_service"
ON public.pessoa_match_dismissed FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "match_dismissed_auth_all"
ON public.pessoa_match_dismissed FOR ALL TO authenticated
USING (
  public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao')
)
WITH CHECK (
  public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao')
);

-- Recriar a view filtrando os pares dispensados.
DROP VIEW IF EXISTS public.pessoa_match_candidates;

CREATE VIEW public.pessoa_match_candidates
WITH (security_invoker = on) AS
WITH censo AS (
  SELECT
    id, nome,
    LOWER(public.f_unaccent(TRIM(nome))) AS nome_norm,
    LOWER(TRIM(email)) AS email_norm,
    REGEXP_REPLACE(COALESCE(telefone, ''), '\D', '', 'g') AS tel_digits,
    data_nascimento, igreja_id, associacao_id, uniao_id, cadastro_resposta_id
  FROM public.pessoas
  WHERE fonte = 'censo_2026' AND tipo = 'membro'
),
legado AS (
  SELECT
    id, nome,
    LOWER(public.f_unaccent(TRIM(nome))) AS nome_norm,
    LOWER(TRIM(email)) AS email_norm,
    REGEXP_REPLACE(COALESCE(telefone, ''), '\D', '', 'g') AS tel_digits,
    data_nascimento, igreja_id, associacao_id, uniao_id,
    data_batismo, foto
  FROM public.pessoas
  WHERE (fonte IS NULL OR fonte <> 'censo_2026') AND tipo = 'membro'
)
SELECT
  c.id   AS canonical_id, c.nome AS canonical_nome,
  c.email_norm AS canonical_email, c.tel_digits AS canonical_telefone,
  c.data_nascimento AS canonical_nascimento, c.igreja_id AS canonical_igreja_id,
  c.cadastro_resposta_id AS canonical_cadastro_id,
  l.id   AS duplicate_id, l.nome AS duplicate_nome,
  l.email_norm AS duplicate_email, l.tel_digits AS duplicate_telefone,
  l.data_nascimento AS duplicate_nascimento, l.igreja_id AS duplicate_igreja_id,
  l.data_batismo AS duplicate_data_batismo, l.foto AS duplicate_foto,
  GREATEST(
    CASE WHEN c.email_norm IS NOT NULL AND c.email_norm <> '' AND c.email_norm = l.email_norm THEN 100 ELSE 0 END,
    CASE WHEN c.tel_digits IS NOT NULL AND c.tel_digits <> '' AND c.tel_digits = l.tel_digits
              AND c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento THEN 95 ELSE 0 END,
    CASE WHEN c.nome_norm = l.nome_norm
              AND c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento THEN 90 ELSE 0 END,
    CASE WHEN c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento
              AND extensions.similarity(c.nome_norm, l.nome_norm) >= 0.65 THEN
      LEAST(85, 50 + ROUND(extensions.similarity(c.nome_norm, l.nome_norm) * 40)::int)
    ELSE 0 END,
    CASE WHEN c.nome_norm = l.nome_norm
              AND (c.data_nascimento IS NULL OR l.data_nascimento IS NULL OR c.data_nascimento <> l.data_nascimento)
         THEN 50 ELSE 0 END
  ) AS confidence,
  jsonb_build_object(
    'email_match',      c.email_norm IS NOT NULL AND c.email_norm = l.email_norm,
    'telefone_match',   c.tel_digits IS NOT NULL AND c.tel_digits <> '' AND c.tel_digits = l.tel_digits,
    'nome_exato',       c.nome_norm = l.nome_norm,
    'nome_similarity',  ROUND(extensions.similarity(c.nome_norm, l.nome_norm)::numeric, 3),
    'nascimento_match', c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento,
    'igreja_match',     c.igreja_id IS NOT NULL AND c.igreja_id = l.igreja_id
  ) AS sinais
FROM censo c
JOIN legado l ON
  (
    (c.email_norm IS NOT NULL AND c.email_norm <> '' AND c.email_norm = l.email_norm)
    OR (c.tel_digits IS NOT NULL AND c.tel_digits <> '' AND c.tel_digits = l.tel_digits AND c.data_nascimento = l.data_nascimento)
    OR (c.nome_norm = l.nome_norm)
    OR (c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento
        AND extensions.similarity(c.nome_norm, l.nome_norm) >= 0.65)
  )
WHERE c.id <> l.id
  AND NOT EXISTS (
    SELECT 1 FROM public.pessoa_match_dismissed d
    WHERE d.canonical_id = c.id AND d.duplicate_id = l.id
  );


-- RPC para auto-mesclar todos os candidatos com confidence >= threshold.
CREATE OR REPLACE FUNCTION public.auto_merge_high_confidence(p_threshold int DEFAULT 90, p_limit int DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_rec    RECORD;
  v_merged int := 0;
  v_failed int := 0;
  v_papel  text;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  v_papel := public.current_user_role_secure();
  IF v_papel NOT IN ('admin', 'admin_uniao', 'admin_associacao') THEN
    RAISE EXCEPTION 'Sem permissão para auto-merge.' USING ERRCODE = '42501';
  END IF;

  FOR v_rec IN
    SELECT DISTINCT ON (duplicate_id) canonical_id, duplicate_id, confidence
    FROM public.pessoa_match_candidates
    WHERE confidence >= p_threshold
    ORDER BY duplicate_id, confidence DESC
    LIMIT p_limit
  LOOP
    BEGIN
      PERFORM public.merge_pessoas(v_rec.canonical_id, v_rec.duplicate_id, 'auto_merge_threshold_' || p_threshold);
      v_merged := v_merged + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object(
        'canonical_id', v_rec.canonical_id,
        'duplicate_id', v_rec.duplicate_id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'merged', v_merged,
    'failed', v_failed,
    'threshold', p_threshold,
    'errors', v_errors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_merge_high_confidence(int, int) TO authenticated;

COMMENT ON FUNCTION public.auto_merge_high_confidence IS
  'Mescla automaticamente todos os pares com confidence >= threshold (default 90). Usa DISTINCT ON para garantir que cada duplicate seja merged 1x. Limite para batches manejáveis.';

-- =============================================
-- Reconciliação de duplicatas pessoa censo ↔ pessoa legado
--
-- Estratégia: o censo é a fonte canônica (preenchido pelo próprio membro).
-- Quando o trigger de sync não casou com nenhuma pessoa legado (matching strict
-- por email/telefone/nome+nascimento), criou-se uma pessoa NOVA com fonte=censo_2026.
-- Resultado: 3.487 pessoas ativas vs 2.750 do inventário → ~737 duplicatas.
--
-- Esta migration adiciona:
--   1. Extensões para fuzzy matching (pg_trgm, fuzzystrmatch).
--   2. View pessoa_match_candidates: pares (censo × legado) com score de confiança.
--   3. Tabela pessoa_merge_log: auditoria de cada merge.
--   4. Função merge_pessoas(canonical_id, duplicate_id): move FKs e deleta duplicata.
-- =============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm    WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- Wrapper IMMUTABLE de unaccent (necessário para índices funcionais).
-- Por default extensions.unaccent é STABLE porque depende do dicionário ativo;
-- ao fixar o dicionário 'unaccent', a operação se torna determinística.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$ SELECT extensions.unaccent('extensions.unaccent', $1) $$;

-- ─── 1. Tabela de auditoria de merges ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pessoa_merge_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id    uuid NOT NULL,
  duplicate_id    uuid NOT NULL,
  duplicate_snapshot jsonb NOT NULL,
  merged_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  merge_reason    text,
  fk_moves        jsonb NOT NULL DEFAULT '{}'::jsonb,
  fields_filled   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pessoa_merge_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merge_log_service_role_all" ON public.pessoa_merge_log;
DROP POLICY IF EXISTS "merge_log_auth_select"      ON public.pessoa_merge_log;

CREATE POLICY "merge_log_service_role_all"
ON public.pessoa_merge_log
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Admin master vê tudo; admin uniao/associação vê os relativos a pessoas no escopo.
CREATE POLICY "merge_log_auth_select"
ON public.pessoa_merge_log
FOR SELECT TO authenticated
USING (
  public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao')
);

COMMENT ON TABLE public.pessoa_merge_log IS
  'Histórico de merges entre pessoas (censo canônica ← legado duplicada). Permite auditoria e — em teoria — reversão manual via duplicate_snapshot.';


-- ─── 2. View pessoa_match_candidates ──────────────────────────────────────
-- Retorna pares (canonical_id = pessoa do censo, duplicate_id = pessoa legado)
-- candidatos a serem mesclados, com score de confiança 0..100.
DROP VIEW IF EXISTS public.pessoa_match_candidates;

CREATE VIEW public.pessoa_match_candidates
WITH (security_invoker = on) AS
WITH censo AS (
  SELECT
    id,
    nome,
    LOWER(extensions.unaccent(TRIM(nome))) AS nome_norm,
    LOWER(TRIM(email)) AS email_norm,
    REGEXP_REPLACE(COALESCE(telefone, ''), '\D', '', 'g') AS tel_digits,
    data_nascimento,
    igreja_id,
    associacao_id,
    uniao_id,
    cadastro_resposta_id
  FROM public.pessoas
  WHERE fonte = 'censo_2026'
    AND tipo = 'membro'
),
legado AS (
  SELECT
    id,
    nome,
    LOWER(extensions.unaccent(TRIM(nome))) AS nome_norm,
    LOWER(TRIM(email)) AS email_norm,
    REGEXP_REPLACE(COALESCE(telefone, ''), '\D', '', 'g') AS tel_digits,
    data_nascimento,
    igreja_id,
    associacao_id,
    uniao_id,
    data_batismo,
    foto
  FROM public.pessoas
  WHERE (fonte IS NULL OR fonte <> 'censo_2026')
    AND tipo = 'membro'
)
SELECT
  c.id                                 AS canonical_id,
  c.nome                               AS canonical_nome,
  c.email_norm                         AS canonical_email,
  c.tel_digits                         AS canonical_telefone,
  c.data_nascimento                    AS canonical_nascimento,
  c.igreja_id                          AS canonical_igreja_id,
  c.cadastro_resposta_id               AS canonical_cadastro_id,
  l.id                                 AS duplicate_id,
  l.nome                               AS duplicate_nome,
  l.email_norm                         AS duplicate_email,
  l.tel_digits                         AS duplicate_telefone,
  l.data_nascimento                    AS duplicate_nascimento,
  l.igreja_id                          AS duplicate_igreja_id,
  l.data_batismo                       AS duplicate_data_batismo,
  l.foto                               AS duplicate_foto,
  -- Score 0..100 ponderado por sinais
  GREATEST(
    -- Email exato: 100
    CASE WHEN c.email_norm IS NOT NULL AND c.email_norm <> '' AND c.email_norm = l.email_norm THEN 100 ELSE 0 END,
    -- Telefone exato + nascimento exato: 95
    CASE WHEN c.tel_digits IS NOT NULL AND c.tel_digits <> '' AND c.tel_digits = l.tel_digits
              AND c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento THEN 95 ELSE 0 END,
    -- Nome normalizado idêntico + nascimento exato: 90
    CASE WHEN c.nome_norm = l.nome_norm
              AND c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento THEN 90 ELSE 0 END,
    -- Nome similaridade alta + nascimento exato: 60..85 dependendo de similarity
    CASE WHEN c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento
              AND extensions.similarity(c.nome_norm, l.nome_norm) >= 0.65 THEN
      LEAST(85, 50 + ROUND(extensions.similarity(c.nome_norm, l.nome_norm) * 40)::int)
    ELSE 0 END,
    -- Nome idêntico mas nascimento diferente: 50 (atenção, pode ser homônimo)
    CASE WHEN c.nome_norm = l.nome_norm
              AND (c.data_nascimento IS NULL OR l.data_nascimento IS NULL OR c.data_nascimento <> l.data_nascimento)
         THEN 50 ELSE 0 END
  ) AS confidence,
  -- Sinais individuais para debug
  jsonb_build_object(
    'email_match',            c.email_norm IS NOT NULL AND c.email_norm = l.email_norm,
    'telefone_match',         c.tel_digits IS NOT NULL AND c.tel_digits <> '' AND c.tel_digits = l.tel_digits,
    'nome_exato',             c.nome_norm = l.nome_norm,
    'nome_similarity',        ROUND(extensions.similarity(c.nome_norm, l.nome_norm)::numeric, 3),
    'nascimento_match',       c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento,
    'igreja_match',           c.igreja_id IS NOT NULL AND c.igreja_id = l.igreja_id
  ) AS sinais
FROM censo c
JOIN legado l ON
  -- Pré-filtro para reduzir cross join (Postgres usa GIN índice de trgm)
  (
    (c.email_norm IS NOT NULL AND c.email_norm <> '' AND c.email_norm = l.email_norm)
    OR (c.tel_digits IS NOT NULL AND c.tel_digits <> '' AND c.tel_digits = l.tel_digits AND c.data_nascimento = l.data_nascimento)
    OR (c.nome_norm = l.nome_norm)
    OR (c.data_nascimento IS NOT NULL AND c.data_nascimento = l.data_nascimento
        AND extensions.similarity(c.nome_norm, l.nome_norm) >= 0.65)
  )
WHERE c.id <> l.id;

COMMENT ON VIEW public.pessoa_match_candidates IS
  'Pares (censo × legado) com score 0..100. Use confidence ≥ 90 para auto-merge seguro; 60..89 revisar manualmente.';

-- Índices para acelerar similarity (pg_trgm GIN)
CREATE INDEX IF NOT EXISTS idx_pessoas_nome_trgm
  ON public.pessoas USING gin (LOWER(public.f_unaccent(nome)) extensions.gin_trgm_ops);


-- ─── 3. Função merge_pessoas ──────────────────────────────────────────────
-- Move todas as FKs do duplicate_id para o canonical_id, preserva campos do
-- legado que estão NULL no canonical, registra log, e deleta a duplicata.
CREATE OR REPLACE FUNCTION public.merge_pessoas(
  p_canonical_id uuid,
  p_duplicate_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_canonical RECORD;
  v_duplicate RECORD;
  v_caller    uuid;
  v_papel     text;
  v_moves     jsonb := '{}'::jsonb;
  v_fields    jsonb := '{}'::jsonb;
  v_count     int;
BEGIN
  -- Permissões: só admin master ou admin_uniao/associacao com escopo.
  v_caller := auth.uid();
  v_papel  := public.current_user_role_secure();

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '28000';
  END IF;

  IF p_canonical_id = p_duplicate_id THEN
    RAISE EXCEPTION 'canonical_id e duplicate_id não podem ser iguais.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_canonical FROM public.pessoas WHERE id = p_canonical_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pessoa canonical não encontrada' USING ERRCODE = 'P0002'; END IF;

  SELECT * INTO v_duplicate FROM public.pessoas WHERE id = p_duplicate_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pessoa duplicate não encontrada' USING ERRCODE = 'P0002'; END IF;

  -- Verifica escopo (admin master sempre passa, demais precisam ter acesso a ambas)
  IF v_papel <> 'admin' THEN
    IF NOT public.can_manage_scope_secure(v_canonical.uniao_id, v_canonical.associacao_id, v_canonical.igreja_id, NULL)
       OR NOT public.can_manage_scope_secure(v_duplicate.uniao_id, v_duplicate.associacao_id, v_duplicate.igreja_id, NULL)
    THEN
      RAISE EXCEPTION 'Sem permissão para mesclar essas pessoas no seu escopo.' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- ─── Move FKs do duplicate para canonical ────────────────────────────
  -- Tabelas com pessoa_id "ownership" (registros pertencem à pessoa)
  UPDATE public.acompanhamento_novo_membro    SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('acompanhamento_novo_membro.pessoa_id', v_count);

  UPDATE public.acompanhamento_novo_membro    SET padrinho_id = p_canonical_id WHERE padrinho_id = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('acompanhamento_novo_membro.padrinho_id', v_count);

  UPDATE public.cadastro_respostas            SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('cadastro_respostas', v_count);

  UPDATE public.pessoa_contribuicao_mensal    SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('pessoa_contribuicao_mensal', v_count);

  UPDATE public.transferencias                SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('transferencias', v_count);

  UPDATE public.relatorios_missionarios       SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('relatorios_missionarios', v_count);

  UPDATE public.interacoes                    SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('interacoes', v_count);

  UPDATE public.notificacoes_aniversario      SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('notificacoes_aniversario', v_count);

  -- Classes (alunos): pode haver UNIQUE(pessoa_id, classe_id). Se canonical já
  -- está em alguma classe que duplicate também está, deletamos o duplicate
  -- (não dá para ter dois registros) — caso contrário, atualizamos.
  DELETE FROM public.classe_batismal_alunos cba
   WHERE cba.pessoa_id = p_duplicate_id
     AND EXISTS (SELECT 1 FROM public.classe_batismal_alunos x WHERE x.pessoa_id = p_canonical_id AND x.classe_id = cba.classe_id);
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('classe_batismal_alunos.deduped', v_count);

  UPDATE public.classe_batismal_alunos        SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('classe_batismal_alunos.moved', v_count);

  DELETE FROM public.classe_biblica_alunos cba
   WHERE cba.pessoa_id = p_duplicate_id
     AND EXISTS (SELECT 1 FROM public.classe_biblica_alunos x WHERE x.pessoa_id = p_canonical_id AND x.classe_id = cba.classe_id);
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('classe_biblica_alunos.deduped', v_count);

  UPDATE public.classe_biblica_alunos         SET pessoa_id   = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('classe_biblica_alunos.moved', v_count);

  UPDATE public.classe_batismal_presenca      SET instrutor_id = p_canonical_id WHERE instrutor_id = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('classe_batismal_presenca.instrutor', v_count);

  UPDATE public.classes_batismais             SET instrutor_id = p_canonical_id WHERE instrutor_id = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('classes_batismais.instrutor', v_count);

  UPDATE public.classes_es                    SET professor_id = p_canonical_id WHERE professor_id = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('classes_es.professor', v_count);

  UPDATE public.classes_es                    SET auxiliar_id  = p_canonical_id WHERE auxiliar_id  = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('classes_es.auxiliar', v_count);

  UPDATE public.eb_progresso_pessoal          SET pessoa_id    = p_canonical_id WHERE pessoa_id   = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('eb_progresso_pessoal', v_count);

  UPDATE public.pequenos_grupos               SET anfitriao_id = p_canonical_id WHERE anfitriao_id = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('pequenos_grupos.anfitriao', v_count);

  UPDATE public.pequenos_grupos               SET lider_id     = p_canonical_id WHERE lider_id     = p_duplicate_id;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moves := v_moves || jsonb_build_object('pequenos_grupos.lider', v_count);

  -- ─── Preserva campos do legado que faltam no canonical (censo) ──────
  -- Estratégia: o censo é a fonte canônica, mas dados estruturais do legado
  -- (data de batismo, foto histórica, nome do pai/mãe, RG, naturalidade, etc.)
  -- não estão no formulário do censo. Preservamos esses campos.
  UPDATE public.pessoas SET
    foto              = COALESCE(foto, v_duplicate.foto),
    foto_aprovada     = CASE WHEN foto IS NULL AND v_duplicate.foto IS NOT NULL THEN COALESCE(v_duplicate.foto_aprovada, true) ELSE foto_aprovada END,
    data_batismo      = COALESCE(data_batismo, v_duplicate.data_batismo),
    forma_recepcao    = COALESCE(forma_recepcao, v_duplicate.forma_recepcao),
    data_recepcao     = COALESCE(data_recepcao, v_duplicate.data_recepcao),
    rg                = COALESCE(rg, v_duplicate.rg),
    nacionalidade     = COALESCE(nacionalidade, v_duplicate.nacionalidade),
    naturalidade      = COALESCE(naturalidade, v_duplicate.naturalidade),
    nome_pai          = COALESCE(nome_pai, v_duplicate.nome_pai),
    nome_mae          = COALESCE(nome_mae, v_duplicate.nome_mae),
    conjuge_nome      = COALESCE(conjuge_nome, v_duplicate.conjuge_nome),
    religiao_anterior = COALESCE(religiao_anterior, v_duplicate.religiao_anterior),
    admissao_tipo     = COALESCE(admissao_tipo, v_duplicate.admissao_tipo),
    admissao_data     = COALESCE(admissao_data, v_duplicate.admissao_data),
    admissao_local    = COALESCE(admissao_local, v_duplicate.admissao_local),
    admissao_ministro = COALESCE(admissao_ministro, v_duplicate.admissao_ministro),
    cargo             = COALESCE(cargo, v_duplicate.cargo),
    -- cargos_adicionais: union dos arrays
    cargos_adicionais = ARRAY(
      SELECT DISTINCT unnest(
        COALESCE(cargos_adicionais, '{}'::text[]) || COALESCE(v_duplicate.cargos_adicionais, '{}'::text[])
      )
    ),
    familia_id        = COALESCE(familia_id, v_duplicate.familia_id),
    parentesco        = COALESCE(parentesco, v_duplicate.parentesco),
    classe_es_id      = COALESCE(classe_es_id, v_duplicate.classe_es_id),
    -- coordenadas: usa do legado se canonical não tem
    coordenadas_lat   = COALESCE(coordenadas_lat, v_duplicate.coordenadas_lat),
    coordenadas_lng   = COALESCE(coordenadas_lng, v_duplicate.coordenadas_lng),
    updated_at        = now()
  WHERE id = p_canonical_id;

  v_fields := jsonb_build_object(
    'data_batismo_filled',  v_canonical.data_batismo IS NULL AND v_duplicate.data_batismo IS NOT NULL,
    'foto_filled',          v_canonical.foto IS NULL AND v_duplicate.foto IS NOT NULL,
    'rg_filled',            v_canonical.rg IS NULL AND v_duplicate.rg IS NOT NULL,
    'familia_filled',       v_canonical.familia_id IS NULL AND v_duplicate.familia_id IS NOT NULL,
    'classe_es_filled',     v_canonical.classe_es_id IS NULL AND v_duplicate.classe_es_id IS NOT NULL
  );

  -- ─── Log da operação ─────────────────────────────────────────────────
  INSERT INTO public.pessoa_merge_log (
    canonical_id, duplicate_id, duplicate_snapshot, merged_by, merge_reason, fk_moves, fields_filled
  ) VALUES (
    p_canonical_id, p_duplicate_id, to_jsonb(v_duplicate), v_caller, p_reason, v_moves, v_fields
  );

  -- ─── Deleta a duplicata ──────────────────────────────────────────────
  DELETE FROM public.pessoas WHERE id = p_duplicate_id;

  RETURN jsonb_build_object(
    'success', true,
    'canonical_id', p_canonical_id,
    'duplicate_id', p_duplicate_id,
    'fk_moves', v_moves,
    'fields_filled', v_fields
  );
END;
$$;

COMMENT ON FUNCTION public.merge_pessoas IS
  'Mescla pessoa duplicate (legado) na canonical (censo). Move todas as 17 FKs, preserva campos do legado ausentes no canonical, registra em pessoa_merge_log, deleta duplicate. SECURITY DEFINER + checagem de escopo.';

-- Permite chamada via supabase.rpc do frontend autenticado.
GRANT EXECUTE ON FUNCTION public.merge_pessoas(uuid, uuid, text) TO authenticated;

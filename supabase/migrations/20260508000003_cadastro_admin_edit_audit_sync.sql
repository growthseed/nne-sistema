-- =============================================
-- Cadastro: admin/missionário editando ficha + audit log + sync com pessoas
--
-- Casos de uso:
--   1. Membro idoso liga pra associação pedindo ajuda → secretário/missionário abre
--      a ficha do membro e continua preenchendo. Cada save é registrado em
--      cadastro_audit_log para compliance (LGPD/auditoria interna).
--   2. Admin compartilha ficha pública (link read-only) → share_token separado do
--      draft_token (este último permite editar; o share_token só permite ver).
--   3. Quando uma ficha for marcada como completa, virar fonte canônica em
--      `pessoas` (substitui dados legados via UPDATE ou cria nova via INSERT).
-- =============================================

-- ─── 1. Colunas novas em cadastro_respostas ───────────────────────────────
ALTER TABLE public.cadastro_respostas
  ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.cadastro_respostas
  ADD COLUMN IF NOT EXISTS last_edited_at timestamptz;
ALTER TABLE public.cadastro_respostas
  ADD COLUMN IF NOT EXISTS share_token uuid;
ALTER TABLE public.cadastro_respostas
  ADD COLUMN IF NOT EXISTS share_token_at timestamptz;
ALTER TABLE public.cadastro_respostas
  ADD COLUMN IF NOT EXISTS pessoa_id uuid REFERENCES public.pessoas(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cadastro_respostas_share_token
  ON public.cadastro_respostas(share_token) WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cadastro_respostas_pessoa
  ON public.cadastro_respostas(pessoa_id) WHERE pessoa_id IS NOT NULL;

COMMENT ON COLUMN public.cadastro_respostas.last_edited_by IS
  'Auth user (admin/missionário/secretário) que fez a última edição. NULL = o próprio membro respondeu.';
COMMENT ON COLUMN public.cadastro_respostas.share_token IS
  'Token público read-only para compartilhar a ficha. Diferente de draft_token (que permite editar).';
COMMENT ON COLUMN public.cadastro_respostas.pessoa_id IS
  'Vínculo com pessoas (membro/interessado canônico). Setado pelo trigger de sync ao completar.';


-- ─── 2. Tabela de audit log ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cadastro_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id     uuid NOT NULL REFERENCES public.cadastro_respostas(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  papel           text,
  acao            text NOT NULL,
  etapa_before    integer,
  etapa_after     integer,
  campos_alterados jsonb,
  ip              text,
  user_agent      text,
  observacao      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cadastro_audit_cadastro
  ON public.cadastro_audit_log(cadastro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cadastro_audit_user
  ON public.cadastro_audit_log(user_id, created_at DESC);

ALTER TABLE public.cadastro_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_service_role_all"   ON public.cadastro_audit_log;
DROP POLICY IF EXISTS "audit_auth_select_secure" ON public.cadastro_audit_log;

CREATE POLICY "audit_service_role_all"
ON public.cadastro_audit_log
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Admin/admin_uniao/admin_associacao podem ver auditoria do escopo deles
-- (deduzido via cadastro_respostas → uniao_id/associacao_id/igreja_id).
CREATE POLICY "audit_auth_select_secure"
ON public.cadastro_audit_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cadastro_respostas r
    WHERE r.id = cadastro_audit_log.cadastro_id
      AND public.can_manage_scope_secure(r.uniao_id, r.associacao_id, r.igreja_id, NULL)
  )
);

COMMENT ON TABLE public.cadastro_audit_log IS
  'Trilha de auditoria de cada ação em cadastro_respostas (autosave, edit por admin, share, etc.). Compliance LGPD: registra quem fez o quê e quando.';


-- ─── 3. Sincronizar cadastro_respostas → pessoas ─────────────────────────
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS cadastro_resposta_id uuid REFERENCES public.cadastro_respostas(id) ON DELETE SET NULL;
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS fonte text;
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS sincronizado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_pessoas_cadastro_resposta
  ON public.pessoas(cadastro_resposta_id) WHERE cadastro_resposta_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pessoas_match_email
  ON public.pessoas(LOWER(email)) WHERE email IS NOT NULL;

COMMENT ON COLUMN public.pessoas.fonte IS
  'Origem do registro: censo_2026 (do formulário), legado (importado), manual (admin criou).';

-- Função de sync: tenta achar pessoa correspondente. Se achar 1 match unânime,
-- UPDATE; se zero matches, INSERT; se múltiplos matches, NÃO faz nada (admin
-- precisa resolver manualmente). Em todos os casos, gera audit_log.
CREATE OR REPLACE FUNCTION public.cadastro_respostas_sync_pessoa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_match_count integer;
  v_pessoa_id   uuid;
  v_email_norm  text;
  v_tel_digits  text;
  v_nome_norm   text;
  v_sexo_norm   text;
  v_estado_civil_norm text;
BEGIN
  -- Só sincroniza cadastros completos. Para cadastros já completos antes do
  -- trigger existir, basta um UPDATE no-op para disparar o sync (backfill).
  IF NEW.completo IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Se já tem pessoa vinculada, atualiza ela direto (cadastro = fonte canônica).
  IF NEW.pessoa_id IS NOT NULL THEN
    v_pessoa_id := NEW.pessoa_id;
  END IF;

  v_email_norm := NULLIF(LOWER(TRIM(NEW.email)), '');
  v_tel_digits := NULLIF(REGEXP_REPLACE(COALESCE(NEW.telefone, ''), '\D', '', 'g'), '');
  v_nome_norm  := NULLIF(LOWER(extensions.unaccent(TRIM(NEW.nome))), '');
  v_sexo_norm  := CASE WHEN NEW.sexo IN ('masculino', 'feminino') THEN NEW.sexo ELSE NULL END;
  v_estado_civil_norm := CASE WHEN NEW.estado_civil IN
    ('solteiro', 'casado', 'divorciado', 'viuvo', 'separado', 'uniao_estavel')
    THEN NEW.estado_civil ELSE NULL END;

  -- Estratégia de matching: do mais forte para o mais fraco.
  -- 1. email + data_nascimento
  IF v_email_norm IS NOT NULL AND NEW.data_nascimento IS NOT NULL THEN
    SELECT id INTO v_pessoa_id FROM public.pessoas
    WHERE LOWER(email) = v_email_norm
      AND data_nascimento = NEW.data_nascimento
    LIMIT 2;
    GET DIAGNOSTICS v_match_count = ROW_COUNT;
    IF v_match_count > 1 THEN v_pessoa_id := NULL; END IF;
  END IF;

  -- 2. telefone (digits) + data_nascimento
  IF v_pessoa_id IS NULL AND v_tel_digits IS NOT NULL AND NEW.data_nascimento IS NOT NULL THEN
    SELECT id INTO v_pessoa_id FROM public.pessoas
    WHERE REGEXP_REPLACE(COALESCE(telefone, ''), '\D', '', 'g') = v_tel_digits
      AND data_nascimento = NEW.data_nascimento
    LIMIT 2;
    GET DIAGNOSTICS v_match_count = ROW_COUNT;
    IF v_match_count > 1 THEN v_pessoa_id := NULL; END IF;
  END IF;

  -- 3. nome (normalizado) + data_nascimento
  IF v_pessoa_id IS NULL AND v_nome_norm IS NOT NULL AND NEW.data_nascimento IS NOT NULL THEN
    SELECT id INTO v_pessoa_id FROM public.pessoas
    WHERE LOWER(extensions.unaccent(TRIM(nome))) = v_nome_norm
      AND data_nascimento = NEW.data_nascimento
    LIMIT 2;
    GET DIAGNOSTICS v_match_count = ROW_COUNT;
    IF v_match_count > 1 THEN v_pessoa_id := NULL; END IF;
  END IF;

  IF v_pessoa_id IS NOT NULL THEN
    -- Match unânime → UPDATE pessoa com dados do cadastro (cadastro vira fonte canônica)
    UPDATE public.pessoas SET
      nome              = COALESCE(NULLIF(NEW.nome, ''), nome),
      email             = COALESCE(NULLIF(NEW.email, ''), email),
      telefone          = COALESCE(NULLIF(NEW.telefone, ''), telefone),
      data_nascimento   = COALESCE(NEW.data_nascimento, data_nascimento),
      sexo              = COALESCE(v_sexo_norm, sexo),
      estado_civil      = COALESCE(v_estado_civil_norm, estado_civil),
      profissao         = COALESCE(NULLIF(NEW.profissao, ''), profissao),
      escolaridade      = COALESCE(NULLIF(NEW.escolaridade, ''), escolaridade),
      endereco_rua      = COALESCE(NULLIF(NEW.rua, ''), endereco_rua),
      endereco_numero   = COALESCE(NULLIF(NEW.numero, ''), endereco_numero),
      endereco_bairro   = COALESCE(NULLIF(NEW.bairro, ''), endereco_bairro),
      endereco_cidade   = COALESCE(NULLIF(NEW.cidade, ''), endereco_cidade),
      endereco_estado   = COALESCE(NULLIF(NEW.estado, ''), endereco_estado),
      endereco_cep      = COALESCE(NULLIF(NEW.cep, ''), endereco_cep),
      igreja_id         = COALESCE(NEW.igreja_id, igreja_id),
      associacao_id     = COALESCE(NEW.associacao_id, associacao_id),
      uniao_id          = COALESCE(NEW.uniao_id, uniao_id),
      cadastro_resposta_id = NEW.id,
      fonte             = 'censo_2026',
      sincronizado_em   = now()
    WHERE id = v_pessoa_id;

    NEW.pessoa_id := v_pessoa_id;

    INSERT INTO public.cadastro_audit_log (cadastro_id, user_id, acao, observacao)
    VALUES (NEW.id, NEW.last_edited_by, 'sync_update', 'pessoa_id=' || v_pessoa_id::text);
  ELSE
    -- Sem match → INSERT nova pessoa (só se houver nome+data_nascimento)
    IF NEW.nome IS NOT NULL AND TRIM(NEW.nome) <> '' THEN
      INSERT INTO public.pessoas (
        nome, email, telefone, data_nascimento, sexo, estado_civil, profissao,
        escolaridade, endereco_rua, endereco_numero, endereco_bairro,
        endereco_cidade, endereco_estado, endereco_cep,
        igreja_id, associacao_id, uniao_id,
        tipo, ativo, situacao,
        cadastro_resposta_id, fonte, sincronizado_em
      ) VALUES (
        TRIM(NEW.nome), v_email_norm, NEW.telefone, NEW.data_nascimento, v_sexo_norm, v_estado_civil_norm, NEW.profissao,
        NEW.escolaridade, NEW.rua, NEW.numero, NEW.bairro,
        NEW.cidade, NEW.estado, NEW.cep,
        NEW.igreja_id, NEW.associacao_id, NEW.uniao_id,
        'membro', true, 'ativo',
        NEW.id, 'censo_2026', now()
      ) RETURNING id INTO v_pessoa_id;

      NEW.pessoa_id := v_pessoa_id;

      INSERT INTO public.cadastro_audit_log (cadastro_id, user_id, acao, observacao)
      VALUES (NEW.id, NEW.last_edited_by, 'sync_insert', 'pessoa_id=' || v_pessoa_id::text);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cadastro_respostas_sync_pessoa ON public.cadastro_respostas;

CREATE TRIGGER trg_cadastro_respostas_sync_pessoa
  BEFORE INSERT OR UPDATE OF completo
  ON public.cadastro_respostas
  FOR EACH ROW
  EXECUTE FUNCTION public.cadastro_respostas_sync_pessoa();

COMMENT ON FUNCTION public.cadastro_respostas_sync_pessoa() IS
  'Quando cadastro_resposta vira completo, faz upsert em pessoas (matching forte por email+nascimento, telefone+nascimento, ou nome+nascimento). Cadastro vira fonte canônica.';

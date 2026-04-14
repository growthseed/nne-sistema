-- ============================================================
-- Migration 032: Sincronização de fotos com matching multi-chave
--
-- Substitui a 031. Como 99% das pessoas legadas não tem email,
-- o match passa a tentar, na ordem:
--   1) Email (case-insensitive trim)
--   2) Nome normalizado (unaccent+lower) + data_nascimento
--   3) Nome normalizado sozinho (último recurso, só se for match único)
--
-- Propaga entre: pessoas, missionarios, eb_perfis_aluno
-- ============================================================

-- Drop tudo da migration 031
DROP TRIGGER IF EXISTS trg_pessoas_foto_sync      ON public.pessoas;
DROP TRIGGER IF EXISTS trg_pessoas_foto_pull      ON public.pessoas;
DROP TRIGGER IF EXISTS trg_missionarios_foto_sync ON public.missionarios;
DROP TRIGGER IF EXISTS trg_missionarios_foto_pull ON public.missionarios;
DROP TRIGGER IF EXISTS trg_eb_foto_sync           ON public.eb_perfis_aluno;
DROP TRIGGER IF EXISTS trg_eb_foto_pull           ON public.eb_perfis_aluno;

DROP FUNCTION IF EXISTS public._tg_pessoas_foto_sync();
DROP FUNCTION IF EXISTS public._tg_pessoas_foto_pull();
DROP FUNCTION IF EXISTS public._tg_missionarios_foto_sync();
DROP FUNCTION IF EXISTS public._tg_missionarios_foto_pull();
DROP FUNCTION IF EXISTS public._tg_eb_foto_sync();
DROP FUNCTION IF EXISTS public._tg_eb_foto_pull();
DROP FUNCTION IF EXISTS public.sync_pessoa_foto(text, text);

-- ------------------------------------------------------------
-- Helper: normalização de nome (unaccent + lower + espaços colapsados)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.norm_nome(p_nome text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_nome IS NULL OR btrim(p_nome) = '' THEN NULL
    ELSE regexp_replace(lower(extensions.unaccent(btrim(p_nome))), '\s+', ' ', 'g')
  END;
$$;

-- Helper: cast seguro de texto para date (retorna NULL em vez de erro)
CREATE OR REPLACE FUNCTION public.safe_to_date(p_text text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_text IS NULL OR btrim(p_text) = '' THEN RETURN NULL; END IF;
  RETURN p_text::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- Função central: sincroniza foto em todas as 3 tabelas
-- usando email, nome+dob ou nome apenas (nessa ordem).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_pessoa_foto(
  p_email text,
  p_nome  text,
  p_dob   date,
  p_foto  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_email text;
  v_nome  text;
BEGIN
  IF p_foto IS NULL OR p_foto = '' THEN
    RETURN;
  END IF;

  v_email := NULLIF(lower(btrim(coalesce(p_email, ''))), '');
  v_nome  := public.norm_nome(p_nome);

  IF v_email IS NULL AND v_nome IS NULL THEN
    RETURN;
  END IF;

  ---------- pessoas ----------
  UPDATE public.pessoas
     SET foto = p_foto,
         foto_aprovada = true,
         foto_pendente = false,
         updated_at = now()
   WHERE (foto IS DISTINCT FROM p_foto)
     AND (
          (v_email IS NOT NULL AND lower(btrim(email)) = v_email)
          OR (v_email IS NULL AND v_nome IS NOT NULL AND p_dob IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND data_nascimento = p_dob)
          OR (v_email IS NULL AND p_dob IS NULL AND v_nome IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND (SELECT count(*) FROM public.pessoas x WHERE public.norm_nome(x.nome) = v_nome) = 1)
         );

  ---------- missionarios ----------
  UPDATE public.missionarios
     SET foto_url = p_foto,
         updated_at = now()
   WHERE (foto_url IS DISTINCT FROM p_foto)
     AND (
          (v_email IS NOT NULL AND lower(btrim(email_pessoal)) = v_email)
          OR (v_email IS NULL AND v_nome IS NOT NULL AND p_dob IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND data_nascimento = p_dob)
          OR (v_email IS NULL AND p_dob IS NULL AND v_nome IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND (SELECT count(*) FROM public.missionarios x WHERE public.norm_nome(x.nome) = v_nome) = 1)
         );

  ---------- eb_perfis_aluno (data_nascimento é text → cast seguro) ----------
  UPDATE public.eb_perfis_aluno
     SET foto_url = p_foto,
         updated_at = now()
   WHERE (foto_url IS DISTINCT FROM p_foto)
     AND (
          (v_email IS NOT NULL AND lower(btrim(email)) = v_email)
          OR (v_email IS NULL AND v_nome IS NOT NULL AND p_dob IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND public.safe_to_date(data_nascimento) = p_dob)
          OR (v_email IS NULL AND p_dob IS NULL AND v_nome IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND (SELECT count(*) FROM public.eb_perfis_aluno x WHERE public.norm_nome(x.nome) = v_nome) = 1)
         );
END;
$$;

COMMENT ON FUNCTION public.sync_pessoa_foto(text, text, date, text) IS
  'Sincroniza foto entre pessoas, missionarios e eb_perfis_aluno usando email ou nome+data_nascimento como chave.';

-- ------------------------------------------------------------
-- TRIGGER: pessoas → sync (AFTER) + puxa foto existente (BEFORE)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tg_pessoas_foto_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.foto IS NOT NULL AND NEW.foto <> ''
     AND (TG_OP = 'INSERT' OR NEW.foto IS DISTINCT FROM OLD.foto)
  THEN
    PERFORM public.sync_pessoa_foto(NEW.email, NEW.nome, NEW.data_nascimento, NEW.foto);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pessoas_foto_sync
  AFTER INSERT OR UPDATE OF foto ON public.pessoas
  FOR EACH ROW
  WHEN (pg_trigger_depth() < 1)
  EXECUTE FUNCTION public._tg_pessoas_foto_sync();

CREATE OR REPLACE FUNCTION public._tg_pessoas_foto_pull()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_foto text;
  v_nome text;
BEGIN
  IF NEW.foto IS NOT NULL AND NEW.foto <> '' THEN
    RETURN NEW;
  END IF;
  v_nome := public.norm_nome(NEW.nome);
  IF v_nome IS NULL AND (NEW.email IS NULL OR NEW.email = '') THEN
    RETURN NEW;
  END IF;

  -- tenta pegar em missionarios
  SELECT foto_url INTO v_foto
    FROM public.missionarios
   WHERE foto_url IS NOT NULL AND foto_url <> ''
     AND (
          (NEW.email IS NOT NULL AND lower(btrim(email_pessoal)) = lower(btrim(NEW.email)))
          OR (NEW.data_nascimento IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND data_nascimento = NEW.data_nascimento)
         )
   LIMIT 1;

  IF v_foto IS NULL THEN
    SELECT foto_url INTO v_foto
      FROM public.eb_perfis_aluno
     WHERE foto_url IS NOT NULL AND foto_url <> ''
       AND (
            (NEW.email IS NOT NULL AND lower(btrim(email)) = lower(btrim(NEW.email)))
            OR (NEW.data_nascimento IS NOT NULL
                AND public.norm_nome(nome) = v_nome
                AND public.safe_to_date(data_nascimento) = NEW.data_nascimento)
           )
     LIMIT 1;
  END IF;

  IF v_foto IS NOT NULL THEN
    NEW.foto := v_foto;
    NEW.foto_aprovada := true;
    NEW.foto_pendente := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pessoas_foto_pull
  BEFORE INSERT ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_pessoas_foto_pull();

-- ------------------------------------------------------------
-- TRIGGER: missionarios → sync + pull
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tg_missionarios_foto_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.foto_url IS NOT NULL AND NEW.foto_url <> ''
     AND (TG_OP = 'INSERT' OR NEW.foto_url IS DISTINCT FROM OLD.foto_url)
  THEN
    PERFORM public.sync_pessoa_foto(NEW.email_pessoal, NEW.nome, NEW.data_nascimento, NEW.foto_url);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_missionarios_foto_sync
  AFTER INSERT OR UPDATE OF foto_url ON public.missionarios
  FOR EACH ROW
  WHEN (pg_trigger_depth() < 1)
  EXECUTE FUNCTION public._tg_missionarios_foto_sync();

CREATE OR REPLACE FUNCTION public._tg_missionarios_foto_pull()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_foto text;
  v_nome text;
BEGIN
  IF NEW.foto_url IS NOT NULL AND NEW.foto_url <> '' THEN
    RETURN NEW;
  END IF;
  v_nome := public.norm_nome(NEW.nome);
  IF v_nome IS NULL AND (NEW.email_pessoal IS NULL OR NEW.email_pessoal = '') THEN
    RETURN NEW;
  END IF;

  SELECT foto INTO v_foto
    FROM public.pessoas
   WHERE foto IS NOT NULL AND foto <> ''
     AND (
          (NEW.email_pessoal IS NOT NULL AND lower(btrim(email)) = lower(btrim(NEW.email_pessoal)))
          OR (NEW.data_nascimento IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND data_nascimento = NEW.data_nascimento)
         )
   LIMIT 1;

  IF v_foto IS NULL THEN
    SELECT foto_url INTO v_foto
      FROM public.eb_perfis_aluno
     WHERE foto_url IS NOT NULL AND foto_url <> ''
       AND (
            (NEW.email_pessoal IS NOT NULL AND lower(btrim(email)) = lower(btrim(NEW.email_pessoal)))
            OR (NEW.data_nascimento IS NOT NULL
                AND public.norm_nome(nome) = v_nome
                AND public.safe_to_date(data_nascimento) = NEW.data_nascimento)
           )
     LIMIT 1;
  END IF;

  IF v_foto IS NOT NULL THEN
    NEW.foto_url := v_foto;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_missionarios_foto_pull
  BEFORE INSERT ON public.missionarios
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_missionarios_foto_pull();

-- ------------------------------------------------------------
-- TRIGGER: eb_perfis_aluno → sync + pull
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tg_eb_foto_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.foto_url IS NOT NULL AND NEW.foto_url <> ''
     AND (TG_OP = 'INSERT' OR NEW.foto_url IS DISTINCT FROM OLD.foto_url)
  THEN
    PERFORM public.sync_pessoa_foto(NEW.email, NEW.nome, NEW.data_nascimento, NEW.foto_url);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_eb_foto_sync
  AFTER INSERT OR UPDATE OF foto_url ON public.eb_perfis_aluno
  FOR EACH ROW
  WHEN (pg_trigger_depth() < 1)
  EXECUTE FUNCTION public._tg_eb_foto_sync();

CREATE OR REPLACE FUNCTION public._tg_eb_foto_pull()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_foto text;
  v_nome text;
  v_dob  date;
BEGIN
  IF NEW.foto_url IS NOT NULL AND NEW.foto_url <> '' THEN
    RETURN NEW;
  END IF;
  v_nome := public.norm_nome(NEW.nome);
  v_dob  := public.safe_to_date(NEW.data_nascimento);
  IF v_nome IS NULL AND (NEW.email IS NULL OR NEW.email = '') THEN
    RETURN NEW;
  END IF;

  SELECT foto INTO v_foto
    FROM public.pessoas
   WHERE foto IS NOT NULL AND foto <> ''
     AND (
          (NEW.email IS NOT NULL AND lower(btrim(email)) = lower(btrim(NEW.email)))
          OR (v_dob IS NOT NULL
              AND public.norm_nome(nome) = v_nome
              AND data_nascimento = v_dob)
         )
   LIMIT 1;

  IF v_foto IS NULL THEN
    SELECT foto_url INTO v_foto
      FROM public.missionarios
     WHERE foto_url IS NOT NULL AND foto_url <> ''
       AND (
            (NEW.email IS NOT NULL AND lower(btrim(email_pessoal)) = lower(btrim(NEW.email)))
            OR (v_dob IS NOT NULL
                AND public.norm_nome(nome) = v_nome
                AND data_nascimento = v_dob)
           )
     LIMIT 1;
  END IF;

  IF v_foto IS NOT NULL THEN
    NEW.foto_url := v_foto;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_eb_foto_pull
  BEFORE INSERT ON public.eb_perfis_aluno
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_eb_foto_pull();

-- ------------------------------------------------------------
-- BACKFILL com matching multi-chave
-- ------------------------------------------------------------

-- missionarios.foto_url → pessoas.foto (via email ou nome+dob)
UPDATE public.pessoas p
   SET foto = m.foto_url,
       foto_aprovada = true,
       foto_pendente = false,
       updated_at = now()
  FROM public.missionarios m
 WHERE m.foto_url IS NOT NULL AND m.foto_url <> ''
   AND (p.foto IS NULL OR p.foto = '')
   AND (
        (m.email_pessoal IS NOT NULL AND p.email IS NOT NULL
         AND lower(btrim(p.email)) = lower(btrim(m.email_pessoal)))
        OR
        (m.data_nascimento IS NOT NULL AND p.data_nascimento IS NOT NULL
         AND m.data_nascimento = p.data_nascimento
         AND public.norm_nome(m.nome) = public.norm_nome(p.nome))
       );

-- missionarios → eb_perfis_aluno
UPDATE public.eb_perfis_aluno e
   SET foto_url = m.foto_url,
       updated_at = now()
  FROM public.missionarios m
 WHERE m.foto_url IS NOT NULL AND m.foto_url <> ''
   AND (e.foto_url IS NULL OR e.foto_url = '')
   AND (
        (m.email_pessoal IS NOT NULL AND e.email IS NOT NULL
         AND lower(btrim(e.email)) = lower(btrim(m.email_pessoal)))
        OR
        (m.data_nascimento IS NOT NULL AND public.safe_to_date(e.data_nascimento) IS NOT NULL
         AND m.data_nascimento = public.safe_to_date(e.data_nascimento)
         AND public.norm_nome(m.nome) = public.norm_nome(e.nome))
       );

-- pessoas → missionarios
UPDATE public.missionarios m
   SET foto_url = p.foto,
       updated_at = now()
  FROM public.pessoas p
 WHERE p.foto IS NOT NULL AND p.foto <> ''
   AND (m.foto_url IS NULL OR m.foto_url = '')
   AND (
        (p.email IS NOT NULL AND m.email_pessoal IS NOT NULL
         AND lower(btrim(p.email)) = lower(btrim(m.email_pessoal)))
        OR
        (p.data_nascimento IS NOT NULL AND m.data_nascimento IS NOT NULL
         AND p.data_nascimento = m.data_nascimento
         AND public.norm_nome(p.nome) = public.norm_nome(m.nome))
       );

-- pessoas → eb_perfis_aluno
UPDATE public.eb_perfis_aluno e
   SET foto_url = p.foto,
       updated_at = now()
  FROM public.pessoas p
 WHERE p.foto IS NOT NULL AND p.foto <> ''
   AND (e.foto_url IS NULL OR e.foto_url = '')
   AND (
        (p.email IS NOT NULL AND e.email IS NOT NULL
         AND lower(btrim(p.email)) = lower(btrim(e.email)))
        OR
        (p.data_nascimento IS NOT NULL AND public.safe_to_date(e.data_nascimento) IS NOT NULL
         AND p.data_nascimento = public.safe_to_date(e.data_nascimento)
         AND public.norm_nome(p.nome) = public.norm_nome(e.nome))
       );

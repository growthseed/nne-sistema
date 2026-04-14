-- ============================================================
-- Migration 031: Sincronização global de fotos
--
-- Qualquer foto cadastrada em UMA das três tabelas (pessoas,
-- missionarios, eb_perfis_aluno) é propagada automaticamente
-- para as outras quando o email bate (case-insensitive).
--
-- Funciona via triggers AFTER UPDATE e AFTER INSERT, com proteção
-- contra recursão via pg_trigger_depth().
-- ============================================================

-- ------------------------------------------------------------
-- Função central: sincroniza uma foto em todas as 3 tabelas pelo email
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_pessoa_foto(
  p_email text,
  p_foto  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' OR p_foto IS NULL OR p_foto = '' THEN
    RETURN;
  END IF;

  v_norm := lower(btrim(p_email));

  -- pessoas
  UPDATE public.pessoas
     SET foto = p_foto,
         foto_aprovada = true,
         foto_pendente = false,
         updated_at = now()
   WHERE lower(btrim(email)) = v_norm
     AND (foto IS DISTINCT FROM p_foto);

  -- missionarios
  UPDATE public.missionarios
     SET foto_url = p_foto,
         updated_at = now()
   WHERE lower(btrim(email_pessoal)) = v_norm
     AND (foto_url IS DISTINCT FROM p_foto);

  -- eb_perfis_aluno
  UPDATE public.eb_perfis_aluno
     SET foto_url = p_foto,
         updated_at = now()
   WHERE lower(btrim(email)) = v_norm
     AND (foto_url IS DISTINCT FROM p_foto);
END;
$$;

COMMENT ON FUNCTION public.sync_pessoa_foto(text, text) IS
  'Sincroniza a foto de uma pessoa em todas as 3 tabelas (pessoas, missionarios, eb_perfis_aluno) que compartilham o mesmo email.';

-- ------------------------------------------------------------
-- TRIGGER: pessoas → sync
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tg_pessoas_foto_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.foto IS NOT NULL
     AND NEW.foto <> ''
     AND NEW.email IS NOT NULL
     AND NEW.email <> ''
     AND (TG_OP = 'INSERT' OR NEW.foto IS DISTINCT FROM OLD.foto)
  THEN
    PERFORM public.sync_pessoa_foto(NEW.email, NEW.foto);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pessoas_foto_sync ON public.pessoas;
CREATE TRIGGER trg_pessoas_foto_sync
  AFTER INSERT OR UPDATE OF foto ON public.pessoas
  FOR EACH ROW
  WHEN (pg_trigger_depth() < 1)
  EXECUTE FUNCTION public._tg_pessoas_foto_sync();

-- Trigger auxiliar: quando é criada uma pessoa SEM foto mas já existe foto
-- em missionarios/eb com o mesmo email, puxa para pessoas.
CREATE OR REPLACE FUNCTION public._tg_pessoas_foto_pull()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_foto text;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' OR NEW.foto IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT foto_url INTO v_foto
    FROM public.missionarios
   WHERE lower(btrim(email_pessoal)) = lower(btrim(NEW.email))
     AND foto_url IS NOT NULL AND foto_url <> ''
   LIMIT 1;

  IF v_foto IS NULL THEN
    SELECT foto_url INTO v_foto
      FROM public.eb_perfis_aluno
     WHERE lower(btrim(email)) = lower(btrim(NEW.email))
       AND foto_url IS NOT NULL AND foto_url <> ''
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

DROP TRIGGER IF EXISTS trg_pessoas_foto_pull ON public.pessoas;
CREATE TRIGGER trg_pessoas_foto_pull
  BEFORE INSERT ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_pessoas_foto_pull();

-- ------------------------------------------------------------
-- TRIGGER: missionarios → sync
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tg_missionarios_foto_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.foto_url IS NOT NULL
     AND NEW.foto_url <> ''
     AND NEW.email_pessoal IS NOT NULL
     AND NEW.email_pessoal <> ''
     AND (TG_OP = 'INSERT' OR NEW.foto_url IS DISTINCT FROM OLD.foto_url)
  THEN
    PERFORM public.sync_pessoa_foto(NEW.email_pessoal, NEW.foto_url);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_missionarios_foto_sync ON public.missionarios;
CREATE TRIGGER trg_missionarios_foto_sync
  AFTER INSERT OR UPDATE OF foto_url ON public.missionarios
  FOR EACH ROW
  WHEN (pg_trigger_depth() < 1)
  EXECUTE FUNCTION public._tg_missionarios_foto_sync();

-- Trigger auxiliar: ao criar missionário sem foto, puxa de pessoas/eb
CREATE OR REPLACE FUNCTION public._tg_missionarios_foto_pull()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_foto text;
BEGIN
  IF NEW.email_pessoal IS NULL OR NEW.email_pessoal = '' OR NEW.foto_url IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT foto INTO v_foto
    FROM public.pessoas
   WHERE lower(btrim(email)) = lower(btrim(NEW.email_pessoal))
     AND foto IS NOT NULL AND foto <> ''
   LIMIT 1;

  IF v_foto IS NULL THEN
    SELECT foto_url INTO v_foto
      FROM public.eb_perfis_aluno
     WHERE lower(btrim(email)) = lower(btrim(NEW.email_pessoal))
       AND foto_url IS NOT NULL AND foto_url <> ''
     LIMIT 1;
  END IF;

  IF v_foto IS NOT NULL THEN
    NEW.foto_url := v_foto;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_missionarios_foto_pull ON public.missionarios;
CREATE TRIGGER trg_missionarios_foto_pull
  BEFORE INSERT ON public.missionarios
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_missionarios_foto_pull();

-- ------------------------------------------------------------
-- TRIGGER: eb_perfis_aluno → sync
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._tg_eb_foto_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.foto_url IS NOT NULL
     AND NEW.foto_url <> ''
     AND NEW.email IS NOT NULL
     AND NEW.email <> ''
     AND (TG_OP = 'INSERT' OR NEW.foto_url IS DISTINCT FROM OLD.foto_url)
  THEN
    PERFORM public.sync_pessoa_foto(NEW.email, NEW.foto_url);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eb_foto_sync ON public.eb_perfis_aluno;
CREATE TRIGGER trg_eb_foto_sync
  AFTER INSERT OR UPDATE OF foto_url ON public.eb_perfis_aluno
  FOR EACH ROW
  WHEN (pg_trigger_depth() < 1)
  EXECUTE FUNCTION public._tg_eb_foto_sync();

-- Trigger auxiliar: ao criar eb_perfis_aluno sem foto, puxa de pessoas/missionarios
CREATE OR REPLACE FUNCTION public._tg_eb_foto_pull()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_foto text;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' OR NEW.foto_url IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT foto INTO v_foto
    FROM public.pessoas
   WHERE lower(btrim(email)) = lower(btrim(NEW.email))
     AND foto IS NOT NULL AND foto <> ''
   LIMIT 1;

  IF v_foto IS NULL THEN
    SELECT foto_url INTO v_foto
      FROM public.missionarios
     WHERE lower(btrim(email_pessoal)) = lower(btrim(NEW.email))
       AND foto_url IS NOT NULL AND foto_url <> ''
     LIMIT 1;
  END IF;

  IF v_foto IS NOT NULL THEN
    NEW.foto_url := v_foto;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eb_foto_pull ON public.eb_perfis_aluno;
CREATE TRIGGER trg_eb_foto_pull
  BEFORE INSERT ON public.eb_perfis_aluno
  FOR EACH ROW
  EXECUTE FUNCTION public._tg_eb_foto_pull();

-- ------------------------------------------------------------
-- BACKFILL — propaga fotos existentes que ainda não foram sincronizadas
-- ------------------------------------------------------------

-- missionarios → pessoas
UPDATE public.pessoas p
   SET foto = m.foto_url,
       foto_aprovada = true,
       foto_pendente = false,
       updated_at = now()
  FROM public.missionarios m
 WHERE lower(btrim(p.email)) = lower(btrim(m.email_pessoal))
   AND m.foto_url IS NOT NULL AND m.foto_url <> ''
   AND (p.foto IS NULL OR p.foto = '');

-- missionarios → eb_perfis_aluno
UPDATE public.eb_perfis_aluno e
   SET foto_url = m.foto_url,
       updated_at = now()
  FROM public.missionarios m
 WHERE lower(btrim(e.email)) = lower(btrim(m.email_pessoal))
   AND m.foto_url IS NOT NULL AND m.foto_url <> ''
   AND (e.foto_url IS NULL OR e.foto_url = '');

-- pessoas → missionarios (caso em que pessoas já tem foto mas missionarios ainda não)
UPDATE public.missionarios m
   SET foto_url = p.foto,
       updated_at = now()
  FROM public.pessoas p
 WHERE lower(btrim(m.email_pessoal)) = lower(btrim(p.email))
   AND p.foto IS NOT NULL AND p.foto <> ''
   AND (m.foto_url IS NULL OR m.foto_url = '');

-- pessoas → eb_perfis_aluno
UPDATE public.eb_perfis_aluno e
   SET foto_url = p.foto,
       updated_at = now()
  FROM public.pessoas p
 WHERE lower(btrim(e.email)) = lower(btrim(p.email))
   AND p.foto IS NOT NULL AND p.foto <> ''
   AND (e.foto_url IS NULL OR e.foto_url = '');

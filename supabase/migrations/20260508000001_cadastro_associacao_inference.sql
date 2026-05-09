-- =============================================
-- Inferência de associação/união a partir de cidade/estado para cadastros públicos
--
-- Problema: o formulário público pergunta a associação na etapa 1, mas há respostas
-- legadas e abandonos cuja associação ficou NULL embora cidade+estado estejam
-- preenchidos. Resultado: admin_associacao não vê esses cadastros porque o filtro
-- bate em associacao_id, e admin_uniao só os vê se uniao_id estiver setado.
--
-- Esta migration:
--  1. Backfill de cadastro_respostas.associacao_id baseado em (cidade, estado)
--     casando contra igrejas.endereco_cidade/endereco_estado quando o resultado é
--     unânime (todas as igrejas da cidade pertencem à mesma associação).
--  2. Backfill de cadastro_respostas.uniao_id sempre que associacao_id estiver
--     setado (uniao_id := associacoes.uniao_id WHERE id = associacao_id).
--  3. Trigger BEFORE INSERT/UPDATE que aplica a mesma lógica em novos registros.
--  4. Mesma lógica em igrejas: se uniao_id NULL mas associacao_id setada, deriva.
-- =============================================

-- Pré-requisito: extensão unaccent (já usada em 032_sync_foto_multichave).
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- 0. Garantir que igrejas.uniao_id está consistente com associacao_id
-- (caso algum registro tenha uniao_id NULL).
UPDATE public.igrejas i
SET uniao_id = a.uniao_id
FROM public.associacoes a
WHERE i.associacao_id = a.id
  AND i.uniao_id IS DISTINCT FROM a.uniao_id;

-- 1. Backfill cadastro_respostas.associacao_id por (cidade, estado).
-- Só atualiza onde a inferência é unânime (single associacao_id na cidade).
WITH unique_assoc_por_cidade AS (
  SELECT
    LOWER(extensions.unaccent(TRIM(endereco_cidade))) AS cidade_norm,
    UPPER(TRIM(endereco_estado))           AS estado_norm,
    MIN(associacao_id)                     AS associacao_id,
    COUNT(DISTINCT associacao_id)          AS n_assoc
  FROM public.igrejas
  WHERE associacao_id IS NOT NULL
    AND endereco_cidade IS NOT NULL
    AND endereco_estado IS NOT NULL
  GROUP BY 1, 2
)
UPDATE public.cadastro_respostas r
SET associacao_id = u.associacao_id
FROM unique_assoc_por_cidade u
WHERE r.associacao_id IS NULL
  AND r.cidade IS NOT NULL
  AND r.estado IS NOT NULL
  AND u.cidade_norm = LOWER(extensions.unaccent(TRIM(r.cidade)))
  AND u.estado_norm = UPPER(TRIM(r.estado))
  AND u.n_assoc = 1;

-- 2. Backfill cadastro_respostas.uniao_id derivado de associacao_id.
UPDATE public.cadastro_respostas r
SET uniao_id = a.uniao_id
FROM public.associacoes a
WHERE r.associacao_id = a.id
  AND r.uniao_id IS DISTINCT FROM a.uniao_id;

-- 3. Trigger: BEFORE INSERT/UPDATE aplica as duas regras em novos registros.
CREATE OR REPLACE FUNCTION public.cadastro_respostas_infer_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 3a. Inferir associacao_id de (cidade, estado) se NULL.
  IF NEW.associacao_id IS NULL AND NEW.cidade IS NOT NULL AND NEW.estado IS NOT NULL THEN
    SELECT MIN(i.associacao_id)
      INTO NEW.associacao_id
    FROM public.igrejas i
    WHERE i.associacao_id IS NOT NULL
      AND LOWER(extensions.unaccent(TRIM(i.endereco_cidade))) = LOWER(extensions.unaccent(TRIM(NEW.cidade)))
      AND UPPER(TRIM(i.endereco_estado)) = UPPER(TRIM(NEW.estado))
    HAVING COUNT(DISTINCT i.associacao_id) = 1;
  END IF;

  -- 3b. Sempre derivar uniao_id de associacao_id quando esta estiver presente.
  IF NEW.associacao_id IS NOT NULL THEN
    SELECT a.uniao_id INTO NEW.uniao_id
    FROM public.associacoes a
    WHERE a.id = NEW.associacao_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cadastro_respostas_infer_scope ON public.cadastro_respostas;

CREATE TRIGGER trg_cadastro_respostas_infer_scope
  BEFORE INSERT OR UPDATE OF cidade, estado, associacao_id, uniao_id, igreja_id
  ON public.cadastro_respostas
  FOR EACH ROW
  EXECUTE FUNCTION public.cadastro_respostas_infer_scope();

COMMENT ON FUNCTION public.cadastro_respostas_infer_scope() IS
  'Auto-preenche associacao_id e uniao_id em cadastro_respostas a partir de cidade/estado e da hierarquia das associações. Garante que admin_uniao e admin_associacao vejam o mesmo universo de respostas.';

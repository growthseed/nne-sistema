-- ============================================================
-- Migration 033: Adicionar campos do legado em pessoas
-- - gs_id (chave de match com sistema legado secretaria.org.br)
-- - celular (separado de telefone)
-- - dados pessoais expandidos (pai, mãe, RG, nacionalidade)
-- - dados conjugais (cônjuge nome, data casamento)
-- - dados de admissão (religião anterior, data/local batismo, oficiante)
-- - endereco_completo_legado (string crua, antes de normalizar)
-- - Drop CHECK constraints de sexo e estado_civil (legado tem mais variantes)
-- Date: 2026-04-06
-- ============================================================

-- ===== 1. Novas colunas =====
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS gs_id integer;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS celular text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS nome_pai text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS nome_mae text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS nacionalidade text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS conjuge_nome text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS data_casamento date;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS religiao_anterior text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS religiao_anterior_desde text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS cargo_anterior text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS local_batismo text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS oficiante_batismo text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS endereco_completo_legado text;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS dados_legado_atualizado_em timestamptz;

-- ===== 2. Index único em gs_id (permite NULL para registros nativos do NNE) =====
CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoas_gs_id ON public.pessoas (gs_id) WHERE gs_id IS NOT NULL;

-- ===== 3. Drop CHECK constraints de sexo e estado_civil =====
-- O legado retorna "Feminino"/"Masculino" e "Casado(a)"/"Solteiro(a)" — não cabem no constraint atual.
-- A normalização passa a ser responsabilidade do app/importer.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
    WHERE rel.relname = 'pessoas'
      AND con.contype = 'c'
      AND att.attname IN ('sexo', 'estado_civil')
  LOOP
    EXECUTE format('ALTER TABLE public.pessoas DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Dropped constraint % on pessoas', r.conname;
  END LOOP;
END $$;

-- ===== 4. Comentários para documentação =====
COMMENT ON COLUMN public.pessoas.gs_id IS 'ID legado do sistema secretaria.org.br (GS 4.1). NULL para registros nativos do NNE.';
COMMENT ON COLUMN public.pessoas.endereco_completo_legado IS 'String bruta do endereço como veio do legado (antes da normalização em rua/numero/bairro/cidade/cep).';
COMMENT ON COLUMN public.pessoas.celular IS 'Telefone celular (separado de telefone fixo). Pode ser usado para WhatsApp.';
COMMENT ON COLUMN public.pessoas.dados_legado_atualizado_em IS 'Última vez que dados deste membro foram sincronizados do legado via scraper.';

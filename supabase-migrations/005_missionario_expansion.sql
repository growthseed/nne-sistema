-- =============================================
-- NNE Sistema - Migration 005: Missionary Biographical Expansion (SDARM 4.1)
-- Expande cadastro de missionarios com ~50 campos biograficos
-- Baseado no sistema SDARM 4.1 Cadastro Biografico
-- Criado em: 2026-02-25
-- =============================================

-- =============================================
-- 1. EXPAND CHECK CONSTRAINTS
-- =============================================

-- 1A. Expand cargo_ministerial CHECK
ALTER TABLE missionarios DROP CONSTRAINT IF EXISTS missionarios_cargo_ministerial_check;
ALTER TABLE missionarios ADD CONSTRAINT missionarios_cargo_ministerial_check
  CHECK (cargo_ministerial IN (
    'pastor_ordenado', 'pastor_licenciado', 'obreiro_biblico',
    'colportor', 'missionario_voluntario', 'diretor_departamental',
    'presidente', 'secretario', 'tesoureiro_campo',
    -- Novos cargos SDARM 4.1
    'ministro', 'obreiro_aspirante', 'obreiro_pre_aspirante',
    'diretor_colportagem', 'aux_diretor_colportagem',
    'evangelista', 'contratado', 'missionario_auxiliar'
  ));

-- 1B. Expand status CHECK
ALTER TABLE missionarios DROP CONSTRAINT IF EXISTS missionarios_status_check;
ALTER TABLE missionarios ADD CONSTRAINT missionarios_status_check
  CHECK (status IN (
    'ativo', 'inativo', 'licenca', 'transferido', 'aposentado',
    -- Novos status
    'falecido', 'exonerado', 'suspenso'
  ));

-- =============================================
-- 2. ADD COLUMNS - Dados Pessoais
-- =============================================

ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS sexo text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_nascimento date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS cidade_nascimento text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS uf_nascimento text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS nacionalidade text DEFAULT 'Brasileira';
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS profissao text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS escolaridade text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS nome_pai text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS nome_mae text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS estado_civil text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_casamento date;

-- =============================================
-- 3. ADD COLUMNS - Documentos
-- =============================================

ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS rg_numero text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS rg_orgao text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS pis_numero text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS pis_orgao text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS nit_numero text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS titulo_eleitor text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS ctps_serie_uf text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS cnh text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS passaporte text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS reservista text;

-- =============================================
-- 4. ADD COLUMNS - Contato/Endereco
-- =============================================

ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS endereco_bairro text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS endereco_cidade text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS endereco_uf text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS endereco_cep text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS celular text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS email_pessoal text;

-- =============================================
-- 5. ADD COLUMNS - Dependentes
-- =============================================

ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS conjuge_nome text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS conjuge_nascimento date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS conjuge_cidade text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS conjuge_uf text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS conjuge_nacionalidade text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS conjuge_escolaridade text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS filhos jsonb DEFAULT '[]';

-- =============================================
-- 6. ADD COLUMNS - Dados Religiosos (marcos da carreira)
-- =============================================

ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS religiao_anterior text;

-- Batismo
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_batismo date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS batismo_oficiante text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS batismo_local text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS batismo_uf text;

-- Colportagem
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_colportagem date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS colportagem_oficiante text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS colportagem_local text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS colportagem_uf text;

-- Pre-Aspirante
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_pre_aspirante date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS pre_aspirante_oficiante text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS pre_aspirante_local text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS pre_aspirante_uf text;

-- Aspirante
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_aspirante date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS aspirante_oficiante text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS aspirante_local text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS aspirante_uf text;

-- Obreiro Biblico
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_obreiro_biblico date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS obreiro_biblico_oficiante text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS obreiro_biblico_local text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS obreiro_biblico_uf text;

-- Pastor
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_pastor date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS pastor_oficiante text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS pastor_local text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS pastor_uf text;

-- Ministro
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS data_ministro date;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS ministro_oficiante text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS ministro_local text;
ALTER TABLE missionarios ADD COLUMN IF NOT EXISTS ministro_uf text;

-- =============================================
-- 7. CREATE TABLE - Historico Missionario
-- =============================================

CREATE TABLE IF NOT EXISTS historico_missionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missionario_id uuid NOT NULL REFERENCES missionarios(id) ON DELETE CASCADE,
  data date,
  cidade_uf text,
  funcao text,
  decisao text,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_missionario_id ON historico_missionario(missionario_id);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_missionario(data);

-- =============================================
-- 8. RLS for historico_missionario
-- =============================================

ALTER TABLE historico_missionario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico_select" ON historico_missionario FOR SELECT TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
  OR missionario_id IN (SELECT id FROM missionarios WHERE usuario_id = auth.uid())
);

CREATE POLICY "historico_insert" ON historico_missionario FOR INSERT TO authenticated WITH CHECK (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);

CREATE POLICY "historico_update" ON historico_missionario FOR UPDATE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);

CREATE POLICY "historico_delete" ON historico_missionario FOR DELETE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);

-- =============================================
-- 9. Additional indexes for new columns
-- =============================================

CREATE INDEX IF NOT EXISTS idx_missionarios_cargo ON missionarios(cargo_ministerial);
CREATE INDEX IF NOT EXISTS idx_missionarios_cpf ON missionarios(cpf) WHERE cpf IS NOT NULL;

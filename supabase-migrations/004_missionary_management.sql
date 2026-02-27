-- =============================================
-- NNE Sistema - Migration 004: Missionary Management System
-- Sistema de RH, Gestao e Estrutura Organizacional de Missionarios
-- Criado em: 2026-02-24
-- =============================================

-- 1. MISSIONARIOS (perfil missionario vinculado a usuario)
CREATE TABLE IF NOT EXISTS missionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE,
  uniao_id uuid REFERENCES unioes(id),
  associacao_id uuid REFERENCES associacoes(id),
  igrejas_responsavel uuid[] DEFAULT '{}',
  cargo_ministerial text NOT NULL CHECK (cargo_ministerial IN (
    'pastor_ordenado', 'pastor_licenciado', 'obreiro_biblico',
    'colportor', 'missionario_voluntario', 'diretor_departamental',
    'presidente', 'secretario', 'tesoureiro_campo'
  )),
  data_inicio_ministerio date,
  data_admissao date,
  data_ordenacao date,
  formacao_teologica text,
  especialidade text,
  telefone_ministerial text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN (
    'ativo', 'inativo', 'licenca', 'transferido', 'aposentado'
  )),
  motivo_inativo text,
  foto_url text,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(usuario_id)
);

-- 2. METAS_MISSIONARIO (metas/KPIs por periodo)
CREATE TABLE IF NOT EXISTS metas_missionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missionario_id uuid REFERENCES missionarios(id) ON DELETE CASCADE,
  tipo_periodo text NOT NULL CHECK (tipo_periodo IN ('mensal', 'trimestral', 'anual')),
  mes integer CHECK (mes BETWEEN 1 AND 12),
  trimestre integer CHECK (trimestre BETWEEN 1 AND 4),
  ano integer NOT NULL,
  meta_estudos_biblicos integer DEFAULT 0,
  meta_visitas integer DEFAULT 0,
  meta_literatura integer DEFAULT 0,
  meta_pessoas_contatadas integer DEFAULT 0,
  meta_convites integer DEFAULT 0,
  meta_pessoas_trazidas integer DEFAULT 0,
  meta_horas_trabalho numeric(6,1) DEFAULT 0,
  meta_batismos integer DEFAULT 0,
  meta_classes_batismais integer DEFAULT 0,
  meta_receita_dizimos numeric(12,2) DEFAULT 0,
  meta_crescimento_membros integer DEFAULT 0,
  definido_por uuid REFERENCES usuarios(id),
  status text DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. ATIVIDADES_MISSIONARIO (log diario de atividades)
CREATE TABLE IF NOT EXISTS atividades_missionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missionario_id uuid REFERENCES missionarios(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'visita_pastoral', 'estudo_biblico', 'reuniao', 'evento',
    'classe_batismal', 'aconselhamento', 'treinamento',
    'viagem', 'administrativo', 'outro'
  )),
  titulo text NOT NULL,
  descricao text,
  data date NOT NULL,
  hora_inicio time,
  hora_fim time,
  igreja_id uuid REFERENCES igrejas(id),
  local_descricao text,
  pessoas_envolvidas uuid[] DEFAULT '{}',
  numero_participantes integer DEFAULT 0,
  google_event_id text,
  google_calendar_synced boolean DEFAULT false,
  resultado text,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- 4. AVALIACOES_MISSIONARIO (avaliacoes de desempenho)
CREATE TABLE IF NOT EXISTS avaliacoes_missionario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missionario_id uuid REFERENCES missionarios(id) ON DELETE CASCADE,
  avaliador_id uuid REFERENCES usuarios(id),
  tipo_periodo text NOT NULL CHECK (tipo_periodo IN ('mensal', 'trimestral', 'semestral', 'anual')),
  mes integer,
  trimestre integer,
  ano integer NOT NULL,
  nota_pastoral numeric(3,1) DEFAULT 0,
  nota_evangelismo numeric(3,1) DEFAULT 0,
  nota_lideranca numeric(3,1) DEFAULT 0,
  nota_administrativa numeric(3,1) DEFAULT 0,
  nota_financeiro numeric(3,1) DEFAULT 0,
  nota_geral numeric(3,1) DEFAULT 0,
  pontos_fortes text,
  pontos_melhoria text,
  plano_acao text,
  status text DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicada', 'vista')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. GOOGLE_CALENDAR_TOKENS (tokens OAuth2 por usuario)
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  calendar_id text DEFAULT 'primary',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_missionarios_usuario ON missionarios(usuario_id);
CREATE INDEX idx_missionarios_associacao ON missionarios(associacao_id);
CREATE INDEX idx_missionarios_uniao ON missionarios(uniao_id);
CREATE INDEX idx_missionarios_status ON missionarios(status);
CREATE INDEX idx_metas_missionario_id ON metas_missionario(missionario_id);
CREATE INDEX idx_metas_periodo ON metas_missionario(ano, tipo_periodo);
CREATE INDEX idx_atividades_missionario_id ON atividades_missionario(missionario_id);
CREATE INDEX idx_atividades_data ON atividades_missionario(data);
CREATE INDEX idx_atividades_tipo ON atividades_missionario(tipo);
CREATE INDEX idx_avaliacoes_missionario_id ON avaliacoes_missionario(missionario_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE missionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_missionario ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades_missionario ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_missionario ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- MISSIONARIOS
CREATE POLICY "missionarios_select" ON missionarios FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR (get_user_papel() = 'admin_uniao' AND uniao_id = get_user_uniao_id())
  OR (get_user_papel() = 'admin_associacao' AND associacao_id = get_user_associacao_id())
  OR usuario_id = auth.uid()
);
CREATE POLICY "missionarios_manage" ON missionarios FOR INSERT TO authenticated WITH CHECK (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);
CREATE POLICY "missionarios_update" ON missionarios FOR UPDATE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
  OR usuario_id = auth.uid()
);
CREATE POLICY "missionarios_delete" ON missionarios FOR DELETE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao')
);

-- METAS_MISSIONARIO
CREATE POLICY "metas_select" ON metas_missionario FOR SELECT TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
  OR missionario_id IN (SELECT id FROM missionarios WHERE usuario_id = auth.uid())
);
CREATE POLICY "metas_manage" ON metas_missionario FOR INSERT TO authenticated WITH CHECK (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);
CREATE POLICY "metas_update" ON metas_missionario FOR UPDATE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);
CREATE POLICY "metas_delete" ON metas_missionario FOR DELETE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);

-- ATIVIDADES_MISSIONARIO
CREATE POLICY "atividades_select" ON atividades_missionario FOR SELECT TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
  OR missionario_id IN (SELECT id FROM missionarios WHERE usuario_id = auth.uid())
);
CREATE POLICY "atividades_insert" ON atividades_missionario FOR INSERT TO authenticated WITH CHECK (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
  OR missionario_id IN (SELECT id FROM missionarios WHERE usuario_id = auth.uid())
);
CREATE POLICY "atividades_update" ON atividades_missionario FOR UPDATE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
  OR missionario_id IN (SELECT id FROM missionarios WHERE usuario_id = auth.uid())
);
CREATE POLICY "atividades_delete" ON atividades_missionario FOR DELETE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
  OR missionario_id IN (SELECT id FROM missionarios WHERE usuario_id = auth.uid())
);

-- AVALIACOES_MISSIONARIO
CREATE POLICY "avaliacoes_select" ON avaliacoes_missionario FOR SELECT TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
  OR missionario_id IN (SELECT id FROM missionarios WHERE usuario_id = auth.uid())
);
CREATE POLICY "avaliacoes_manage" ON avaliacoes_missionario FOR INSERT TO authenticated WITH CHECK (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);
CREATE POLICY "avaliacoes_update" ON avaliacoes_missionario FOR UPDATE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);
CREATE POLICY "avaliacoes_delete" ON avaliacoes_missionario FOR DELETE TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao')
);

-- GOOGLE_CALENDAR_TOKENS (somente o proprio usuario)
CREATE POLICY "gcal_select" ON google_calendar_tokens FOR SELECT TO authenticated USING (
  usuario_id = auth.uid()
);
CREATE POLICY "gcal_insert" ON google_calendar_tokens FOR INSERT TO authenticated WITH CHECK (
  usuario_id = auth.uid()
);
CREATE POLICY "gcal_update" ON google_calendar_tokens FOR UPDATE TO authenticated USING (
  usuario_id = auth.uid()
);
CREATE POLICY "gcal_delete" ON google_calendar_tokens FOR DELETE TO authenticated USING (
  usuario_id = auth.uid()
);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER tr_missionarios_updated_at BEFORE UPDATE ON missionarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_metas_updated_at BEFORE UPDATE ON metas_missionario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_avaliacoes_updated_at BEFORE UPDATE ON avaliacoes_missionario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_gcal_tokens_updated_at BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- NNE Sistema - Migration Completa
-- Criado em: 2026-02-24
-- Projeto Supabase: prqxiqykkijzpwdpqujv
-- =============================================

-- 1. UNIOES
CREATE TABLE IF NOT EXISTS unioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text NOT NULL,
  estado text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. ASSOCIACOES
CREATE TABLE IF NOT EXISTS associacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  sigla text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('associacao', 'campo', 'missao')),
  uniao_id uuid REFERENCES unioes(id) ON DELETE CASCADE,
  estado text,
  cidade text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. IGREJAS
CREATE TABLE IF NOT EXISTS igrejas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  associacao_id uuid REFERENCES associacoes(id) ON DELETE CASCADE,
  uniao_id uuid REFERENCES unioes(id) ON DELETE CASCADE,
  endereco_rua text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_estado text,
  endereco_cep text,
  coordenadas_lat double precision,
  coordenadas_lng double precision,
  pastor text,
  telefone text,
  email text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. USUARIOS (perfil vinculado ao Supabase Auth)
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  papel text NOT NULL DEFAULT 'membro' CHECK (papel IN (
    'admin', 'admin_uniao', 'admin_associacao',
    'diretor_es', 'professor_es', 'secretario_es',
    'tesoureiro', 'secretario_igreja', 'membro'
  )),
  uniao_id uuid REFERENCES unioes(id),
  associacao_id uuid REFERENCES associacoes(id),
  igreja_id uuid REFERENCES igrejas(id),
  classe_es_id uuid,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. PESSOAS (membros e interessados)
CREATE TABLE IF NOT EXISTS pessoas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  telefone text,
  foto text,
  foto_aprovada boolean DEFAULT false,
  foto_pendente boolean DEFAULT false,
  data_nascimento date,
  sexo text CHECK (sexo IN ('masculino', 'feminino')),
  estado_civil text CHECK (estado_civil IN (
    'solteiro', 'casado', 'divorciado', 'viuvo', 'separado', 'uniao_estavel'
  )),
  profissao text,
  escolaridade text,
  endereco_rua text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_estado text,
  endereco_cep text,
  coordenadas_lat double precision,
  coordenadas_lng double precision,
  tipo text NOT NULL DEFAULT 'interessado' CHECK (tipo IN ('membro', 'interessado')),
  data_batismo date,
  igreja_id uuid REFERENCES igrejas(id) ON DELETE SET NULL,
  associacao_id uuid REFERENCES associacoes(id) ON DELETE SET NULL,
  uniao_id uuid REFERENCES unioes(id) ON DELETE SET NULL,
  classe_es_id uuid,
  cargo text,
  cargos_adicionais text[] DEFAULT '{}',
  familia_id uuid,
  parentesco text,
  ativo boolean DEFAULT true,
  motivo_inativo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. FAMILIAS
CREATE TABLE IF NOT EXISTS familias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  igreja_id uuid REFERENCES igrejas(id) ON DELETE SET NULL,
  endereco_rua text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_estado text,
  endereco_cep text,
  coordenadas_lat double precision,
  coordenadas_lng double precision,
  membros uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 7. TRANSFERENCIAS
CREATE TABLE IF NOT EXISTS transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid REFERENCES pessoas(id) ON DELETE CASCADE,
  igreja_origem_id uuid REFERENCES igrejas(id),
  igreja_destino_id uuid REFERENCES igrejas(id),
  tipo text NOT NULL CHECK (tipo IN ('transferencia', 'carta')),
  status text NOT NULL DEFAULT 'solicitada' CHECK (status IN (
    'solicitada', 'aprovada', 'concluida', 'rejeitada'
  )),
  motivo text,
  observacao text,
  solicitado_por uuid REFERENCES usuarios(id),
  aprovado_por uuid REFERENCES usuarios(id),
  data_aprovacao timestamptz,
  data_conclusao timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 8. DADOS_FINANCEIROS
CREATE TABLE IF NOT EXISTS dados_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  igreja_id uuid REFERENCES igrejas(id) ON DELETE CASCADE,
  associacao_id uuid REFERENCES associacoes(id),
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  -- Receitas (10 categorias)
  receita_dizimos numeric(12,2) DEFAULT 0,
  receita_oferta_regular numeric(12,2) DEFAULT 0,
  receita_oferta_especial numeric(12,2) DEFAULT 0,
  receita_oferta_missoes numeric(12,2) DEFAULT 0,
  receita_oferta_agradecimento numeric(12,2) DEFAULT 0,
  receita_oferta_es numeric(12,2) DEFAULT 0,
  receita_doacoes numeric(12,2) DEFAULT 0,
  receita_fundo_assistencial numeric(12,2) DEFAULT 0,
  receita_proventos_imoveis numeric(12,2) DEFAULT 0,
  receita_outras numeric(12,2) DEFAULT 0,
  -- Despesas (7 categorias)
  despesa_salarios numeric(12,2) DEFAULT 0,
  despesa_manutencao numeric(12,2) DEFAULT 0,
  despesa_agua numeric(12,2) DEFAULT 0,
  despesa_energia numeric(12,2) DEFAULT 0,
  despesa_internet numeric(12,2) DEFAULT 0,
  despesa_material_es numeric(12,2) DEFAULT 0,
  despesa_outras numeric(12,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(igreja_id, mes, ano)
);

-- 9. CLASSES_ES (Escola Sabatina)
CREATE TABLE IF NOT EXISTS classes_es (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  faixa_etaria text,
  igreja_id uuid REFERENCES igrejas(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES pessoas(id) ON DELETE SET NULL,
  auxiliar_id uuid REFERENCES pessoas(id) ON DELETE SET NULL,
  membros uuid[] DEFAULT '{}',
  ativa boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Vincular FK de usuarios.classe_es_id e pessoas.classe_es_id
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_classe_es
  FOREIGN KEY (classe_es_id) REFERENCES classes_es(id) ON DELETE SET NULL;

ALTER TABLE pessoas ADD CONSTRAINT fk_pessoas_classe_es
  FOREIGN KEY (classe_es_id) REFERENCES classes_es(id) ON DELETE SET NULL;

-- 10. PRESENCA_ES
CREATE TABLE IF NOT EXISTS presenca_es (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid REFERENCES classes_es(id) ON DELETE CASCADE,
  data date NOT NULL,
  trimestre integer NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  ano integer NOT NULL,
  presentes uuid[] DEFAULT '{}',
  ausentes uuid[] DEFAULT '{}',
  visitantes integer DEFAULT 0,
  oferta numeric(10,2) DEFAULT 0,
  licao_estudada integer,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- 11. CLASSES_BATISMAIS
CREATE TABLE IF NOT EXISTS classes_batismais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  igreja_id uuid REFERENCES igrejas(id) ON DELETE CASCADE,
  instrutor text NOT NULL,
  data_inicio date NOT NULL,
  data_previsao_termino date,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada')),
  alunos uuid[] DEFAULT '{}',
  licoes jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- 12. RELATORIOS_MISSIONARIOS
CREATE TABLE IF NOT EXISTS relatorios_missionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid REFERENCES pessoas(id) ON DELETE CASCADE,
  igreja_id uuid REFERENCES igrejas(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  estudos_biblicos integer DEFAULT 0,
  visitas_missionarias integer DEFAULT 0,
  literatura_distribuida integer DEFAULT 0,
  pessoas_contatadas integer DEFAULT 0,
  convites_feitos integer DEFAULT 0,
  pessoas_trazidas integer DEFAULT 0,
  horas_trabalho numeric(6,1) DEFAULT 0,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- 13. CONTAGEM_MENSAL
CREATE TABLE IF NOT EXISTS contagem_mensal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  igreja_id uuid REFERENCES igrejas(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  total_membros integer DEFAULT 0,
  total_interessados integer DEFAULT 0,
  media_presenca numeric(6,1) DEFAULT 0,
  batismos integer DEFAULT 0,
  transferencias_entrada integer DEFAULT 0,
  transferencias_saida integer DEFAULT 0,
  obitos integer DEFAULT 0,
  exclusoes integer DEFAULT 0,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(igreja_id, mes, ano)
);

-- 14. CADASTRO_RESPOSTAS (formulario 12 etapas)
CREATE TABLE IF NOT EXISTS cadastro_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Etapa 0: LGPD
  lgpd_aceite boolean DEFAULT false,
  lgpd_timestamp timestamptz,
  -- Etapa 1: Dados Pessoais
  nome text,
  email text,
  telefone text,
  cep text,
  rua text,
  numero text,
  bairro text,
  cidade text,
  estado text,
  -- Etapa 2: Nascimento
  data_nascimento date,
  sexo text,
  faixa_etaria text,
  -- Etapa 3: Estado Civil
  estado_civil text,
  escolaridade text,
  profissao text,
  -- Etapa 4: Tempo de Membro
  tempo_membro text,
  -- Etapa 5: Descoberta
  como_conheceu text,
  como_conheceu_outro text,
  -- Etapa 6: Localizacao
  distancia_igreja text,
  meio_transporte text,
  igreja_frequenta text,
  -- Etapa 7: Perfil
  pontos_fortes text[] DEFAULT '{}',
  pontos_fracos text[] DEFAULT '{}',
  cargos_ocupa text[] DEFAULT '{}',
  -- Etapa 8: Satisfacao (13 itens x 4 pontos)
  satisfacao jsonb DEFAULT '{}',
  -- Etapa 9: Prioridades (22 areas)
  prioridades text[] DEFAULT '{}',
  -- Etapa 10: Participacao (6 itens x 5 pontos)
  participacao jsonb DEFAULT '{}',
  -- Etapa 11: Departamentos
  opiniao_departamentos text,
  -- Metadados
  igreja_id uuid REFERENCES igrejas(id) ON DELETE SET NULL,
  associacao_id uuid REFERENCES associacoes(id) ON DELETE SET NULL,
  uniao_id uuid REFERENCES unioes(id) ON DELETE SET NULL,
  etapa_atual integer DEFAULT 0,
  completo boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 15. PLANOS_VISITA
CREATE TABLE IF NOT EXISTS planos_visita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  data date NOT NULL,
  visitador_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  igreja_id uuid REFERENCES igrejas(id) ON DELETE CASCADE,
  paradas jsonb DEFAULT '[]',
  rota_otimizada boolean DEFAULT false,
  distancia_total numeric(10,2),
  tempo_estimado integer,
  status text NOT NULL DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_andamento', 'concluido')),
  created_at timestamptz DEFAULT now()
);

-- 16. RECEITA_CAMPO
CREATE TABLE IF NOT EXISTS receita_campo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  associacao_id uuid REFERENCES associacoes(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  total_dizimos numeric(12,2) DEFAULT 0,
  total_ofertas numeric(12,2) DEFAULT 0,
  total_geral numeric(12,2) DEFAULT 0,
  igrejas jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  UNIQUE(associacao_id, mes, ano)
);

-- =============================================
-- INDEXES para performance
-- =============================================
CREATE INDEX idx_associacoes_uniao ON associacoes(uniao_id);
CREATE INDEX idx_igrejas_associacao ON igrejas(associacao_id);
CREATE INDEX idx_igrejas_uniao ON igrejas(uniao_id);
CREATE INDEX idx_usuarios_igreja ON usuarios(igreja_id);
CREATE INDEX idx_usuarios_associacao ON usuarios(associacao_id);
CREATE INDEX idx_usuarios_uniao ON usuarios(uniao_id);
CREATE INDEX idx_usuarios_papel ON usuarios(papel);
CREATE INDEX idx_pessoas_igreja ON pessoas(igreja_id);
CREATE INDEX idx_pessoas_associacao ON pessoas(associacao_id);
CREATE INDEX idx_pessoas_uniao ON pessoas(uniao_id);
CREATE INDEX idx_pessoas_tipo ON pessoas(tipo);
CREATE INDEX idx_pessoas_nome ON pessoas(nome);
CREATE INDEX idx_transferencias_status ON transferencias(status);
CREATE INDEX idx_transferencias_pessoa ON transferencias(pessoa_id);
CREATE INDEX idx_dados_financeiros_igreja_periodo ON dados_financeiros(igreja_id, ano, mes);
CREATE INDEX idx_classes_es_igreja ON classes_es(igreja_id);
CREATE INDEX idx_presenca_es_classe ON presenca_es(classe_id);
CREATE INDEX idx_presenca_es_data ON presenca_es(data);
CREATE INDEX idx_relatorios_missionarios_pessoa ON relatorios_missionarios(pessoa_id);
CREATE INDEX idx_relatorios_missionarios_igreja ON relatorios_missionarios(igreja_id);
CREATE INDEX idx_contagem_mensal_igreja ON contagem_mensal(igreja_id);
CREATE INDEX idx_cadastro_respostas_igreja ON cadastro_respostas(igreja_id);

-- =============================================
-- RLS (Row Level Security) - Ativar em todas
-- =============================================
ALTER TABLE unioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE associacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE igrejas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes_es ENABLE ROW LEVEL SECURITY;
ALTER TABLE presenca_es ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes_batismais ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_missionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE contagem_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE cadastro_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_visita ENABLE ROW LEVEL SECURITY;
ALTER TABLE receita_campo ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper: funcao para pegar o papel do usuario
CREATE OR REPLACE FUNCTION get_user_papel()
RETURNS text AS $$
  SELECT papel FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_uniao_id()
RETURNS uuid AS $$
  SELECT uniao_id FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_associacao_id()
RETURNS uuid AS $$
  SELECT associacao_id FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_igreja_id()
RETURNS uuid AS $$
  SELECT igreja_id FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- UNIOES: todos autenticados podem ler
CREATE POLICY "unioes_select" ON unioes FOR SELECT TO authenticated USING (true);
CREATE POLICY "unioes_admin" ON unioes FOR ALL TO authenticated USING (get_user_papel() = 'admin');

-- ASSOCIACOES: leitura hierarquica
CREATE POLICY "associacoes_select" ON associacoes FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR uniao_id = get_user_uniao_id()
  OR id = get_user_associacao_id()
);
CREATE POLICY "associacoes_admin" ON associacoes FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao')
);

-- IGREJAS: leitura hierarquica
CREATE POLICY "igrejas_select" ON igrejas FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR uniao_id = get_user_uniao_id()
  OR associacao_id = get_user_associacao_id()
  OR id = get_user_igreja_id()
);
CREATE POLICY "igrejas_manage" ON igrejas FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);

-- USUARIOS: leitura propria + hierarquica
CREATE POLICY "usuarios_self" ON usuarios FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "usuarios_select" ON usuarios FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR (get_user_papel() = 'admin_uniao' AND uniao_id = get_user_uniao_id())
  OR (get_user_papel() = 'admin_associacao' AND associacao_id = get_user_associacao_id())
);
CREATE POLICY "usuarios_admin" ON usuarios FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao')
);
CREATE POLICY "usuarios_self_update" ON usuarios FOR UPDATE TO authenticated USING (id = auth.uid());

-- PESSOAS: leitura hierarquica
CREATE POLICY "pessoas_select" ON pessoas FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR (get_user_papel() = 'admin_uniao' AND uniao_id = get_user_uniao_id())
  OR (get_user_papel() = 'admin_associacao' AND associacao_id = get_user_associacao_id())
  OR igreja_id = get_user_igreja_id()
);
CREATE POLICY "pessoas_manage" ON pessoas FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
);

-- FAMILIAS
CREATE POLICY "familias_select" ON familias FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR igreja_id = get_user_igreja_id()
);
CREATE POLICY "familias_manage" ON familias FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
);

-- TRANSFERENCIAS
CREATE POLICY "transferencias_select" ON transferencias FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR igreja_origem_id = get_user_igreja_id()
  OR igreja_destino_id = get_user_igreja_id()
);
CREATE POLICY "transferencias_manage" ON transferencias FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
);

-- DADOS_FINANCEIROS
CREATE POLICY "financeiro_select" ON dados_financeiros FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR (get_user_papel() = 'admin_uniao' AND associacao_id IN (SELECT id FROM associacoes WHERE uniao_id = get_user_uniao_id()))
  OR (get_user_papel() = 'admin_associacao' AND associacao_id = get_user_associacao_id())
  OR (get_user_papel() IN ('tesoureiro', 'secretario_igreja') AND igreja_id = get_user_igreja_id())
);
CREATE POLICY "financeiro_manage" ON dados_financeiros FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'tesoureiro')
);

-- CLASSES_ES
CREATE POLICY "classes_es_select" ON classes_es FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR igreja_id = get_user_igreja_id()
);
CREATE POLICY "classes_es_manage" ON classes_es FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'diretor_es')
);

-- PRESENCA_ES
CREATE POLICY "presenca_es_select" ON presenca_es FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR classe_id IN (SELECT id FROM classes_es WHERE igreja_id = get_user_igreja_id())
);
CREATE POLICY "presenca_es_manage" ON presenca_es FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'diretor_es', 'professor_es', 'secretario_es')
);

-- CLASSES_BATISMAIS
CREATE POLICY "classes_batismais_select" ON classes_batismais FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR igreja_id = get_user_igreja_id()
);
CREATE POLICY "classes_batismais_manage" ON classes_batismais FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
);

-- RELATORIOS_MISSIONARIOS
CREATE POLICY "missionarios_select" ON relatorios_missionarios FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR igreja_id = get_user_igreja_id()
);
CREATE POLICY "missionarios_manage" ON relatorios_missionarios FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
  OR pessoa_id IN (SELECT id FROM pessoas WHERE id::text = auth.uid()::text)
);

-- CONTAGEM_MENSAL
CREATE POLICY "contagem_select" ON contagem_mensal FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR igreja_id = get_user_igreja_id()
);
CREATE POLICY "contagem_manage" ON contagem_mensal FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
);

-- CADASTRO_RESPOSTAS
CREATE POLICY "cadastro_select" ON cadastro_respostas FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR igreja_id = get_user_igreja_id()
);
CREATE POLICY "cadastro_insert" ON cadastro_respostas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "cadastro_manage" ON cadastro_respostas FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
);

-- PLANOS_VISITA
CREATE POLICY "planos_select" ON planos_visita FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR igreja_id = get_user_igreja_id()
  OR visitador_id = auth.uid()
);
CREATE POLICY "planos_manage" ON planos_visita FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja')
  OR visitador_id = auth.uid()
);

-- RECEITA_CAMPO
CREATE POLICY "receita_campo_select" ON receita_campo FOR SELECT TO authenticated USING (
  get_user_papel() = 'admin'
  OR (get_user_papel() = 'admin_uniao' AND associacao_id IN (SELECT id FROM associacoes WHERE uniao_id = get_user_uniao_id()))
  OR (get_user_papel() = 'admin_associacao' AND associacao_id = get_user_associacao_id())
);
CREATE POLICY "receita_campo_manage" ON receita_campo FOR ALL TO authenticated USING (
  get_user_papel() IN ('admin', 'admin_uniao', 'admin_associacao')
);

-- =============================================
-- TRIGGER: auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_pessoas_updated_at BEFORE UPDATE ON pessoas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_dados_financeiros_updated_at BEFORE UPDATE ON dados_financeiros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_cadastro_respostas_updated_at BEFORE UPDATE ON cadastro_respostas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- STORAGE BUCKET para fotos
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos', 'fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "fotos_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos');

CREATE POLICY "fotos_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos');

CREATE POLICY "fotos_public_read" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'fotos');

CREATE POLICY "fotos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fotos' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND papel IN ('admin', 'admin_uniao', 'admin_associacao'))
  ));

-- =============================================
-- ESCOLA BÍBLICA - Schema Completo
-- Módulos, Pontos, Turmas, Alunos, Aulas,
-- Presenças, Liberações, Respostas, Progresso
-- =============================================

-- ============ CONTEÚDO ============

-- Módulos (Princípios de Fé, Crenças Fundamentais)
CREATE TABLE IF NOT EXISTS eb_modulos (
  id TEXT PRIMARY KEY, -- 'principios_fe' ou 'crencas_fundamentais'
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  descricao TEXT,
  capa_url TEXT,
  total_pontos INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'principios_fe',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pontos doutrinários (lições de cada módulo)
-- Perguntas, seções e compromissos em JSONB (flexível como Firestore)
CREATE TABLE IF NOT EXISTS eb_pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id TEXT NOT NULL REFERENCES eb_modulos(id) ON DELETE CASCADE,
  ponto_numero INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  introducao TEXT,
  imagem_url TEXT,
  video_url TEXT,
  video_thumbnail TEXT,
  -- Conteúdo estruturado: [{ id, titulo, tipo, conteudo: [{ tipo, texto, itens }], subSecoes }]
  secoes JSONB DEFAULT '[]'::jsonb,
  -- Perguntas: [{ id, numero, texto, opcoes: [{ id, texto }], resposta_correta, explicacao, referencias }]
  perguntas JSONB DEFAULT '[]'::jsonb,
  -- Compromissos de fé: [{ id, texto }]
  compromissos_fe JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(modulo_id, ponto_numero)
);

-- ============ TURMAS & GESTÃO ============

-- Liberação individual de quiz (professor → aluno)
CREATE TABLE IF NOT EXISTS eb_liberacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES classes_biblicas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES classe_biblica_alunos(id) ON DELETE CASCADE,
  ponto_numero INTEGER NOT NULL,
  liberado_por UUID,
  liberado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(turma_id, aluno_id, ponto_numero)
);

-- Respostas dos alunos (quiz completo)
CREATE TABLE IF NOT EXISTS classe_biblica_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id UUID NOT NULL REFERENCES classes_biblicas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES classe_biblica_alunos(id) ON DELETE CASCADE,
  aluno_nome TEXT,
  ponto_numero INTEGER NOT NULL,
  ponto_titulo TEXT,
  pontuacao INTEGER NOT NULL DEFAULT 0,
  total_perguntas INTEGER NOT NULL DEFAULT 0,
  percentual_acerto NUMERIC(5,2) NOT NULL DEFAULT 0,
  respostas JSONB DEFAULT '{}'::jsonb,      -- { "pergunta_id": "opcao_selecionada" }
  compromissos JSONB DEFAULT '{}'::jsonb,   -- { "compromisso_id": true/false }
  revisado_por_professor BOOLEAN NOT NULL DEFAULT false,
  professor_comentario TEXT,
  submetido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(classe_id, aluno_id, ponto_numero) -- 1 resposta por aluno por ponto
);

-- Progresso pessoal do aluno (cache rápido)
CREATE TABLE IF NOT EXISTS eb_progresso_pessoal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  modulo_id TEXT NOT NULL REFERENCES eb_modulos(id) ON DELETE CASCADE,
  pontos_concluidos INTEGER NOT NULL DEFAULT 0,
  total_pontos INTEGER NOT NULL DEFAULT 0,
  percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  media_acerto NUMERIC(5,2) NOT NULL DEFAULT 0,
  ultimo_ponto INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pessoa_id, modulo_id)
);

-- ============ ÍNDICES ============

CREATE INDEX IF NOT EXISTS idx_eb_pontos_modulo ON eb_pontos(modulo_id, ponto_numero);
CREATE INDEX IF NOT EXISTS idx_cb_respostas_classe ON classe_biblica_respostas(classe_id);
CREATE INDEX IF NOT EXISTS idx_cb_respostas_aluno ON classe_biblica_respostas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_eb_liberacoes_turma ON eb_liberacoes(turma_id, aluno_id);
CREATE INDEX IF NOT EXISTS idx_eb_progresso_pessoa ON eb_progresso_pessoal(pessoa_id, modulo_id);

-- ============ DADOS INICIAIS ============

INSERT INTO eb_modulos (id, titulo, subtitulo, descricao, total_pontos, tipo)
VALUES
  ('principios_fe', 'Princípios de Fé', '37 Pontos Doutrinários', 'Estudo completo dos 37 princípios de fé da Igreja Adventista do Sétimo Dia - Movimento de Reforma', 37, 'principios_fe'),
  ('crencas_fundamentais', 'Crenças Fundamentais', '25 Temas Essenciais', 'Estudo das 25 crenças fundamentais da fé reformista', 25, 'crencas_fundamentais')
ON CONFLICT (id) DO NOTHING;

-- ============ RLS ============

ALTER TABLE eb_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_liberacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE classe_biblica_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_progresso_pessoal ENABLE ROW LEVEL SECURITY;

-- Conteúdo: leitura para todos (alunos logados acessam)
CREATE POLICY "eb_modulos_read" ON eb_modulos FOR SELECT USING (true);
CREATE POLICY "eb_pontos_read" ON eb_pontos FOR SELECT USING (true);

-- Conteúdo: escrita para autenticados (admin/professor)
CREATE POLICY "eb_modulos_write" ON eb_modulos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "eb_pontos_write" ON eb_pontos FOR ALL USING (auth.role() = 'authenticated');

-- Liberações, respostas e progresso: autenticados
CREATE POLICY "eb_liberacoes_all" ON eb_liberacoes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "cb_respostas_all" ON classe_biblica_respostas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "eb_progresso_all" ON eb_progresso_pessoal FOR ALL USING (auth.role() = 'authenticated');

-- ============ VIEW: Resumo por aula ============

CREATE OR REPLACE VIEW eb_resumos_aula AS
SELECT
  a.classe_id,
  a.ponto_numero,
  a.ponto_titulo,
  a.data_aula,
  a.questionario_liberado,
  COUNT(DISTINCT p.id) FILTER (WHERE p.presente = true) AS presentes,
  COUNT(DISTINCT p.id) FILTER (WHERE p.presente = false) AS ausentes,
  COUNT(DISTINCT r.id) AS respostas_enviadas,
  COALESCE(AVG(r.percentual_acerto), 0) AS media_acerto
FROM classe_biblica_aulas a
LEFT JOIN classe_biblica_aula_presenca p ON p.aula_id = a.id
LEFT JOIN classe_biblica_respostas r ON r.classe_id = a.classe_id AND r.ponto_numero = a.ponto_numero
GROUP BY a.id, a.classe_id, a.ponto_numero, a.ponto_titulo, a.data_aula, a.questionario_liberado;

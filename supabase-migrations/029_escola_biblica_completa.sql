-- =============================================
-- Migration 029: Escola Bíblica Completa
-- Expandir classes_biblicas com hierarquia organizacional,
-- aulas, questionários, respostas e relatórios
-- Date: 2026-03-23
-- =============================================

-- =============================================
-- 1. EXPANDIR classes_biblicas (turmas)
-- Adicionar hierarquia completa: professor → igreja → associação → união
-- =============================================

ALTER TABLE public.classes_biblicas
  ADD COLUMN IF NOT EXISTS modulo_id text DEFAULT 'principios_fe' CHECK (modulo_id IN ('principios_fe', 'crencas_fundamentais')),
  ADD COLUMN IF NOT EXISTS modulo_titulo text,
  ADD COLUMN IF NOT EXISTS instrutor_nome text,
  ADD COLUMN IF NOT EXISTS instrutor_foto_url text,
  ADD COLUMN IF NOT EXISTS associacao_id uuid REFERENCES public.associacoes(id),
  ADD COLUMN IF NOT EXISTS uniao_id uuid REFERENCES public.unioes(id),
  ADD COLUMN IF NOT EXISTS formato_typeform boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS classe_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_online text,
  ADD COLUMN IF NOT EXISTS total_alunos integer DEFAULT 0;

-- Renomear status para incluir 'pausada'
ALTER TABLE public.classes_biblicas DROP CONSTRAINT IF EXISTS classes_biblicas_status_check;
ALTER TABLE public.classes_biblicas ADD CONSTRAINT classes_biblicas_status_check
  CHECK (status IN ('ativa', 'concluida', 'cancelada', 'pausada'));

-- =============================================
-- 2. EXPANDIR classe_biblica_alunos
-- Adicionar progresso detalhado e frequência
-- =============================================

ALTER TABLE public.classe_biblica_alunos
  ADD COLUMN IF NOT EXISTS aluno_nome text,
  ADD COLUMN IF NOT EXISTS aluno_email text,
  ADD COLUMN IF NOT EXISTS aluno_telefone text,
  ADD COLUMN IF NOT EXISTS aluno_tipo text DEFAULT 'presencial' CHECK (aluno_tipo IN ('app', 'web', 'presencial')),
  ADD COLUMN IF NOT EXISTS aluno_foto_url text,
  ADD COLUMN IF NOT EXISTS aluno_igreja_id uuid REFERENCES public.igrejas(id),
  ADD COLUMN IF NOT EXISTS papel text DEFAULT 'aluno' CHECK (papel IN ('aluno', 'ouvinte')),
  ADD COLUMN IF NOT EXISTS firebase_uid text,
  -- Progresso detalhado
  ADD COLUMN IF NOT EXISTS total_pontos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pontos_concluidos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_ponto integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_progresso numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS media_acerto numeric(5,2) DEFAULT 0,
  -- Frequência
  ADD COLUMN IF NOT EXISTS total_aulas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS presencas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_presenca numeric(5,2) DEFAULT 0;

-- =============================================
-- 3. AULAS (professor ativa a aula)
-- =============================================

CREATE TABLE IF NOT EXISTS public.classe_biblica_aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid NOT NULL REFERENCES public.classes_biblicas(id) ON DELETE CASCADE,
  ponto_numero integer NOT NULL,
  ponto_titulo text,

  -- Professor que ministrou
  professor_id uuid REFERENCES auth.users(id),
  professor_nome text,

  -- Controle da aula
  data_aula timestamptz NOT NULL DEFAULT now(),
  ativada boolean DEFAULT false,
  ativada_em timestamptz,

  -- Questionário
  questionario_liberado boolean DEFAULT false,
  questionario_liberado_em timestamptz,
  questionario_liberado_por uuid REFERENCES auth.users(id),

  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 4. PRESENÇA POR AULA (simplificado: presente ou ausente)
-- =============================================

CREATE TABLE IF NOT EXISTS public.classe_biblica_aula_presenca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.classe_biblica_aulas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.classe_biblica_alunos(id) ON DELETE CASCADE,
  aluno_nome text,
  presente boolean DEFAULT false,
  tipo_presenca text DEFAULT 'presencial' CHECK (tipo_presenca IN ('presencial', 'online')),
  registrado_por uuid REFERENCES auth.users(id),
  registrado_em timestamptz DEFAULT now(),
  UNIQUE(aula_id, aluno_id)
);

-- =============================================
-- 5. LIBERAÇÃO INDIVIDUAL DO QUESTIONÁRIO
-- =============================================

CREATE TABLE IF NOT EXISTS public.classe_biblica_liberacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.classe_biblica_aulas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.classe_biblica_alunos(id) ON DELETE CASCADE,
  aluno_nome text,
  liberado_por uuid REFERENCES auth.users(id),
  liberado_por_nome text,
  liberado_em timestamptz DEFAULT now(),
  motivo text, -- ex: 'Estudo individual', 'Reposição'
  UNIQUE(aula_id, aluno_id)
);

-- =============================================
-- 6. RESPOSTAS DOS ALUNOS AOS QUESTIONÁRIOS
-- =============================================

CREATE TABLE IF NOT EXISTS public.classe_biblica_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid NOT NULL REFERENCES public.classes_biblicas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.classe_biblica_alunos(id) ON DELETE CASCADE,
  aula_id uuid REFERENCES public.classe_biblica_aulas(id),
  aluno_nome text,
  firebase_uid text,

  -- Ponto/Tema respondido
  ponto_numero integer NOT NULL,
  ponto_titulo text,
  modulo_id text, -- principios_fe | crencas_fundamentais

  -- Respostas
  respostas jsonb NOT NULL DEFAULT '{}', -- {"q1": "b", "q2": "a", "q3": "c"}
  pontuacao integer DEFAULT 0,
  total_perguntas integer DEFAULT 0,
  percentual_acerto numeric(5,2) DEFAULT 0,

  -- Compromissos de fé
  compromissos_fe jsonb DEFAULT '{}', -- {"cf1": true, "cf2": true, "cf3": false}

  -- Timestamps
  submetido_em timestamptz DEFAULT now(),

  -- Revisão do professor
  revisado_por_professor boolean DEFAULT false,
  professor_comentario text,
  revisado_em timestamptz,

  UNIQUE(classe_id, aluno_id, ponto_numero)
);

-- =============================================
-- 7. RESUMOS AGREGADOS POR PONTO (dashboard professor)
-- =============================================

CREATE TABLE IF NOT EXISTS public.classe_biblica_resumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid NOT NULL REFERENCES public.classes_biblicas(id) ON DELETE CASCADE,
  ponto_numero integer NOT NULL,
  ponto_titulo text,
  aula_id uuid REFERENCES public.classe_biblica_aulas(id),
  data_ultima_aula timestamptz,

  -- Presença
  total_alunos integer DEFAULT 0,
  presentes integer DEFAULT 0,
  ausentes integer DEFAULT 0,
  percentual_presenca numeric(5,2) DEFAULT 0,

  -- Questionário
  alunos_que_responderam integer DEFAULT 0,
  media_acerto numeric(5,2) DEFAULT 0,
  maior_nota numeric(5,2) DEFAULT 0,
  menor_nota numeric(5,2) DEFAULT 0,

  atualizado_em timestamptz DEFAULT now(),
  UNIQUE(classe_id, ponto_numero)
);

-- =============================================
-- 8. ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_cb_aulas_classe ON public.classe_biblica_aulas(classe_id);
CREATE INDEX IF NOT EXISTS idx_cb_aulas_ponto ON public.classe_biblica_aulas(ponto_numero);
CREATE INDEX IF NOT EXISTS idx_cb_presenca_aula ON public.classe_biblica_aula_presenca(aula_id);
CREATE INDEX IF NOT EXISTS idx_cb_respostas_classe ON public.classe_biblica_respostas(classe_id);
CREATE INDEX IF NOT EXISTS idx_cb_respostas_aluno ON public.classe_biblica_respostas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_cb_resumos_classe ON public.classe_biblica_resumos(classe_id);
CREATE INDEX IF NOT EXISTS idx_classes_biblicas_igreja ON public.classes_biblicas(igreja_id);
CREATE INDEX IF NOT EXISTS idx_classes_biblicas_modulo ON public.classes_biblicas(modulo_id);
CREATE INDEX IF NOT EXISTS idx_classes_biblicas_instrutor ON public.classes_biblicas(instrutor_id);
CREATE INDEX IF NOT EXISTS idx_cb_alunos_firebase ON public.classe_biblica_alunos(firebase_uid);

-- =============================================
-- 9. RLS POLICIES
-- =============================================

ALTER TABLE public.classe_biblica_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_aula_presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_liberacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_resumos ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_all" ON public.classe_biblica_aulas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.classe_biblica_aula_presenca FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.classe_biblica_liberacoes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.classe_biblica_respostas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.classe_biblica_resumos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated read
CREATE POLICY "authenticated_read" ON public.classe_biblica_aulas FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.classe_biblica_aula_presenca FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.classe_biblica_liberacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.classe_biblica_respostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.classe_biblica_resumos FOR SELECT TO authenticated USING (true);

-- Authenticated write
CREATE POLICY "authenticated_write" ON public.classe_biblica_aulas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classe_biblica_aulas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.classe_biblica_aula_presenca FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classe_biblica_aula_presenca FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.classe_biblica_liberacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.classe_biblica_respostas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classe_biblica_respostas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.classe_biblica_resumos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classe_biblica_resumos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Authenticated delete (apenas professor pode deletar)
CREATE POLICY "authenticated_delete" ON public.classe_biblica_aulas FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete" ON public.classe_biblica_aula_presenca FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete" ON public.classe_biblica_liberacoes FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete" ON public.classe_biblica_respostas FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_delete" ON public.classe_biblica_resumos FOR DELETE TO authenticated USING (true);

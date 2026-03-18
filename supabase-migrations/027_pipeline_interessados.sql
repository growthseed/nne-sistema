-- =============================================
-- Migration 027: Pipeline de Conversão de Interessados
-- Funil: Contato → Classe Bíblica → Estudos → Decisão → Batismo → Integração
-- Date: 2026-03-18
-- =============================================

-- Etapa do interessado no funil de conversão
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS etapa_funil text DEFAULT 'contato';
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS score_engajamento integer DEFAULT 0;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS data_ultimo_contato date;
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES auth.users(id);
ALTER TABLE public.pessoas ADD COLUMN IF NOT EXISTS observacoes_funil text;

-- Índices para pipeline queries
CREATE INDEX IF NOT EXISTS idx_pessoas_etapa_funil ON public.pessoas(etapa_funil);
CREATE INDEX IF NOT EXISTS idx_pessoas_score ON public.pessoas(score_engajamento DESC);
CREATE INDEX IF NOT EXISTS idx_pessoas_responsavel ON public.pessoas(responsavel_id);

-- =============================================
-- Classe Bíblica (estudos com interessados)
-- =============================================
CREATE TABLE IF NOT EXISTS public.classes_biblicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  igreja_id uuid REFERENCES public.igrejas(id),
  instrutor_id uuid REFERENCES auth.users(id),
  data_inicio date,
  data_previsao_termino date,
  status text DEFAULT 'ativa' CHECK (status IN ('ativa', 'concluida', 'cancelada')),
  total_licoes integer DEFAULT 28,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Alunos da classe bíblica
CREATE TABLE IF NOT EXISTS public.classe_biblica_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid NOT NULL REFERENCES public.classes_biblicas(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  data_ingresso date DEFAULT CURRENT_DATE,
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'desistente', 'batizado', 'transferido')),
  licoes_concluidas integer DEFAULT 0,
  decisao_batismo boolean DEFAULT false,
  data_decisao date,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(classe_id, pessoa_id)
);

-- Registro de presença por lição
CREATE TABLE IF NOT EXISTS public.classe_biblica_presenca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid NOT NULL REFERENCES public.classes_biblicas(id) ON DELETE CASCADE,
  licao_numero integer NOT NULL,
  licao_titulo text,
  data date NOT NULL,
  presentes uuid[] DEFAULT '{}',
  ausentes uuid[] DEFAULT '{}',
  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- Histórico de interações (timeline do interessado/membro)
-- =============================================
CREATE TABLE IF NOT EXISTS public.interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('visita', 'estudo_biblico', 'ligacao', 'whatsapp', 'evento', 'classe_biblica', 'culto', 'es', 'outro')),
  descricao text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  realizado_por uuid REFERENCES auth.users(id),
  igreja_id uuid REFERENCES public.igrejas(id),
  resultado text, -- 'positivo', 'neutro', 'negativo'
  proxima_acao text,
  data_proxima_acao date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interacoes_pessoa ON public.interacoes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_data ON public.interacoes(data DESC);
CREATE INDEX IF NOT EXISTS idx_interacoes_tipo ON public.interacoes(tipo);

-- =============================================
-- Notificações de aniversário
-- =============================================
CREATE TABLE IF NOT EXISTS public.notificacoes_aniversario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  tipo text DEFAULT 'whatsapp',
  status text DEFAULT 'enviado',
  mensagem text,
  enviado_por uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(pessoa_id, ano)
);

-- =============================================
-- Programa "Primeiros 365 dias" pós-batismo
-- =============================================
CREATE TABLE IF NOT EXISTS public.acompanhamento_novo_membro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  padrinho_id uuid REFERENCES public.pessoas(id),
  data_batismo date NOT NULL,
  -- Checklist
  visita_boas_vindas boolean DEFAULT false,
  visita_boas_vindas_data date,
  integracao_es boolean DEFAULT false,
  integracao_es_data date,
  mentor_designado boolean DEFAULT false,
  mentor_designado_data date,
  envolvimento_departamento boolean DEFAULT false,
  envolvimento_departamento_data date,
  avaliacao_6_meses boolean DEFAULT false,
  avaliacao_6_meses_data date,
  aniversario_batismo boolean DEFAULT false,
  aniversario_batismo_data date,
  -- Status
  status text DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'abandonado')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- Pequenos grupos / células
-- =============================================
CREATE TABLE IF NOT EXISTS public.pequenos_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  igreja_id uuid REFERENCES public.igrejas(id),
  lider_id uuid REFERENCES public.pessoas(id),
  anfitriao_id uuid REFERENCES public.pessoas(id),
  endereco text,
  dia_semana text, -- 'segunda', 'terca', etc.
  horario text,
  tipo text DEFAULT 'estudo' CHECK (tipo IN ('estudo', 'oracao', 'evangelismo', 'social', 'misto')),
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'encerrado')),
  membros uuid[] DEFAULT '{}',
  interessados_convidados uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pequeno_grupo_encontros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.pequenos_grupos(id) ON DELETE CASCADE,
  data date NOT NULL,
  tema text,
  presentes uuid[] DEFAULT '{}',
  visitantes_novos integer DEFAULT 0,
  decisoes text,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- Metas de batismo por igreja/associação
-- =============================================
CREATE TABLE IF NOT EXISTS public.metas_batismo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  igreja_id uuid REFERENCES public.igrejas(id),
  associacao_id uuid REFERENCES public.associacoes(id),
  ano integer NOT NULL,
  trimestre integer, -- null = anual
  meta integer NOT NULL,
  realizado integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.classes_biblicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_aniversario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acompanhamento_novo_membro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pequenos_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pequeno_grupo_encontros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_batismo ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for import scripts and admin operations)
CREATE POLICY "service_role_all" ON public.classes_biblicas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.classe_biblica_alunos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.classe_biblica_presenca FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.interacoes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.notificacoes_aniversario FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.acompanhamento_novo_membro FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.pequenos_grupos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.pequeno_grupo_encontros FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.metas_batismo FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read all (RLS scope will be handled in application layer via user role)
CREATE POLICY "authenticated_read" ON public.classes_biblicas FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.classe_biblica_alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.classe_biblica_presenca FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.interacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.notificacoes_aniversario FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.acompanhamento_novo_membro FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.pequenos_grupos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.pequeno_grupo_encontros FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.metas_batismo FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert/update (scope handled in app)
CREATE POLICY "authenticated_write" ON public.classes_biblicas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classes_biblicas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.classe_biblica_alunos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classe_biblica_alunos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.classe_biblica_presenca FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classe_biblica_presenca FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.interacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.interacoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.notificacoes_aniversario FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.notificacoes_aniversario FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.acompanhamento_novo_membro FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.acompanhamento_novo_membro FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.pequenos_grupos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.pequenos_grupos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.pequeno_grupo_encontros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.pequeno_grupo_encontros FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_write" ON public.metas_batismo FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.metas_batismo FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

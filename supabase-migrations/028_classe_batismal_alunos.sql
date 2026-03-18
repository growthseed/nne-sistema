-- =============================================
-- Migration 028: Lista de Chamada - Classe Batismal
-- Tabela junction para alunos com dados complementares
-- Date: 2026-03-18
-- =============================================

-- Tabela de matrícula do aluno na classe batismal
CREATE TABLE IF NOT EXISTS public.classe_batismal_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid NOT NULL REFERENCES public.classes_batismais(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  -- Dados complementares (não duplicar o que já está em pessoas)
  redes_sociais jsonb DEFAULT '{}', -- {"instagram": "@user", "facebook": "url", "tiktok": "@user"}
  participou_anteriormente boolean DEFAULT false,
  classe_anterior_obs text, -- "Participou em 2024 na igreja X"
  -- Status na classe
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'desistente', 'batizado', 'transferido')),
  data_matricula date DEFAULT CURRENT_DATE,
  data_batismo date, -- quando foi batizado (resultado da classe)
  data_desistencia date,
  motivo_desistencia text,
  -- Progresso
  licoes_concluidas integer DEFAULT 0,
  decisao_batismo boolean DEFAULT false,
  data_decisao date,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(classe_id, pessoa_id)
);

CREATE INDEX IF NOT EXISTS idx_cbat_alunos_classe ON public.classe_batismal_alunos(classe_id);
CREATE INDEX IF NOT EXISTS idx_cbat_alunos_pessoa ON public.classe_batismal_alunos(pessoa_id);

-- Registro de presença por lição/aula
CREATE TABLE IF NOT EXISTS public.classe_batismal_presenca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id uuid NOT NULL REFERENCES public.classes_batismais(id) ON DELETE CASCADE,
  licao_numero integer NOT NULL,
  licao_titulo text, -- Ex: "Princípio 1 - A Bíblia Sagrada"
  data date NOT NULL DEFAULT CURRENT_DATE,
  instrutor_nome text, -- Quem ministrou esta aula específica
  instrutor_id uuid REFERENCES public.pessoas(id), -- Opcional: se for alguém cadastrado
  presentes uuid[] DEFAULT '{}',
  ausentes uuid[] DEFAULT '{}',
  observacoes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cbat_presenca_classe ON public.classe_batismal_presenca(classe_id);

-- Adicionar campo instrutor_id (uuid) à classes_batismais para linkar com missionário/pessoa
ALTER TABLE public.classes_batismais ADD COLUMN IF NOT EXISTS instrutor_id uuid REFERENCES public.pessoas(id);
-- Adicionar campo para total de lições (Princípios de Fé)
ALTER TABLE public.classes_batismais ADD COLUMN IF NOT EXISTS total_licoes integer DEFAULT 28;
-- Adicionar campo de observações
ALTER TABLE public.classes_batismais ADD COLUMN IF NOT EXISTS observacoes text;

-- RLS
ALTER TABLE public.classe_batismal_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_batismal_presenca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.classe_batismal_alunos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.classe_batismal_presenca FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read" ON public.classe_batismal_alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write" ON public.classe_batismal_alunos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classe_batismal_alunos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete" ON public.classe_batismal_alunos FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_read" ON public.classe_batismal_presenca FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_write" ON public.classe_batismal_presenca FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.classe_batismal_presenca FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

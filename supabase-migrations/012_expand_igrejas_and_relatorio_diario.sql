-- ============================================================
-- Migration 012: Expandir igrejas + Criar relatorio diario + Parametros missionario
-- Baseado no mapeamento completo do GS 4.1 (SDARM)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PARTE A: Expandir tabela igrejas com campos do GS 4.1
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS gs_id integer;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'Templo';
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS data_inauguracao date;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS escritura text;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS site text;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS relatorio_financeiro boolean DEFAULT true;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS recibo_eletronico_desde text;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS membros_ativos integer DEFAULT 0;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS membros_inativos integer DEFAULT 0;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS membros_falecidos integer DEFAULT 0;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS interessados integer DEFAULT 0;

-- Endereco de correspondencia (separado do endereco fisico)
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS corresp_rua text;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS corresp_bairro text;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS corresp_cidade text;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS corresp_uf text;
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS corresp_cep text;

-- Pastor e obreiro responsavel (FK para missionarios)
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS pastor_id uuid REFERENCES public.missionarios(id);
ALTER TABLE public.igrejas ADD COLUMN IF NOT EXISTS obreiro_id uuid REFERENCES public.missionarios(id);

-- ─────────────────────────────────────────────────────────────
-- PARTE B: Expandir missionario_igrejas com data_fim e ativo
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.missionario_igrejas ADD COLUMN IF NOT EXISTS data_fim date;
ALTER TABLE public.missionario_igrejas ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- ─────────────────────────────────────────────────────────────
-- PARTE C: Expandir relatorios_missionarios com status/acerto
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.relatorios_missionarios ADD COLUMN IF NOT EXISTS status text DEFAULT 'aberto';
ALTER TABLE public.relatorios_missionarios ADD COLUMN IF NOT EXISTS saldo_acerto numeric(12,2) DEFAULT 0;
ALTER TABLE public.relatorios_missionarios ADD COLUMN IF NOT EXISTS data_fechamento timestamptz;

-- ─────────────────────────────────────────────────────────────
-- PARTE D: Criar tabela relatorio_missionario_diario
-- Uma linha por dia com 38+ campos em 4 blocos
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.relatorio_missionario_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios_missionarios(id) ON DELETE CASCADE,
  dia integer NOT NULL CHECK (dia BETWEEN 1 AND 31),
  lugar_atividade text,
  observacao text,

  -- Bloco 1: Atividades Missionarias (14 campos)
  familias_visitadas integer DEFAULT 0,
  membros_visitados integer DEFAULT 0,
  interessados_visitados integer DEFAULT 0,
  estudos_biblicos integer DEFAULT 0,
  folhetos_distribuidos integer DEFAULT 0,
  contatos_missionarios integer DEFAULT 0,
  cultos_residencias integer DEFAULT 0,
  sermoes_conferencias integer DEFAULT 0,
  seminarios_palestras integer DEFAULT 0,
  cartas_email integer DEFAULT 0,
  classes_batismais_ativ integer DEFAULT 0,
  funerais integer DEFAULT 0,

  -- Bloco 2: Horas Empregadas (8 campos)
  horas_viagens numeric(4,1) DEFAULT 0,
  horas_comissoes numeric(4,1) DEFAULT 0,
  horas_estudo_pessoal numeric(4,1) DEFAULT 0,
  horas_reunioes_igreja numeric(4,1) DEFAULT 0,
  horas_escritorio numeric(4,1) DEFAULT 0,
  horas_diligencias numeric(4,1) DEFAULT 0,
  horas_aconselhamentos numeric(4,1) DEFAULT 0,
  horas_recebendo_visitas numeric(4,1) DEFAULT 0,

  -- Bloco 3: Atividades Pastorais (8 campos)
  organizacoes_igrejas integer DEFAULT 0,
  santa_ceia integer DEFAULT 0,
  cerimonias_batismais integer DEFAULT 0,
  pessoas_batizadas integer DEFAULT 0,
  pessoas_excluidas integer DEFAULT 0,
  casamentos integer DEFAULT 0,
  apresentacao_criancas integer DEFAULT 0,
  reunioes_membros integer DEFAULT 0,

  -- Bloco 4: Despesas R$ (6 campos)
  passagens numeric(10,2) DEFAULT 0,
  alimentacao numeric(10,2) DEFAULT 0,
  hotel numeric(10,2) DEFAULT 0,
  comunicacao numeric(10,2) DEFAULT 0,
  km_carro integer DEFAULT 0,
  km_moto integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),

  UNIQUE(relatorio_id, dia)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_relatorio_diario_relatorio ON public.relatorio_missionario_diario(relatorio_id);

-- RLS
ALTER TABLE public.relatorio_missionario_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relatorio_diario_select" ON public.relatorio_missionario_diario
  FOR SELECT USING (true);

CREATE POLICY "relatorio_diario_insert" ON public.relatorio_missionario_diario
  FOR INSERT WITH CHECK (true);

CREATE POLICY "relatorio_diario_update" ON public.relatorio_missionario_diario
  FOR UPDATE USING (true);

CREATE POLICY "relatorio_diario_delete" ON public.relatorio_missionario_diario
  FOR DELETE USING (true);

-- ─────────────────────────────────────────────────────────────
-- PARTE E: Criar tabela missionario_parametros
-- Dados bancarios + parametros de reembolso
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.missionario_parametros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  missionario_id uuid NOT NULL REFERENCES public.missionarios(id) UNIQUE,

  -- Dados bancarios
  banco text,
  agencia text,
  conta text,
  tipo_conta text DEFAULT 'Corrente',
  pix_chave text,
  pix_tipo text, -- cpf, email, telefone, aleatoria

  -- Parametros de reembolso
  valor_gasolina numeric(6,2),
  km_carro_rate numeric(5,2) DEFAULT 0.20,
  km_moto_rate numeric(5,2) DEFAULT 0.07,
  limite_passagens numeric(10,2),
  limite_alimentacao numeric(10,2),
  limite_hotel numeric(10,2),
  limite_comunicacao numeric(10,2),
  diaria_valor numeric(10,2),
  ajuda_custo numeric(10,2),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.missionario_parametros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parametros_select" ON public.missionario_parametros
  FOR SELECT USING (true);

CREATE POLICY "parametros_insert" ON public.missionario_parametros
  FOR INSERT WITH CHECK (true);

CREATE POLICY "parametros_update" ON public.missionario_parametros
  FOR UPDATE USING (true);

CREATE POLICY "parametros_delete" ON public.missionario_parametros
  FOR DELETE USING (true);

-- ─────────────────────────────────────────────────────────────
-- PARTE F: Expandir dados_financeiros com colunas GS 4.1
-- ─────────────────────────────────────────────────────────────

-- Caixa Associacao (campos granulares do GS 4.1)
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS dizimo numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS primicias numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS assist_social numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS esc_sabatina numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS evangelismo numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS radio_curso_biblico numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS construcao numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS musica numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS gratidao_6pct numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS diverso_assoc numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS missoes_mensais numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS missoes_anuais numeric(12,2) DEFAULT 0;

-- Caixa Local - Receitas
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS of_cultos_construcao numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS of_missionaria numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS of_juvenil numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS of_gratidao_pobres numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS diversos_local numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS flores numeric(12,2) DEFAULT 0;

-- Caixa Local - Despesas
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS desp_zeladoria numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS desp_manutencao numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS desp_dizimo_local numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS desp_repasse_dorcas numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS desp_repasse_grat6pct numeric(12,2) DEFAULT 0;

-- Metadados financeiros
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS saldo_anterior numeric(12,2) DEFAULT 0;
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS status_financeiro text DEFAULT 'pendente';
ALTER TABLE public.dados_financeiros ADD COLUMN IF NOT EXISTS responsavel_id uuid;

-- ─────────────────────────────────────────────────────────────
-- PARTE G: Criar tabela church_oficiais (departamentos)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.igreja_oficiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  igreja_id uuid NOT NULL REFERENCES public.igrejas(id) ON DELETE CASCADE,
  departamento text NOT NULL,
  responsavel_nome text,
  responsavel_id uuid, -- optional FK to pessoas
  ano integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at timestamptz DEFAULT now(),

  UNIQUE(igreja_id, departamento, ano)
);

ALTER TABLE public.igreja_oficiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oficiais_select" ON public.igreja_oficiais FOR SELECT USING (true);
CREATE POLICY "oficiais_insert" ON public.igreja_oficiais FOR INSERT WITH CHECK (true);
CREATE POLICY "oficiais_update" ON public.igreja_oficiais FOR UPDATE USING (true);
CREATE POLICY "oficiais_delete" ON public.igreja_oficiais FOR DELETE USING (true);

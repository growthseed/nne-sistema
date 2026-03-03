-- =============================================
-- Migration 019: Tabela documento_templates
-- Permite ao admin configurar textos como o Termo de Compromisso
-- =============================================

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS public.documento_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL UNIQUE,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  ativo boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.documento_templates ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler
CREATE POLICY "documento_templates_select" ON public.documento_templates
  FOR SELECT TO authenticated USING (true);

-- Apenas admin pode inserir/atualizar
CREATE POLICY "documento_templates_insert" ON public.documento_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin')
  );

CREATE POLICY "documento_templates_update" ON public.documento_templates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND papel = 'admin')
  );

-- 3. Inserir Termo de Compromisso padrão
INSERT INTO public.documento_templates (tipo, titulo, conteudo, ativo)
VALUES (
  'termo_compromisso',
  'TERMO DE COMPROMISSO MISSIONÁRIO (QUADRIÊNIO 2026-2029)',
  E'{"lema":"Féis até o Fim: Gerindo para a Eternidade","citacao":"A maior lição que os obreiros têm a aprender é a de sua própria insuficiência e a necessidade de se entregarem inteiramente a Deus. A religião de Cristo não consiste apenas no perdão dos pecados; significa a renovação do coração e a conformação da vida com a vontade de Deus. [...] A fidelidade nas pequenas coisas, o desempenho dos deveres comuns da vida, requerem esforço e determinação tanto quanto as maiores empresas.","citacao_ref":"Ellen G. White, Obreiros Evangélicos, pág. 273.","declaracao_intro":"diante de Deus e da liderança desta União, aceito o solene chamado para servir como missionário durante o quadriênio 2026-2029. Compreendo que o serviço ao Mestre exige esmero, minudência e uma busca constante pela excelência. Inspirado pelo compromisso de nunca me acomodar, assumo como meu lema pessoal: \\"EU POSSO FAZER MELHOR\\".","declaracao_corpo":"Pelo presente termo, comprometo-me voluntariamente a pautar meu ministério sob as seguintes diretrizes fundamentais:","diretrizes":["Evangelismo Relacional e Cuidado Atencioso: Dedicar-me-ei ao pastoreio individualizado, realizando o envio de mensagens semanais de instrução e encorajamento a todos os membros, interessados e aniversariantes da minha área de atuação, zelando para que cada alma se sinta assistida.","Edificação Coletiva pelo Curso Bíblico: Assumo o compromisso de realizar o Curso Bíblico com toda a igreja, integrando membros e interessados em um estudo profundo e sistemático da verdade presente, fortalecendo a unidade doutrinária.","Classe Bíblica Batismal Efetiva: Manterei a Classe Bíblica Batismal em funcionamento contínuo e ininterrupto, garantindo que seja um ambiente produtivo de preparo espiritual e doutrinário para os novos conversos.","Operosidade e Frutificação (Alvo Batismal): Empenhar-me-ei, sob a guia do Espírito Santo, para que o trabalho resulte em frutos visíveis para o Reino de Deus, realizando no mínimo um batismo por trimestre."],"declaracao_final":"Ao assinar este compromisso, declaro minha total submissão às diretrizes da União Norte Nordeste dos Adventistas do Sétimo Dia — Movimento de Reforma, reconhecendo que a fidelidade nos pequenos deveres é o que compõe a grande obra da eternidade."}',
  true
)
ON CONFLICT (tipo) DO NOTHING;

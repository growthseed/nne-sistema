# Sistema de Gamificação NNE Escola Bíblica

## Visão Geral da Arquitetura

Antes de detalhar cada seção, o princípio central: toda a mecânica de gamificação deve reforçar o propósito espiritual da plataforma. Pontos e conquistas são indicadores de crescimento real, não recompensas por engajamento vazio. O vocabulário é completamente bíblico.

---

# SEÇÃO 1: GAMIFICAÇÃO DO ALUNO

## 1.1 Sistema de XP (Experiência — "Frutos")

O XP do aluno é chamado de **Frutos** no texto da interface, mas armazenado como `xp_total` no banco. Isso mantém o vocabulário espiritual sem sacrificar a nomenclatura técnica.

### Tabela de Ações e Valores de XP

**Estudo e Quizzes**
- Completar uma lição pela primeira vez: 100 XP
- Obter nota 100% no quiz na primeira tentativa: +50 XP (bônus)
- Obter nota 80–99% no quiz: +25 XP (bônus)
- Rever uma lição já completada: 10 XP (máximo 1x por dia por lição)
- Completar todos os 37 Princípios da Fé: 500 XP (bônus único)
- Completar todas as 25 Crenças Fundamentais: 500 XP (bônus único)
- Completar AMBOS os módulos: 1.000 XP (bônus único)

**Presença e Comunidade**
- Presença registrada pelo professor em aula: 75 XP
- Presença em 100% das aulas do mês: +150 XP (bônus mensal)
- Publicar no fórum (post aprovado): 30 XP (máximo 3 publicações/dia)
- Responder no fórum (aprovada pelo professor): 20 XP (máximo 5/dia)
- Receber "resposta útil" no fórum de outro aluno: +15 XP
- Enviar mensagem no chat da turma: 5 XP (máximo 10/dia)

**Evangelismo e NPS**
- Convidar um amigo que se cadastra: 150 XP
- Convidar amigo que completa a primeira lição: +100 XP (bônus)
- Responder pesquisa NPS da plataforma: 20 XP (1x por ciclo)
- NOTA: Batismo NÃO gera XP — é uma decisão espiritual pessoal, guiada pelo Espírito Santo

**Streaks (Sequências)**
- Dia de estudo (qualquer ação de estudo): base para streak
- Streak de 7 dias consecutivos: bônus +100 XP ao completar a semana
- Streak de 30 dias: bônus +500 XP
- Multiplicador ativo de streak: veja seção 1.4

---

## 1.2 Níveis — "A Jornada da Semente à Colheita"

Inspirado em Marcos 4 (parábola do semeador) e na progressão espiritual bíblica.

| # | Nome | XP Mínimo | XP Máximo | Metáfora |
|---|------|-----------|-----------|----------|
| 1 | Semente | 0 | 299 | Ainda na terra, com potencial latente |
| 2 | Germinando | 300 | 799 | A casca se rompe, vida começa |
| 3 | Broto | 800 | 1.799 | Primeira luz, crescimento visível |
| 4 | Muda | 1.800 | 3.499 | Raízes se formando, crescimento firme |
| 5 | Arbusto | 3.500 | 6.499 | Estabelecido, frutos iniciais |
| 6 | Árvore Jovem | 6.500 | 10.999 | Forte, começa a dar sombra |
| 7 | Árvore Frutífera | 11.000 | 17.999 | Frutos abundantes (Jo 15:5) |
| 8 | Luz do Mundo | 18.000 | 27.999 | Ilumina os que estão ao redor (Mt 5:14) |
| 9 | Sal da Terra | 28.000 | 41.999 | Preserva e dá sabor (Mt 5:13) |
| 10 | Trigo Amadurecido | 42.000 | 59.999 | Pronto para a colheita |
| 11 | Servo Fiel | 60.000 | 84.999 | "Bem feito, servo fiel" (Mt 25:21) |
| 12 | Discípulo | 85.000 | 119.999 | Seguidor comprometido |
| 13 | Embaixador | 120.000 | 169.999 | Representa o Reino (2Co 5:20) |
| 14 | Semeador | 170.000 | 239.999 | Vai e semeia em outros campos |
| 15 | Colheita Abundante | 240.000 | ∞ | A promessa cumprida (Jo 4:35) |

Cada nível tem um ícone SVG único, uma cor associada e uma citação bíblica exibida no momento da progressão.

---

## 1.3 Badges / Conquistas

Organizadas em categorias temáticas.

### Categoria: Primeiros Passos (Início da Jornada)

**"Primeira Semente"**
- Critério: Completar a primeira lição
- Ícone: Semente germinando
- XP bônus ao desbloquear: 50

**"Questão de Fé"**
- Critério: Completar o primeiro quiz com nota acima de 80%
- Ícone: Pergaminho com pergunta de interrogação
- XP bônus: 30

**"Presente"**
- Critério: Primeira presença registrada em aula
- Ícone: Cadeira de classe
- XP bônus: 25

### Categoria: Perseverança (Sequências e Constância)

**"Sete Dias de Maná"**
- Critério: 7 dias consecutivos de estudo
- Ícone: Jarro de maná (referência a Êxodo 16)
- XP bônus: 100

**"Quarenta Dias no Deserto"**
- Critério: 40 dias consecutivos de estudo
- Ícone: Deserto com oásis ao fundo
- XP bônus: 400

**"Como o Rio"**
- Critério: Manter streak ativo por 90 dias
- Ícone: Rio fluindo (Ez 47)
- XP bônus: 1.000

**"Constância de Davi"**
- Critério: Sem nenhuma falta em aula por 3 meses consecutivos
- Ícone: Harpa de Davi
- XP bônus: 300

### Categoria: Conhecimento (Domínio do Conteúdo)

**"Estudioso"**
- Critério: Completar 10 lições
- Ícone: Pilha de livros
- XP bônus: 200

**"Buscador da Verdade"**
- Critério: Completar todos os 37 Princípios da Fé
- Ícone: Tocha acesa
- XP bônus: 500

**"Alicerce Firme"**
- Critério: Completar todas as 25 Crenças Fundamentais
- Ícone: Pedra angular
- XP bônus: 500

**"Teólogo"**
- Critério: Completar AMBOS os módulos
- Ícone: Coroa de oliveira
- XP bônus: 1.000

**"Perfeito no Quiz"**
- Critério: 10 quizzes consecutivos com nota 100%
- Ícone: Estrela dourada
- XP bônus: 250

### Categoria: Comunidade (Relacionamento)

**"Voz no Fórum"**
- Critério: Primeira publicação aprovada no fórum
- Ícone: Balão de diálogo com pomba
- XP bônus: 30

**"Edificador"**
- Critério: 10 respostas úteis no fórum (marcadas por outros)
- Ícone: Tijolos se empilhando (Ef 4:12)
- XP bônus: 150

**"Missionário Digital"**
- Critério: Convidar 3 amigos que se cadastram
- Ícone: Três sementes em mãos
- XP bônus: 300

**"Ceifeiro"**
- Critério: Um amigo que você convidou se batiza
- Ícone: Foice dourada no campo de trigo
- XP bônus: 750

### Categoria: Marcos Espirituais (Conquistas Raras)

**"Batizado nas Águas"**
- Critério: Batismo registrado pelo professor
- Ícone: Ondas de água com pomba
- XP bônus: 1.000
- Nota: Badge permanente de destaque no perfil

**"Família da Fé"**
- Critério: Fazer parte de uma turma por 6 meses
- Ícone: Círculo de pessoas unidas
- XP bônus: 500

**"Relâmpago do Leste"**
- Critério: Ser o primeiro da turma a completar um módulo
- Ícone: Raio dourado (ref. Mt 24:27)
- XP bônus: 200

---

## 1.4 Sistema de Streaks

### Definição de "Dia de Estudo"
Um dia conta como "dia de estudo" se o aluno realizar pelo menos UMA das seguintes ações: completar uma lição, responder um quiz, participar de aula (presença registrada), ou publicar/responder no fórum.

### Multiplicadores de XP por Streak

| Streak Ativo | Multiplicador | Exemplo |
|---|---|---|
| 1–6 dias | 1.0x | Sem multiplicador |
| 7–13 dias | 1.2x | 100 XP vira 120 |
| 14–29 dias | 1.5x | 100 XP vira 150 |
| 30–59 dias | 2.0x | 100 XP vira 200 |
| 60+ dias | 2.5x | 100 XP vira 250 |

### "Graça" — Proteção de Streak
Cada aluno tem 1 "dia de graça" por semana. Se perder um dia, o streak não é zerado se o dia de graça ainda estiver disponível. A metáfora usada na interface: "Misericórdias novas a cada manhã" (Lm 3:23).

### Streak Freeze Especial
Alunos de nível 7+ desbloqueiam a possibilidade de congelar o streak por até 3 dias quando justificam ausência (campo de texto na interface). O professor pode aprovar.

---

## 1.5 Leaderboard

### Escopos de Ranking

**Ranking da Turma** — Visível para todos os alunos da mesma turma. Atualizado em tempo real. Exibe: posição, avatar, nome, nível, XP da semana atual.

**Ranking da Igreja** — Todos os alunos da mesma igreja. Atualizado diariamente à meia-noite. Agrupa por `church_id`.

**Ranking da Associação** — Agrega todos os alunos das igrejas da associação. Atualizado diariamente.

**Ranking Geral NNE** — Todos os alunos de todas as associações. Atualizado diariamente. Exibe apenas top 100.

### Período do Ranking
- **Semanal** (reset toda segunda-feira às 00:00): XP ganho na semana
- **Mensal** (reset no primeiro dia do mês): XP ganho no mês
- **Geral / All-time**: XP total acumulado

### Privacidade
Aluno pode optar por aparecer como "Anônimo" no ranking geral e da associação, mas não pode ocultar o ranking da turma (para manter accountability pedagógica).

---

## 1.6 Visualização de Progresso

### "O Caminho" — Milestone Path
Na página principal do aluno, um caminho visual estilo linha do tempo vertical mostra as 15 lições seguintes como marcos. Cada marco completado muda de cor (cinza → verde/dourado). Entre os marcos, pequenas ilustrações bíblicas contextuais.

### Círculo de Nível
No topo do perfil: círculo SVG animado mostrando % de progresso para o próximo nível. Dentro do círculo: ícone do nível atual. Ao passar o mouse (hover): tooltip com XP restante.

### "Mapa da Colheita" — Progress Dashboard
Seção dedicada no perfil mostrando:
- Campo de trigo estilizado onde cada espiga representa uma lição completada (preenchida = completa)
- Termômetro de streak à direita
- Grid de badges com filtros por categoria
- Gráfico de linha de XP nos últimos 30 dias

---

# SEÇÃO 2: GAMIFICAÇÃO DO PROFESSOR

## 2.1 Sistema de XP do Professor — "Influência"

O XP do professor é chamado de **Influência** na interface, simbolizando o impacto pastoral que ele exerce.

### Tabela de Ações e Valores de XP

**Gestão de Turma**
- Criar e ativar uma turma: 200 XP (1x por turma)
- Ativar uma lição para a turma (publicar): 50 XP
- Registrar presença de uma aula completa: 80 XP
- Registrar presença de 100% dos alunos em uma aula: +40 XP (bônus)
- Fechar módulo (todos alunos completaram): 300 XP

**Interação Pedagógica**
- Responder mensagem de aluno no chat da turma: 15 XP (máximo 10/dia)
- Moderar publicação no fórum (aprovar/reprovar com feedback): 20 XP
- Criar tópico de discussão no fórum da turma: 40 XP
- Enviar feedback personalizado a um aluno: 25 XP (máximo 5/dia)

**Crescimento do Grupo**
- Novo aluno aceito na turma: 100 XP
- Aluno da turma completa uma lição: 10 XP (passivo)
- Aluno da turma completa o módulo inteiro: 150 XP (passivo)
- NOTA: Batismo do aluno NÃO gera XP para o professor — decisão espiritual

**Qualidade e Consistência**
- Turma com NPS médio acima de 8.5 no mês: 200 XP (mensal)
- Manter turma ativa por 3 meses consecutivos: 400 XP (bônus trimestral)
- Todos os alunos ativos no último mês: 250 XP (mensal)
- Resposta a aluno em menos de 24h (média do mês): +100 XP (mensal)

---

## 2.2 Níveis do Professor

| # | Nome | XP Mínimo | XP Máximo | Metáfora |
|---|------|-----------|-----------|----------|
| 1 | Instrutor | 0 | 999 | Início do ministério docente |
| 2 | Guia | 1.000 | 2.999 | Começa a orientar o caminho |
| 3 | Mestre | 3.000 | 6.999 | Ensina com autoridade |
| 4 | Educador Fiel | 7.000 | 13.999 | Comprometido com a missão |
| 5 | Ancião | 14.000 | 24.999 | Sabedoria reconhecida (1Tm 3:2) |
| 6 | Pastor de Turma | 25.000 | 44.999 | Cuida do rebanho |
| 7 | Evangelista | 45.000 | 74.999 | Foco em crescimento e colheita |
| 8 | Reformador | 75.000 | 119.999 | Transforma vidas pela Palavra |
| 9 | Mentor de Almas | 120.000 | 199.999 | Forma outros professores |
| 10 | Pilar da Reforma | 200.000 | ∞ | Fundação do movimento regional |

---

## 2.3 Badges do Professor

**"Primeira Turma"**
- Critério: Criar e ativar a primeira turma
- XP bônus: 100

**"Turma Completa"**
- Critério: Ter todos os alunos da turma com presença em uma semana
- XP bônus: 150

**"Sem Ausentes"**
- Critério: 100% de presença registrada em um mês inteiro
- XP bônus: 300

**"Dez Batismos"**
- Critério: 10 batismos registrados em turmas que liderou
- XP bônus: 1.000

**"Vinte e Cinco Batismos"**
- Critério: 25 batismos acumulados
- XP bônus: 2.500

**"Semeador Diligente"**
- Critério: Registrar presença em 30 aulas consecutivas (sem interrupção)
- XP bônus: 500

**"Mestre Responde"**
- Critério: Responder 100% das mensagens de alunos em menos de 24h por um mês
- XP bônus: 400

**"NPS Excelente"**
- Critério: NPS médio acima de 9.0 por 3 meses consecutivos
- XP bônus: 600

**"Formador"**
- Critério: Ter um ex-aluno que se tornou professor na plataforma
- XP bônus: 500

**"Cem Alunos"**
- Critério: 100 alunos únicos já passaram pelas suas turmas
- XP bônus: 1.000

**"Colheita do Campo"**
- Critério: Todos os alunos de uma turma completam o módulo completo
- XP bônus: 800

**"Dois Anos Fiel"**
- Critério: Ativo na plataforma por 24 meses consecutivos
- XP bônus: 2.000

---

## 2.4 Leaderboard do Professor

### Escopos

**Ranking da Igreja** — Professores da mesma igreja. Exibe: Influência total, número de turmas ativas, número de batismos.

**Ranking da Associação** — Professores de todas as igrejas da associação. Atualizado diariamente. Critério principal: Influência mensal.

**Ranking da União (NNE)** — Top 50 professores de toda a NNE. Exibe destaque para o top 3 de cada associação.

### Métricas Exibidas no Card do Professor
- Nível atual + nome do nível
- XP mensal e total
- Número de alunos ativos
- Taxa de conclusão das turmas (%)
- Número de batismos registrados
- Tempo médio de resposta

---

## 2.5 Métricas de Impacto do Professor

### Dashboard "Frutos do Ministério"

**Painel de Efetividade**
- Taxa de conclusão de lições pelos alunos (meta: >70%)
- Taxa de retenção mensal (alunos que continuaram ativos)
- NPS médio das turmas
- Tempo médio para completar um módulo por aluno

**Painel de Crescimento**
- Número de batismos por turma
- Número de alunos que avançaram de nível neste mês
- Comparativo mês a mês de engajamento da turma

**Indicador "Saúde da Turma"**
Calculado automaticamente: média ponderada de presença (30%), engajamento no fórum/chat (20%), taxa de conclusão de lições (30%), NPS (20%). Exibido como gauge visual de 0–100.

---

# SEÇÃO 3: IMPLEMENTAÇÃO TÉCNICA

## 3.1 Schema Supabase

```sql
-- =============================================
-- TABELAS CORE DE GAMIFICAÇÃO
-- =============================================

-- Configuração central de XP por ação
CREATE TABLE gamification_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key   TEXT UNIQUE NOT NULL, -- 'lesson_complete', 'quiz_perfect', etc.
  actor_type   TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  xp_value     INTEGER NOT NULL DEFAULT 0,
  max_per_day  INTEGER,              -- NULL = sem limite diário
  description  TEXT NOT NULL,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Perfil de gamificação do aluno
CREATE TABLE student_gamification (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_total            INTEGER NOT NULL DEFAULT 0,
  xp_current_week     INTEGER NOT NULL DEFAULT 0,
  xp_current_month    INTEGER NOT NULL DEFAULT 0,
  level_id            INTEGER NOT NULL DEFAULT 1,
  streak_current      INTEGER NOT NULL DEFAULT 0,
  streak_best         INTEGER NOT NULL DEFAULT 0,
  streak_last_activity DATE,
  streak_grace_used   BOOLEAN NOT NULL DEFAULT FALSE,  -- reseta toda semana
  streak_freeze_days  INTEGER NOT NULL DEFAULT 0,      -- dias de freeze disponíveis
  baptism_date        DATE,                             -- data do batismo, se ocorreu
  privacy_leaderboard TEXT NOT NULL DEFAULT 'public'
                        CHECK (privacy_leaderboard IN ('public', 'anonymous', 'private')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Perfil de gamificação do professor
CREATE TABLE teacher_gamification (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_total             INTEGER NOT NULL DEFAULT 0,
  xp_current_week      INTEGER NOT NULL DEFAULT 0,
  xp_current_month     INTEGER NOT NULL DEFAULT 0,
  level_id             INTEGER NOT NULL DEFAULT 1,
  total_baptisms       INTEGER NOT NULL DEFAULT 0,
  total_students_ever  INTEGER NOT NULL DEFAULT 0,
  avg_response_time_h  NUMERIC(5,2),   -- média em horas
  health_score         NUMERIC(5,2),   -- 0–100
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Níveis (compartilhados entre aluno e professor com actor_type)
CREATE TABLE gamification_levels (
  id           SERIAL PRIMARY KEY,
  actor_type   TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  level_number INTEGER NOT NULL,
  name         TEXT NOT NULL,
  xp_min       INTEGER NOT NULL,
  xp_max       INTEGER,          -- NULL = nível máximo (sem teto)
  description  TEXT NOT NULL,
  bible_ref    TEXT,             -- ex: "João 15:5"
  icon_key     TEXT NOT NULL,    -- referência ao SVG no frontend
  color_hex    TEXT NOT NULL,
  UNIQUE(actor_type, level_number)
);

-- Definição das badges/conquistas
CREATE TABLE badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,    -- 'primeira_semente', 'sete_dias_mana', etc.
  actor_type      TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  category        TEXT NOT NULL,           -- 'primeiros_passos', 'perseveranca', etc.
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  criteria_desc   TEXT NOT NULL,           -- descrição human-readable do critério
  xp_bonus        INTEGER NOT NULL DEFAULT 0,
  icon_key        TEXT NOT NULL,
  rarity          TEXT NOT NULL DEFAULT 'common'
                    CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Badges conquistadas por usuário
CREATE TABLE user_badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id      UUID NOT NULL REFERENCES badges(id),
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified      BOOLEAN NOT NULL DEFAULT FALSE,   -- se o usuário já foi notificado
  UNIQUE(user_id, badge_id)
);

-- Log de transações de XP (imutável — audit trail)
CREATE TABLE xp_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_type    TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  action_key    TEXT NOT NULL,
  xp_earned     INTEGER NOT NULL,
  multiplier    NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  xp_final      INTEGER NOT NULL,   -- xp_earned * multiplier (arredondado)
  reference_id  UUID,               -- ID da lição, aula, etc. que gerou o XP
  reference_type TEXT,              -- 'lesson', 'attendance', 'forum_post', etc.
  metadata      JSONB,              -- dados extras contextuais
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshots diários para leaderboard (evita recalcular em tempo real)
CREATE TABLE leaderboard_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_type    TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  period_type   TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'alltime')),
  period_key    TEXT NOT NULL,   -- ex: '2026-W13' ou '2026-03' ou 'all'
  scope_type    TEXT NOT NULL CHECK (scope_type IN ('class', 'church', 'association', 'union')),
  scope_id      UUID,            -- NULL = union (NNE toda)
  xp_value      INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER,
  level_id      INTEGER NOT NULL,
  display_name  TEXT NOT NULL,   -- nome ou 'Anônimo'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_key, scope_type, scope_id)
);

-- Streaks: registro diário para cálculo e proteção
CREATE TABLE streak_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date    DATE NOT NULL,
  action_key  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, log_date)   -- um registro por dia é suficiente para contar o dia
);

-- Métricas de impacto do professor (calculadas diariamente)
CREATE TABLE teacher_impact_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month          DATE NOT NULL,  -- primeiro dia do mês
  completion_rate       NUMERIC(5,2),   -- % alunos que completaram pelo menos 1 lição
  retention_rate        NUMERIC(5,2),   -- % alunos ativos vs total da turma
  nps_avg               NUMERIC(4,2),
  avg_lesson_days       NUMERIC(6,2),   -- média de dias para completar um módulo
  baptisms_this_month   INTEGER NOT NULL DEFAULT 0,
  students_leveled_up   INTEGER NOT NULL DEFAULT 0,
  health_score          NUMERIC(5,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, period_month)
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_student_gamification_user ON student_gamification(user_id);
CREATE INDEX idx_teacher_gamification_user ON teacher_gamification(user_id);
CREATE INDEX idx_xp_transactions_user_date ON xp_transactions(user_id, created_at DESC);
CREATE INDEX idx_xp_transactions_action ON xp_transactions(action_key, created_at DESC);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_notified ON user_badges(user_id, notified) WHERE notified = FALSE;
CREATE INDEX idx_leaderboard_scope ON leaderboard_snapshots(scope_type, scope_id, period_type, period_key);
CREATE INDEX idx_streak_logs_user_date ON streak_logs(user_id, log_date DESC);

-- =============================================
-- FUNÇÃO: Conceder XP (usada por triggers e edge functions)
-- =============================================

CREATE OR REPLACE FUNCTION award_xp(
  p_user_id     UUID,
  p_actor_type  TEXT,
  p_action_key  TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_metadata    JSONB DEFAULT NULL
)
RETURNS INTEGER   -- retorna o XP final concedido
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action        gamification_actions%ROWTYPE;
  v_multiplier    NUMERIC(4,2) := 1.0;
  v_xp_final      INTEGER;
  v_streak        INTEGER;
  v_today_count   INTEGER;
BEGIN
  -- Busca a ação
  SELECT * INTO v_action
  FROM gamification_actions
  WHERE action_key = p_action_key AND actor_type = p_actor_type AND active = TRUE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Verifica limite diário
  IF v_action.max_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_count
    FROM xp_transactions
    WHERE user_id = p_user_id
      AND action_key = p_action_key
      AND created_at >= CURRENT_DATE;

    IF v_today_count >= v_action.max_per_day THEN
      RETURN 0;
    END IF;
  END IF;

  -- Aplica multiplicador de streak (somente alunos)
  IF p_actor_type = 'student' THEN
    SELECT streak_current INTO v_streak
    FROM student_gamification WHERE user_id = p_user_id;

    v_multiplier := CASE
      WHEN v_streak >= 60 THEN 2.5
      WHEN v_streak >= 30 THEN 2.0
      WHEN v_streak >= 14 THEN 1.5
      WHEN v_streak >= 7  THEN 1.2
      ELSE 1.0
    END;
  END IF;

  v_xp_final := ROUND(v_action.xp_value * v_multiplier);

  -- Insere a transação
  INSERT INTO xp_transactions(
    user_id, actor_type, action_key,
    xp_earned, multiplier, xp_final,
    reference_id, reference_type, metadata
  ) VALUES (
    p_user_id, p_actor_type, p_action_key,
    v_action.xp_value, v_multiplier, v_xp_final,
    p_reference_id, p_reference_type, p_metadata
  );

  -- Atualiza o perfil de gamificação
  IF p_actor_type = 'student' THEN
    UPDATE student_gamification SET
      xp_total          = xp_total + v_xp_final,
      xp_current_week   = xp_current_week + v_xp_final,
      xp_current_month  = xp_current_month + v_xp_final,
      updated_at        = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE teacher_gamification SET
      xp_total          = xp_total + v_xp_final,
      xp_current_week   = xp_current_week + v_xp_final,
      xp_current_month  = xp_current_month + v_xp_final,
      updated_at        = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Atualiza nível se necessário
  PERFORM update_user_level(p_user_id, p_actor_type);

  RETURN v_xp_final;
END;
$$;

-- =============================================
-- FUNÇÃO: Atualizar nível após ganho de XP
-- =============================================

CREATE OR REPLACE FUNCTION update_user_level(
  p_user_id    UUID,
  p_actor_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp_total    INTEGER;
  v_new_level   INTEGER;
  v_old_level   INTEGER;
BEGIN
  IF p_actor_type = 'student' THEN
    SELECT xp_total, level_id INTO v_xp_total, v_old_level
    FROM student_gamification WHERE user_id = p_user_id;
  ELSE
    SELECT xp_total, level_id INTO v_xp_total, v_old_level
    FROM teacher_gamification WHERE user_id = p_user_id;
  END IF;

  SELECT level_number INTO v_new_level
  FROM gamification_levels
  WHERE actor_type = p_actor_type
    AND xp_min <= v_xp_total
    AND (xp_max IS NULL OR xp_max >= v_xp_total)
  ORDER BY level_number DESC
  LIMIT 1;

  IF v_new_level IS DISTINCT FROM v_old_level THEN
    IF p_actor_type = 'student' THEN
      UPDATE student_gamification SET level_id = v_new_level WHERE user_id = p_user_id;
    ELSE
      UPDATE teacher_gamification SET level_id = v_new_level WHERE user_id = p_user_id;
    END IF;

    -- Insere notificação de level up (usa tabela de notificações existente se houver)
    INSERT INTO xp_transactions(
      user_id, actor_type, action_key,
      xp_earned, multiplier, xp_final, metadata
    ) VALUES (
      p_user_id, p_actor_type, 'level_up',
      0, 1.0, 0,
      jsonb_build_object('old_level', v_old_level, 'new_level', v_new_level)
    );
  END IF;
END;
$$;

-- =============================================
-- FUNÇÃO: Verificar e conceder badges
-- =============================================

CREATE OR REPLACE FUNCTION check_and_award_badges(
  p_user_id    UUID,
  p_actor_type TEXT
)
RETURNS SETOF TEXT  -- retorna os codes das badges concedidas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_badge     badges%ROWTYPE;
  v_earned    BOOLEAN;
  v_xp_total  INTEGER;
  v_streak    INTEGER;
  v_baptisms  INTEGER;
BEGIN
  -- Lê dados do perfil
  IF p_actor_type = 'student' THEN
    SELECT xp_total, streak_best INTO v_xp_total, v_streak
    FROM student_gamification WHERE user_id = p_user_id;
  ELSE
    SELECT xp_total, total_baptisms INTO v_xp_total, v_baptisms
    FROM teacher_gamification WHERE user_id = p_user_id;
  END IF;

  -- Itera sobre todas as badges não conquistadas do tipo correto
  FOR v_badge IN
    SELECT b.* FROM badges b
    WHERE b.actor_type = p_actor_type
      AND b.active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM user_badges ub
        WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
      )
  LOOP
    v_earned := FALSE;

    -- Lógica por código de badge
    CASE v_badge.code
      WHEN 'primeira_semente' THEN
        SELECT COUNT(*) > 0 INTO v_earned
        FROM xp_transactions
        WHERE user_id = p_user_id AND action_key = 'lesson_complete';

      WHEN 'sete_dias_mana' THEN
        v_earned := (v_streak >= 7);

      WHEN 'quarenta_dias_deserto' THEN
        v_earned := (v_streak >= 40);

      WHEN 'como_o_rio' THEN
        v_earned := (v_streak >= 90);

      WHEN 'dez_batismos' THEN
        v_earned := (p_actor_type = 'teacher' AND v_baptisms >= 10);

      WHEN 'vinte_cinco_batismos' THEN
        v_earned := (p_actor_type = 'teacher' AND v_baptisms >= 25);

      -- demais badges seguem o mesmo padrão...
      ELSE
        v_earned := FALSE;
    END CASE;

    IF v_earned THEN
      INSERT INTO user_badges(user_id, badge_id)
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT DO NOTHING;

      -- Concede XP bônus da badge
      IF v_badge.xp_bonus > 0 THEN
        PERFORM award_xp(p_user_id, p_actor_type, 'badge_bonus',
          v_badge.id, 'badge',
          jsonb_build_object('badge_code', v_badge.code));
      END IF;

      RETURN NEXT v_badge.code;
    END IF;
  END LOOP;
END;
$$;

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE student_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- Aluno vê apenas seu próprio perfil de gamificação
CREATE POLICY student_gamification_own ON student_gamification
  FOR SELECT USING (auth.uid() = user_id);

-- Professor vê gamificação de alunos das suas turmas
CREATE POLICY student_gamification_teacher ON student_gamification
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_students cs
      JOIN classes c ON cs.class_id = c.id
      WHERE cs.student_id = student_gamification.user_id
        AND c.teacher_id = auth.uid()
    )
  );

-- Transações são somente leitura para o próprio usuário
CREATE POLICY xp_transactions_own ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 3.2 Estrutura de Componentes React

### Hierarquia de Arquivos

```
src/
  features/
    gamification/
      hooks/
        useStudentGamification.ts
        useTeacherGamification.ts
        useLeaderboard.ts
        useStreakStatus.ts
        useBadgeNotifications.ts
      components/
        student/
          XPBar.tsx
          LevelBadge.tsx
          StreakWidget.tsx
          HarvestMap.tsx         ← visualização do campo de trigo
          MilestonePath.tsx      ← caminho de lições
          BadgeGrid.tsx
          BadgeCard.tsx
          LeaderboardPanel.tsx
          LevelUpModal.tsx
          BadgeUnlockedToast.tsx
        teacher/
          InfluenceBar.tsx
          TeacherLevelBadge.tsx
          ImpactDashboard.tsx
          TeacherLeaderboard.tsx
          ClassHealthGauge.tsx
          TeacherBadgeGrid.tsx
        shared/
          XPToast.tsx            ← notificação flutuante de +XP
          RankingCard.tsx
          ProgressRing.tsx       ← SVG animado circular
      services/
        gamificationService.ts   ← chamadas ao Supabase
        xpCalculator.ts          ← lógica de multiplicadores
      constants/
        levels.ts                ← dados dos 15 níveis de aluno
        teacherLevels.ts
        badges.ts                ← metadados de todas as badges
        xpActions.ts             ← mapeamento action_key → valores
      types/
        gamification.types.ts
```

### Contratos de Interface Principais

`useStudentGamification.ts` retorna:
- `profile: StudentGamification | null`
- `currentLevel: GamificationLevel`
- `nextLevel: GamificationLevel | null`
- `progressToNextLevel: number` (0–100)
- `streakStatus: StreakStatus`
- `badges: UserBadge[]`
- `pendingBadgeNotifications: Badge[]`
- `awardXP(actionKey, referenceId?, metadata?): Promise<number>`
- `dismissBadgeNotification(badgeId): void`

`useLeaderboard.ts` recebe `{ scope, scopeId, periodType }` e retorna:
- `entries: LeaderboardEntry[]`
- `currentUserRank: number | null`
- `loading: boolean`

---

## 3.3 Pontos de Integração nas Páginas Existentes

### Integração no Contexto do NNE Sistema

Dado que o NNE Sistema está em `c:\Users\EFEITO DIGITAL\nne sistema\src\`, as integrações principais são:

**`src/pages/aluno/LicaoPage.tsx`** (ou equivalente de lição)
- Após submissão de quiz: chamar `awardXP('lesson_complete')` e `awardXP('quiz_perfect')` se aplicável
- Exibir `<XPToast>` com o XP ganho após confirmação
- Verificar badges com `check_and_award_badges` via Edge Function
- Exibir `<LevelUpModal>` se houve progressão de nível

**`src/pages/aluno/PerfilPage.tsx`** (ou `DashboardAluno.tsx`)
- Inserir `<ProgressRing>` no topo com nível e % para o próximo
- Inserir `<StreakWidget>` mostrando sequência atual e multiplicador
- Inserir `<MilestonePath>` com as próximas 10 lições como marcos
- Inserir `<BadgeGrid>` com filtros por categoria
- Inserir `<LeaderboardPanel>` com abas: Turma / Igreja / Associação

**`src/pages/aluno/ForumPage.tsx`**
- Após publicação aprovada: chamar `awardXP('forum_post')`
- Após resposta aprovada: chamar `awardXP('forum_reply')`
- Quando outro usuário marca resposta como útil: chamar `awardXP('forum_helpful')`

**`src/pages/professor/TurmaPage.tsx`**
- Após registrar presença: chamar `awardXP('record_attendance', classId)` para o professor
- Para cada aluno presente: chamar `awardXP('attendance_present', classId)` para o aluno
- Verificar bônus de 100% de presença após registro completo
- Inserir `<ClassHealthGauge>` no topo do painel da turma

**`src/pages/professor/DashboardProfessor.tsx`**
- Inserir `<InfluenceBar>` com nível atual e progresso
- Inserir `<ImpactDashboard>` com métricas do mês
- Inserir `<TeacherLeaderboard>` com escopo da associação
- Inserir `<TeacherBadgeGrid>` com conquistas do professor

**`src/pages/professor/AlunosPage.tsx`**
- Ao registrar batismo de aluno: chamar `awardXP('student_baptism')` para o professor + `awardXP('baptism_received')` para o aluno
- Exibir mini badge de nível ao lado do nome de cada aluno na listagem

**`src/hooks/`** — Criar `src/hooks/useGamification.ts` como re-export central das hooks de gamificação para facilitar importação nas páginas existentes.

---

## 3.4 Edge Functions Supabase Necessárias

**`supabase/functions/process-xp-event/index.ts`**
Recebe eventos de ação e executa: `award_xp()` + `check_and_award_badges()` + atualiza snapshot de leaderboard se necessário. Chamada pelo frontend via `supabase.functions.invoke('process-xp-event', { body: { actionKey, userId, referenceId } })`.

**`supabase/functions/refresh-leaderboard/index.ts`**
Cron job diário (00:05 UTC-3) que recalcula `leaderboard_snapshots` para todos os escopos e períodos. Configurado via `supabase/config.toml`.

**`supabase/functions/reset-weekly-xp/index.ts`**
Cron job toda segunda-feira que zera `xp_current_week` em ambas as tabelas de gamificação e recalcula `streak_grace_used = FALSE`.

---

## 3.5 Fluxo de Dados Completo

```
Ação do usuário (ex: submeter quiz)
        ↓
Frontend valida resultado do quiz
        ↓
supabase.functions.invoke('process-xp-event', {
  actionKey: 'lesson_complete',
  userId: currentUser.id,
  referenceId: lessonId
})
        ↓
Edge Function:
  1. award_xp() → insere em xp_transactions
  2. update_user_level() → verifica progressão
  3. check_and_award_badges() → concede badges novas
  4. Retorna { xpEarned, newLevel, newBadges }
        ↓
Frontend recebe resposta:
  - invalidate query 'studentGamification'
  - exibe <XPToast xp={xpEarned} />
  - se newLevel → exibe <LevelUpModal level={newLevel} />
  - para cada badge em newBadges → enfileira <BadgeUnlockedToast />
```

---

## 3.6 Sequência de Implementação

```
FASE 1 — Fundação (Sprint 1, ~5 dias)
[ ] Criar migration SQL com todas as tabelas acima
[ ] Popular gamification_actions com todos os valores de XP definidos
[ ] Popular gamification_levels para alunos e professores
[ ] Popular badges com todos os 20 badges de aluno e 12 de professor
[ ] Criar funções PL/pgSQL: award_xp, update_user_level, check_and_award_badges
[ ] Criar Edge Function process-xp-event
[ ] Criar gamification.types.ts e constants/ no frontend
[ ] Criar gamificationService.ts com chamadas básicas ao Supabase

FASE 2 — Perfil do Aluno (Sprint 2, ~4 dias)
[ ] Criar useStudentGamification.ts
[ ] Criar useStreakStatus.ts
[ ] Criar ProgressRing.tsx (SVG animado)
[ ] Criar LevelBadge.tsx
[ ] Criar StreakWidget.tsx com indicador de multiplicador
[ ] Criar XPToast.tsx (notificação flutuante)
[ ] Criar LevelUpModal.tsx com animação e versículo bíblico
[ ] Integrar na página de lição: disparo de XP após quiz
[ ] Integrar no perfil do aluno: ProgressRing + LevelBadge

FASE 3 — Badges e Leaderboard do Aluno (Sprint 3, ~4 dias)
[ ] Criar BadgeCard.tsx e BadgeGrid.tsx
[ ] Criar BadgeUnlockedToast.tsx
[ ] Criar useBadgeNotifications.ts (polling ou realtime)
[ ] Criar useLeaderboard.ts
[ ] Criar LeaderboardPanel.tsx com abas Turma/Igreja/Associação
[ ] Criar Edge Function refresh-leaderboard (cron diário)
[ ] Integrar BadgeGrid e LeaderboardPanel no perfil do aluno

FASE 4 — Visualização Avançada do Aluno (Sprint 4, ~3 dias)
[ ] Criar HarvestMap.tsx (campo de trigo SVG)
[ ] Criar MilestonePath.tsx (caminho visual de lições)
[ ] Integrar HarvestMap e MilestonePath no dashboard do aluno
[ ] Criar XPBar.tsx com histórico dos últimos 30 dias (gráfico linha)

FASE 5 — Gamificação do Professor (Sprint 5, ~4 dias)
[ ] Criar useTeacherGamification.ts
[ ] Criar InfluenceBar.tsx e TeacherLevelBadge.tsx
[ ] Criar ClassHealthGauge.tsx (gauge SVG 0–100)
[ ] Criar ImpactDashboard.tsx com métricas mensais
[ ] Criar TeacherLeaderboard.tsx (escopo associação/união)
[ ] Criar TeacherBadgeGrid.tsx
[ ] Integrar em TurmaPage: disparo de XP ao registrar presença
[ ] Integrar em DashboardProfessor: InfluenceBar + ImpactDashboard
[ ] Integrar disparo de XP para batismo em AlunosPage
[ ] Criar Edge Function reset-weekly-xp (cron semanal)

FASE 6 — Polish e Notificações (Sprint 6, ~2 dias)
[ ] Ativar Supabase Realtime em user_badges para notificações instantâneas
[ ] Implementar streak_grace_used (dia de graça)
[ ] Implementar streak_freeze para alunos nível 7+
[ ] Testes de integração das Edge Functions
[ ] Revisar RLS policies para todos os perfis de acesso
[ ] Seeding de dados de teste para validação visual
```

---

## Considerações Finais de Arquitetura

**Performance**: O `leaderboard_snapshots` é fundamental. Jamais calcular rankings on-the-fly em produção. O cron de refresh diário garante dados consistentes sem sobrecarga.

**Consistência de XP**: Toda concessão de XP passa obrigatoriamente pela função `award_xp()` no banco. O frontend nunca manipula `xp_total` diretamente. Isso garante integridade mesmo com múltiplas sessões abertas.

**Segurança**: A função `award_xp()` usa `SECURITY DEFINER`. O frontend só pode disparar XP via Edge Function autenticada, nunca chamando a função diretamente via RPC sem validação.

**Respeito ao propósito espiritual**: Toda a nomenclatura na interface aponta para crescimento espiritual real. Recomenda-se que o nível e os badges sejam exibidos com versículos bíblicos relevantes, e que o professor possa enviar uma mensagem de encorajamento automática quando um aluno atinge um novo nível.
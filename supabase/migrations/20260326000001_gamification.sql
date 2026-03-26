-- =============================================
-- GAMIFICAÇÃO — Escola Bíblica NNE
-- Fase 1: Tabelas + Seed + Funções
-- =============================================

-- Configuração de XP por ação
CREATE TABLE IF NOT EXISTS gamification_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT UNIQUE NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  xp_value INTEGER NOT NULL DEFAULT 0,
  max_per_day INTEGER,
  description TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Perfil de gamificação do aluno
CREATE TABLE IF NOT EXISTS student_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pessoa_id UUID,
  xp_total INTEGER NOT NULL DEFAULT 0,
  xp_current_week INTEGER NOT NULL DEFAULT 0,
  xp_current_month INTEGER NOT NULL DEFAULT 0,
  level_number INTEGER NOT NULL DEFAULT 1,
  streak_current INTEGER NOT NULL DEFAULT 0,
  streak_best INTEGER NOT NULL DEFAULT 0,
  streak_last_activity DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfil de gamificação do professor
CREATE TABLE IF NOT EXISTS teacher_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  xp_total INTEGER NOT NULL DEFAULT 0,
  xp_current_week INTEGER NOT NULL DEFAULT 0,
  xp_current_month INTEGER NOT NULL DEFAULT 0,
  level_number INTEGER NOT NULL DEFAULT 1,
  total_students_ever INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Níveis
CREATE TABLE IF NOT EXISTS gamification_levels (
  id SERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  level_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  xp_min INTEGER NOT NULL,
  xp_max INTEGER,
  description TEXT NOT NULL,
  bible_ref TEXT,
  icon_key TEXT NOT NULL DEFAULT 'seed',
  color_hex TEXT NOT NULL DEFAULT '#16a34a',
  UNIQUE(actor_type, level_number)
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_bonus INTEGER NOT NULL DEFAULT 0,
  icon_key TEXT NOT NULL DEFAULT 'star',
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary'))
);

-- Badges conquistadas
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Log de transações de XP
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('student', 'teacher')),
  action_key TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  xp_final INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Streak logs
CREATE TABLE IF NOT EXISTS streak_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  action_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_gam_user ON student_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_gam_user ON teacher_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_trans_user ON xp_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_logs_user ON streak_logs(user_id, log_date DESC);

-- RLS
ALTER TABLE student_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY gam_read_all ON student_gamification FOR SELECT USING (true);
CREATE POLICY gam_write ON student_gamification FOR ALL USING (true);
CREATE POLICY tgam_read ON teacher_gamification FOR SELECT USING (true);
CREATE POLICY tgam_write ON teacher_gamification FOR ALL USING (true);
CREATE POLICY ub_read ON user_badges FOR SELECT USING (true);
CREATE POLICY ub_write ON user_badges FOR ALL USING (true);
CREATE POLICY xp_read ON xp_transactions FOR SELECT USING (true);
CREATE POLICY xp_write ON xp_transactions FOR ALL USING (true);
CREATE POLICY ga_read ON gamification_actions FOR SELECT USING (true);
CREATE POLICY gl_read ON gamification_levels FOR SELECT USING (true);
CREATE POLICY b_read ON badges FOR SELECT USING (true);
CREATE POLICY sl_read ON streak_logs FOR SELECT USING (true);
CREATE POLICY sl_write ON streak_logs FOR ALL USING (true);

-- =============================================
-- SEED: Níveis do Aluno (15 níveis)
-- =============================================

INSERT INTO gamification_levels (actor_type, level_number, name, xp_min, xp_max, description, bible_ref, icon_key, color_hex) VALUES
('student', 1, 'Semente', 0, 299, 'Ainda na terra, com potencial latente', NULL, 'seed', '#a3a3a3'),
('student', 2, 'Germinando', 300, 799, 'A casca se rompe, vida começa', NULL, 'sprout', '#84cc16'),
('student', 3, 'Broto', 800, 1799, 'Primeira luz, crescimento visível', NULL, 'leaf', '#22c55e'),
('student', 4, 'Muda', 1800, 3499, 'Raízes se formando, crescimento firme', NULL, 'plant', '#16a34a'),
('student', 5, 'Arbusto', 3500, 6499, 'Estabelecido, frutos iniciais', NULL, 'bush', '#15803d'),
('student', 6, 'Árvore Jovem', 6500, 10999, 'Forte, começa a dar sombra', NULL, 'tree', '#166534'),
('student', 7, 'Árvore Frutífera', 11000, 17999, 'Frutos abundantes', 'João 15:5', 'fruit-tree', '#ca8a04'),
('student', 8, 'Luz do Mundo', 18000, 27999, 'Ilumina os que estão ao redor', 'Mateus 5:14', 'sun', '#eab308'),
('student', 9, 'Sal da Terra', 28000, 41999, 'Preserva e dá sabor', 'Mateus 5:13', 'salt', '#f59e0b'),
('student', 10, 'Trigo Amadurecido', 42000, 59999, 'Pronto para a colheita', NULL, 'wheat', '#d97706'),
('student', 11, 'Servo Fiel', 60000, 84999, 'Bem feito, servo fiel', 'Mateus 25:21', 'crown', '#7c3aed'),
('student', 12, 'Discípulo', 85000, 119999, 'Seguidor comprometido', NULL, 'book', '#6d28d9'),
('student', 13, 'Embaixador', 120000, 169999, 'Representa o Reino', '2 Coríntios 5:20', 'flag', '#4f46e5'),
('student', 14, 'Semeador', 170000, 239999, 'Vai e semeia em outros campos', NULL, 'sower', '#2563eb'),
('student', 15, 'Colheita Abundante', 240000, NULL, 'A promessa cumprida', 'João 4:35', 'harvest', '#dc2626')
ON CONFLICT (actor_type, level_number) DO NOTHING;

-- =============================================
-- SEED: Níveis do Professor (10 níveis)
-- =============================================

INSERT INTO gamification_levels (actor_type, level_number, name, xp_min, xp_max, description, bible_ref, icon_key, color_hex) VALUES
('teacher', 1, 'Instrutor', 0, 999, 'Início do ministério docente', NULL, 'chalkboard', '#6b7280'),
('teacher', 2, 'Guia', 1000, 2999, 'Começa a orientar o caminho', NULL, 'compass', '#22c55e'),
('teacher', 3, 'Mestre', 3000, 6999, 'Ensina com autoridade', NULL, 'scroll', '#16a34a'),
('teacher', 4, 'Educador Fiel', 7000, 13999, 'Comprometido com a missão', NULL, 'lamp', '#15803d'),
('teacher', 5, 'Ancião', 14000, 24999, 'Sabedoria reconhecida', '1 Timóteo 3:2', 'elder', '#ca8a04'),
('teacher', 6, 'Pastor de Turma', 25000, 44999, 'Cuida do rebanho', NULL, 'shepherd', '#eab308'),
('teacher', 7, 'Evangelista', 45000, 74999, 'Foco em crescimento e colheita', NULL, 'trumpet', '#d97706'),
('teacher', 8, 'Reformador', 75000, 119999, 'Transforma vidas pela Palavra', NULL, 'flame', '#7c3aed'),
('teacher', 9, 'Mentor de Almas', 120000, 199999, 'Forma outros professores', NULL, 'mentor', '#4f46e5'),
('teacher', 10, 'Pilar da Reforma', 200000, NULL, 'Fundação do movimento regional', NULL, 'pillar', '#dc2626')
ON CONFLICT (actor_type, level_number) DO NOTHING;

-- =============================================
-- SEED: Ações de XP
-- =============================================

INSERT INTO gamification_actions (action_key, actor_type, xp_value, max_per_day, description) VALUES
-- Aluno
('lesson_complete', 'student', 100, NULL, 'Completar uma lição pela primeira vez'),
('quiz_perfect', 'student', 50, NULL, 'Quiz 100% na primeira tentativa'),
('quiz_good', 'student', 25, NULL, 'Quiz 80-99%'),
('lesson_review', 'student', 10, 1, 'Rever lição já completada'),
('module_pf_complete', 'student', 500, NULL, 'Completar todos os 37 Princípios de Fé'),
('module_cf_complete', 'student', 500, NULL, 'Completar todas as 25 Crenças Fundamentais'),
('module_both_complete', 'student', 1000, NULL, 'Completar AMBOS os módulos'),
('attendance_present', 'student', 75, NULL, 'Presença registrada em aula'),
('attendance_month_100', 'student', 150, NULL, '100% presença no mês'),
('forum_post', 'student', 30, 3, 'Publicar no fórum'),
('forum_reply', 'student', 20, 5, 'Responder no fórum'),
('forum_helpful', 'student', 15, NULL, 'Resposta marcada como útil'),
('chat_message', 'student', 5, 10, 'Mensagem no chat da turma'),
('invite_signup', 'student', 150, NULL, 'Amigo convidado se cadastrou'),
('invite_first_lesson', 'student', 100, NULL, 'Amigo convidado completou 1ª lição'),
('nps_response', 'student', 20, NULL, 'Respondeu NPS'),
('streak_7_days', 'student', 100, NULL, 'Streak de 7 dias'),
('streak_30_days', 'student', 500, NULL, 'Streak de 30 dias'),
('badge_bonus', 'student', 0, NULL, 'XP bônus de badge conquistada'),
-- Professor
('create_class', 'teacher', 200, NULL, 'Criar e ativar turma'),
('activate_lesson', 'teacher', 50, NULL, 'Ativar lição para turma'),
('record_attendance', 'teacher', 80, NULL, 'Registrar presença de aula'),
('attendance_full', 'teacher', 40, NULL, '100% presença na aula'),
('close_module', 'teacher', 300, NULL, 'Fechar módulo (todos completaram)'),
('chat_reply', 'teacher', 15, 10, 'Responder aluno no chat'),
('forum_moderate', 'teacher', 20, NULL, 'Moderar publicação no fórum'),
('forum_topic', 'teacher', 40, NULL, 'Criar tópico de discussão'),
('feedback_student', 'teacher', 25, 5, 'Feedback personalizado para aluno'),
('new_student', 'teacher', 100, NULL, 'Novo aluno na turma'),
('student_lesson_complete', 'teacher', 10, NULL, 'Aluno completou lição'),
('student_module_complete', 'teacher', 150, NULL, 'Aluno completou módulo'),
('nps_high', 'teacher', 200, NULL, 'NPS médio acima de 8.5 no mês'),
('class_active_3m', 'teacher', 400, NULL, 'Turma ativa por 3 meses'),
('badge_bonus', 'teacher', 0, NULL, 'XP bônus de badge conquistada')
ON CONFLICT (action_key) DO NOTHING;

-- =============================================
-- SEED: Badges do Aluno (20)
-- =============================================

INSERT INTO badges (code, actor_type, category, name, description, xp_bonus, icon_key, rarity) VALUES
-- Primeiros Passos
('primeira_semente', 'student', 'primeiros_passos', 'Primeira Semente', 'Completou a primeira lição', 50, 'seed', 'common'),
('questao_de_fe', 'student', 'primeiros_passos', 'Questão de Fé', 'Primeiro quiz acima de 80%', 30, 'scroll', 'common'),
('presente', 'student', 'primeiros_passos', 'Presente', 'Primeira presença em aula', 25, 'chair', 'common'),
-- Perseverança
('sete_dias_mana', 'student', 'perseveranca', 'Sete Dias de Maná', '7 dias consecutivos de estudo', 100, 'jar', 'uncommon'),
('quarenta_dias_deserto', 'student', 'perseveranca', 'Quarenta Dias no Deserto', '40 dias consecutivos', 400, 'desert', 'rare'),
('como_o_rio', 'student', 'perseveranca', 'Como o Rio', '90 dias consecutivos', 1000, 'river', 'legendary'),
('constancia_davi', 'student', 'perseveranca', 'Constância de Davi', 'Sem falta por 3 meses', 300, 'harp', 'rare'),
-- Conhecimento
('estudioso', 'student', 'conhecimento', 'Estudioso', 'Completou 10 lições', 200, 'books', 'uncommon'),
('buscador_verdade', 'student', 'conhecimento', 'Buscador da Verdade', 'Completou 37 Princípios de Fé', 500, 'torch', 'rare'),
('alicerce_firme', 'student', 'conhecimento', 'Alicerce Firme', 'Completou 25 Crenças Fundamentais', 500, 'stone', 'rare'),
('teologo', 'student', 'conhecimento', 'Teólogo', 'Completou AMBOS os módulos', 1000, 'crown-olive', 'legendary'),
('perfeito_quiz', 'student', 'conhecimento', 'Perfeito no Quiz', '10 quizzes com 100%', 250, 'star-gold', 'rare'),
-- Comunidade
('voz_forum', 'student', 'comunidade', 'Voz no Fórum', 'Primeira publicação no fórum', 30, 'dove', 'common'),
('edificador', 'student', 'comunidade', 'Edificador', '10 respostas úteis no fórum', 150, 'bricks', 'uncommon'),
('missionario_digital', 'student', 'comunidade', 'Missionário Digital', 'Convidou 3 amigos', 300, 'seeds-hand', 'rare'),
-- Marcos Espirituais
('familia_da_fe', 'student', 'marcos', 'Família da Fé', 'Na turma por 6 meses', 500, 'circle-people', 'rare'),
('relampago_leste', 'student', 'marcos', 'Relâmpago do Leste', 'Primeiro a completar módulo na turma', 200, 'lightning', 'uncommon'),
-- Professor
('primeira_turma', 'teacher', 'gestao', 'Primeira Turma', 'Criou e ativou primeira turma', 100, 'chalkboard', 'common'),
('turma_completa', 'teacher', 'gestao', 'Turma Completa', '100% presença em uma semana', 150, 'check-all', 'uncommon'),
('sem_ausentes', 'teacher', 'gestao', 'Sem Ausentes', '100% presença por 1 mês', 300, 'perfect', 'rare'),
('semeador_diligente', 'teacher', 'perseveranca', 'Semeador Diligente', '30 aulas consecutivas', 500, 'sower', 'rare'),
('mestre_responde', 'teacher', 'qualidade', 'Mestre Responde', 'Respondeu 100% em 24h por 1 mês', 400, 'clock-check', 'rare'),
('nps_excelente', 'teacher', 'qualidade', 'NPS Excelente', 'NPS acima de 9.0 por 3 meses', 600, 'star-medal', 'legendary'),
('cem_alunos', 'teacher', 'crescimento', 'Cem Alunos', '100 alunos únicos', 1000, 'crowd', 'legendary'),
('colheita_campo', 'teacher', 'crescimento', 'Colheita do Campo', 'Todos alunos completaram módulo', 800, 'harvest', 'rare'),
('dois_anos_fiel', 'teacher', 'perseveranca', 'Dois Anos Fiel', '24 meses consecutivos ativo', 2000, 'pillar', 'legendary')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- FUNÇÃO: Conceder XP
-- =============================================

CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID, p_actor_type TEXT, p_action_key TEXT,
  p_reference_id UUID DEFAULT NULL, p_reference_type TEXT DEFAULT NULL
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_action gamification_actions%ROWTYPE;
  v_multiplier NUMERIC(4,2) := 1.0;
  v_xp_final INTEGER;
  v_streak INTEGER;
  v_today_count INTEGER;
BEGIN
  SELECT * INTO v_action FROM gamification_actions
  WHERE action_key = p_action_key AND actor_type = p_actor_type AND active = TRUE;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_action.max_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_count FROM xp_transactions
    WHERE user_id = p_user_id AND action_key = p_action_key AND created_at >= CURRENT_DATE;
    IF v_today_count >= v_action.max_per_day THEN RETURN 0; END IF;
  END IF;

  IF p_actor_type = 'student' THEN
    SELECT streak_current INTO v_streak FROM student_gamification WHERE user_id = p_user_id;
    IF v_streak IS NULL THEN v_streak := 0; END IF;
    v_multiplier := CASE
      WHEN v_streak >= 60 THEN 2.5 WHEN v_streak >= 30 THEN 2.0
      WHEN v_streak >= 14 THEN 1.5 WHEN v_streak >= 7 THEN 1.2 ELSE 1.0
    END;
  END IF;

  v_xp_final := ROUND(v_action.xp_value * v_multiplier);

  INSERT INTO xp_transactions(user_id, actor_type, action_key, xp_earned, multiplier, xp_final, reference_id, reference_type)
  VALUES (p_user_id, p_actor_type, p_action_key, v_action.xp_value, v_multiplier, v_xp_final, p_reference_id, p_reference_type);

  IF p_actor_type = 'student' THEN
    INSERT INTO student_gamification(user_id, xp_total, xp_current_week, xp_current_month)
    VALUES (p_user_id, v_xp_final, v_xp_final, v_xp_final)
    ON CONFLICT (user_id) DO UPDATE SET
      xp_total = student_gamification.xp_total + v_xp_final,
      xp_current_week = student_gamification.xp_current_week + v_xp_final,
      xp_current_month = student_gamification.xp_current_month + v_xp_final,
      updated_at = now();
  ELSE
    INSERT INTO teacher_gamification(user_id, xp_total, xp_current_week, xp_current_month)
    VALUES (p_user_id, v_xp_final, v_xp_final, v_xp_final)
    ON CONFLICT (user_id) DO UPDATE SET
      xp_total = teacher_gamification.xp_total + v_xp_final,
      xp_current_week = teacher_gamification.xp_current_week + v_xp_final,
      xp_current_month = teacher_gamification.xp_current_month + v_xp_final,
      updated_at = now();
  END IF;

  -- Update level
  PERFORM update_gamification_level(p_user_id, p_actor_type);

  RETURN v_xp_final;
END;
$$;

-- =============================================
-- FUNÇÃO: Atualizar nível
-- =============================================

CREATE OR REPLACE FUNCTION update_gamification_level(p_user_id UUID, p_actor_type TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  IF p_actor_type = 'student' THEN
    SELECT xp_total INTO v_xp FROM student_gamification WHERE user_id = p_user_id;
  ELSE
    SELECT xp_total INTO v_xp FROM teacher_gamification WHERE user_id = p_user_id;
  END IF;

  SELECT level_number INTO v_new_level FROM gamification_levels
  WHERE actor_type = p_actor_type AND xp_min <= COALESCE(v_xp, 0) AND (xp_max IS NULL OR xp_max >= COALESCE(v_xp, 0))
  ORDER BY level_number DESC LIMIT 1;

  IF v_new_level IS NULL THEN v_new_level := 1; END IF;

  IF p_actor_type = 'student' THEN
    UPDATE student_gamification SET level_number = v_new_level WHERE user_id = p_user_id;
  ELSE
    UPDATE teacher_gamification SET level_number = v_new_level WHERE user_id = p_user_id;
  END IF;
END;
$$;

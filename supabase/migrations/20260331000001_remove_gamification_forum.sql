-- ============================================================
-- SIMPLIFICAÇÃO: Remove gamificação, fórum, chat e NPS
-- Data: 2026-03-31
-- ============================================================

-- 1. Drop gamification functions
DROP FUNCTION IF EXISTS award_xp(UUID, TEXT, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_gamification_level(UUID, TEXT) CASCADE;

-- 2. Drop gamification tables (order matters: children first)
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS xp_transactions CASCADE;
DROP TABLE IF EXISTS streak_logs CASCADE;
DROP TABLE IF EXISTS student_gamification CASCADE;
DROP TABLE IF EXISTS teacher_gamification CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS gamification_actions CASCADE;
DROP TABLE IF EXISTS gamification_levels CASCADE;

-- 3. Drop forum tables
DROP TABLE IF EXISTS eb_forum_respostas CASCADE;
DROP TABLE IF EXISTS eb_forum_topicos CASCADE;

-- 4. Drop chat table
DROP TABLE IF EXISTS eb_mensagens CASCADE;

-- 5. Drop NPS
DROP VIEW IF EXISTS eb_nps_resumo CASCADE;
DROP TABLE IF EXISTS eb_nps CASCADE;

-- 6. Drop student profile table (used by forum/chat)
DROP TABLE IF EXISTS eb_perfis_aluno CASCADE;

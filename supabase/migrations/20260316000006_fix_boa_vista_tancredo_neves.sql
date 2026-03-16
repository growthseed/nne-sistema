-- ============================================================
-- Migration 030: Replace "Boa Vista - Tancredo Neves" with "Boa Vista - Centro"
-- This church doesn't exist in the ARAM report — Ryan and Héber should point to Boa Vista - Centro
-- Date: 2026-03-16
-- ============================================================

-- OLD (wrong): a8bbaf8d-8705-4050-b894-467814992cf6 (Boa Vista - Tancredo Neves, 22 membros)
-- NEW (correct): 848e11e2-dcc8-402b-aa95-39a8819017fb (Boa Vista - Centro, 24 membros)

-- 1. Move missionary references
UPDATE missionarios
SET igrejas_responsavel = array_replace(
  igrejas_responsavel,
  'a8bbaf8d-8705-4050-b894-467814992cf6'::uuid,
  '848e11e2-dcc8-402b-aa95-39a8819017fb'::uuid
)
WHERE 'a8bbaf8d-8705-4050-b894-467814992cf6'::uuid = ANY(igrejas_responsavel);

-- 2. Delete duplicate financial/contagem data (Boa Vista Centro already has correct data)
DELETE FROM dados_financeiros WHERE igreja_id = 'a8bbaf8d-8705-4050-b894-467814992cf6';
DELETE FROM contagem_mensal WHERE igreja_id = 'a8bbaf8d-8705-4050-b894-467814992cf6';
DELETE FROM relatorios_missionarios WHERE igreja_id = 'a8bbaf8d-8705-4050-b894-467814992cf6';

-- 3. Delete the wrong church
DELETE FROM igrejas WHERE id = 'a8bbaf8d-8705-4050-b894-467814992cf6';

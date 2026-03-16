-- ============================================================
-- Migration 028: Fix remaining duplicate churches with missionary references
-- Date: 2026-03-16
-- NOTE: Caucaia missionarios UPDATE already ran in previous attempt
-- ============================================================

-- ============ Caucaia - Parque Potira ============
-- OLD: 5673fe8f  |  KEEP: 2b072b3a (has 10 members)
-- Missionarios already migrated. Now handle financial data conflicts.

-- Delete duplicate financial/contagem data from OLD church (KEEP church already has it)
DELETE FROM dados_financeiros WHERE igreja_id = '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79';
DELETE FROM contagem_mensal WHERE igreja_id = '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79';
DELETE FROM relatorios_missionarios WHERE igreja_id = '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79';

-- Now safe to delete old church
DELETE FROM igrejas WHERE id = '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79';

-- ============ São Bernardo - Centro ============
-- OLD (0 members, 2 missionaries): a142f6de  |  KEEP (21 members): 22ace350
UPDATE missionarios
SET igrejas_responsavel = array_replace(
  igrejas_responsavel,
  'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2'::uuid,
  '22ace350-f04b-4007-aaa6-a8d9eadffea5'::uuid
)
WHERE 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2'::uuid = ANY(igrejas_responsavel);

-- Delete duplicate financial/contagem data from OLD church
DELETE FROM dados_financeiros WHERE igreja_id = 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2';
DELETE FROM contagem_mensal WHERE igreja_id = 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2';
DELETE FROM relatorios_missionarios WHERE igreja_id = 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2';

DELETE FROM igrejas WHERE id = 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2';

-- ============ Araci - Centro (both 0 members, 0 refs) ============
DELETE FROM igrejas WHERE id = '24bc9e86-b958-4d73-8f72-9bdbb30ae732';

-- ============ Vitória da Conquista - Patagônia (both 0 members, 0 refs) ============
DELETE FROM igrejas WHERE id = '7d311aa7-d878-4fb9-b0de-f17e4c27f221';

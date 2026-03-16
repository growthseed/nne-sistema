-- ============================================================
-- Migration 026: Fix duplicate churches + add missing ARAM churches
-- Date: 2026-03-16
-- ============================================================

-- ============ 1. Remove duplicate churches (keep the one with data/members) ============

-- Araci - Centro: keep whichever, both have 0 members. Delete one.
DELETE FROM igrejas WHERE id = '2d157144-ca40-4401-8f75-ca12873f298d'
  AND NOT EXISTS (SELECT 1 FROM missionarios WHERE '2d157144-ca40-4401-8f75-ca12873f298d' = ANY(igrejas_responsavel))
  AND NOT EXISTS (SELECT 1 FROM dados_financeiros WHERE igreja_id = '2d157144-ca40-4401-8f75-ca12873f298d')
  AND NOT EXISTS (SELECT 1 FROM relatorios_missionarios WHERE igreja_id = '2d157144-ca40-4401-8f75-ca12873f298d');

-- Caucaia - Parque Potira: keep 2b072b3a (has 10 members), delete 5673fe8f (0 members)
DELETE FROM igrejas WHERE id = '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79'
  AND NOT EXISTS (SELECT 1 FROM missionarios WHERE '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79' = ANY(igrejas_responsavel))
  AND NOT EXISTS (SELECT 1 FROM dados_financeiros WHERE igreja_id = '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79')
  AND NOT EXISTS (SELECT 1 FROM relatorios_missionarios WHERE igreja_id = '5673fe8f-95cb-4dcb-ba82-83ff8ade3f79');

-- São Bernardo - Centro: keep 22ace350 (has 21 members), delete a142f6de (0 members)
DELETE FROM igrejas WHERE id = 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2'
  AND NOT EXISTS (SELECT 1 FROM missionarios WHERE 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2' = ANY(igrejas_responsavel))
  AND NOT EXISTS (SELECT 1 FROM dados_financeiros WHERE igreja_id = 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2')
  AND NOT EXISTS (SELECT 1 FROM relatorios_missionarios WHERE igreja_id = 'a142f6de-cf87-4fed-aad9-a9a7a1a53aa2');

-- Vitória da Conquista - Patagônia: keep whichever, both 0 members. Delete one.
DELETE FROM igrejas WHERE id = '7e4b9939-3939-4e46-a1b5-b491332a409d'
  AND NOT EXISTS (SELECT 1 FROM missionarios WHERE '7e4b9939-3939-4e46-a1b5-b491332a409d' = ANY(igrejas_responsavel))
  AND NOT EXISTS (SELECT 1 FROM dados_financeiros WHERE igreja_id = '7e4b9939-3939-4e46-a1b5-b491332a409d')
  AND NOT EXISTS (SELECT 1 FROM relatorios_missionarios WHERE igreja_id = '7e4b9939-3939-4e46-a1b5-b491332a409d');

-- ============ 2. Update ARAM church member counts ============
-- ARAM associacao_id = 62237917-adc6-49b0-8fe9-fe078dfcb63a

-- Santa Etelvina: 23 → 25
UPDATE igrejas SET membros_ativos = 25, updated_at = now()
WHERE id = 'bd4a6a71-e7c3-4bc3-b402-9cabb8be5e07';

-- ============ 3. Add missing ARAM churches ============

-- BOA VISTA (separate from Boa Vista - Santa Luzia and Boa Vista - Tancredo Neves)
INSERT INTO igrejas (nome, endereco_cidade, endereco_estado, associacao_id, membros_ativos, interessados)
VALUES (
  'Igreja Boa Vista - Centro',
  'Boa Vista',
  'RR',
  '62237917-adc6-49b0-8fe9-fe078dfcb63a',
  24,
  0
) ON CONFLICT DO NOTHING;

-- MANAUS MEMBROS ISOLADOS
INSERT INTO igrejas (nome, endereco_cidade, endereco_estado, associacao_id, membros_ativos, interessados)
VALUES (
  'Igreja Manaus - Membros Isolados',
  'Manaus',
  'AM',
  '62237917-adc6-49b0-8fe9-fe078dfcb63a',
  11,
  0
) ON CONFLICT DO NOTHING;

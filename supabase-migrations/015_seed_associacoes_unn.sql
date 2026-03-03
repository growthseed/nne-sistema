-- ============================================================
-- Migration 015: Seed das 7 Associacoes da Uniao Norte Nordeste
-- Fonte: Sistema Mordomia NNE (referencia oficial)
-- Data: 2026-02-27
-- ============================================================
-- A UNN possui 7 associacoes/campos missionarios:
-- 1. ASPAR  - Associacao Paraense (JA EXISTE - b0000000-...-000000000001)
-- 2. ARAM   - Associacao Roraima Amazonas
-- 3. AMAPI  - Associacao Maranhao Piaui
-- 4. ANOB   - Associacao Nordeste Brasileira
-- 5. ASCE   - Associacao Cearense
-- 6. CAMISE - Campo Missionario Sergipano
-- 7. CAMAP  - Campo Missionario Amapaense
-- ============================================================

-- 1. ARAM - Associacao Roraima Amazonas (AM, RR, AC, RO)
INSERT INTO associacoes (id, uniao_id, nome, sigla, tipo, estado, cidade, ativo)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Associacao Roraima Amazonas',
  'ARAM',
  'associacao',
  'AM',
  'Manaus',
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. AMAPI - Associacao Maranhao Piaui (MA, PI)
INSERT INTO associacoes (id, uniao_id, nome, sigla, tipo, estado, cidade, ativo)
VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Associacao Maranhao Piaui',
  'AMAPI',
  'associacao',
  'MA',
  'Sao Luis',
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. ANOB - Associacao Nordeste Brasileira (PE, AL, PB, RN, BA)
INSERT INTO associacoes (id, uniao_id, nome, sigla, tipo, estado, cidade, ativo)
VALUES (
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Associacao Nordeste Brasileira',
  'ANOB',
  'associacao',
  'PE',
  'Recife',
  true
) ON CONFLICT (id) DO NOTHING;

-- 4. ASCE - Associacao Cearense (CE)
INSERT INTO associacoes (id, uniao_id, nome, sigla, tipo, estado, cidade, ativo)
VALUES (
  'b0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Associacao Cearense',
  'ASCE',
  'associacao',
  'CE',
  'Fortaleza',
  true
) ON CONFLICT (id) DO NOTHING;

-- 5. CAMISE - Campo Missionario Sergipano (SE)
INSERT INTO associacoes (id, uniao_id, nome, sigla, tipo, estado, cidade, ativo)
VALUES (
  'b0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'Campo Missionario Sergipano',
  'CAMISE',
  'campo',
  'SE',
  'Aracaju',
  true
) ON CONFLICT (id) DO NOTHING;

-- 6. CAMAP - Campo Missionario Amapaense (AP)
INSERT INTO associacoes (id, uniao_id, nome, sigla, tipo, estado, cidade, ativo)
VALUES (
  'b0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'Campo Missionario Amapaense',
  'CAMAP',
  'campo',
  'AP',
  'Macapa',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Resumo: 7 Associacoes/Campos da UNN
-- ============================================================
-- ASPAR  (b...001) - Associacao Paraense (PA)         - JA EXISTIA
-- ARAM   (b...002) - Associacao Roraima Amazonas (AM)  - NOVA
-- AMAPI  (b...003) - Associacao Maranhao Piaui (MA)    - NOVA
-- ANOB   (b...004) - Associacao Nordeste Brasileira (PE)- NOVA
-- ASCE   (b...005) - Associacao Cearense (CE)          - NOVA
-- CAMISE (b...006) - Campo Missionario Sergipano (SE)  - NOVA
-- CAMAP  (b...007) - Campo Missionario Amapaense (AP)  - NOVA
--
-- Cores UI (referencia mordomia-nne):
-- ASPAR=#16a34a  ARAM=#0891b2  AMAPI=#7c3aed  ANOB=#dc2626
-- ASCE=#ea580c   CAMISE=#ca8a04  CAMAP=#0d9488
--
-- Fonte: mordomia-nne (C:\Users\EFEITO DIGITAL\mordomia-nne)
-- ============================================================

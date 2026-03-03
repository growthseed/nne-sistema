-- ============================================================
-- Migration 016: Vincular igrejas existentes às associações por estado
-- Mapeamento corrigido conforme orientação do usuário
-- Data: 2026-02-28
-- ============================================================

-- ASPAR - Associação Paraense (PA) → 42 igrejas
UPDATE igrejas SET associacao_id = (SELECT id FROM associacoes WHERE sigla = 'ASPAR')
WHERE endereco_estado = 'PA';

-- ARAM - Associação Roraima Amazonas (AM, RR) → 8 igrejas
-- NOTA: Apenas AM e RR. AC e RO NÃO pertencem à ARAM.
UPDATE igrejas SET associacao_id = (SELECT id FROM associacoes WHERE sigla = 'ARAM')
WHERE endereco_estado IN ('AM', 'RR');

-- AMAPI - Associação Maranhão Piauí (MA, PI) → 31 igrejas
UPDATE igrejas SET associacao_id = (SELECT id FROM associacoes WHERE sigla = 'AMAPI')
WHERE endereco_estado IN ('MA', 'PI');

-- ANOB - Associação Nordeste Brasileira (PE, AL, PB, RN) → 29 igrejas
-- NOTA: BA NÃO pertence à ANOB.
UPDATE igrejas SET associacao_id = (SELECT id FROM associacoes WHERE sigla = 'ANOB')
WHERE endereco_estado IN ('PE', 'AL', 'PB', 'RN');

-- ASCE - Associação Cearense (CE) → 10 igrejas
UPDATE igrejas SET associacao_id = (SELECT id FROM associacoes WHERE sigla = 'ASCE')
WHERE endereco_estado = 'CE';

-- CAMISE - Campo Missionário Sergipano (SE) → 10 igrejas
UPDATE igrejas SET associacao_id = (SELECT id FROM associacoes WHERE sigla = 'CAMISE')
WHERE endereco_estado = 'SE';

-- CAMAP - Campo Missionário Amapaense (AP) → 6 igrejas
UPDATE igrejas SET associacao_id = (SELECT id FROM associacoes WHERE sigla = 'CAMAP')
WHERE endereco_estado = 'AP';

-- ============================================================
-- Resultado: 136 igrejas vinculadas às 7 associações da UNN
-- Estados sem associação (fora da UNN ou sem mapeamento):
-- AC, RO, BA, SP, RJ, MG, ES, GO, DF, MT, MS, TO, PR, RS, SC
-- ============================================================

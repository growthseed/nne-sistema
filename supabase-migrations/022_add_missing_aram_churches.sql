-- ============================================================
-- Migration 022: Adicionar igrejas faltantes da ARAM
-- Baseado nas capturas de tela do sistema antigo
-- Data: 2026-03-14
-- ============================================================

-- Igrejas faltantes identificadas comparando sistema antigo com seed 010:
-- AM: Manaus Central, Careiro da Várzea, Terra Nova, Mutirão, São Miguel
-- RR: (já existem Alto Alegre, Boa Vista-Tancredo Neves, Boa Vista-Santa Luzia)
-- Categorias especiais: Membros Isolados, Missionários, Extras
-- CE: Martinópole

-- Usar a associacao ARAM para AM/RR
-- Todas as igrejas novas serão vinculadas à ARAM

INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_cidade, endereco_estado, tipo, ativo)
SELECT
  'Igreja Manaus - Central',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  'Manaus', 'AM', 'Templo', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%Manaus%Central%'
);

INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_cidade, endereco_estado, tipo, ativo)
SELECT
  'Igreja Careiro da Várzea',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  'Careiro da Várzea', 'AM', 'Templo', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%Careiro%Várzea%' OR nome ILIKE '%Careiro da Varzea%'
);

INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_cidade, endereco_estado, tipo, ativo)
SELECT
  'Igreja Terra Nova',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  'Terra Nova', 'AM', 'Templo', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%Terra Nova%' AND endereco_estado = 'AM'
);

INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_cidade, endereco_estado, tipo, ativo)
SELECT
  'Igreja Manaus - Mutirão',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  'Manaus', 'AM', 'Congregacao', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%Manaus%Mutirão%' OR nome ILIKE '%Manaus%Mutirao%'
);

INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_cidade, endereco_estado, tipo, ativo)
SELECT
  'Igreja São Miguel',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  'São Miguel', 'AM', 'Congregacao', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%São Miguel%' AND endereco_estado = 'AM'
);

-- Categorias especiais (igrejas virtuais usadas para contabilidade)
INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_estado, tipo, ativo)
SELECT
  'Membros Isolados - ARAM',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  'AM', 'Grupo', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%Membros Isolados%ARAM%'
);

INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_estado, tipo, ativo)
SELECT
  'Missionários - ARAM',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  'AM', 'Grupo', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%Missionários%ARAM%' OR nome ILIKE '%Missionarios%ARAM%'
);

INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_estado, tipo, ativo)
SELECT
  'Extras - ARAM',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ARAM' LIMIT 1),
  'AM', 'Grupo', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%Extras%ARAM%'
);

-- Martinópole (CE) - pertence à ASCE
INSERT INTO igrejas (nome, uniao_id, associacao_id, endereco_cidade, endereco_estado, tipo, ativo)
SELECT
  'Igreja Martinópole',
  (SELECT id FROM unioes WHERE sigla = 'UNN' LIMIT 1),
  (SELECT id FROM associacoes WHERE sigla = 'ASCE' LIMIT 1),
  'Martinópole', 'CE', 'Congregacao', true
WHERE NOT EXISTS (
  SELECT 1 FROM igrejas WHERE nome ILIKE '%Martinópole%' OR nome ILIKE '%Martinopole%'
);

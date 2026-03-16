-- ============================================================
-- Migration 027: Fix ARAM church member counts + add missing churches
-- Date: 2026-03-16
-- ============================================================

-- Santa Etelvina: 23 → 25
UPDATE igrejas SET membros_ativos = 25
WHERE id = 'bd4a6a71-e7c3-4bc3-b402-9cabb8be5e07';

-- BOA VISTA (separate from Boa Vista - Santa Luzia)
INSERT INTO igrejas (nome, endereco_cidade, endereco_estado, associacao_id, membros_ativos, interessados)
VALUES (
  'Igreja Boa Vista - Centro',
  'Boa Vista',
  'RR',
  '62237917-adc6-49b0-8fe9-fe078dfcb63a',
  24,
  0
);

-- MANAUS MEMBROS ISOLADOS
INSERT INTO igrejas (nome, endereco_cidade, endereco_estado, associacao_id, membros_ativos, interessados)
VALUES (
  'Igreja Manaus - Membros Isolados',
  'Manaus',
  'AM',
  '62237917-adc6-49b0-8fe9-fe078dfcb63a',
  11,
  0
);

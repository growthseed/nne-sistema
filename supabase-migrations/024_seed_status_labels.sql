-- ============================================================
-- Migration 024: Seed status_labels in configuracoes
-- Allows admin to manage missionary status options dynamically
-- Date: 2026-03-15
-- ============================================================

INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
  'status_labels',
  '{
    "ativo": "Ativo",
    "inativo": "Inativo",
    "licenca": "Licença",
    "transferido": "Transferido",
    "aposentado": "Aposentado",
    "falecido": "Falecido",
    "exonerado": "Exonerado",
    "suspenso": "Suspenso"
  }'::jsonb,
  'Nomes de exibição dos status de missionários. Editável via Configurações > Categorias.'
)
ON CONFLICT (chave) DO NOTHING;

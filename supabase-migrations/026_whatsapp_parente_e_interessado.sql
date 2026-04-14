-- =============================================
-- Migration 026: WhatsApp de parente + opção interessado/visitante
-- =============================================

-- 1. Colunas para WhatsApp alternativo (parente/responsável)
ALTER TABLE cadastro_respostas ADD COLUMN IF NOT EXISTS whatsapp_parente text;
ALTER TABLE cadastro_respostas ADD COLUMN IF NOT EXISTS whatsapp_parente_nome text;
ALTER TABLE cadastro_respostas ADD COLUMN IF NOT EXISTS whatsapp_parente_parentesco text;

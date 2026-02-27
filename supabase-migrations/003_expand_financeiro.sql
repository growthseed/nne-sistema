-- Migration: Expand financial categories to match old SDARM system
-- Run this against the Supabase project: prqxiqykkijzpwdpqujv

-- New receita columns
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS receita_primicias numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS receita_evangelismo numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS receita_radio_colportagem numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS receita_construcao numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS receita_gratificacao_6 numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS receita_missoes_mundial numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS receita_missoes_autonomas numeric DEFAULT 0;

-- New despesa columns
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS despesa_aluguel numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS despesa_telefone numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS despesa_transporte numeric DEFAULT 0;
ALTER TABLE dados_financeiros ADD COLUMN IF NOT EXISTS despesa_eventos numeric DEFAULT 0;

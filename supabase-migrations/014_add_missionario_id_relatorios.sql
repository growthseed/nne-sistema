-- ============================================================
-- Migration 014: Adicionar missionario_id a relatorios_missionarios
-- Necessario para o novo RelatorioMissionarioPage (entrada diaria)
-- ============================================================

-- Adicionar coluna missionario_id
ALTER TABLE public.relatorios_missionarios
  ADD COLUMN IF NOT EXISTS missionario_id uuid REFERENCES public.missionarios(id);

-- Criar index para buscas por missionario + mes/ano
CREATE INDEX IF NOT EXISTS idx_relatorios_missionario_mes_ano
  ON public.relatorios_missionarios(missionario_id, mes, ano);

-- Unique constraint para evitar duplicidade (1 relatorio por missionario/mes/ano)
-- Nao usar UNIQUE direto pois pode conflitar com registros antigos sem missionario_id
-- Sera validado no frontend

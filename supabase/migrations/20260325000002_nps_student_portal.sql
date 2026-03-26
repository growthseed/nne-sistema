-- =============================================
-- NPS por Aula + Portal do Aluno
-- =============================================

-- NPS (Net Promoter Score) por aula
CREATE TABLE IF NOT EXISTS eb_nps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id UUID NOT NULL REFERENCES classes_biblicas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES classe_biblica_alunos(id) ON DELETE CASCADE,
  aula_id UUID NOT NULL REFERENCES classe_biblica_aulas(id) ON DELETE CASCADE,
  ponto_numero INTEGER NOT NULL,
  nota INTEGER NOT NULL CHECK (nota >= 0 AND nota <= 10),
  comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(classe_id, aluno_id, aula_id)
);

-- Índices NPS
CREATE INDEX IF NOT EXISTS idx_eb_nps_classe ON eb_nps(classe_id);
CREATE INDEX IF NOT EXISTS idx_eb_nps_aula ON eb_nps(aula_id);

-- RLS
ALTER TABLE eb_nps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eb_nps_read" ON eb_nps FOR SELECT USING (true);
CREATE POLICY "eb_nps_write" ON eb_nps FOR ALL USING (true);

-- View: NPS médio por turma
CREATE OR REPLACE VIEW eb_nps_resumo AS
SELECT
  n.classe_id,
  cb.nome AS classe_nome,
  COUNT(n.id) AS total_avaliacoes,
  ROUND(AVG(n.nota), 1) AS media_nps,
  COUNT(CASE WHEN n.nota >= 9 THEN 1 END) AS promotores,
  COUNT(CASE WHEN n.nota >= 7 AND n.nota <= 8 THEN 1 END) AS neutros,
  COUNT(CASE WHEN n.nota <= 6 THEN 1 END) AS detratores,
  CASE WHEN COUNT(n.id) > 0
    THEN ROUND(
      (COUNT(CASE WHEN n.nota >= 9 THEN 1 END)::numeric / COUNT(n.id) * 100) -
      (COUNT(CASE WHEN n.nota <= 6 THEN 1 END)::numeric / COUNT(n.id) * 100)
    , 1)
    ELSE 0
  END AS score_nps
FROM eb_nps n
JOIN classes_biblicas cb ON cb.id = n.classe_id
GROUP BY n.classe_id, cb.nome;

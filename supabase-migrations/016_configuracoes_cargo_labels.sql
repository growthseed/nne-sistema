-- ============================================================
-- Migration 016: Tabela configuracoes + seed cargo_labels
-- Permite edição dos nomes dos cargos ministeriais via UI
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text UNIQUE NOT NULL,
  valor jsonb NOT NULL,
  descricao text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Todos podem ler configuracoes
CREATE POLICY "configuracoes_select" ON configuracoes
  FOR SELECT USING (true);

-- Apenas admin pode inserir/atualizar/deletar
CREATE POLICY "configuracoes_insert" ON configuracoes
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM usuarios WHERE papel = 'admin')
  );

CREATE POLICY "configuracoes_update" ON configuracoes
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM usuarios WHERE papel = 'admin')
  );

CREATE POLICY "configuracoes_delete" ON configuracoes
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM usuarios WHERE papel = 'admin')
  );

-- Seed: cargo_labels padrão
INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
  'cargo_labels',
  '{
    "ministro": "Ministro",
    "pastor_ordenado": "Pastor Ordenado",
    "pastor_licenciado": "Pastor Licenciado",
    "obreiro_biblico": "Obreiro Bíblico",
    "obreiro_aspirante": "Obreiro Aspirante",
    "obreiro_pre_aspirante": "Obreiro Pré-Aspirante",
    "colportor": "Colportor",
    "diretor_colportagem": "Diretor de Colportagem",
    "aux_diretor_colportagem": "Aux. Diretor Colportagem",
    "evangelista": "Evangelista",
    "contratado": "Contratado",
    "missionario_voluntario": "Missionário Voluntário",
    "missionario_auxiliar": "Missionário Auxiliar",
    "diretor_departamental": "Diretor Departamental",
    "presidente": "Presidente",
    "secretario": "Secretário",
    "tesoureiro_campo": "Tesoureiro de Campo"
  }'::jsonb,
  'Nomes de exibição dos cargos ministeriais. Editável via Configurações > Categorias.'
)
ON CONFLICT (chave) DO NOTHING;

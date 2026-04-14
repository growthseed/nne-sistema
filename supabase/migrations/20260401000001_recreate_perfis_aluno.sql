-- Recriar tabela eb_perfis_aluno (necessária para perfil do aluno)
-- Foi removida por engano na migration anterior

CREATE TABLE IF NOT EXISTS eb_perfis_aluno (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  foto_url TEXT,
  data_nascimento TEXT,
  sexo TEXT,
  telefone TEXT,
  cidade TEXT,
  estado TEXT,
  igreja_nome TEXT,
  bio TEXT,
  perfil_completo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE eb_perfis_aluno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil_own_read" ON eb_perfis_aluno FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "perfil_own_insert" ON eb_perfis_aluno FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "perfil_own_update" ON eb_perfis_aluno FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

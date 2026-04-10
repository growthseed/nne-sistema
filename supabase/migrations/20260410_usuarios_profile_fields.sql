-- Adiciona campos de perfil completo na tabela usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sexo TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS endereco_rua TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS endereco_cidade TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS endereco_estado TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS endereco_cep TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS observacoes TEXT;

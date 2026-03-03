-- ============================================================
-- Migration 013b: Corrigir seed das igrejas que nao foram atualizadas
-- Problema: ILIKE nao ignora acentos (Maraba != Marabá)
-- Usando nomes exatos do banco
-- ============================================================

-- Abade: cidade no banco e Braganca, nao Curuca
UPDATE igrejas SET membros_ativos = 40, interessados = 142, tipo = 'Templo'
  WHERE nome = 'Igreja Abade';

-- Aguas Lindas (Belem): nome real tem acento
UPDATE igrejas SET membros_ativos = 11, interessados = 93, tipo = 'Templo'
  WHERE nome ILIKE '%Aguas Lindas%' AND endereco_cidade ILIKE '%Bel%m%';

-- Apinages: nome real e Apinagés
UPDATE igrejas SET membros_ativos = 10, interessados = 20, tipo = 'Templo'
  WHERE nome ILIKE '%Apinag%s%';

-- Belem Sede/Pedreira: nao ha "Sede", usar Pedreira ou Cabanagem
-- Usando Pedreira conforme migration original
UPDATE igrejas SET membros_ativos = 21, interessados = 46, tipo = 'Templo'
  WHERE nome ILIKE '%Bel%m%Pedreira%';

-- Boa Esperanca: Nao existe no PA - pode ser Cabanagem?
-- Pulando por agora (precisa confirmar com usuario)

-- Braganca: acento no c cedilha
UPDATE igrejas SET membros_ativos = 30, interessados = 106, tipo = 'Templo'
  WHERE nome ILIKE '%Bragan%a%Cereja%' OR (nome ILIKE '%Bragan%' AND endereco_estado = 'PA' AND nome ILIKE '%Cereja%');

-- Conceicao do Araguaia
UPDATE igrejas SET membros_ativos = 14, interessados = 79, tipo = 'Templo'
  WHERE nome ILIKE '%Concei%o do Araguaia%';

-- Concordia do Para
UPDATE igrejas SET membros_ativos = 7, interessados = 29, tipo = 'Templo'
  WHERE nome ILIKE '%Conc%rdia do Par%';

-- Curuca (Abade original aponta para Curuca mas Abade ja atualizado acima)
-- O seed original mencionava Abade+Curuca, ja tratado

-- Goianesia do Para
UPDATE igrejas SET membros_ativos = 11, interessados = 37, tipo = 'Templo'
  WHERE nome ILIKE '%Goian%sia%' AND endereco_estado = 'PA';

-- Jacunda
UPDATE igrejas SET membros_ativos = 5, interessados = 18, tipo = 'Templo'
  WHERE nome ILIKE '%Jacund%' AND endereco_estado = 'PA';

-- Jardim do Eden (Barcarena): nome real muito diferente
UPDATE igrejas SET membros_ativos = 10, interessados = 101, tipo = 'Templo'
  WHERE nome ILIKE '%Barcarena%' AND nome ILIKE '%den%';

-- Liberdade (Maraba)
UPDATE igrejas SET membros_ativos = 9, interessados = 49, tipo = 'Salao Alugado'
  WHERE nome ILIKE '%Marab%Liberdade%';

-- Maraba (principal, nao Liberdade)
UPDATE igrejas SET membros_ativos = 46, interessados = 186, tipo = 'Templo'
  WHERE nome ILIKE '%Marab%Nova Marab%';

-- Pratinha (Belem)
UPDATE igrejas SET membros_ativos = 8, interessados = 84, tipo = 'Templo'
  WHERE nome ILIKE '%Bel%m%Pratinha%';

-- Redencao (usar Bela Vista para nao pegar Castanhal Cristo Redentor)
UPDATE igrejas SET membros_ativos = 13, interessados = 49, tipo = 'Salao Alugado'
  WHERE nome ILIKE '%Reden%Bela Vista%';

-- Castanhal: re-setar valor correto (foi sobrescrito acidentalmente pelo Redencao acima)
UPDATE igrejas SET membros_ativos = 25, interessados = 140, tipo = 'Templo'
  WHERE nome ILIKE '%Castanhal%Cristo Redentor%';

-- Santarem
UPDATE igrejas SET membros_ativos = 31, interessados = 9, tipo = 'Templo'
  WHERE nome ILIKE '%Santar%m%' AND endereco_estado = 'PA';

-- Sao Domingos do Araguaia
UPDATE igrejas SET membros_ativos = 103, interessados = 291, tipo = 'Templo'
  WHERE nome ILIKE '%Domingos do Araguaia%Centro%';

-- Tailandia
UPDATE igrejas SET membros_ativos = 13, interessados = 65, tipo = 'Templo'
  WHERE nome ILIKE '%Tail%ndia%';

-- Tucuma
UPDATE igrejas SET membros_ativos = 14, interessados = 54, tipo = 'Templo'
  WHERE nome ILIKE '%Tucum%' AND endereco_estado = 'PA' AND nome NOT ILIKE '%Tucuru%';

-- Tucurui
UPDATE igrejas SET membros_ativos = 12, interessados = 31, tipo = 'Templo'
  WHERE nome ILIKE '%Tucuru%' AND endereco_estado = 'PA';

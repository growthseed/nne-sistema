-- ============================================================
-- Migration 013: Seed membros_ativos e interessados das 36 igrejas ASPAR
-- Dados extraidos do GS 4.1 (fevereiro 2026)
-- ============================================================

-- Match por nome + endereco_cidade para maior precisao

UPDATE igrejas SET membros_ativos = 40, interessados = 142, tipo = 'Templo'
  WHERE nome ILIKE '%Abade%' AND endereco_cidade ILIKE '%Curuca%';

UPDATE igrejas SET membros_ativos = 9, interessados = 49, tipo = 'Templo'
  WHERE nome ILIKE '%Abaetetuba%';

UPDATE igrejas SET membros_ativos = 11, interessados = 93, tipo = 'Templo'
  WHERE nome ILIKE '%Aguas Lindas%' AND endereco_cidade ILIKE '%Belem%';

UPDATE igrejas SET membros_ativos = 23, interessados = 119, tipo = 'Templo'
  WHERE nome ILIKE '%Altamira%' AND endereco_estado = 'PA';

UPDATE igrejas SET membros_ativos = 90, interessados = 91, tipo = 'Templo'
  WHERE nome ILIKE '%Anapu%';

UPDATE igrejas SET membros_ativos = 10, interessados = 20, tipo = 'Templo'
  WHERE nome ILIKE '%Apinages%';

UPDATE igrejas SET membros_ativos = 21, interessados = 46, tipo = 'Templo'
  WHERE nome ILIKE '%Belem%Sede%' OR (nome ILIKE '%Belem%Pedreira%');

UPDATE igrejas SET membros_ativos = 7, interessados = 74, tipo = 'Templo'
  WHERE nome ILIKE '%Boa Esperanca%' AND endereco_cidade ILIKE '%Belem%';

UPDATE igrejas SET membros_ativos = 30, interessados = 106, tipo = 'Templo'
  WHERE nome ILIKE '%Braganca%' AND endereco_estado = 'PA';

UPDATE igrejas SET membros_ativos = 24, interessados = 75, tipo = 'Templo'
  WHERE nome ILIKE '%Breu Branco%';

UPDATE igrejas SET membros_ativos = 25, interessados = 140, tipo = 'Templo'
  WHERE nome ILIKE '%Castanhal%';

UPDATE igrejas SET membros_ativos = 14, interessados = 48, tipo = 'Templo'
  WHERE nome ILIKE '%Chipaia%';

UPDATE igrejas SET membros_ativos = 14, interessados = 79, tipo = 'Templo'
  WHERE nome ILIKE '%Conceicao%Araguaia%';

UPDATE igrejas SET membros_ativos = 7, interessados = 29, tipo = 'Templo'
  WHERE nome ILIKE '%Concordia%Para%';

UPDATE igrejas SET membros_ativos = 9, interessados = 66, tipo = 'Templo'
  WHERE nome ILIKE '%Dom Eliseu%';

UPDATE igrejas SET membros_ativos = 11, interessados = 37, tipo = 'Templo'
  WHERE nome ILIKE '%Goianesia%' AND endereco_estado = 'PA';

UPDATE igrejas SET membros_ativos = 5, interessados = 18, tipo = 'Templo'
  WHERE nome ILIKE '%Jacunda%';

UPDATE igrejas SET membros_ativos = 21, interessados = 12, tipo = 'Templo'
  WHERE nome ILIKE '%Janari%';

UPDATE igrejas SET membros_ativos = 10, interessados = 101, tipo = 'Templo'
  WHERE nome ILIKE '%Jardim%Eden%' AND endereco_cidade ILIKE '%Barcarena%';

UPDATE igrejas SET membros_ativos = 9, interessados = 49, tipo = 'Salao Alugado'
  WHERE nome ILIKE '%Liberdade%' AND endereco_cidade ILIKE '%Maraba%';

UPDATE igrejas SET membros_ativos = 46, interessados = 186, tipo = 'Templo'
  WHERE nome ILIKE '%Maraba%' AND nome NOT ILIKE '%Liberdade%'
    AND endereco_cidade ILIKE '%Maraba%';

UPDATE igrejas SET membros_ativos = 16, interessados = 102, tipo = 'Templo'
  WHERE nome ILIKE '%Marituba%';

UPDATE igrejas SET membros_ativos = 24, interessados = 25, tipo = 'Templo'
  WHERE nome ILIKE '%Nova Ipixuna%';

UPDATE igrejas SET membros_ativos = 28, interessados = 76, tipo = 'Templo'
  WHERE nome ILIKE '%Paragominas%';

UPDATE igrejas SET membros_ativos = 75, interessados = 280, tipo = 'Templo'
  WHERE nome ILIKE '%Parauapebas%';

UPDATE igrejas SET membros_ativos = 8, interessados = 84, tipo = 'Templo'
  WHERE nome ILIKE '%Pratinha%' AND endereco_cidade ILIKE '%Belem%';

UPDATE igrejas SET membros_ativos = 23, interessados = 29, tipo = 'Templo'
  WHERE nome ILIKE '%Quatro Bocas%';

UPDATE igrejas SET membros_ativos = 13, interessados = 49, tipo = 'Salao Alugado'
  WHERE nome ILIKE '%Redencao%' AND endereco_estado = 'PA';

UPDATE igrejas SET membros_ativos = 12, interessados = 99, tipo = 'Templo'
  WHERE nome ILIKE '%Santa Izabel%' AND endereco_estado = 'PA';

UPDATE igrejas SET membros_ativos = 20, interessados = 41, tipo = 'Templo'
  WHERE nome ILIKE '%Santa Julia%';

UPDATE igrejas SET membros_ativos = 31, interessados = 9, tipo = 'Templo'
  WHERE nome ILIKE '%Santarem%' AND endereco_estado = 'PA';

UPDATE igrejas SET membros_ativos = 103, interessados = 291, tipo = 'Templo'
  WHERE nome ILIKE '%Sao Domingos%Araguaia%';

UPDATE igrejas SET membros_ativos = 13, interessados = 54, tipo = 'Templo'
  WHERE nome ILIKE '%Taboca%';

UPDATE igrejas SET membros_ativos = 13, interessados = 65, tipo = 'Templo'
  WHERE nome ILIKE '%Tailandia%';

UPDATE igrejas SET membros_ativos = 14, interessados = 54, tipo = 'Templo'
  WHERE nome ILIKE '%Tucuma%';

UPDATE igrejas SET membros_ativos = 12, interessados = 31, tipo = 'Templo'
  WHERE nome ILIKE '%Tucurui%';

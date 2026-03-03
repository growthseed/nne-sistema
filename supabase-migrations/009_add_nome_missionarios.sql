-- ============================================================
-- Migration 009: Adicionar coluna 'nome' a tabela missionarios
-- e atualizar os 25 missionarios da ASPAR com seus nomes
-- ============================================================

-- 1. Adicionar coluna nome (NOT NULL com default temporario)
ALTER TABLE public.missionarios ADD COLUMN IF NOT EXISTS nome TEXT;

-- 2. Atualizar nomes dos 25 missionarios (match por data_nascimento + cidade_nascimento)
UPDATE missionarios SET nome = 'ANTONIO NUNES PEREIRA'
  WHERE data_nascimento = '1978-06-05' AND cidade_nascimento = 'Duque Bacelar';

UPDATE missionarios SET nome = 'CAIO VINICIUS DA SILVA'
  WHERE data_nascimento = '1991-01-27' AND cidade_nascimento = 'Belo Horizonte';

UPDATE missionarios SET nome = 'ENOC CARDOSO MEIRELES'
  WHERE data_nascimento = '1993-06-19' AND cidade_nascimento = 'Sao Bernardo';

UPDATE missionarios SET nome = 'ERIELSON PEREIRA BARBOSA LABRE'
  WHERE data_nascimento = '1985-11-13' AND cidade_nascimento = 'Tocantinopolis';

UPDATE missionarios SET nome = 'EVANDERSON LUCA DA SILVA BARBOSA'
  WHERE data_nascimento = '1998-03-19' AND cidade_nascimento = 'Natal';

UPDATE missionarios SET nome = 'FABRICIO FONTENELE DE ARAUJO'
  WHERE data_nascimento = '1989-02-19' AND cidade_nascimento = 'Concordia do Para';

UPDATE missionarios SET nome = 'GILSON DE MELO'
  WHERE data_nascimento = '1968-09-29' AND cidade_nascimento = 'Campo de Brito';

UPDATE missionarios SET nome = 'GIVALDO DE SOUSA PEREIRA'
  WHERE data_nascimento = '1980-07-16' AND cidade_nascimento = 'Praia Norte';

UPDATE missionarios SET nome = 'HEBER SILVA GOMES'
  WHERE data_nascimento = '1972-10-23' AND cidade_nascimento = 'Uberlandia';

UPDATE missionarios SET nome = 'ISAIAS BARBOSA DOS REIS'
  WHERE data_nascimento = '1973-12-09' AND cidade_nascimento = 'Araguaina';

UPDATE missionarios SET nome = 'JEREMIAS FONTINELE ARAUJO'
  WHERE data_nascimento = '1991-03-23' AND cidade_nascimento = 'Concordia do Para';

UPDATE missionarios SET nome = 'JOSUE DE JESUS DA SILVA'
  WHERE data_nascimento = '1987-10-09' AND cidade_nascimento = 'Maraba';

UPDATE missionarios SET nome = 'JULIO AGRIPINO RIBEIRO DE OLIVEIRA'
  WHERE data_nascimento = '1991-03-03' AND cidade_nascimento = 'Campui';

UPDATE missionarios SET nome = 'LAILA OLIVEIRA DA COSTA SOUZA'
  WHERE data_nascimento = '1989-11-24' AND cidade_nascimento = 'Belem';

UPDATE missionarios SET nome = 'LUCIEL RIBEIRO DE SOUZA'
  WHERE data_nascimento = '1985-03-26' AND cidade_nascimento = 'Cachoeira do Arari';

UPDATE missionarios SET nome = 'MANOEL MIRANDA DA COSTA'
  WHERE data_nascimento = '1966-08-27' AND cidade_nascimento = 'Vizeu';

UPDATE missionarios SET nome = 'MARCELO RODRIGUES DA SILVA PINHEIRO'
  WHERE data_nascimento = '1982-11-04' AND cidade_nascimento = 'Belem';

UPDATE missionarios SET nome = 'MATHEUS DO NASCIMENTO SILVA'
  WHERE data_nascimento = '2004-01-27' AND cidade_nascimento = 'Capim Grosso';

UPDATE missionarios SET nome = 'MAURICIO DOS SANTOS SILVA'
  WHERE data_nascimento = '2004-04-24' AND cidade_nascimento = 'Braganca';

UPDATE missionarios SET nome = 'NATANAEL ROCHA COSTA'
  WHERE data_nascimento = '1982-11-18' AND cidade_nascimento = 'Anapu';

UPDATE missionarios SET nome = 'OLDAC OLIVEIRA DE QUEIROZ'
  WHERE data_nascimento = '1963-12-12' AND cidade_nascimento = 'Guanambi';

UPDATE missionarios SET nome = 'RAMON WILLAMYS FERREIRA DA SILVA'
  WHERE data_nascimento = '1991-09-02' AND cidade_nascimento = 'Balsas';

UPDATE missionarios SET nome = 'VALMIR FERREIRA DE SOUSA'
  WHERE data_nascimento = '1964-05-10' AND cidade_nascimento = 'Santa Izabel';

UPDATE missionarios SET nome = 'WALDOMERO LUZ SANTOS'
  WHERE data_nascimento = '1966-11-28' AND cidade_nascimento = 'Conceicao do Araguaia';

UPDATE missionarios SET nome = 'WANDERSON SANTOS DA CUNHA'
  WHERE data_nascimento = '1998-02-08' AND cidade_nascimento = 'Almeirim';

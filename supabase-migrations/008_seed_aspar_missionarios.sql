-- ============================================================
-- Migration 008: Seed ASPAR Missionaries
-- Insere Uniao NNE, Associacao ASPAR, e 25 missionarios
-- Dados extraidos do Cadastro Biografico GS 4.1 (fev/2026)
-- ============================================================

-- 1. Criar Uniao Norte Nordeste
INSERT INTO unioes (id, nome, sigla, ativo)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Uniao Norte Nordeste Brasileira',
  'NNE',
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. Criar Associacao ASPAR (Associacao Para)
INSERT INTO associacoes (id, uniao_id, nome, sigla, tipo, estado, ativo)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Associacao Para',
  'ASPAR',
  'associacao',
  'PA',
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. Inserir 25 missionarios da ASPAR
-- Todos vinculados a uniao NNE e associacao ASPAR
-- cargo_ministerial mapeado do sistema GS 4.1:
--   Ministro -> ministro
--   Pastor -> pastor_ordenado
--   Obreiro Biblico -> obreiro_biblico
--   Obreiro Aspirante -> obreiro_aspirante
--   Obreiro Pre-Aspirante -> obreiro_pre_aspirante
--   Sem Categoria / nao categorizado -> missionario_voluntario

-- M01 — ANTONIO NUNES PEREIRA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_bairro, endereco_cidade, endereco_uf, endereco_cep,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'pastor_ordenado', 'ativo',
  'masculino', '1978-06-05', 'Duque Bacelar', 'MA', 'Brasileira',
  'Missionario', 'Ensino Fundamental Completo', 'casado', '2004-12-29',
  '(94) 991569105', 'dknunes321@gmail.com',
  'Bairro da Paz', 'Parauapebas', 'PA', '68515-000',
  'GISELE DA SILVA FERREIRA NUNES', '1983-05-20', 'Sao Luis', 'MA', 'Superior Incompleto',
  '[{"nome":"DINEY KALEBE DA SILVA NUNES","nascimento":"2011-06-11","cidade":"Sao Luis-MA"}]',
  '1995-08-13'
);

-- M02 — CAIO VINICIUS DA SILVA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'obreiro_pre_aspirante', 'ativo',
  'masculino', '1991-01-27', 'Belo Horizonte', 'MG', 'Brasileira',
  'Aspirante ao Pastorado', 'Mestrado', 'casado', '2013-09-01',
  '31-97325-0660', 'cviniciusteo@gmail.com',
  'Uberlandia', 'MG',
  'REGINA MARIA DA SILVA', '1992-08-03', 'Martinho Campos', 'MG', 'Ensino Medio Completo',
  '[{"nome":"LEONARDO GABRIEL DA SILVA","nascimento":"2016-04-15"},{"nome":"LEVI ALBERT DA SILVA","nascimento":"2017-11-10"}]',
  '2007-11-04'
);

-- M03 — ENOC CARDOSO MEIRELES
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'obreiro_pre_aspirante', 'ativo',
  'masculino', '1993-06-19', 'Sao Bernardo', 'MA', 'Brasileira',
  'Missionario', 'Superior Completo', 'casado', '2022-10-16',
  '(94) 98188 3232', 'enocardoso1@gmail.com',
  'Maraba', 'PA',
  'IRIS SAMARA DE LIMA DE MELO',
  '[]',
  '2008-08-24'
);

-- M04 — ERIELSON PEREIRA BARBOSA LABRE
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'obreiro_biblico', 'ativo',
  'masculino', '1985-11-13', 'Tocantinopolis', 'TO', 'Brasileira',
  'Missionario', 'Ensino Fundamental Completo', 'casado', '2011-01-16',
  '(91) 98210 0011', 'euri.lbr@gmail.com',
  'Braganca', 'PA',
  'LAYCIANE OLIVEIRA DA COSTA LABRE', '1992-02-17', 'Belem', 'PA', 'Ensino Medio Completo',
  '[{"nome":"CAIO EMANUEL DA COSTA LABRE","nascimento":"2015-07-07"}]',
  '2003-09-14'
);

-- M05 — EVANDERSON LUCA DA SILVA BARBOSA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'obreiro_aspirante', 'ativo',
  'masculino', '1998-03-19', 'Natal', 'RN', 'Brasileira',
  'Contador', 'Superior Completo', 'casado', '2025-07-15',
  '(61)9 8372-1112', 'evandersonlucadasilvabarbosa@gmail.com',
  'Sao Luis', 'MA',
  'LAENA FERREIRA GOMES BARBOSA', '2003-09-11', 'Sao Domingos do Araguaia', 'PA', 'Ensino Medio Completo',
  '[]',
  '2013-12-28'
);

-- M06 — FABRICIO FONTENELE DE ARAUJO
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'obreiro_aspirante', 'ativo',
  'masculino', '1989-02-19', 'Concordia do Para', 'PA', 'Brasileira',
  'Mecanico', 'Ensino Medio Completo', 'casado', '2009-12-18',
  '(91) 99364 9311', 'fabriciofonteneledearaujo@gmail.com',
  'Sao Domingos do Araguaia', 'PA',
  'ELIETE DA SILVA FERREIRA DE ARAUJO', '1992-08-20', 'Anapu', 'PA', 'Ensino Medio Completo',
  '[{"nome":"NICOLAS FERREIRA FONTINELE","nascimento":"2014-04-05"},{"nome":"GUILHERME FERREIRA FONTINELE","nascimento":"2016-08-11"}]',
  '2010-07-11'
);

-- M07 — GILSON DE MELO
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'ministro', 'ativo',
  'masculino', '1968-09-29', 'Campo de Brito', 'SE', 'Brasileira',
  'Ministro', 'Ensino Medio Completo', 'casado', '1990-09-16',
  '(91) 98210 2827', 'irmao-gilsonmelo@hotmail.com',
  'Castanhal', 'PA',
  'MARGARETE SILVA DE MELO', '1974-08-10', 'Nanuque', 'MG', 'Ensino Fundamental Incompleto',
  '[{"nome":"GISLAINE SILVA DE MELO","nascimento":"1991-08-12"},{"nome":"JAISSON SILVA DE MELO","nascimento":"1992-08-30"},{"nome":"ALESSON SILVA DE MELO","nascimento":"1994-01-03"},{"nome":"ELISIANE SILVA DE MELO","nascimento":"1996-06-03"}]',
  '1988-11-19'
);

-- M08 — GIVALDO DE SOUSA PEREIRA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'obreiro_aspirante', 'ativo',
  'masculino', '1980-07-16', 'Praia Norte', 'TO', 'Brasileira',
  'Missionario', 'Superior Completo', 'casado', '2009-02-15',
  '(93) 99200 9121', 'GIVALDO-1980@HOTMAIL.COM',
  'Tucuma', 'PA',
  'ADARLETE DE SOUSA PEREIRA', '1986-08-04', 'Altamira', 'PA', 'Ensino Medio Completo',
  '[{"nome":"FABRICIO DE SOUSA PEREIRA","nascimento":"2012-10-19"},{"nome":"HILQUIAS DE SOUSA PEREIRA","nascimento":"2019-08-04"}]',
  '1998-04-12'
);

-- M09 — HEBER SILVA GOMES
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'missionario_voluntario', 'ativo',
  'masculino', '1972-10-23', 'Uberlandia', 'MG', 'Brasileira',
  'Representante Comercial', 'Ensino Medio Completo', 'casado', '1997-02-16',
  '(94) 981526200', 'hebersilvagomes@yahoo.com.br',
  'Parauapebas', 'PA',
  'CLAUDETH DE SOUZA SANTANA GOMES',
  '[]',
  '1989-12-25'
);

-- M10 — ISAIAS BARBOSA DOS REIS
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'ministro', 'ativo',
  'masculino', '1973-12-09', 'Araguaina', 'TO', 'Brasileira',
  'Missionario', 'Superior Completo', 'casado', '1992-12-20',
  '71 9 9354-1116', 'isaiasreis07@gmail.com',
  'Sao Luis', 'MA',
  'MILKA DIAS ALVES REIS', '1975-11-09', 'Bacabal', 'MA', 'Superior Incompleto',
  '[{"nome":"ELLEN KARINE ALVES REIS","nascimento":"1994-04-05"},{"nome":"ELIONAY ALVES REIS","nascimento":"1995-06-11"},{"nome":"HERBET ALVES REIS","nascimento":"1997-06-13"}]',
  '1989-11-11'
);

-- M11 — JEREMIAS FONTINELE ARAUJO
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'missionario_voluntario', 'ativo',
  'masculino', '1991-03-23', 'Concordia do Para', 'PA', 'Brasileira',
  'Estudante', 'Ensino Fundamental Completo', 'casado', '2014-12-17',
  '91 99209 3041', 'fontenelejeremias7@gmail.com',
  'Goianesia do Para', 'PA',
  'KLEITIANE ROCHA CAMPOS', '1991-07-02', 'Pacaja', 'PA', 'Ensino Medio Completo',
  '[]',
  '2009-07-20'
);

-- M12 — JOSUE DE JESUS DA SILVA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'missionario_voluntario', 'ativo',
  'masculino', '1987-10-09', 'Maraba', 'PA', 'Brasileira',
  'Missionario', 'Ensino Medio Completo', 'casado', '2019-07-14',
  '(94) 99302 6754', 'josue1234lilian@gmail.com',
  'Breu Branco', 'PA',
  'LILIAN DE ALMEIDA DA SILVA', '1998-02-05', 'Sao Francisco', 'Ensino Medio Completo',
  '[{"nome":"KIMBERLLY HADASSA DE ALMEIDA DA SILVA","nascimento":"2024-06-20"}]',
  '2011-10-23'
);

-- M13 — JULIO AGRIPINO RIBEIRO DE OLIVEIRA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'obreiro_aspirante', 'ativo',
  'masculino', '1991-03-03', 'Campui', 'MG', 'Brasileira',
  'Missionario', 'Ensino Medio Incompleto', 'casado', '2014-12-28',
  '(91) 98813-0015', 'julioasam2013@hotmail.com',
  'Santa Isabel do Para', 'PA',
  'VIVIANE FERREIRA GONCALVES DE OLIVEIRA', '1991-10-06', 'Fortaleza', 'CE', 'Superior Completo',
  '[{"nome":"JULIA BEATRIZ GONCALVES DE OLIVEIRA","nascimento":"2019-07-30"},{"nome":"ELOISA MARIAH GONCALVES DE OLIVEIRA","nascimento":"2024-06-10"}]',
  '2010-09-15'
);

-- M14 — LAILA OLIVEIRA DA COSTA SOUZA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular,
  endereco_cidade, endereco_uf,
  conjuge_nome,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'pastor_ordenado', 'ativo',
  'feminino', '1989-11-24', 'Belem', 'PA', 'Brasileira',
  'Do Lar', 'Ensino Medio Completo', 'casado', '2007-12-16',
  '(86) 99829-2386',
  'Parnaiba', 'PI',
  'LUCIEL RIBEIRO DE SOUZA',
  '[]',
  '2006-07-30'
);

-- M15 — LUCIEL RIBEIRO DE SOUZA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'pastor_ordenado', 'ativo',
  'masculino', '1985-03-26', 'Cachoeira do Arari', 'PA', 'Brasileira',
  'Missionario', 'Ensino Medio Completo', 'casado', '2007-12-16',
  '86-99839-0302', 'lucielribeirodesouza@gmail.com',
  'Santa Ines', 'MA',
  'LAILA OLIVEIRA DA COSTA SOUZA',
  '[{"nome":"LAYSE OLIVEIRA DE SOUZA","nascimento":"2008-12-25"},{"nome":"LAYRA GEOVANA OLIVEIRA DE SOUZA","nascimento":"2010-11-23"}]',
  '2000-10-22'
);

-- M16 — MANOEL MIRANDA DA COSTA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'pastor_ordenado', 'ativo',
  'masculino', '1966-08-27', 'Vizeu', 'PA', 'Brasileira',
  'Missionario', 'Superior Completo', 'casado', '1988-10-28',
  '(92) 9 81272108', 'm.miranda_125@hotmail.com',
  'Breu Branco', 'PA',
  'EDILANE FERREIRA DA SILVA COSTA', '1970-03-02', 'Juazeiro do Norte', 'CE', 'Ensino Medio Completo',
  '[{"nome":"WANDERSON FERREIRA DA COSTA","nascimento":"1989-10-26"},{"nome":"WESLANIA FERREIRA DA COSTA","nascimento":"1993-04-09"},{"nome":"TAIZA FERREIRA DA COSTA","nascimento":"1999-02-14"}]',
  '1984-06-17'
);

-- M17 — MARCELO RODRIGUES DA SILVA PINHEIRO
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'pastor_ordenado', 'ativo',
  'masculino', '1982-11-04', 'Belem', 'PA', 'Brasileira',
  'Missionario', 'Superior Incompleto', 'casado', '2015-12-20',
  '(94) 99233 3261', 'marcelo.silva.obreiro@gmail.com',
  'Belem', 'PA',
  'JAMARA DAS NEVES PINHEIRO SILVA', '1993-12-12', 'Bacabal', 'MA', 'Superior Completo',
  '[]',
  '2002-12-31'
);

-- M18 — MATHEUS DO NASCIMENTO SILVA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'missionario_voluntario', 'ativo',
  'masculino', '2004-01-27', 'Capim Grosso', 'BA', 'Brasileira',
  'Missionario', 'Ensino Medio Completo', 'solteiro',
  '19 98421 4086', 'matheuzinh2019@gmail.com',
  'Nova Ipixuna', 'PA',
  '[]',
  '2018-09-29'
);

-- M19 — MAURICIO DOS SANTOS SILVA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil,
  celular,
  endereco_cidade, endereco_uf,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'missionario_voluntario', 'ativo',
  'masculino', '2004-04-24', 'Braganca', 'PA', 'Brasileira',
  'Missionario', 'Ensino Fundamental Completo', 'solteiro',
  '91 99203-2781',
  'Redencao', 'PA',
  '[]',
  '2018-09-23'
);

-- M20 — NATANAEL ROCHA COSTA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'obreiro_pre_aspirante', 'ativo',
  'masculino', '1982-11-18', 'Anapu', 'PA', 'Brasileira',
  'Missionario', 'Superior Completo', 'casado', '2008-05-04',
  '91993484282', 'nata1981@outlook.com.br',
  'Altamira', 'PA',
  'SARA DE SOUZA COSTA',
  '[]',
  '2010-07-13'
);

-- M21 — OLDAC OLIVEIRA DE QUEIROZ
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'ministro', 'ativo',
  'masculino', '1963-12-12', 'Guanambi', 'BA', 'Brasileira',
  'Ministro do Evangelho', 'Ensino Fundamental Completo', 'casado', '1984-03-25',
  '(94) 98440 9721', 'oldacqueiroz63@gmail.com',
  'Altamira', 'PA',
  'VASTY NUNES PEREIRA QUEIROZ', '1963-04-05', 'Teixeira de Freitas', 'BA', 'Ensino Fundamental Incompleto',
  '[{"nome":"MIDIA PEREIRA QUEIROZ","nascimento":"1985-04-10"},{"nome":"OZIEL PEREIRA QUEIROZ","nascimento":"1987-09-29"}]',
  '1978-12-22'
);

-- M22 — RAMON WILLAMYS FERREIRA DA SILVA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'missionario_voluntario', 'ativo',
  'masculino', '1991-09-02', 'Balsas', 'MA', 'Brasileira',
  'Vocacionado', 'Ensino Fundamental Completo', 'casado', '2021-06-06',
  '(91) 993133313', 'wyllyamys71798@gmail.com',
  'Goianesia do Para', 'PA',
  'CARLIANA PALHARES DE MEDEIROS SILVA', '2000-06-23', 'Sobral', 'CE', 'Ensino Medio Completo',
  '[{"nome":"ELLEN WYLLYAMYS DE MEDEIROS SILVA","nascimento":"2025-03-30"}]',
  '2010-05-30'
);

-- M23 — VALMIR FERREIRA DE SOUSA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'ministro', 'ativo',
  'masculino', '1964-05-10', 'Santa Izabel', 'PA', 'Brasileira',
  'Missionario', 'Ensino Medio Completo', 'casado', '1989-05-25',
  '91 993893231', 'valmirferreiradesousa5@gmail.com',
  'Benevides', 'PA',
  'MIDILENE O. SANTOS', '1968-01-04', 'Santo Antonio do Taua', 'PA', 'Ensino Medio Completo',
  '[{"nome":"DANIEL SANTOS DE SOUZA","nascimento":"1990-02-27"},{"nome":"DANILHE SANTOS DE SOUZA","nascimento":"1991-01-30"},{"nome":"MIRLENE SANTOS DE SOUZA","nascimento":"1992-03-13"}]',
  '1986-01-05'
);

-- M24 — WALDOMERO LUZ SANTOS
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_nascimento, conjuge_cidade, conjuge_uf, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'pastor_ordenado', 'ativo',
  'masculino', '1966-11-28', 'Conceicao do Araguaia', 'PA', 'Brasileira',
  'Missionario', 'Superior Completo', 'casado', '2006-05-07',
  '(11) 93016-0721', 'waldomeroluz@hotmail.com',
  'Conceicao do Araguaia', 'PA',
  'WILIANA BONINE MONTEIRO LUZ', '1979-02-08', 'Aracruz', 'ES', 'Superior Incompleto',
  '[{"nome":"WALNNER ROBERT MENDES SANTOS","nascimento":"1992-03-02"},{"nome":"KELRY LIZZIE MENDES SANTOS","nascimento":"1995-04-26","obs":"falecida"},{"nome":"WILYAN ROBERT BONINE SANTOS","nascimento":"2007-08-07"},{"nome":"WIGOR ROBERT BONINE SANTOS","nascimento":"2009-10-13"}]',
  '1980-12-14'
);

-- M25 — WANDERSON SANTOS DA CUNHA
INSERT INTO missionarios (
  uniao_id, associacao_id, cargo_ministerial, status,
  sexo, data_nascimento, cidade_nascimento, uf_nascimento, nacionalidade,
  profissao, escolaridade, estado_civil, data_casamento,
  celular, email_pessoal,
  endereco_cidade, endereco_uf,
  conjuge_nome, conjuge_escolaridade,
  filhos,
  data_batismo
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'missionario_voluntario', 'ativo',
  'masculino', '1998-02-08', 'Almeirim', 'PA', 'Brasileira',
  'Mecanico de Motocicleta', 'Ensino Medio Completo', 'casado', '2022-12-04',
  '94 99250 4642', 'wcunha528@gmail.com',
  'Santarem', 'PA',
  'MIRELI SILVA DA CONCEICAO', 'Ensino Medio Completo',
  '[]',
  '2015-12-27'
);

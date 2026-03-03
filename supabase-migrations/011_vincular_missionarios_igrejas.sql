-- ============================================================
-- Migration 011: Vincular missionarios as suas igrejas de campo
-- Fonte: Sistema GS 4.1 - Campo dos 25 Missionarios ASPAR
-- ============================================================

-- 1. Criar igrejas que nao estao no diretorio principal
-- (congregacoes menores / pontos de pregacao)
INSERT INTO igrejas (id, nome, uniao_id, associacao_id, endereco_cidade, endereco_estado, ativo)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Igreja Chipaia', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Belem', 'PA', true),
  ('c0000000-0000-0000-0000-000000000002', 'Igreja Abade', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Braganca', 'PA', true),
  ('c0000000-0000-0000-0000-000000000003', 'Igreja Vila Moises', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sao Domingos do Araguaia', 'PA', true),
  ('c0000000-0000-0000-0000-000000000004', 'Igreja Quatro Bocas (Tome-Acu)', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Tome-Acu', 'PA', true),
  ('c0000000-0000-0000-0000-000000000005', 'Igreja Janari', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Breu Branco', 'PA', true),
  ('c0000000-0000-0000-0000-000000000006', 'Igreja Jaqueira', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Breu Branco', 'PA', true),
  ('c0000000-0000-0000-0000-000000000007', 'Igreja Sitio Bigre', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Breu Branco', 'PA', true),
  ('c0000000-0000-0000-0000-000000000008', 'Igreja Santa Julia', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Altamira', 'PA', true),
  ('c0000000-0000-0000-0000-000000000009', 'Igreja Maraa', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Altamira', 'PA', true),
  ('c0000000-0000-0000-0000-000000000010', 'Igreja Taboca (Sao Felix do Xingu)', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Sao Felix do Xingu', 'PA', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Limpar vinculos anteriores (se houver)
DELETE FROM missionario_igrejas WHERE missionario_id IN (
  SELECT id FROM missionarios WHERE associacao_id = 'b0000000-0000-0000-0000-000000000001'
);

-- ============================================================
-- 3. VINCULAR MISSIONARIOS AS IGREJAS
-- Funcao baseada no cargo: Ministro/Pastor = 'Pastor', outros = 'Auxiliar'
-- ============================================================

-- M01 — ANTONIO NUNES PEREIRA (Pastor) → PARAUAPEBAS, TABOCA, TUCUMÃ
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('83aa36f7-dcd0-4a32-9df8-893e832b3de4', '1208c4f2-e263-4663-be3f-806c10911f43', 'Pastor', true),
  ('83aa36f7-dcd0-4a32-9df8-893e832b3de4', 'c0000000-0000-0000-0000-000000000010', 'Pastor', false),
  ('83aa36f7-dcd0-4a32-9df8-893e832b3de4', '22e3750c-a19c-4375-be66-16e200357c41', 'Pastor', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M02 — CAIO VINICIUS DA SILVA (Ob. Pre-Aspirante) → sem campo

-- M03 — ENOC CARDOSO MEIRELES (Ob. Pre-Aspirante) → AGUAS LINDAS, BELEM (SEDE), BOA ESPERANCA, CHIPAIA, PRATINHA
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('278e144c-df33-4f89-9fc6-2fcf20811c94', 'fe550056-a3e0-4dc0-9c2f-6abddf363160', 'Auxiliar', false),
  ('278e144c-df33-4f89-9fc6-2fcf20811c94', 'abb2abeb-bccf-4f0d-9590-04e35dab563d', 'Auxiliar', true),
  ('278e144c-df33-4f89-9fc6-2fcf20811c94', '09380613-c37c-40a9-8c38-2ba3c183c2e0', 'Auxiliar', false),
  ('278e144c-df33-4f89-9fc6-2fcf20811c94', 'c0000000-0000-0000-0000-000000000001', 'Auxiliar', false),
  ('278e144c-df33-4f89-9fc6-2fcf20811c94', 'f38b4df5-58eb-483f-b024-7f74cd9addfb', 'Auxiliar', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M04 — ERIELSON PEREIRA BARBOSA LABRE (Obreiro Biblico) → ABADE, BRAGANCA
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('51600951-119d-4e13-897a-5ba3b50885d2', 'c0000000-0000-0000-0000-000000000002', 'Obreiro', false),
  ('51600951-119d-4e13-897a-5ba3b50885d2', '3ffd5fb6-47d5-4a31-83ec-04a3123780b8', 'Obreiro', true)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M05 — EVANDERSON LUCA DA SILVA BARBOSA (Ob. Aspirante) → sem campo

-- M06 — FABRICIO FONTENELE DE ARAUJO (Ob. Aspirante) → APINAGES, SAO DOMINGOS, VILA MOISES
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('1e313f24-d57f-48ed-8136-8ff20c871a3a', '1e6dc6d9-77f0-4309-9675-eef0172ec734', 'Auxiliar', false),
  ('1e313f24-d57f-48ed-8136-8ff20c871a3a', '8e425419-1841-48e5-bd71-20a59f44371f', 'Auxiliar', true),
  ('1e313f24-d57f-48ed-8136-8ff20c871a3a', 'c0000000-0000-0000-0000-000000000003', 'Auxiliar', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M07 — GILSON DE MELO (Ministro) → APINAGES, LIBERDADE, MARABA, NOVA IPIXUNA, SAO DOMINGOS
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('7f295eec-486d-4af9-a23c-13cdd3f6b2a8', '1e6dc6d9-77f0-4309-9675-eef0172ec734', 'Pastor', false),
  ('7f295eec-486d-4af9-a23c-13cdd3f6b2a8', 'dc7ee44c-8766-46cf-8e61-6b22d3f3bf5a', 'Pastor', false),
  ('7f295eec-486d-4af9-a23c-13cdd3f6b2a8', '96d198dd-2673-475f-981a-2895152e5868', 'Pastor', true),
  ('7f295eec-486d-4af9-a23c-13cdd3f6b2a8', '6c7602a4-66fa-4a96-b3b1-798052dfbe81', 'Pastor', false),
  ('7f295eec-486d-4af9-a23c-13cdd3f6b2a8', '8e425419-1841-48e5-bd71-20a59f44371f', 'Pastor', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M08 — GIVALDO DE SOUSA PEREIRA (Ob. Aspirante) → TABOCA, TUCUMA
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('193f1ebc-3528-4fa0-8c6c-788953a5414d', 'c0000000-0000-0000-0000-000000000010', 'Auxiliar', false),
  ('193f1ebc-3528-4fa0-8c6c-788953a5414d', '22e3750c-a19c-4375-be66-16e200357c41', 'Auxiliar', true)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M09 — HEBER SILVA GOMES (Sec. Uniao) → sem campo

-- M10 — ISAIAS BARBOSA DOS REIS (Ministro) → DOM ELISEU, PARAGOMINAS
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('718a2bbf-775a-485c-b294-ac7bb7a3b960', '22865f36-cee3-462a-b0bd-b332f5e78f41', 'Pastor', false),
  ('718a2bbf-775a-485c-b294-ac7bb7a3b960', 'c63b5528-ebd9-4a09-9e13-097807411968', 'Pastor', true)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M11 — JEREMIAS FONTINELE ARAUJO (Vol.) → LIBERDADE, MARABA, NOVA IPIXUNA
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('795081e1-079f-49a9-97d9-130455fab0e1', 'dc7ee44c-8766-46cf-8e61-6b22d3f3bf5a', 'Auxiliar', false),
  ('795081e1-079f-49a9-97d9-130455fab0e1', '96d198dd-2673-475f-981a-2895152e5868', 'Auxiliar', true),
  ('795081e1-079f-49a9-97d9-130455fab0e1', '6c7602a4-66fa-4a96-b3b1-798052dfbe81', 'Auxiliar', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M12 — JOSUE DE JESUS DA SILVA (Vol.) → CONCORDIA, QUATRO BOCAS
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('b92c09b2-863f-44c3-bb50-95c9565ade53', 'e6646381-625e-443b-9046-8c2346a2f077', 'Auxiliar', true),
  ('b92c09b2-863f-44c3-bb50-95c9565ade53', 'c0000000-0000-0000-0000-000000000004', 'Auxiliar', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M13 — JULIO AGRIPINO RIBEIRO DE OLIVEIRA (Ob. Aspirante) → ABAETETUBA, JARDIM DO EDEN, MARITUBA, SANTA IZABEL
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('d0521268-0599-4870-be5e-50ccda3a56c8', '9b2df30e-7a6d-4d74-b53a-c64e206d114c', 'Auxiliar', false),
  ('d0521268-0599-4870-be5e-50ccda3a56c8', '814b7e12-9f57-4fdf-ae40-262f53641c9a', 'Auxiliar', false),
  ('d0521268-0599-4870-be5e-50ccda3a56c8', 'b79a422b-3bf7-458b-a951-9f4caccc451f', 'Auxiliar', true),
  ('d0521268-0599-4870-be5e-50ccda3a56c8', '1c29c2c3-a659-41e1-93b6-09f409e783c6', 'Auxiliar', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M14 — LAILA OLIVEIRA DA COSTA SOUZA (Pastor) → CASTANHAL
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('939ded3b-af1a-4adb-ab71-063cbbc7ce8e', '3efbae8a-201a-4837-af05-a9e96e168c5d', 'Pastor', true)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M15 — LUCIEL RIBEIRO DE SOUZA (Pastor) → ABADE, BRAGANCA, CASTANHAL, CONCORDIA, QUATRO BOCAS
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('0f6f04f5-2593-411d-ad63-c6a317ceccb1', 'c0000000-0000-0000-0000-000000000002', 'Pastor', false),
  ('0f6f04f5-2593-411d-ad63-c6a317ceccb1', '3ffd5fb6-47d5-4a31-83ec-04a3123780b8', 'Pastor', true),
  ('0f6f04f5-2593-411d-ad63-c6a317ceccb1', '3efbae8a-201a-4837-af05-a9e96e168c5d', 'Pastor', false),
  ('0f6f04f5-2593-411d-ad63-c6a317ceccb1', 'e6646381-625e-443b-9046-8c2346a2f077', 'Pastor', false),
  ('0f6f04f5-2593-411d-ad63-c6a317ceccb1', 'c0000000-0000-0000-0000-000000000004', 'Pastor', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M16 — MANOEL MIRANDA DA COSTA (Pastor) → BREU BRANCO, GOIANESIA, JACUNDA, JANARI, JAQUEIRA, SITIO BIGRE, TAILANDIA, TUCURUI
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('29e516bf-d9d2-4ce3-b5cd-1d66052d1b19', '4b6ad15e-f037-4b68-a9ef-bd2ef125b719', 'Pastor', true),
  ('29e516bf-d9d2-4ce3-b5cd-1d66052d1b19', 'bf64821a-2782-4ec8-a755-30e280e5e848', 'Pastor', false),
  ('29e516bf-d9d2-4ce3-b5cd-1d66052d1b19', '6fb50f60-854a-4ef8-a5fb-e61ff63d1e6b', 'Pastor', false),
  ('29e516bf-d9d2-4ce3-b5cd-1d66052d1b19', 'c0000000-0000-0000-0000-000000000005', 'Pastor', false),
  ('29e516bf-d9d2-4ce3-b5cd-1d66052d1b19', 'c0000000-0000-0000-0000-000000000006', 'Pastor', false),
  ('29e516bf-d9d2-4ce3-b5cd-1d66052d1b19', 'c0000000-0000-0000-0000-000000000007', 'Pastor', false),
  ('29e516bf-d9d2-4ce3-b5cd-1d66052d1b19', 'f5908564-3dfe-492c-9697-74c270e4def7', 'Pastor', false),
  ('29e516bf-d9d2-4ce3-b5cd-1d66052d1b19', '8c573c6c-9934-41ab-a6d1-64addcb5f936', 'Pastor', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M17 — MARCELO RODRIGUES DA SILVA PINHEIRO (Pastor) → AGUAS LINDAS, BELEM (SEDE), BOA ESPERANCA, CHIPAIA, PRATINHA
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('58da26f3-e14a-422f-8a76-ff3338ac4b0b', 'fe550056-a3e0-4dc0-9c2f-6abddf363160', 'Pastor', false),
  ('58da26f3-e14a-422f-8a76-ff3338ac4b0b', 'abb2abeb-bccf-4f0d-9590-04e35dab563d', 'Pastor', true),
  ('58da26f3-e14a-422f-8a76-ff3338ac4b0b', '09380613-c37c-40a9-8c38-2ba3c183c2e0', 'Pastor', false),
  ('58da26f3-e14a-422f-8a76-ff3338ac4b0b', 'c0000000-0000-0000-0000-000000000001', 'Pastor', false),
  ('58da26f3-e14a-422f-8a76-ff3338ac4b0b', 'f38b4df5-58eb-483f-b024-7f74cd9addfb', 'Pastor', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M18 — MATHEUS DO NASCIMENTO SILVA (Vol.) → DOM ELISEU, PARAGOMINAS
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('df32c490-a42c-42b6-ac05-c5c951e12e0a', '22865f36-cee3-462a-b0bd-b332f5e78f41', 'Auxiliar', false),
  ('df32c490-a42c-42b6-ac05-c5c951e12e0a', 'c63b5528-ebd9-4a09-9e13-097807411968', 'Auxiliar', true)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M19 — MAURICIO DOS SANTOS SILVA (Vol.) → REDENCAO
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('c2ec56b1-e0c7-4536-97b1-a35e8740e70d', '7a749506-9d6a-46b1-8de9-5c5264fd70ea', 'Auxiliar', true)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M20 — NATANAEL ROCHA COSTA (Ob. Pre-Aspirante) → ANAPU, SANTA JULIA
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('79b6cc50-b179-41d3-823b-dee11066a5d9', 'd3b62ed5-5a56-46d8-8454-d5211428f8df', 'Auxiliar', true),
  ('79b6cc50-b179-41d3-823b-dee11066a5d9', 'c0000000-0000-0000-0000-000000000008', 'Auxiliar', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M21 — OLDAC OLIVEIRA DE QUEIROZ (Ministro) → ALTAMIRA, ANAPU, MARAA, SANTA JULIA, SANTAREM, VILA MOISES
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('c470c6c8-7de0-4643-8618-4318d7b539fa', 'da5fd78a-d947-4418-99ab-92ec08ea36f2', 'Pastor', true),
  ('c470c6c8-7de0-4643-8618-4318d7b539fa', 'd3b62ed5-5a56-46d8-8454-d5211428f8df', 'Pastor', false),
  ('c470c6c8-7de0-4643-8618-4318d7b539fa', 'c0000000-0000-0000-0000-000000000009', 'Pastor', false),
  ('c470c6c8-7de0-4643-8618-4318d7b539fa', 'c0000000-0000-0000-0000-000000000008', 'Pastor', false),
  ('c470c6c8-7de0-4643-8618-4318d7b539fa', 'fef8770a-4909-4bab-ad2d-8eda4c7fc621', 'Pastor', false),
  ('c470c6c8-7de0-4643-8618-4318d7b539fa', 'c0000000-0000-0000-0000-000000000003', 'Pastor', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M22 — RAMON WILLAMYS FERREIRA DA SILVA (Vol.) → GOIANESIA, JACUNDA, TAILANDIA
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('a3190b03-e785-4034-b932-0c4239612efd', 'bf64821a-2782-4ec8-a755-30e280e5e848', 'Auxiliar', true),
  ('a3190b03-e785-4034-b932-0c4239612efd', '6fb50f60-854a-4ef8-a5fb-e61ff63d1e6b', 'Auxiliar', false),
  ('a3190b03-e785-4034-b932-0c4239612efd', 'f5908564-3dfe-492c-9697-74c270e4def7', 'Auxiliar', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M23 — VALMIR FERREIRA DE SOUSA (Ministro) → ABAETETUBA, JARDIM DO EDEN, MARITUBA, SANTA IZABEL
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('319e7ff5-b0d2-4011-b029-316f7f1dea92', '9b2df30e-7a6d-4d74-b53a-c64e206d114c', 'Pastor', true),
  ('319e7ff5-b0d2-4011-b029-316f7f1dea92', '814b7e12-9f57-4fdf-ae40-262f53641c9a', 'Pastor', false),
  ('319e7ff5-b0d2-4011-b029-316f7f1dea92', 'b79a422b-3bf7-458b-a951-9f4caccc451f', 'Pastor', false),
  ('319e7ff5-b0d2-4011-b029-316f7f1dea92', '1c29c2c3-a659-41e1-93b6-09f409e783c6', 'Pastor', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M24 — WALDOMERO LUZ SANTOS (Pastor) → CONCEICAO, REDENCAO
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('a29d919f-c41e-4306-a2ff-1d8ed2e4f009', '8078731c-e2a2-44fe-b150-cd7b2a0cb9a7', 'Pastor', true),
  ('a29d919f-c41e-4306-a2ff-1d8ed2e4f009', '7a749506-9d6a-46b1-8de9-5c5264fd70ea', 'Pastor', false)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- M25 — WANDERSON SANTOS DA CUNHA (Vol.) → SANTAREM
INSERT INTO missionario_igrejas (missionario_id, igreja_id, funcao, principal) VALUES
  ('5d7dde05-6d11-476b-804e-c57c310444c3', 'fef8770a-4909-4bab-ad2d-8eda4c7fc621', 'Auxiliar', true)
ON CONFLICT (missionario_id, igreja_id) DO NOTHING;

-- 4. Atualizar igrejas_responsavel (array legado) nos missionarios para manter compatibilidade
UPDATE missionarios m SET igrejas_responsavel = (
  SELECT COALESCE(array_agg(mi.igreja_id), '{}')
  FROM missionario_igrejas mi
  WHERE mi.missionario_id = m.id AND mi.data_fim IS NULL
)
WHERE m.associacao_id = 'b0000000-0000-0000-0000-000000000001';

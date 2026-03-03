-- ============================================================
-- Migration 015: Seed coordenadas (lat/lng) das igrejas
-- Baseado no centro urbano de cada cidade
-- Fonte: Coordenadas oficiais IBGE / Google Maps
-- ============================================================

-- ===== PARÁ (PA) - ASPAR =====
UPDATE igrejas SET coordenadas_lat = -1.7183, coordenadas_lng = -48.8788 WHERE endereco_cidade = 'Abaetetuba' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -1.4043, coordenadas_lng = -48.4982 WHERE endereco_cidade = 'Belém' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -1.5100, coordenadas_lng = -48.6356 WHERE endereco_cidade = 'Barcarena' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -1.0606, coordenadas_lng = -46.7654 WHERE endereco_cidade = 'Bragança' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.8511, coordenadas_lng = -49.6867 WHERE endereco_cidade = 'Breu Branco' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -1.2931, coordenadas_lng = -47.9467 WHERE endereco_cidade = 'Castanhal' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.2575, coordenadas_lng = -49.2648 WHERE endereco_cidade = 'Conceição do Araguaia' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -1.9939, coordenadas_lng = -47.9400 WHERE endereco_cidade ILIKE 'Conc%rdia do Par%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -0.7342, coordenadas_lng = -47.8519 WHERE endereco_cidade ILIKE 'Curu%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.6742, coordenadas_lng = -49.1292 WHERE endereco_cidade = 'Dom Eliseu' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.8436, coordenadas_lng = -49.0978 WHERE endereco_cidade ILIKE 'Goian%sia%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -4.4511, coordenadas_lng = -49.1147 WHERE endereco_cidade ILIKE 'Jacund%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.3522, coordenadas_lng = -49.1325 WHERE endereco_cidade ILIKE 'Marab%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -1.3581, coordenadas_lng = -48.3582 WHERE endereco_cidade = 'Marituba' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -4.4850, coordenadas_lng = -49.1292 WHERE endereco_cidade = 'Nova Ipixuna' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.0889, coordenadas_lng = -47.3522 WHERE endereco_cidade = 'Paragominas' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.0650, coordenadas_lng = -49.9017 WHERE endereco_cidade = 'Parauapebas' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.0283, coordenadas_lng = -49.9953 WHERE endereco_cidade ILIKE 'Reden%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.4431, coordenadas_lng = -54.7081 WHERE endereco_cidade ILIKE 'Santar%m%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -1.3000, coordenadas_lng = -48.2889 WHERE endereco_cidade = 'Santa Izabel do Pará' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.6392, coordenadas_lng = -48.7706 WHERE endereco_cidade ILIKE 'S_o Domingos do Araguaia%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.6433, coordenadas_lng = -51.9697 WHERE endereco_cidade ILIKE 'Sao Felix do Xing%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.3594, coordenadas_lng = -48.7911 WHERE endereco_cidade ILIKE 'S_o Jo_o do Araguaia%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.9392, coordenadas_lng = -48.9628 WHERE endereco_cidade ILIKE 'Tail%ndia%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.7508, coordenadas_lng = -51.0514 WHERE endereco_cidade ILIKE 'Tucum%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.7658, coordenadas_lng = -49.6767 WHERE endereco_cidade ILIKE 'Tucuru%' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.2000, coordenadas_lng = -52.2100 WHERE endereco_cidade = 'Altamira' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.1900, coordenadas_lng = -51.8000 WHERE endereco_cidade = 'Anapu' AND endereco_estado = 'PA' AND coordenadas_lat IS NULL;

-- ===== MARANHÃO (MA) =====
UPDATE igrejas SET coordenadas_lat = -4.2281, coordenadas_lng = -44.7872 WHERE endereco_cidade = 'Bacabal' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.5326, coordenadas_lng = -46.0353 WHERE endereco_cidade = 'Balsas' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.4175, coordenadas_lng = -44.4314 WHERE endereco_cidade = 'Cajari' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -4.5175, coordenadas_lng = -44.1208 WHERE endereco_cidade ILIKE 'Coroat%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.6325, coordenadas_lng = -47.4411 WHERE endereco_cidade = 'Estreito' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.0333, coordenadas_lng = -45.5333 WHERE endereco_cidade ILIKE 'Governador Nunes Freire%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.4675, coordenadas_lng = -46.5175 WHERE endereco_cidade ILIKE 'Grajau%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.3517, coordenadas_lng = -44.3525 WHERE endereco_cidade ILIKE 'Icatu%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.5275, coordenadas_lng = -47.4739 WHERE endereco_cidade = 'Imperatriz' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.5186, coordenadas_lng = -45.2369 WHERE endereco_cidade ILIKE 'Pindar% Mirim%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.8403, coordenadas_lng = -45.1517 WHERE endereco_cidade ILIKE 'Pio%Xii%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.7425, coordenadas_lng = -44.0636 WHERE endereco_cidade = 'Pirapemas' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.4175, coordenadas_lng = -45.5175 WHERE endereco_cidade = 'Santa Inês' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.6008, coordenadas_lng = -44.2825 WHERE endereco_cidade ILIKE 'S_o Bernardo%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.5175, coordenadas_lng = -43.8675 WHERE endereco_cidade ILIKE 'S_o Jo_o dos Patos%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.5086, coordenadas_lng = -44.2825 WHERE endereco_cidade ILIKE 'S_o Lu%s%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.5086, coordenadas_lng = -44.2825 WHERE endereco_cidade ILIKE 'S_o Lu%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -4.3500, coordenadas_lng = -44.8175 WHERE endereco_cidade ILIKE 'S_o Lu%s Gonzaga%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.2175, coordenadas_lng = -47.4675 WHERE endereco_cidade ILIKE 'Vila Nova dos Mart%rios%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.2675, coordenadas_lng = -45.6525 WHERE endereco_cidade ILIKE 'Z% Doca%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.0722, coordenadas_lng = -47.6128 WHERE endereco_cidade ILIKE 'A%ail%ndia%' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.0611, coordenadas_lng = -46.4178 WHERE endereco_cidade = 'Tasso Fragoso' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.0942, coordenadas_lng = -42.8019 WHERE endereco_cidade = 'Timon' AND endereco_estado = 'MA' AND coordenadas_lat IS NULL;

-- ===== CEARÁ (CE) =====
UPDATE igrejas SET coordenadas_lat = -7.3178, coordenadas_lng = -39.0394 WHERE endereco_cidade = 'Abaiara' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.8964, coordenadas_lng = -40.3469 WHERE endereco_cidade = 'Camocim' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.6339, coordenadas_lng = -40.3489 WHERE endereco_cidade = 'Caucaia' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.7172, coordenadas_lng = -38.5431 WHERE endereco_cidade = 'Fortaleza' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.9317, coordenadas_lng = -37.7211 WHERE endereco_cidade = 'Fortim' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.3647, coordenadas_lng = -39.2986 WHERE endereco_cidade = 'Iguatu' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.2131, coordenadas_lng = -39.3150 WHERE endereco_cidade = 'Juazeiro do Norte' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -4.9689, coordenadas_lng = -39.0156 WHERE endereco_cidade ILIKE 'Quixad%' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.6889, coordenadas_lng = -40.3481 WHERE endereco_cidade = 'Sobral' AND endereco_estado = 'CE' AND coordenadas_lat IS NULL;

-- ===== AMAPÁ (AP) =====
UPDATE igrejas SET coordenadas_lat = 0.0356, coordenadas_lng = -51.0664 WHERE endereco_cidade ILIKE 'Macap%' AND endereco_estado = 'AP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 0.1000, coordenadas_lng = -51.1789 WHERE endereco_cidade = 'Santana' AND endereco_estado = 'AP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 0.7142, coordenadas_lng = -51.4056 WHERE endereco_cidade = 'Porto Grande' AND endereco_estado = 'AP' AND coordenadas_lat IS NULL;

-- ===== TOCANTINS (TO) =====
UPDATE igrejas SET coordenadas_lat = -6.0725, coordenadas_lng = -48.5525 WHERE endereco_cidade ILIKE 'Aguiarn%polis%' AND endereco_estado = 'TO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.1931, coordenadas_lng = -48.2067 WHERE endereco_cidade ILIKE 'Araguain%' AND endereco_estado = 'TO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.1931, coordenadas_lng = -48.2067 WHERE endereco_cidade ILIKE 'Araguaina%' AND endereco_estado = 'TO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.6131, coordenadas_lng = -47.4175 WHERE endereco_cidade ILIKE 'Axix%' AND endereco_estado = 'TO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.1839, coordenadas_lng = -48.3336 WHERE endereco_cidade = 'Palmas' AND endereco_estado = 'TO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.1839, coordenadas_lng = -48.8836 WHERE endereco_cidade ILIKE 'Paraiso%' AND endereco_estado = 'TO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -5.5000, coordenadas_lng = -47.1000 WHERE endereco_cidade = 'Praia Norte' AND endereco_estado = 'TO' AND coordenadas_lat IS NULL;

-- ===== AMAZONAS (AM) =====
UPDATE igrejas SET coordenadas_lat = -3.1190, coordenadas_lng = -60.0217 WHERE endereco_cidade = 'Manaus' AND endereco_estado = 'AM' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.7833, coordenadas_lng = -60.3833 WHERE endereco_cidade = 'Careiro Castanho' AND endereco_estado = 'AM' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -3.6186, coordenadas_lng = -61.5175 WHERE endereco_cidade = 'Purupuru' AND endereco_estado = 'AM' AND coordenadas_lat IS NULL;

-- ===== RORAIMA (RR) =====
UPDATE igrejas SET coordenadas_lat = 2.8235, coordenadas_lng = -60.6736 WHERE endereco_cidade = 'Boa Vista' AND endereco_estado = 'RR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 2.9953, coordenadas_lng = -61.5114 WHERE endereco_cidade = 'Alto Alegre' AND endereco_estado = 'RR' AND coordenadas_lat IS NULL;

-- ===== RONDÔNIA (RO) =====
UPDATE igrejas SET coordenadas_lat = -8.7619, coordenadas_lng = -63.9039 WHERE endereco_cidade = 'Porto Velho' AND endereco_estado = 'RO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.9078, coordenadas_lng = -63.0672 WHERE endereco_cidade ILIKE 'Ji-paran%' AND endereco_estado = 'RO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.9472, coordenadas_lng = -61.4444 WHERE endereco_cidade = 'Cacoal' AND endereco_estado = 'RO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.9486, coordenadas_lng = -63.0406 WHERE endereco_cidade = 'Ariquemes' AND endereco_estado = 'RO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -12.4317, coordenadas_lng = -64.2267 WHERE endereco_cidade = 'Costa Marques' AND endereco_estado = 'RO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.8503, coordenadas_lng = -65.3489 WHERE endereco_cidade ILIKE 'Guajar%-mirim%' AND endereco_estado = 'RO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.8600, coordenadas_lng = -61.0300 WHERE endereco_cidade ILIKE 'Presidente M%dici%' AND endereco_estado = 'RO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.9608, coordenadas_lng = -62.7617 WHERE endereco_cidade ILIKE 'S_o Miguel do Guapor%' AND endereco_estado = 'RO' AND coordenadas_lat IS NULL;

-- ===== ACRE (AC) =====
UPDATE igrejas SET coordenadas_lat = -9.9753, coordenadas_lng = -67.8103 WHERE endereco_cidade = 'Rio Branco' AND endereco_estado = 'AC' AND coordenadas_lat IS NULL;

-- ===== PIAUÍ (PI) =====
UPDATE igrejas SET coordenadas_lat = -5.0892, coordenadas_lng = -42.8019 WHERE endereco_cidade = 'Teresina' AND endereco_estado = 'PI' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.7706, coordenadas_lng = -43.0281 WHERE endereco_cidade = 'Floriano' AND endereco_estado = 'PI' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -2.9058, coordenadas_lng = -41.7767 WHERE endereco_cidade ILIKE 'Parna%ba%' AND endereco_estado = 'PI' AND coordenadas_lat IS NULL;

-- ===== RIO GRANDE DO NORTE (RN) =====
UPDATE igrejas SET coordenadas_lat = -5.7945, coordenadas_lng = -35.2110 WHERE endereco_cidade = 'Natal' AND endereco_estado = 'RN' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.4775, coordenadas_lng = -35.4314 WHERE endereco_cidade = 'Nova Cruz' AND endereco_estado = 'RN' AND coordenadas_lat IS NULL;

-- ===== PARAÍBA (PB) =====
UPDATE igrejas SET coordenadas_lat = -7.1195, coordenadas_lng = -34.8450 WHERE endereco_cidade ILIKE 'Jo_o Pessoa%' AND endereco_estado = 'PB' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.2306, coordenadas_lng = -35.8811 WHERE endereco_cidade = 'Campina Grande' AND endereco_estado = 'PB' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -6.8414, coordenadas_lng = -35.6322 WHERE endereco_cidade = 'Guarabira' AND endereco_estado = 'PB' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.0889, coordenadas_lng = -35.4000 WHERE endereco_cidade ILIKE 'Po%o Comprido%' AND endereco_estado = 'PB' AND coordenadas_lat IS NULL;

-- ===== PERNAMBUCO (PE) =====
UPDATE igrejas SET coordenadas_lat = -8.0476, coordenadas_lng = -34.8770 WHERE endereco_cidade = 'Recife' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.2833, coordenadas_lng = -35.9711 WHERE endereco_cidade = 'Caruaru' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.3211, coordenadas_lng = -36.8833 WHERE endereco_cidade = 'Belo Jardim' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.1978, coordenadas_lng = -35.1228 WHERE endereco_cidade ILIKE 'Ch_ Grande%' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.8306, coordenadas_lng = -35.0050 WHERE endereco_cidade = 'Igarassu' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.1128, coordenadas_lng = -34.9158 WHERE endereco_cidade ILIKE 'Jaboat_o dos Guararapes%' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.8764, coordenadas_lng = -35.4511 WHERE endereco_cidade = 'Limoeiro' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -7.7425, coordenadas_lng = -40.0822 WHERE endereco_cidade = 'Ouricuri' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.9742, coordenadas_lng = -38.2986 WHERE endereco_cidade ILIKE 'Petrol%ndia%' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.3889, coordenadas_lng = -40.5039 WHERE endereco_cidade = 'Petrolina' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.1211, coordenadas_lng = -35.2378 WHERE endereco_cidade = 'Pombos' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.1400, coordenadas_lng = -35.8600 WHERE endereco_cidade ILIKE 'Riacho das Almas%' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.2764, coordenadas_lng = -35.1478 WHERE endereco_cidade ILIKE 'Vit%ria de Santo Ant%o%' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -8.5933, coordenadas_lng = -35.4500 WHERE endereco_cidade = 'Agua Preta' AND endereco_estado = 'PE' AND coordenadas_lat IS NULL;

-- ===== ALAGOAS (AL) =====
UPDATE igrejas SET coordenadas_lat = -9.6658, coordenadas_lng = -35.7353 WHERE endereco_cidade ILIKE 'Macei%' AND endereco_estado = 'AL' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.7539, coordenadas_lng = -36.6614 WHERE endereco_cidade = 'Arapiraca' AND endereco_estado = 'AL' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.6383, coordenadas_lng = -35.8175 WHERE endereco_cidade = 'Coqueiro Seco' AND endereco_estado = 'AL' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.2219, coordenadas_lng = -36.6572 WHERE endereco_cidade = 'Cururipe' AND endereco_estado = 'AL' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.5175, coordenadas_lng = -36.7175 WHERE endereco_cidade = 'Estrela de Alagoas' AND endereco_estado = 'AL' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.5000, coordenadas_lng = -37.4500 WHERE endereco_cidade = 'Senador Rui Palmeira' AND endereco_estado = 'AL' AND coordenadas_lat IS NULL;

-- ===== SERGIPE (SE) =====
UPDATE igrejas SET coordenadas_lat = -10.9111, coordenadas_lng = -37.0717 WHERE endereco_cidade = 'Aracaju' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.9111, coordenadas_lng = -37.0717 WHERE endereco_cidade ILIKE 'Aracaj%' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.4475, coordenadas_lng = -36.5594 WHERE endereco_cidade ILIKE 'Aquidab%' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.1764, coordenadas_lng = -37.0558 WHERE endereco_cidade ILIKE 'Cumbe%' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.2683, coordenadas_lng = -37.4383 WHERE endereco_cidade ILIKE 'Est%ncia%' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.6853, coordenadas_lng = -37.4264 WHERE endereco_cidade = 'Itabaiana' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.8050, coordenadas_lng = -37.2119 WHERE endereco_cidade = 'Nossa Senhora das Dores' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.8550, coordenadas_lng = -37.1261 WHERE endereco_cidade = 'Nossa Senhora do Socorro' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.8550, coordenadas_lng = -37.0550 WHERE endereco_cidade = 'Salgado' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.5675, coordenadas_lng = -37.2350 WHERE endereco_cidade = 'Siriri' AND endereco_estado = 'SE' AND coordenadas_lat IS NULL;

-- ===== BAHIA (BA) =====
UPDATE igrejas SET coordenadas_lat = -12.9714, coordenadas_lng = -38.5014 WHERE endereco_cidade = 'Salvador' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -12.2672, coordenadas_lng = -38.9669 WHERE endereco_cidade = 'Feira de Santana' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.1706, coordenadas_lng = -38.7431 WHERE endereco_cidade = 'Araci' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -12.1522, coordenadas_lng = -44.9972 WHERE endereco_cidade = 'Barreiras' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.2028, coordenadas_lng = -41.6611 WHERE endereco_cidade = 'Brumado' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.7972, coordenadas_lng = -39.3000 WHERE endereco_cidade = 'Buerarema' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -12.6178, coordenadas_lng = -39.1889 WHERE endereco_cidade ILIKE 'Cabaceiras do Paragua%u%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.0778, coordenadas_lng = -42.6228 WHERE endereco_cidade ILIKE 'Caetit%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.7650, coordenadas_lng = -39.2850 WHERE endereco_cidade ILIKE 'Concei%_o do Coit%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.3900, coordenadas_lng = -39.5772 WHERE endereco_cidade ILIKE 'Eun%polis%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.2825, coordenadas_lng = -42.8825 WHERE endereco_cidade ILIKE 'Guanambi%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -12.9500, coordenadas_lng = -41.2833 WHERE endereco_cidade = 'Ibicoara' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.3111, coordenadas_lng = -38.4200 WHERE endereco_cidade = 'Inhambupe' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.7853, coordenadas_lng = -39.2803 WHERE endereco_cidade = 'Itabuna' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.1756, coordenadas_lng = -40.4967 WHERE endereco_cidade = 'Jacobina' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -12.8972, coordenadas_lng = -38.3228 WHERE endereco_cidade = 'Lauro de Freitas' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.2900, coordenadas_lng = -40.8400 WHERE endereco_cidade = 'Mirante' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -12.2950, coordenadas_lng = -38.7525 WHERE endereco_cidade ILIKE 'Palmas de Monte Alto%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.4078, coordenadas_lng = -38.2144 WHERE endereco_cidade = 'Paulo Afonso' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.4372, coordenadas_lng = -39.0803 WHERE endereco_cidade = 'Porto Seguro' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.5125, coordenadas_lng = -38.4875 WHERE endereco_cidade = 'Ribeira do Pombal' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -12.3553, coordenadas_lng = -38.9553 WHERE endereco_cidade ILIKE 'Santo Est%v_o%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.4606, coordenadas_lng = -40.1872 WHERE endereco_cidade = 'Senhor do Bonfim' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.6614, coordenadas_lng = -39.0069 WHERE endereco_cidade = 'Serrinha' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.1000, coordenadas_lng = -41.3400 WHERE endereco_cidade ILIKE 'Tanha%u%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -17.5356, coordenadas_lng = -39.7414 WHERE endereco_cidade = 'Teixeira de Freitas' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.8619, coordenadas_lng = -40.8397 WHERE endereco_cidade ILIKE 'Vit%ria da Conquista%' AND endereco_estado = 'BA' AND coordenadas_lat IS NULL;

-- ===== MINAS GERAIS (MG) =====
UPDATE igrejas SET coordenadas_lat = -19.9191, coordenadas_lng = -43.9386 WHERE endereco_cidade = 'Belo Horizonte' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.2500, coordenadas_lng = -43.7736 WHERE endereco_cidade = 'Barbacena' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.5947, coordenadas_lng = -46.9408 WHERE endereco_cidade ILIKE 'Arax%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.8678, coordenadas_lng = -44.0542 WHERE endereco_cidade = 'Contagem' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.6064, coordenadas_lng = -43.8028 WHERE endereco_cidade = 'Conselheiro Lafaiete' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.3294, coordenadas_lng = -42.5375 WHERE endereco_cidade = 'Coronel Fabriciano' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.1389, coordenadas_lng = -44.8842 WHERE endereco_cidade ILIKE 'Divin%polis%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.3667, coordenadas_lng = -43.8000 WHERE endereco_cidade = 'Entre Rios de Minas' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.3167, coordenadas_lng = -44.9833 WHERE endereco_cidade = 'Estiva' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.8539, coordenadas_lng = -41.9494 WHERE endereco_cidade ILIKE 'Govenador Valadares%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.2511, coordenadas_lng = -44.0961 WHERE endereco_cidade ILIKE 'Ibitira%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.1067, coordenadas_lng = -43.3464 WHERE endereco_cidade = 'Itacarambi' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.8500, coordenadas_lng = -42.0667 WHERE endereco_cidade ILIKE 'Joaima%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.8500, coordenadas_lng = -42.0667 WHERE endereco_cidade ILIKE 'Jo%ma%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.7642, coordenadas_lng = -43.3503 WHERE endereco_cidade = 'Juiz de Fora' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.7753, coordenadas_lng = -46.3039 WHERE endereco_cidade = 'Lagoa Formosa' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.7336, coordenadas_lng = -43.8611 WHERE endereco_cidade = 'Montes Claros' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -17.2222, coordenadas_lng = -40.2222 WHERE endereco_cidade = 'Nanuque' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.5922, coordenadas_lng = -46.5175 WHERE endereco_cidade = 'Patos de Minas' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -17.2533, coordenadas_lng = -44.9386 WHERE endereco_cidade = 'Pirapora' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.7878, coordenadas_lng = -46.5614 WHERE endereco_cidade ILIKE 'Po%os de Caldas%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.8614, coordenadas_lng = -43.9533 WHERE endereco_cidade ILIKE 'Ribeir%o das Neves%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.8544, coordenadas_lng = -44.3050 WHERE endereco_cidade ILIKE 'S_o Francisco%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.7944, coordenadas_lng = -44.4225 WHERE endereco_cidade ILIKE 'S_o Jo_o das Miss_es%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.3867, coordenadas_lng = -43.4172 WHERE endereco_cidade ILIKE 'Concei%_o do Mato Dentro%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.8800, coordenadas_lng = -45.2200 WHERE endereco_cidade ILIKE 'Concei%_o do Rio Verde%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.4708, coordenadas_lng = -43.3797 WHERE endereco_cidade = 'Serro' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.4611, coordenadas_lng = -44.2467 WHERE endereco_cidade = 'Sete Lagoas' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.1036, coordenadas_lng = -42.3000 WHERE endereco_cidade ILIKE 'Simon%sia%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -17.8578, coordenadas_lng = -41.5061 WHERE endereco_cidade ILIKE 'Teofilo Otoni%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.9186, coordenadas_lng = -48.2769 WHERE endereco_cidade ILIKE 'Uberl%ndia%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.9928, coordenadas_lng = -48.7597 WHERE endereco_cidade = 'Ituiutaba' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.6914, coordenadas_lng = -44.0433 WHERE endereco_cidade = 'Vespasiano' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.3167, coordenadas_lng = -46.0500 WHERE endereco_cidade ILIKE 'Cambu%' AND endereco_estado = 'MG' AND coordenadas_lat IS NULL;

-- ===== GOIÁS (GO) =====
UPDATE igrejas SET coordenadas_lat = -16.6869, coordenadas_lng = -49.2648 WHERE endereco_cidade ILIKE 'Goi%nia%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.3500, coordenadas_lng = -49.0000 WHERE endereco_cidade ILIKE 'An%polis%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.7289, coordenadas_lng = -49.2958 WHERE endereco_cidade ILIKE 'Aparecida de Goi%nia%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.6047, coordenadas_lng = -49.3850 WHERE endereco_cidade = 'Cachoeira Alta' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -17.7417, coordenadas_lng = -48.6317 WHERE endereco_cidade = 'Caldas Novas' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.1689, coordenadas_lng = -47.9461 WHERE endereco_cidade ILIKE 'Catal_o%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.4508, coordenadas_lng = -49.3297 WHERE endereco_cidade ILIKE 'Jaragua%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -17.8797, coordenadas_lng = -51.7142 WHERE endereco_cidade ILIKE 'Jata%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.2517, coordenadas_lng = -47.9500 WHERE endereco_cidade ILIKE 'Luzi%nia%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.4475, coordenadas_lng = -49.0675 WHERE endereco_cidade ILIKE 'Padre Bernardo%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.8500, coordenadas_lng = -49.0000 WHERE endereco_cidade ILIKE 'Pirinop%lis%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -17.7936, coordenadas_lng = -50.9297 WHERE endereco_cidade = 'Rio Verde' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.5050, coordenadas_lng = -49.1400 WHERE endereco_cidade ILIKE 'Urua%u%' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.9350, coordenadas_lng = -49.6000 WHERE endereco_cidade = 'Santa Terezinha' AND endereco_estado = 'GO' AND coordenadas_lat IS NULL;

-- ===== DISTRITO FEDERAL (DF) =====
UPDATE igrejas SET coordenadas_lat = -15.7975, coordenadas_lng = -47.8919 WHERE endereco_cidade ILIKE 'Bras%lia%' AND endereco_estado = 'DF' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.8500, coordenadas_lng = -47.9900 WHERE endereco_cidade = 'Estrutural' AND endereco_estado = 'DF' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.9600, coordenadas_lng = -48.0608 WHERE endereco_cidade = 'Gama' AND endereco_estado = 'DF' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.7700, coordenadas_lng = -47.7744 WHERE endereco_cidade ILIKE 'Parano%' AND endereco_estado = 'DF' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.6500, coordenadas_lng = -47.7900 WHERE endereco_cidade = 'Sobradinho' AND endereco_estado = 'DF' AND coordenadas_lat IS NULL;

-- ===== MATO GROSSO (MT) =====
UPDATE igrejas SET coordenadas_lat = -15.6014, coordenadas_lng = -56.0979 WHERE endereco_cidade ILIKE 'Cuiab%' AND endereco_estado = 'MT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.2097, coordenadas_lng = -52.0217 WHERE endereco_cidade ILIKE '%gua Boa%' AND endereco_estado = 'MT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -9.8753, coordenadas_lng = -56.0861 WHERE endereco_cidade = 'Alta Floresta' AND endereco_estado = 'MT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -15.8914, coordenadas_lng = -52.2569 WHERE endereco_cidade ILIKE 'Barra do Gar%a%' AND endereco_estado = 'MT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -10.2108, coordenadas_lng = -54.9536 WHERE endereco_cidade = 'Peixoto de Azevedo' AND endereco_estado = 'MT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -16.4697, coordenadas_lng = -54.6361 WHERE endereco_cidade ILIKE 'Rondon%polis%' AND endereco_estado = 'MT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -11.8608, coordenadas_lng = -55.5064 WHERE endereco_cidade = 'Sinop' AND endereco_estado = 'MT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -14.6364, coordenadas_lng = -57.4947 WHERE endereco_cidade ILIKE 'Tangar% da Serra%' AND endereco_estado = 'MT' AND coordenadas_lat IS NULL;

-- ===== MATO GROSSO DO SUL (MS) =====
UPDATE igrejas SET coordenadas_lat = -20.4486, coordenadas_lng = -54.6295 WHERE endereco_cidade = 'Campo Grande' AND endereco_estado = 'MS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.0603, coordenadas_lng = -55.1656 WHERE endereco_cidade = 'Anastácio' AND endereco_estado = 'MS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.1261, coordenadas_lng = -56.4836 WHERE endereco_cidade = 'Bonito' AND endereco_estado = 'MS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.0094, coordenadas_lng = -57.6514 WHERE endereco_cidade ILIKE 'Corumb%' AND endereco_estado = 'MS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.2231, coordenadas_lng = -54.8119 WHERE endereco_cidade = 'Dourados' AND endereco_estado = 'MS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.3067, coordenadas_lng = -54.2036 WHERE endereco_cidade ILIKE 'Itapor%' AND endereco_estado = 'MS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.0697, coordenadas_lng = -55.2747 WHERE endereco_cidade = 'Sete Quedas' AND endereco_estado = 'MS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.7850, coordenadas_lng = -51.7003 WHERE endereco_cidade ILIKE 'Tr%s Lagoas%' AND endereco_estado = 'MS' AND coordenadas_lat IS NULL;

-- ===== ESPÍRITO SANTO (ES) =====
UPDATE igrejas SET coordenadas_lat = -20.3155, coordenadas_lng = -40.3128 WHERE endereco_cidade ILIKE 'Vit%ria%' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.9361, coordenadas_lng = -40.2072 WHERE endereco_cidade = 'Aracruz' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.3653, coordenadas_lng = -40.3150 WHERE endereco_cidade ILIKE 'Ara%atiba%' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.8503, coordenadas_lng = -41.1117 WHERE endereco_cidade = 'Cachoeiro de Itapemirim' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.2633, coordenadas_lng = -40.4164 WHERE endereco_cidade = 'Cariacica' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.5000, coordenadas_lng = -40.4833 WHERE endereco_cidade = 'Guarapari' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.8333, coordenadas_lng = -40.3667 WHERE endereco_cidade ILIKE 'Ibira%u%' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.1119, coordenadas_lng = -41.3886 WHERE endereco_cidade = 'Itapemirim' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -19.3908, coordenadas_lng = -40.0717 WHERE endereco_cidade = 'Linhares' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -18.7128, coordenadas_lng = -40.4069 WHERE endereco_cidade ILIKE 'Nova Ven%cia%' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.1286, coordenadas_lng = -40.3122 WHERE endereco_cidade = 'Serra' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.3297, coordenadas_lng = -40.2922 WHERE endereco_cidade = 'Vila Velha' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.0100, coordenadas_lng = -40.8300 WHERE endereco_cidade ILIKE 'Vila do Itapemirim%' AND endereco_estado = 'ES' AND coordenadas_lat IS NULL;

-- ===== RIO DE JANEIRO (RJ) =====
UPDATE igrejas SET coordenadas_lat = -22.9068, coordenadas_lng = -43.1729 WHERE endereco_cidade = 'Rio de Janeiro' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.5908, coordenadas_lng = -43.2092 WHERE endereco_cidade = 'Duque de Caxias' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.5269, coordenadas_lng = -43.0350 WHERE endereco_cidade ILIKE 'Itabora%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.8669, coordenadas_lng = -43.7567 WHERE endereco_cidade ILIKE 'Itagua%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.3928, coordenadas_lng = -41.7850 WHERE endereco_cidade ILIKE 'Maca%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.6528, coordenadas_lng = -43.1708 WHERE endereco_cidade ILIKE 'Mag%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.7569, coordenadas_lng = -43.4508 WHERE endereco_cidade ILIKE 'Nova Igua%u%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.3872, coordenadas_lng = -42.9819 WHERE endereco_cidade = 'Nova Friburgo' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.4575, coordenadas_lng = -43.3817 WHERE endereco_cidade ILIKE 'Barra do Pirai%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.2178, coordenadas_lng = -44.7131 WHERE endereco_cidade = 'Paraty' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.4694, coordenadas_lng = -44.4464 WHERE endereco_cidade = 'Resende' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.8281, coordenadas_lng = -43.2567 WHERE endereco_cidade ILIKE 'S_o Gon%alo%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.8069, coordenadas_lng = -43.3508 WHERE endereco_cidade ILIKE 'S_o Jo_o de Meriti%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.1167, coordenadas_lng = -43.2125 WHERE endereco_cidade ILIKE 'Tr%s Rios%' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.4367, coordenadas_lng = -45.0861 WHERE endereco_cidade = 'Ubatuba' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.5231, coordenadas_lng = -44.1042 WHERE endereco_cidade = 'Volta Redonda' AND endereco_estado = 'RJ' AND coordenadas_lat IS NULL;

-- ===== SÃO PAULO (SP) =====
UPDATE igrejas SET coordenadas_lat = -23.5505, coordenadas_lng = -46.6333 WHERE endereco_cidade ILIKE 'S_o Paulo%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.8958, coordenadas_lng = -47.0608 WHERE endereco_cidade = 'Campinas' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.1767, coordenadas_lng = -47.8103 WHERE endereco_cidade ILIKE 'Ribeir_o Preto%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.4628, coordenadas_lng = -46.5333 WHERE endereco_cidade = 'Guarulhos' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.5025, coordenadas_lng = -47.4581 WHERE endereco_cidade = 'Sorocaba' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.9064, coordenadas_lng = -47.0616 WHERE endereco_cidade ILIKE 'S_o Jos% dos Campos%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.6261, coordenadas_lng = -46.6564 WHERE endereco_cidade ILIKE 'S_o Caetano do Sul%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.7267, coordenadas_lng = -47.6475 WHERE endereco_cidade = 'Limeira' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.0833, coordenadas_lng = -47.2128 WHERE endereco_cidade = 'Indaiatuba' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.1900, coordenadas_lng = -46.8844 WHERE endereco_cidade ILIKE 'Jundiai%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.3264, coordenadas_lng = -49.0706 WHERE endereco_cidade = 'Bauru' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.2928, coordenadas_lng = -48.5578 WHERE endereco_cidade = 'Botucatu' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.1178, coordenadas_lng = -46.5506 WHERE endereco_cidade = 'Bragança Paulista' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.4400, coordenadas_lng = -46.7900 WHERE endereco_cidade ILIKE 'Carapicu%ba%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.3817, coordenadas_lng = -46.7658 WHERE endereco_cidade = 'Caieiras' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.5981, coordenadas_lng = -47.4533 WHERE endereco_cidade = 'Conchal' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.6600, coordenadas_lng = -46.4800 WHERE endereco_cidade = 'Ferraz de Vasconcelos' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.9894, coordenadas_lng = -46.9594 WHERE endereco_cidade ILIKE 'Hortol%ndia%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.6586, coordenadas_lng = -47.2222 WHERE endereco_cidade ILIKE 'Ibi%na%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.2053, coordenadas_lng = -49.3764 WHERE endereco_cidade ILIKE 'Itapetininga%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.4872, coordenadas_lng = -46.3486 WHERE endereco_cidade ILIKE 'Itaquaquecetuba%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.2636, coordenadas_lng = -47.2994 WHERE endereco_cidade = 'Itu' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.2939, coordenadas_lng = -48.5578 WHERE endereco_cidade ILIKE 'Ja%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.2236, coordenadas_lng = -47.8422 WHERE endereco_cidade ILIKE 'Juqui%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.6367, coordenadas_lng = -49.7408 WHERE endereco_cidade = 'Lins' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.0867, coordenadas_lng = -46.9550 WHERE endereco_cidade = 'Louveira' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.2128, coordenadas_lng = -49.9456 WHERE endereco_cidade ILIKE 'Mar%lia%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.5206, coordenadas_lng = -46.1856 WHERE endereco_cidade = 'Mogi das Cruzes' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.0025, coordenadas_lng = -46.7625 WHERE endereco_cidade = 'Praia Grande' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.1253, coordenadas_lng = -51.3889 WHERE endereco_cidade = 'Presidente Prudente' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.4103, coordenadas_lng = -47.5625 WHERE endereco_cidade = 'Pirassununga' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.4167, coordenadas_lng = -47.3833 WHERE endereco_cidade = 'Rio Claro' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.6683, coordenadas_lng = -46.4653 WHERE endereco_cidade = 'Suzano' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.9567, coordenadas_lng = -46.3325 WHERE endereco_cidade ILIKE 'S_o Vicente%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.5917, coordenadas_lng = -46.6331 WHERE endereco_cidade = 'Socorro' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.1800, coordenadas_lng = -46.9994 WHERE endereco_cidade ILIKE 'Itanha%m%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.4900, coordenadas_lng = -47.8400 WHERE endereco_cidade = 'Registro' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.5006, coordenadas_lng = -47.7544 WHERE endereco_cidade = 'Cajati' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.7400, coordenadas_lng = -47.3300 WHERE endereco_cidade = 'Artur Nogueira' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.1244, coordenadas_lng = -47.0781 WHERE endereco_cidade ILIKE 'Elias Fausto%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.6611, coordenadas_lng = -50.4122 WHERE endereco_cidade = 'Assis' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.1261, coordenadas_lng = -46.5528 WHERE endereco_cidade = 'Atibaia' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.6367, coordenadas_lng = -47.0667 WHERE endereco_cidade = 'Aparecida' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.3328, coordenadas_lng = -46.3569 WHERE endereco_cidade ILIKE 'Bom Jesus dos Perd_es%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.6833, coordenadas_lng = -51.1833 WHERE endereco_cidade = 'Caiabu' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.8939, coordenadas_lng = -48.0472 WHERE endereco_cidade ILIKE 'Cap_o Bonito%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.2022, coordenadas_lng = -47.4367 WHERE endereco_cidade ILIKE 'Ces%rio Lange%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.0833, coordenadas_lng = -48.5833 WHERE endereco_cidade = 'Guapiara' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.4600, coordenadas_lng = -46.5300 WHERE endereco_cidade = 'Perus' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -20.8511, coordenadas_lng = -48.7881 WHERE endereco_cidade ILIKE 'Pontal%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.6339, coordenadas_lng = -45.9586 WHERE endereco_cidade ILIKE 'Sales%polis%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -22.0000, coordenadas_lng = -51.4000 WHERE endereco_cidade = 'Taciba' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.5372, coordenadas_lng = -51.0389 WHERE endereco_cidade ILIKE 'Apucarana%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.1806, coordenadas_lng = -49.3861 WHERE endereco_cidade ILIKE 'S_o Jos% do Rio Preto%' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -21.7867, coordenadas_lng = -48.1750 WHERE endereco_cidade = 'Araraquara' AND endereco_estado = 'SP' AND coordenadas_lat IS NULL;

-- ===== PARANÁ (PR) =====
UPDATE igrejas SET coordenadas_lat = -25.4284, coordenadas_lng = -49.2733 WHERE endereco_cidade = 'Curitiba' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.3045, coordenadas_lng = -51.1696 WHERE endereco_cidade = 'Londrina' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.4206, coordenadas_lng = -51.9331 WHERE endereco_cidade ILIKE 'Maring%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -25.3833, coordenadas_lng = -49.2667 WHERE endereco_cidade ILIKE 'Almirante Tamandar%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.5372, coordenadas_lng = -51.0389 WHERE endereco_cidade ILIKE 'Apucarana%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.0100, coordenadas_lng = -50.0600 WHERE endereco_cidade ILIKE 'Cambar%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.3133, coordenadas_lng = -49.3833 WHERE endereco_cidade ILIKE 'C_ndido de Abreu%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.9961, coordenadas_lng = -50.0119 WHERE endereco_cidade = 'Castro' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -24.9578, coordenadas_lng = -53.4596 WHERE endereco_cidade = 'Cascavel' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -25.3831, coordenadas_lng = -49.2233 WHERE endereco_cidade = 'Colombo' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -25.4328, coordenadas_lng = -49.4744 WHERE endereco_cidade = 'Fazenda Rio Grande' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -25.5478, coordenadas_lng = -54.5881 WHERE endereco_cidade ILIKE 'Foz do Igua%u%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -25.3953, coordenadas_lng = -51.4614 WHERE endereco_cidade = 'Guarapuava' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -25.4278, coordenadas_lng = -48.8361 WHERE endereco_cidade = 'Morretes' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.3167, coordenadas_lng = -50.0667 WHERE endereco_cidade ILIKE 'Pinhal_o%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -25.0944, coordenadas_lng = -50.1614 WHERE endereco_cidade = 'Ponta Grossa' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -25.0833, coordenadas_lng = -50.5833 WHERE endereco_cidade ILIKE 'Prudent%polis%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.5289, coordenadas_lng = -50.8506 WHERE endereco_cidade ILIKE '%ngulo%' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.3000, coordenadas_lng = -51.2333 WHERE endereco_cidade = 'Tamarana' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -23.7833, coordenadas_lng = -53.3167 WHERE endereco_cidade = 'Umuarama' AND endereco_estado = 'PR' AND coordenadas_lat IS NULL;

-- ===== SANTA CATARINA (SC) =====
UPDATE igrejas SET coordenadas_lat = -27.5954, coordenadas_lng = -48.5480 WHERE endereco_cidade ILIKE 'Florian%polis%' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -27.0175, coordenadas_lng = -48.6353 WHERE endereco_cidade ILIKE 'Cambori%' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -27.0969, coordenadas_lng = -52.6158 WHERE endereco_cidade ILIKE 'Chapec%' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -28.6775, coordenadas_lng = -49.3697 WHERE endereco_cidade ILIKE 'Criciuma%' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -27.0153, coordenadas_lng = -49.5261 WHERE endereco_cidade = 'Ibirama' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -28.3428, coordenadas_lng = -48.8008 WHERE endereco_cidade ILIKE 'Imaru%' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -26.9000, coordenadas_lng = -49.2333 WHERE endereco_cidade = 'Indaial' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -26.9283, coordenadas_lng = -48.7378 WHERE endereco_cidade ILIKE 'Itajai%' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -26.3044, coordenadas_lng = -48.8464 WHERE endereco_cidade = 'Joinville' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -28.4842, coordenadas_lng = -49.0069 WHERE endereco_cidade ILIKE 'Tubar_o%' AND endereco_estado = 'SC' AND coordenadas_lat IS NULL;

-- ===== RIO GRANDE DO SUL (RS) =====
UPDATE igrejas SET coordenadas_lat = -30.0346, coordenadas_lng = -51.2177 WHERE endereco_cidade = 'Porto Alegre' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -27.0836, coordenadas_lng = -54.1500 WHERE endereco_cidade = 'Bom Retiro' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -29.9200, coordenadas_lng = -50.9200 WHERE endereco_cidade = 'Cachoeirinha' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -27.6333, coordenadas_lng = -54.1333 WHERE endereco_cidade = 'Crissiumal' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -29.9167, coordenadas_lng = -50.9917 WHERE endereco_cidade ILIKE 'Gravata%' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -30.8833, coordenadas_lng = -53.6833 WHERE endereco_cidade = 'Lavras do Sul' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -29.6883, coordenadas_lng = -51.1300 WHERE endereco_cidade = 'Novo Hamburgo' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -31.7654, coordenadas_lng = -52.3376 WHERE endereco_cidade = 'Pelotas' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = -32.0350, coordenadas_lng = -52.0986 WHERE endereco_cidade = 'Rio Grande' AND endereco_estado = 'RS' AND coordenadas_lat IS NULL;

-- ===== PORTUGAL (PT) - igrejas no exterior =====
UPDATE igrejas SET coordenadas_lat = 38.7223, coordenadas_lng = -9.1393 WHERE endereco_cidade = 'Lisboa' AND endereco_estado = 'PT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 39.7436, coordenadas_lng = -8.8071 WHERE endereco_cidade = 'Leiria' AND endereco_estado = 'PT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 38.7000, coordenadas_lng = -9.0333 WHERE endereco_cidade = 'Montijo' AND endereco_estado = 'PT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 37.1361, coordenadas_lng = -8.5381 WHERE endereco_cidade ILIKE 'Portim_o%' AND endereco_estado = 'PT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 38.6333, coordenadas_lng = -9.1000 WHERE endereco_cidade = 'Seixal' AND endereco_estado = 'PT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 41.1333, coordenadas_lng = -8.6167 WHERE endereco_cidade = 'Vila Nova de Gaia' AND endereco_estado = 'PT' AND coordenadas_lat IS NULL;
UPDATE igrejas SET coordenadas_lat = 38.8583, coordenadas_lng = -8.9861 WHERE endereco_cidade ILIKE 'Estremoz%' AND endereco_estado = 'PT' AND coordenadas_lat IS NULL;

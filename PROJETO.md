# NNE Sistema - Documento Completo do Projeto

## 1. Visao Geral

**Nome**: NNE Sistema (Uniao Norte Nordeste Brasileira)
**Objetivo**: Sistema unificado de gestao eclesiastica que consolida funcionalidades de 4 sistemas existentes em uma unica plataforma moderna.
**Idioma**: Portugues (Brasil)

### 1.1 Stack Tecnologico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Estilizacao | Tailwind CSS 3 |
| Backend/BaaS | Supabase |
| Banco de Dados | PostgreSQL (via Supabase) |
| Autenticacao | Supabase Auth |
| Storage | Supabase Storage (fotos) |
| Mapas | Leaflet.js 1.9 + OpenStreetMap |
| Graficos | Chart.js 4 |
| PDF | jsPDF + html2canvas |
| CEP | ViaCEP API |
| Dados Demograficos | IBGE API |
| Exportacao | CSV, PDF, Excel (xlsx) |
| Roteamento | React Router v6 |
| Estado | React Context + useReducer |
| Formularios | React Hook Form + Zod |
| Icones | Lucide React |

### 1.2 Supabase

- **URL**: `https://gbuygmwyrnubnebrzkyd.supabase.co`
- **Funcionalidades**: Auth, Database, Storage, Row Level Security (RLS)

---

## 2. Sistemas de Referencia

| Sistema | Tecnologia | Funcionalidades Extraidas |
|---------|-----------|--------------------------|
| CMS Vida Plena | PHP + Firebase | RBAC 8 niveis, hierarquia organizacional, gestao de pessoas, financeiro, transferencias, relatorios, mapas |
| Mordomia NNE | React + Supabase | Modelo financeiro (10 receitas + 7 despesas), tipos TypeScript, estrutura Supabase |
| Reformistas Cadastro | HTML/JS Web | Formulario 12 etapas, LGPD, pesquisa de satisfacao |
| SDARM Secretaria | Web | Gestao missionaria, contagem de membros, receita de campo, Escola Sabatina, classes batismais |

---

## 3. Hierarquia Organizacional

```
Uniao (Norte Nordeste Brasileira)
  |
  +-- Associacao / Campo / Missao
        |
        +-- Igreja
              |
              +-- Membro
              +-- Interessado
              +-- Classe ES (Escola Sabatina)
              +-- Familia
```

### 3.1 Modelo de Dados - Organizacao

```typescript
interface Uniao {
  id: string;
  nome: string;
  sigla: string;
  estado: string;
  ativo: boolean;
  created_at: string;
}

interface Associacao {
  id: string;
  nome: string;
  sigla: string;
  tipo: 'associacao' | 'campo' | 'missao';
  uniaoId: string;
  estado: string;
  cidade: string;
  ativo: boolean;
  created_at: string;
}

interface Igreja {
  id: string;
  nome: string;
  associacaoId: string;
  uniaoId: string;
  endereco: Endereco;
  coordenadas?: { lat: number; lng: number };
  pastor?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  created_at: string;
}
```

---

## 4. Sistema de Controle de Acesso (RBAC)

### 4.1 Papeis (8 niveis)

| Papel | Descricao | Escopo |
|-------|----------|--------|
| `admin` | Administrador geral | Acesso total |
| `admin_uniao` | Admin da Uniao | Filtra por uniao |
| `admin_associacao` | Admin da Associacao | Filtra por associacao |
| `diretor_es` | Diretor Escola Sabatina | Igreja + ES |
| `professor_es` | Professor Escola Sabatina | Sua classe |
| `secretario_es` | Secretario ES | Igreja + ES |
| `tesoureiro` | Tesoureiro | Igreja + financeiro |
| `secretario_igreja` | Secretario da Igreja | Igreja |
| `membro` | Membro comum | Somente leitura pessoal |

### 4.2 Filtragem Hierarquica

```
admin           -> Ve TUDO
admin_uniao     -> WHERE uniaoId = usuario.uniaoId
admin_associacao -> WHERE associacaoId = usuario.associacaoId
demais          -> WHERE igrejaId = usuario.igrejaId
```

### 4.3 Funcoes de Permissao (a replicar do CMS)

- `temPermissaoPagina(pagina)` - Verifica acesso a pagina
- `temPermissaoAcao(acao)` - Verifica acesso a acao
- `podeAcessarClasse(classeId)` - Verifica acesso a classe ES
- `podeAcessarIgreja(igrejaId)` - Verifica acesso a igreja
- `podeAcessarAssociacao(assocId)` - Verifica acesso a associacao
- `getNivelAcesso()` - Retorna nivel hierarquico
- `getPaginasPermitidas()` - Lista paginas acessiveis
- `getFiltroHierarquico()` - Retorna filtro SQL por hierarquia

---

## 5. Modulos do Sistema

### 5.1 Modulo Cadastro (Formulario 12 Etapas)

Baseado no sistema Reformistas. Formulario multi-step com progresso visual.

#### Etapas:

| Etapa | Titulo | Campos |
|-------|--------|--------|
| 0 | LGPD | Consentimento obrigatorio, texto legal, checkbox aceite |
| 1 | Dados Pessoais | Nome completo, email, telefone, CEP (ViaCEP auto-fill), rua, numero, bairro, cidade, estado |
| 2 | Nascimento | Data de nascimento, sexo (Masculino/Feminino), faixa etaria |
| 3 | Estado Civil | Estado civil (6 opcoes), escolaridade (8 niveis), profissao (55+ opcoes) |
| 4 | Tempo de Membro | Ha quanto tempo e membro (6 faixas) |
| 5 | Descoberta | Como conheceu a igreja (8 opcoes + outro) |
| 6 | Localizacao | Distancia da igreja (5 faixas), meio de transporte (6 opcoes), qual igreja frequenta |
| 7 | Perfil | Pontos fortes (10 opcoes), pontos fracos (10 opcoes), cargos que ocupa (20+ opcoes) |
| 8 | Satisfacao | Matriz 13 itens x 4 pontos (Muito Insatisfeito a Muito Satisfeito) |
| 9 | Prioridades | 22 areas, selecao minima de 3 prioridades |
| 10 | Participacao | Matriz 6 itens x 5 pontos (Nunca a Sempre) |
| 11 | Departamentos | Opiniao sobre departamentos da igreja (texto livre) |

#### Integracao ViaCEP:
```
GET https://viacep.com.br/ws/{cep}/json/
-> Auto-preenche: logradouro, bairro, localidade, uf
```

#### LGPD:
- Consentimento explicito obrigatorio antes de prosseguir
- Texto informativo sobre uso dos dados
- Checkbox: "Li e concordo com a Politica de Privacidade"
- Armazenamento do timestamp do consentimento

---

### 5.2 Modulo Secretaria

#### 5.2.1 Gestao de Pessoas

```typescript
interface Pessoa {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  foto?: string;
  fotoAprovada: boolean;
  fotoPendente: boolean;
  dataNascimento?: string;
  sexo?: 'masculino' | 'feminino';
  estadoCivil?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | 'separado' | 'uniao_estavel';
  profissao?: string;
  escolaridade?: string;
  endereco: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    coordenadas?: { lat: number; lng: number };
  };
  tipo: 'membro' | 'interessado'; // auto: membro se dataBatismo, senao interessado
  dataBatismo?: string;
  igrejaId: string;
  associacaoId: string;
  uniaoId: string;
  classeESId?: string;
  cargo?: string;
  cargosAdicionais: string[];
  familiaId?: string;
  parentesco?: string;
  ativo: boolean;
  motivoInativo?: string;
  created_at: string;
  updated_at: string;
}
```

**Funcionalidades:**
- CRUD completo de membros e interessados
- Upload de foto com workflow de aprovacao (fotoPendente -> fotoAprovada)
- Busca e filtros avancados (por nome, igreja, associacao, tipo, status)
- Exportacao CSV/PDF/Excel
- Estatisticas: total membros, interessados, batismos no mes, aniversariantes
- 55+ opcoes de profissao pre-cadastradas
- Determinacao automatica de tipo (membro/interessado) baseado em dataBatismo

#### 5.2.2 Transferencias

```typescript
interface Transferencia {
  id: string;
  pessoaId: string;
  igrejaOrigemId: string;
  igrejaDestinoId: string;
  tipo: 'transferencia' | 'carta';
  status: 'solicitada' | 'aprovada' | 'concluida' | 'rejeitada';
  motivo?: string;
  observacao?: string;
  solicitadoPor: string;
  aprovadoPor?: string;
  dataAprovacao?: string;
  dataConclusao?: string;
  created_at: string;
}
```

**Workflow de Status:**
```
solicitada -> aprovada -> concluida
     |            |
     +-> rejeitada +-> rejeitada
```

**UI:** Abas por status (Pendentes / Aprovadas / Concluidas / Rejeitadas / Todas)

#### 5.2.3 Familias

```typescript
interface Familia {
  id: string;
  nome: string;
  igrejaId: string;
  endereco: Endereco;
  coordenadas?: { lat: number; lng: number };
  membros: string[]; // pessoaIds
  created_at: string;
}
```

#### 5.2.4 Contagem de Membros (Secretaria SDARM)

Registro mensal de presenca e estatisticas:

```typescript
interface ContagemMensal {
  id: string;
  igrejaId: string;
  mes: number; // 1-12
  ano: number;
  totalMembros: number;
  totalInteressados: number;
  mediaPresenca: number;
  batismos: number;
  transferenciasEntrada: number;
  transferenciasSaida: number;
  obitos: number;
  exclusoes: number;
  observacoes?: string;
  created_at: string;
}
```

#### 5.2.5 Classes Batismais

```typescript
interface ClasseBatismal {
  id: string;
  nome: string;
  igrejaId: string;
  instrutor: string;
  dataInicio: string;
  dataPrevisaoTermino: string;
  status: 'ativa' | 'concluida' | 'cancelada';
  alunos: string[]; // pessoaIds
  licoes: LicaoBatismal[];
  created_at: string;
}

interface LicaoBatismal {
  numero: number;
  titulo: string;
  dataPrevista: string;
  dataRealizada?: string;
  presentes: string[]; // pessoaIds
}
```

---

### 5.3 Modulo Financeiro

Baseado no CMS + Mordomia NNE.

#### 5.3.1 Modelo Financeiro

```typescript
interface DadosFinanceiros {
  id: string;
  igrejaId: string;
  associacaoId: string;
  mes: number;
  ano: number;
  receitas: {
    dizimos: number;
    ofertaRegular: number;
    ofertaEspecial: number;
    ofertaMissoes: number;
    ofertaAgradecimento: number;
    ofertaES: number;
    doacoes: number;
    fundoAssistencial: number;
    proventosImoveis: number;
    outrasReceitas: number;
  };
  despesas: {
    salarios: number;
    manutencao: number;
    agua: number;
    energia: number;
    internet: number;
    materialES: number;
    outrasDespesas: number;
  };
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}
```

**10 Categorias de Receita:**
1. Dizimos
2. Oferta Regular
3. Oferta Especial
4. Oferta de Missoes
5. Oferta de Agradecimento
6. Oferta Escola Sabatina
7. Doacoes
8. Fundo Assistencial
9. Proventos de Imoveis
10. Outras Receitas

**7 Categorias de Despesa:**
1. Salarios
2. Manutencao
3. Agua
4. Energia
5. Internet
6. Material Escola Sabatina
7. Outras Despesas

**Funcionalidades:**
- Cards resumo: Total do Mes, Dizimos, Ofertas, Doacoes
- Filtros por periodo, igreja, associacao
- Workflow de aprovacao (pendente -> aprovado/rejeitado)
- Historico mensal
- Comparativo ano a ano
- Exportacao PDF/Excel/CSV
- Integracao Google Sheets (sync)

#### 5.3.2 Receita de Campo (SDARM)

```typescript
interface ReceitaCampo {
  id: string;
  associacaoId: string;
  mes: number;
  ano: number;
  totalDizimos: number;
  totalOfertas: number;
  totalGeral: number;
  igrejas: {
    igrejaId: string;
    dizimos: number;
    ofertas: number;
  }[];
  created_at: string;
}
```

---

### 5.4 Modulo Escola Sabatina

```typescript
interface ClasseES {
  id: string;
  nome: string;
  faixaEtaria: string;
  igrejaId: string;
  professorId: string;
  auxiliarId?: string;
  membros: string[]; // pessoaIds
  ativa: boolean;
  created_at: string;
}

interface PresencaES {
  id: string;
  classeId: string;
  data: string; // sabado
  trimestre: number;
  ano: number;
  presentes: string[];
  ausentes: string[];
  visitantes: number;
  oferta: number;
  licaoEstudada: number;
  observacoes?: string;
  created_at: string;
}
```

**7 Tipos de Relatorio ES (do CMS):**
1. Presenca por classe
2. Presenca geral da igreja
3. Evolucao trimestral
4. Estudo da licao
5. Ofertas da ES
6. Visitantes
7. Comparativo entre classes

---

### 5.5 Modulo Missoes / Missionario (SDARM)

```typescript
interface RelatorioMissionario {
  id: string;
  pessoaId: string;
  igrejaId: string;
  mes: number;
  ano: number;
  estudosBiblicos: number;
  visitasMissionarias: number;
  literaturaDistribuida: number;
  pessoasContatadas: number;
  convitesFeitos: number;
  pessoasTrazidas: number;
  horasTrabalho: number;
  observacoes?: string;
  created_at: string;
}
```

---

### 5.6 Modulo Relatorios e PDF

#### 5.6.1 Tipos de Relatorio

1. **Relatorio de Membros**: Listagem completa, filtros, estatisticas
2. **Relatorio Financeiro**: Mensal/trimestral/anual, comparativos
3. **Relatorio Escola Sabatina**: Presenca, ofertas, evolucao
4. **Relatorio Missionario**: Individual e consolidado
5. **Relatorio de Transferencias**: Por status, periodo
6. **Relatorio de Batismos**: Classes, conclusoes
7. **Relatorio Demografico**: Integracao IBGE

#### 5.6.2 Geracao de PDF

- Biblioteca: jsPDF + html2canvas
- Layout padrao com cabecalho institucional
- **Assinatura fisica**: Campo para assinatura manual
- **Assinatura digital GOV.BR**: Integracao com certificado digital ICP-Brasil
- Exportacao em A4, paisagem/retrato
- Marca d'agua institucional

#### 5.6.3 Exportacao

- **CSV**: Dados tabulares simples
- **Excel (XLSX)**: Com formatacao e multiplas abas
- **PDF**: Relatorios formatados com graficos

---

### 5.7 Modulo Mapas e Planejamento de Visitas

#### 5.7.1 Mapa de Membros

- **Motor**: Leaflet.js 1.9.4 + OpenStreetMap tiles
- Marcadores customizados por tipo (membro/interessado/familia)
- Filtros por Uniao, Associacao, Igreja
- Popup com dados resumidos ao clicar
- Cluster de marcadores para muitos pontos
- Geocodificacao de enderecos via Nominatim

#### 5.7.2 Planejamento de Visitas

```typescript
interface PlanoVisita {
  id: string;
  titulo: string;
  data: string;
  visitadorId: string;
  igrejaId: string;
  paradas: {
    ordem: number;
    pessoaId?: string;
    familiaId?: string;
    endereco: Endereco;
    coordenadas: { lat: number; lng: number };
    observacao?: string;
    visitaRealizada: boolean;
  }[];
  rotaOtimizada: boolean;
  distanciaTotal?: number;
  tempoEstimado?: number;
  status: 'planejado' | 'em_andamento' | 'concluido';
  created_at: string;
}
```

**Funcionalidades:**
- Selecao de membros/familias no mapa
- Otimizacao de rota (Travelling Salesman simplificado)
- Estimativa de tempo e distancia
- Checklist de visitas realizadas
- Historico de visitas

---

### 5.8 Modulo IBGE - Dados Demograficos

#### 5.8.1 APIs Utilizadas

```
GET https://servicodados.ibge.gov.br/api/v1/localidades/estados
GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios
GET https://servicodados.ibge.gov.br/api/v3/agregados/{pesquisa}/periodos/{periodo}/variaveis/{variavel}
```

#### 5.8.2 Dados Integrados

- Populacao por municipio
- Faixa etaria
- Renda per capita
- Densidade demografica
- Taxa de urbanizacao
- Comparativo igreja vs populacao local

#### 5.8.3 Visualizacao

- Cards com dados do municipio
- Graficos de pizza/barra comparativos
- Indicadores de penetracao (membros/populacao)
- Mapa coropletico por regiao

---

### 5.9 Modulo Dashboard e Graficos

#### 5.9.1 Dashboard Principal

Cards resumo:
- Total de membros (com variacao mensal)
- Total de interessados
- Batismos no periodo
- Receita do mes
- Presenca media ES
- Estudos biblicos realizados

#### 5.9.2 Graficos (Chart.js 4)

1. **Linha**: Evolucao de membros ao longo do tempo
2. **Barra**: Comparativo financeiro mensal
3. **Pizza**: Distribuicao por faixa etaria
4. **Doughnut**: Distribuicao por sexo
5. **Barra Horizontal**: Ranking de igrejas por membros
6. **Area**: Tendencia de batismos
7. **Radar**: Satisfacao (dados do cadastro etapa 8)
8. **Barra Empilhada**: Receitas x Despesas

#### 5.9.3 Filtros Globais

- Periodo (mes/trimestre/semestre/ano/customizado)
- Uniao
- Associacao
- Igreja
- Tipo (membro/interessado)

---

## 6. Estrutura do Projeto

```
nne-sistema/
|-- public/
|   |-- favicon.ico
|   +-- logo.png
|-- src/
|   |-- assets/
|   |   |-- images/
|   |   +-- styles/
|   |       +-- globals.css
|   |-- components/
|   |   |-- ui/                    # Componentes base (Button, Input, Card, Modal, etc)
|   |   |-- layout/               # Layout (Sidebar, Header, Footer)
|   |   |-- forms/                # Componentes de formulario
|   |   |-- charts/               # Wrappers Chart.js
|   |   |-- maps/                 # Componentes Leaflet
|   |   +-- shared/               # Componentes compartilhados
|   |-- contexts/
|   |   |-- AuthContext.tsx
|   |   |-- ThemeContext.tsx
|   |   +-- FilterContext.tsx
|   |-- hooks/
|   |   |-- useAuth.ts
|   |   |-- usePermission.ts
|   |   |-- useSupabase.ts
|   |   |-- useViaCEP.ts
|   |   |-- useIBGE.ts
|   |   +-- useGeolocation.ts
|   |-- lib/
|   |   |-- supabase.ts           # Cliente Supabase
|   |   |-- permissions.ts        # Sistema RBAC
|   |   |-- pdf.ts                # Geracao PDF
|   |   |-- export.ts             # CSV/Excel
|   |   +-- utils.ts              # Utilitarios
|   |-- pages/
|   |   |-- auth/
|   |   |   |-- Login.tsx
|   |   |   +-- ForgotPassword.tsx
|   |   |-- dashboard/
|   |   |   +-- Dashboard.tsx
|   |   |-- cadastro/
|   |   |   |-- CadastroForm.tsx   # Form 12 etapas
|   |   |   +-- steps/             # Step0LGPD..Step11Departamentos
|   |   |-- secretaria/
|   |   |   |-- Pessoas.tsx
|   |   |   |-- PessoaForm.tsx
|   |   |   |-- Transferencias.tsx
|   |   |   |-- Familias.tsx
|   |   |   |-- Contagem.tsx
|   |   |   +-- ClassesBatismais.tsx
|   |   |-- financeiro/
|   |   |   |-- Financeiro.tsx
|   |   |   |-- LancamentoForm.tsx
|   |   |   +-- ReceitaCampo.tsx
|   |   |-- escola-sabatina/
|   |   |   |-- EscolaSabatina.tsx
|   |   |   |-- Classes.tsx
|   |   |   +-- Presenca.tsx
|   |   |-- missoes/
|   |   |   |-- Missoes.tsx
|   |   |   +-- RelatorioMissionario.tsx
|   |   |-- relatorios/
|   |   |   |-- Relatorios.tsx
|   |   |   +-- RelatorioViewer.tsx
|   |   |-- mapas/
|   |   |   |-- Mapa.tsx
|   |   |   +-- PlanoVisita.tsx
|   |   |-- ibge/
|   |   |   +-- DadosDemograficos.tsx
|   |   |-- organizacao/
|   |   |   |-- Unioes.tsx
|   |   |   |-- Associacoes.tsx
|   |   |   +-- Igrejas.tsx
|   |   +-- admin/
|   |       |-- Usuarios.tsx
|   |       +-- Configuracoes.tsx
|   |-- types/
|   |   |-- database.ts           # Tipos do Supabase
|   |   |-- forms.ts              # Tipos dos formularios
|   |   +-- index.ts              # Re-exports
|   |-- App.tsx
|   |-- main.tsx
|   +-- vite-env.d.ts
|-- .env                          # Variaveis de ambiente
|-- .env.example
|-- index.html
|-- package.json
|-- postcss.config.js
|-- tailwind.config.js
|-- tsconfig.json
|-- tsconfig.node.json
+-- vite.config.ts
```

---

## 7. Navegacao (Sidebar)

Baseada no CMS (28+ paginas), organizada em secoes:

```
DASHBOARD
  - Painel Geral

CADASTRO
  - Novo Cadastro (12 etapas)
  - Respostas

SECRETARIA
  - Pessoas
  - Familias
  - Transferencias
  - Contagem Mensal
  - Classes Batismais

FINANCEIRO
  - Lancamentos
  - Receita de Campo
  - Relatorio Financeiro

ESCOLA SABATINA
  - Classes
  - Presenca
  - Relatorios ES

MISSOES
  - Relatorio Missionario
  - Consolidado

MAPAS
  - Mapa de Membros
  - Plano de Visitas

RELATORIOS
  - Gerar Relatorio
  - Dados IBGE

ORGANIZACAO
  - Unioes
  - Associacoes
  - Igrejas

ADMINISTRACAO
  - Usuarios
  - Configuracoes
```

---

## 8. Banco de Dados (Supabase/PostgreSQL)

### 8.1 Tabelas Principais

| Tabela | Descricao |
|--------|----------|
| `unioes` | Unioes organizacionais |
| `associacoes` | Associacoes/Campos/Missoes |
| `igrejas` | Igrejas locais |
| `pessoas` | Membros e interessados |
| `familias` | Nucleos familiares |
| `transferencias` | Solicitacoes de transferencia |
| `dados_financeiros` | Lancamentos financeiros mensais |
| `classes_es` | Classes da Escola Sabatina |
| `presenca_es` | Registro de presenca ES |
| `classes_batismais` | Classes de batismo |
| `relatorios_missionarios` | Atividades missionarias |
| `contagem_mensal` | Estatisticas mensais da igreja |
| `cadastro_respostas` | Respostas do formulario 12 etapas |
| `planos_visita` | Planejamento de visitas |
| `usuarios` | Usuarios do sistema (auth + perfil) |
| `receita_campo` | Receita consolidada por associacao |

### 8.2 Row Level Security (RLS)

Todas as tabelas terao RLS ativado com politicas baseadas no papel do usuario:

```sql
-- Exemplo: Politica para tabela pessoas
CREATE POLICY "pessoas_select" ON pessoas
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM usuarios WHERE papel = 'admin'
    )
    OR
    (auth.uid() IN (
      SELECT id FROM usuarios WHERE papel = 'admin_uniao' AND uniao_id = pessoas.uniao_id
    ))
    OR
    (auth.uid() IN (
      SELECT id FROM usuarios WHERE papel = 'admin_associacao' AND associacao_id = pessoas.associacao_id
    ))
    OR
    (auth.uid() IN (
      SELECT id FROM usuarios WHERE papel IN ('secretario_igreja','tesoureiro','diretor_es','professor_es','secretario_es') AND igreja_id = pessoas.igreja_id
    ))
  );
```

---

## 9. APIs Externas

### 9.1 ViaCEP
```
GET https://viacep.com.br/ws/{cep}/json/
Retorna: logradouro, bairro, localidade, uf, complemento
Uso: Auto-preenchimento de endereco no cadastro
```

### 9.2 IBGE Localidades
```
GET https://servicodados.ibge.gov.br/api/v1/localidades/estados
GET https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios
Uso: Selecao de estado/cidade, dados demograficos
```

### 9.3 IBGE Agregados
```
GET https://servicodados.ibge.gov.br/api/v3/agregados/{pesquisa}/periodos/...
Uso: Populacao, renda, faixa etaria por municipio
```

### 9.4 Nominatim (OpenStreetMap)
```
GET https://nominatim.openstreetmap.org/search?q={endereco}&format=json
Uso: Geocodificacao de enderecos para coordenadas
```

---

## 10. Dados de Referencia Pre-Cadastrados

### 10.1 Profissoes (55+)
Administrador, Advogado, Agronomo, Aposentado, Arquiteto, Assistente Social, Autonomo, Biologo, Bombeiro, Cabeleireiro, Comerciante, Contador, Cozinheiro, Dentista, Designer, Do Lar, Economista, Eletricista, Empresario, Enfermeiro, Engenheiro, Estudante, Farmaceutico, Fisioterapeuta, Fotografo, Funcionario Publico, Gerente, Jornalista, Medico, Mecanico, Militar, Motorista, Musico, Nutricionista, Pastor, Pedagogo, Pedreiro, Policial, Professor, Programador, Psicologo, Publicitario, Recepcionista, Secretario, Seguranca, Tecnico, Telefonista, Vendedor, Veterinario, Outro

### 10.2 Estados Civis
Solteiro, Casado, Divorciado, Viuvo, Separado, Uniao Estavel

### 10.3 Escolaridade
Fundamental Incompleto, Fundamental Completo, Medio Incompleto, Medio Completo, Superior Incompleto, Superior Completo, Pos-Graduacao, Mestrado/Doutorado

### 10.4 Cargos da Igreja (20+)
Pastor, Anciao, Diacono, Diaconisa, Diretor ES, Professor ES, Secretario, Tesoureiro, Diretor de Musica, Pianista/Organista, Diretor de Jovens, Diretor de Desbravadores, Diretor de Aventureiros, Lider de PG, Diretor Missionario, Diretor de Comunicacao, Diretor de Liberdade Religiosa, Diretor de Saude, Sonoplasta, Outro

---

## 11. UI/UX

### 11.1 Design System

- **Cores**: Baseado em tons institucionais (azul/branco)
- **Tipografia**: Inter (Google Fonts)
- **Componentes**: Tailwind CSS utilitarios
- **Responsivo**: Mobile-first
- **Tema**: Claro (com possibilidade de dark mode futuro)

### 11.2 Componentes Base

- `Button` (primary, secondary, danger, ghost)
- `Input` (text, email, tel, number, date, select, textarea)
- `Card` (com header, body, footer)
- `Modal` (dialog responsivo)
- `Table` (com ordenacao, paginacao, busca)
- `Badge` (status com cores)
- `Tabs` (navegacao por abas)
- `Stepper` (progresso multi-etapa)
- `Sidebar` (navegacao lateral colapsavel)
- `Header` (barra superior com usuario)
- `Toast` (notificacoes temporarias)
- `Skeleton` (loading states)
- `EmptyState` (estados vazios)
- `ConfirmDialog` (confirmacao de acoes)

### 11.3 Pagina de Login

- Logo centralizado
- Campo email + senha
- Botao "Entrar"
- Link "Esqueci minha senha"
- Fundo com imagem institucional

---

## 12. Seguranca

- Autenticacao via Supabase Auth (email/senha)
- Tokens JWT automaticos
- RLS em todas as tabelas
- RBAC no frontend + backend
- LGPD compliance (consentimento, anonimizacao)
- Upload de fotos com validacao de tipo/tamanho
- Sanitizacao de inputs
- HTTPS obrigatorio
- Rate limiting via Supabase

---

## 13. Ordem de Implementacao

### Fase 1 - Fundacao
1. Setup do projeto (Vite + React + TypeScript + Tailwind)
2. Configuracao Supabase (cliente, tipos)
3. Sistema de autenticacao (login, logout, rotas protegidas)
4. Layout base (sidebar, header, roteamento)
5. Sistema RBAC (permissoes, filtros hierarquicos)

### Fase 2 - Modulos Core
6. Organizacao (CRUD unioes, associacoes, igrejas)
7. Gestao de Pessoas (CRUD, busca, filtros, foto)
8. Familias
9. Transferencias (workflow completo)

### Fase 3 - Cadastro
10. Formulario 12 etapas
11. Integracao ViaCEP
12. Armazenamento de respostas

### Fase 4 - Operacional
13. Financeiro (lancamentos, receita campo)
14. Escola Sabatina (classes, presenca)
15. Missoes (relatorio missionario)
16. Contagem mensal
17. Classes batismais

### Fase 5 - Relatorios e Visualizacao
18. Dashboard com graficos (Chart.js)
19. Geracao de relatorios PDF
20. Assinatura digital GOV.BR
21. Exportacao CSV/Excel

### Fase 6 - Mapas e Dados
22. Mapa de membros (Leaflet)
23. Planejamento de visitas + rotas
24. Integracao IBGE
25. Dados demograficos

### Fase 7 - Polimento
26. Admin (usuarios, configuracoes)
27. Google Sheets sync
28. Testes e ajustes
29. Deploy

---

## 14. Variaveis de Ambiente

```env
VITE_SUPABASE_URL=https://gbuygmwyrnubnebrzkyd.supabase.co
VITE_SUPABASE_ANON_KEY=<chave_anonima>
VITE_GOOGLE_MAPS_KEY=<chave_google_maps>  # opcional
VITE_APP_NAME=NNE Sistema
VITE_APP_VERSION=1.0.0
```

---

*Documento gerado em 19/02/2026 - NNE Sistema v1.0*

# Sprint 2 - Estabilizacao, Performance e Governanca

Estado de referencia: 12/04/2026

## Meta da sprint

Sair do hardening inicial e entrar em uma fase de estabilizacao sustentavel, com foco em segmentacao real por modulo, performance em rotas privadas, experiencia mobile e governanca tecnica do backend.

## Status do pacote 1

- Matriz central de acesso por modulo e rota criada em `src/lib/access.ts`.
- Sidebar privada passou a consumir a mesma fonte de verdade das permissoes.
- Modulo Financeiro voltou a aparecer na navegacao para perfis elegiveis.
- Base de guardas foi preparada para evoluir do controle por array solto para controle por chave de acesso.

## Status do pacote 2

- `LancamentosPage` ganhou filtros mais estaveis no mobile, cards responsivos e estados de acao por item.
- `TransferenciasPage` saiu do modelo de tabela unica e agora possui leitura mobile em cards com acoes contextuais.
- Mutacoes principais dessas duas telas passaram a usar toasts de sucesso e erro no lugar de feedbacks soltos.

## Status do pacote 3

- Hook `useTransferencias` criado com `useQuery` e invalidacao centralizada para a listagem da secretaria.
- `TransferenciasPage` deixou de depender de `fetch` manual em ciclo de vida e passou a usar cache e mutacoes com React Query.
- Atualizacoes de transferencia agora invalidam tambem `secretaria-stats`, mantendo dashboard e operacao mais consistentes.

## Status do pacote 4

- Hook `useFinanceiroLancamentos` criado para concentrar escopo por perfil, listagem por periodo e mutacoes do financeiro.
- `LancamentosPage` foi migrada para React Query e agora usa invalidador central em vez de recarga manual apos salvar, aprovar, rejeitar ou excluir.
- `FinanceiroPage` passou a consumir o mesmo cache de lancamentos, ganhou estado de erro recuperavel e leitura mobile da listagem.
- Auditoria de roteamento confirmou que as rotas privadas e publicas principais ja estao em `lazy` com `Suspense` global e `PageLoader`.

## Status do pacote 5

- `ReceitaCampoPage` foi migrada para o mesmo cache central do financeiro e deixou de repetir consulta manual ao Supabase.
- Componentes reutilizaveis de skeleton foram criados para o modulo financeiro em `src/components/financeiro/FinanceiroSkeletons.tsx`.
- `FinanceiroPage`, `LancamentosPage` e `ReceitaCampoPage` agora exibem carregamento estruturado em vez de depender apenas de texto simples.

## Status do pacote 6

- Hook `useClassesBiblicas` foi criado para concentrar listagem, detalhe, busca de pessoas e mutacoes do fluxo de classes biblicas.
- `ClassesBiblicasPage` saiu do modelo de consulta manual e passou a usar cache e invalidacao centralizada com React Query.
- O escopo por igreja foi corrigido para perfis de uniao e associacao, permitindo listar e criar classes dentro do territorio permitido.
- A criacao de classe agora suporta selecao de igreja quando o usuario tem acesso a mais de uma lotacao, com toasts e estados de acao mais consistentes.

## Status do pacote 7

- `EscolaBiblicaPage` passou a reutilizar o cache central de classes acessiveis nas abas de turmas e respostas.
- A criacao de turmas dentro da escola biblica agora respeita o escopo por igreja e tambem aceita selecao de igreja para perfis com cobertura ampliada.
- Hook `useClasseBiblicaRespostas` foi criado para revisar respostas com cache, refetch simples e mutacao dedicada.
- A aba de respostas deixou de depender de carga manual por perfil e passou a filtrar apenas turmas ativas ja disponiveis no cache compartilhado.

## Status do pacote 8

- A aba de turmas da `EscolaBiblicaPage` ganhou tratamento de erro recuperavel ao abrir uma turma, com limpeza de estado antes da recarga dos detalhes.
- Os fluxos de matricula, decisao, batismo, aula, diario, interacao e copia de link passaram a expor estados de processamento reais na interface.
- A busca de alunos existentes agora mostra feedback de erro e estado vazio, reduzindo ambiguidade para o professor durante a matricula.
- O bloco legado que restava apos a migracao para mutacoes centralizadas foi reduzido, deixando o fluxo operacional mais previsivel para a proxima rodada de refatoracao.

## Status do pacote 9

- A aba de respostas da `EscolaBiblicaPage` deixou de depender de `prompt` para revisao e ganhou um fluxo inline com comentario persistente por resposta.
- Professores agora conseguem filtrar respostas pendentes e revisadas, com indicadores rapidos de volume para acompanhar a fila de correcao.
- Cada card de resposta passou a expor um painel de revisao expansivel com contexto basico de desempenho e atualizacao de comentario no proprio card.
- A nova revisao usa estado local por item para evitar ambiguidade durante o salvamento e manter a experiencia mais previsivel em turmas com varias respostas.

## Status do pacote 10

- A aba de respostas ganhou busca rapida por aluno, titulo do ponto e numero da licao, acelerando a triagem em turmas maiores.
- Os filtros e a busca agora reiniciam automaticamente quando o professor troca de turma, evitando contexto residual entre revisoes.
- A aba de turmas teve uma rodada adicional de higiene interna, removendo retornos mortos que restavam apos a migracao de mutacoes.

## Status do pacote 11

- O fluxo de registrar batismo na `EscolaBiblicaPage` deixou de depender de `prompt` e agora usa uma confirmacao inline com data explicita no proprio card do aluno.
- A confirmacao de batismo passou a ser mais segura para o professor, com cancelamento visivel e estado de salvamento claro antes de atualizar a secretaria.
- A transicao da aba de respostas foi consolidada em runtime e o bloco legado anterior ficou isolado fora da execucao, reduzindo risco de regressao enquanto a limpeza final do arquivo continua.

## Status do pacote 12

- A aba de respostas da Escola Biblica passou a usar o componente dedicado `RespostasTab`, separando a leitura e a revisao das respostas do arquivo principal da pagina.
- Essa extracao reduz acoplamento dentro da `EscolaBiblicaPage`, prepara o terreno para remover o bloco legado com menos risco e permite carregar a aba somente quando ela for aberta.
- O build de producao foi validado apos a troca, com a `EscolaBiblicaPage` caindo de aproximadamente `67.70 kB` para `58.78 kB` e a nova aba seguindo em chunk proprio (`RespostasTab`, cerca de `9.75 kB`).

## Status do pacote 13

- A implementacao ativa antiga da aba de respostas foi removida da `EscolaBiblicaPage`, deixando a pagina dependente apenas do componente extraido e reduzindo duplicacao de regra de negocio.
- Os imports de hooks e icones associados ao fluxo antigo foram enxugados, o que deixa o arquivo principal mais coerente com a responsabilidade atual.
- O build de producao foi validado novamente apos a limpeza, confirmando que a remocao do codigo executavel legado nao introduziu regressao.

## Status do pacote 14

- A aba de turmas da `EscolaBiblicaPage` passou a consumir `useClasseBiblicaDetail` para alunos e aulas, reduzindo a dependencia do carregamento manual ao abrir uma turma.
- As mutacoes principais dessa aba deixaram de depender de `openTurma` para recarregar dados centrais, aproveitando invalidacao e refetch do React Query onde o cache ja estava preparado.
- Interacoes, diario e pontos disponiveis ganharam estados de erro e recarga mais explicitos, com build de producao validado apos a migracao incremental.

## Status do pacote 15

- `Interacoes` e `diario` da aba de turmas passaram a usar o hook dedicado `useClasseBiblicaTurmaExtras`, consolidando a leitura desses blocos em cache React Query.
- As mutacoes de salvar diario e registrar interacao agora usam hooks proprios, reduzindo chamadas diretas ao Supabase dentro da `EscolaBiblicaPage` e alinhando o fluxo com o restante da sprint.
- O retry da tela passou a reutilizar `refetch` dos hooks de detalhe e extras, com build de producao validado apos a troca.

## Status do pacote 16

- Os pontos disponiveis da turma passaram a usar `useClasseBiblicaPontosDisponiveis`, removendo o efeito manual que consultava `eb_pontos` diretamente dentro da `EscolaBiblicaPage`.
- O cadastro de novo interessado e o registro de batismo agora usam mutacoes dedicadas em `useClassesBiblicas`, reduzindo mais um bloco de escrita direta no Supabase dentro da aba de turmas.
- O build de producao foi validado apos a troca, com a `EscolaBiblicaPage` caindo de aproximadamente `60.51 kB` para `59.37 kB`.

## Status do pacote 17

- A aba de turmas foi extraida para `TurmasTab` e passou a ser carregada via `React.lazy` + `Suspense`, reduzindo o peso do bundle inicial da Escola Biblica.
- A `EscolaBiblicaPage` agora centraliza apenas o header, tabs e o fluxo de conteudo, enquanto turmas e respostas ficam em componentes dedicados.
- O build de producao foi validado apos a separacao, com a `EscolaBiblicaPage` caindo para cerca de `21.21 kB` e o novo chunk de turmas ficando em `38.75 kB`.

## Status do pacote 18

- A aba de conteudo foi extraida para `ConteudoTab` e tambem passou a ser carregada via `React.lazy` + `Suspense`.
- A `EscolaBiblicaPage` ficou apenas com o shell de tabs e controle de permissoes, reduzindo o bundle principal para cerca de `3.51 kB`.
- O build de producao foi validado apos a separacao, com o chunk de conteudo ficando em torno de `18.06 kB`.

## Status do pacote 19

- A listagem de modulos e pontos da Escola Biblica passou a usar hooks com React Query (`useEbModulos` e `useEbPontos`), reduzindo fetch manual e preparando cache.
- A aba de conteudo ganhou estado de erro com botao de retry para carregamento de pontos.

## Status do pacote 20

- As mutacoes da aba de conteudo (criar, salvar e excluir pontos + atualizar modulo) passaram a usar `useMutation` e invalidacao centralizada.
- O fluxo de toasts de erro ficou consistente para falhas de escrita, mantendo o mesmo comportamento visual da tela.

## Status do pacote 21

- A selecao de ponto passou a usar `useEbPonto` com cache, eliminando o fetch manual e adicionando retry dedicado.
- O estado de detalhes ficou sincronizado com o ponto em cache, mantendo o cancelamento de edicao consistente.

## Prioridade 1 - Seguranca e acesso por dominio

- Consolidar uma matriz de permissao por modulo: secretaria, financeiro, missoes, escola biblica, configuracoes.
- Separar o app privado por grupos de rotas e garantir guardas consistentes por papel e escopo organizacional.
- Revisar se toda permissao importante esta no backend e nao apenas no frontend.
- Versionar localmente qualquer edge function que esteja ativa em producao e ainda nao esteja no repositorio.
- Criar validacao de auditoria para operacoes administrativas sensiveis: reset de senha, troca de perfil, mudanca de lotacao e desativacao de usuario.

## Prioridade 2 - Arquitetura e desempenho

- Expandir o uso de lazy loading para todos os modulos pesados ainda acoplados no bundle inicial.
- Refatorar consultas Supabase recorrentes para hooks baseados em React Query com cache, retry e invalidador central.
- Reduzir paginas monoliticas por dominio, movendo componentes e regras para pastas por feature.
- Padronizar carregamento com `PageLoader`, estados vazios e erros recuperaveis.
- Mapear e remover codigo morto ou legado que ainda conflita com a arquitetura atual.

## Prioridade 3 - UX e responsividade

- Auditar tabelas densas da secretaria e financeiro e substituir a visao mobile por cards responsivos.
- Padronizar toasts de sucesso, erro e loading para todas as mutacoes.
- Introduzir skeletons nas dashboards e listagens principais.
- Refinar o formulario publico e a escola biblica para uma experiencia mais proxima de Typeform, mantendo acessibilidade e protecao de dados.
- Melhorar clareza visual de estados de permissao negada, sessao expirada e formularios incompletos.

## Prioridade 4 - Operacao e observabilidade

- Criar um inventario de variaveis de ambiente por camada: frontend, Supabase secrets, deploy host.
- Registrar runbook de deploy, rollback e recuperacao rapida.
- Padronizar scripts seguros para manutencao do banco sem credenciais fixas no repositorio.
- Criar checklist minimo de QA para cada deploy em producao.
- Definir uma rotina de revisao de logs e erros das edge functions.

## Riscos atuais que a sprint precisa resolver

- Functions rodando em producao sem espelho completo no repositorio.
- Crescimento do bundle privado conforme novos modulos entram no app principal.
- Permissoes de acesso potencialmente distribuidas entre componentes, contexto e banco sem uma matriz unica.
- Superficie administrativa crescendo sem trilha formal de auditoria.
- Experiencia mobile inconsistente em paginas com tabelas, filtros e acoes em massa.

## Entregaveis sugeridos

- Documento de matriz de acesso por modulo e por papel.
- Pacote de refatoracao de rotas privadas por dominio.
- Hooks React Query para dashboards e listagens criticas.
- Componentes mobile-first para tabelas da secretaria e financeiro.
- Export e versionamento das functions remotas faltantes.
- Dashboard simples de saude operacional com links para logs, functions e ambiente.

## Criterios de aceite

- Usuario so visualiza modulos compativeis com seu papel e sua lotacao.
- Nenhuma tela critica depende de `Carregando...` simples sem estado visual estruturado.
- Rotas privadas principais carregam com code splitting e fallback padronizado.
- Fluxos publicos seguem acessiveis sem login, mas protegidos contra abuso automatizado.
- Toda function ativa em producao esta documentada e versionada.
- Existe runbook suficiente para outra pessoa da equipe repetir deploy e validacao sem dependencia oral.

## Ordem recomendada

1. Exportar e versionar functions ativas em producao que ainda estao fora do repositorio.
2. Fechar a matriz de acesso e revisar guardas por modulo.
3. Atacar performance das rotas privadas com React Query e code splitting restante.
4. Refatorar UI mobile das tabelas e feedback de mutacoes.
5. Formalizar observabilidade, runbook e checklist continuo de deploy.

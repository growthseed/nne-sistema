# Sprint 2 - Estabilizacao, Performance e Governanca

Estado de referencia: 12/04/2026

## Meta da sprint

Sair do hardening inicial e entrar em uma fase de estabilizacao sustentavel, com foco em segmentacao real por modulo, performance em rotas privadas, experiencia mobile e governanca tecnica do backend.

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

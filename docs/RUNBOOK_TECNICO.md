# Runbook Tecnico e Operacional

Estado de referencia: 12/04/2026

## Visao geral

O NNE Sistema usa frontend React + Vite + TypeScript com backend Supabase. O estado atual ja inclui endurecimento do cadastro publico, segmentacao inicial de rotas privadas, edge functions para captcha e submissao publica, e um fluxo administrativo de usuario mais robusto.

## Componentes principais

- Frontend: React 18, Vite, TypeScript, Tailwind CSS.
- Roteamento: React Router com divisao entre rotas publicas e privadas.
- Dados: Supabase Database com RLS.
- Auth: Supabase Auth.
- Server state: React Query nas consultas ja refatoradas.
- Edge functions em producao: `verify-turnstile`, `save-public-cadastro`, `admin-manage-user-nne`, `admin-manage-user`.
- Function neutralizada por seguranca: `run-sql-temp`.

## Estado conhecido do deploy

- Migrations executadas e sincronizadas no banco.
- Turnstile habilitado com fallback de chave no fluxo publico.
- Pagina de editar usuario entregue com rota `/configuracoes/usuario/:id`.
- Auto-cadastro do portal desligado por ambiente.
- Ambiente local e ambiente de deploy ja receberam as variaveis essenciais.

## Variaveis de ambiente do frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_NAME`
- `VITE_APP_VERSION`
- `VITE_MVP_ONLY`
- `VITE_TURNSTILE_SITE_KEY`
- `VITE_PORTAL_SELF_SIGNUP_ENABLED`

## Secrets esperados no Supabase

- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY`

## Migrations relevantes para seguranca e portal

- `20260401000001_recreate_perfis_aluno.sql`
- `20260410000010_security_helpers.sql`
- `20260410000011_harden_cadastro_publico.sql`
- `20260410000012_harden_escola_biblica_rls.sql`
- `20260410_usuarios_profile_fields.sql`

## Funcoes e responsabilidade

- `verify-turnstile`: valida o token do captcha antes da submissao final.
- `save-public-cadastro`: salva rascunho e envio final do cadastro publico.
- `admin-manage-user-nne`: operacoes administrativas de usuario no fluxo NNE.
- `admin-manage-user`: funcao administrativa legada ou complementar ainda ativa em producao.
- `run-sql-temp`: deve permanecer bloqueada, despublicada ou sem uso operacional.

## Lacunas tecnicas conhecidas

- As functions conhecidas do pacote atual estao versionadas localmente, mas ainda vale confirmar se nao existem remotas extras fora do repositorio.
- Existe worktree ativo e heterogeneo, entao mudancas futuras devem respeitar arquivos locais ja alterados.
- O projeto ainda precisa consolidar uma matriz formal de acesso por modulo e papel.

## Ordem segura de deploy

1. Conferir branch, diff e ambiente local.
2. Rodar `npm run build`.
3. Validar variaveis `.env` locais e variaveis do host.
4. Aplicar migrations no projeto Supabase correto.
5. Publicar ou atualizar secrets do Supabase.
6. Fazer deploy das edge functions impactadas.
7. Fazer deploy do frontend.
8. Executar o checklist de QA pos-deploy.

## Comandos de referencia

```powershell
npm run build
npx supabase link --project-ref prqxiqykkijzpwdpqujv
npx supabase migration list --linked
npx supabase db push --linked
npx supabase secrets set --project-ref prqxiqykkijzpwdpqujv SUPABASE_SERVICE_ROLE_KEY="***" TURNSTILE_SECRET_KEY="***"
npx supabase functions deploy verify-turnstile --project-ref prqxiqykkijzpwdpqujv --no-verify-jwt
npx supabase functions deploy save-public-cadastro --project-ref prqxiqykkijzpwdpqujv --no-verify-jwt
npx supabase functions deploy admin-manage-user-nne --project-ref prqxiqykkijzpwdpqujv
npx supabase functions deploy admin-manage-user --project-ref prqxiqykkijzpwdpqujv
# Se a function ainda existir remotamente, publique a versao neutralizada para bloquear reativacao acidental.
npx supabase functions deploy run-sql-temp --project-ref prqxiqykkijzpwdpqujv
npx supabase functions list --project-ref prqxiqykkijzpwdpqujv
```

## Checklist de rollback

- Reverter o deploy do frontend para o ultimo build estavel.
- Restaurar variaveis de ambiente alteradas na ultima janela de deploy.
- Despublicar ou reverter function que introduziu erro.
- Avaliar se alguma migration precisa de script corretivo ao inves de rollback bruto.
- Reexecutar smoke tests minimos em login, cadastro publico e administracao.

## Operacao diaria recomendada

- Monitorar logs das edge functions com foco em captcha, insert e erro de permissao.
- Revisar periodicamente politicas RLS das tabelas sensiveis.
- Evitar scripts com credenciais fixas ou SQL arbitrario exposto.
- Registrar qualquer mudanca manual feita no painel do Supabase para posterior versionamento.
- Manter um usuario administrador controlado para contingencia operacional.

## Proxima acao tecnica recomendada

Comparar o estado remoto do Supabase com a pasta local `supabase/functions` para validar se as cinco functions conhecidas estao em paridade operacional, incluindo secrets, configuracao e comportamento esperado.

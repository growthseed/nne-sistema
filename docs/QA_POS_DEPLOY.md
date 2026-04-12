# QA Pos-Deploy

Estado de referencia: 12/04/2026

## Objetivo

Este checklist valida o pacote ja aplicado no NNE Sistema apos as entregas de seguranca, edge functions, endurecimento de RLS, ajustes de acesso e consolidacao do fluxo publico de cadastro.

## Escopo validado

- Migrations aplicadas no banco via cliente PostgreSQL.
- Edge functions em operacao para captcha, cadastro publico e administracao de usuarios.
- Cadastro publico com Turnstile e submissao protegida.
- Portal da Escola Biblica com auto-cadastro desabilitado por variavel de ambiente.
- Tela administrativa de usuario disponivel em `/configuracoes/usuario/:id`.
- Controle de acesso por perfil e carga sob demanda das rotas principais.

## Checklist de ambiente

- Confirmar que o frontend esta apontando para o projeto Supabase correto `prqxiqykkijzpwdpqujv`.
- Confirmar que `VITE_TURNSTILE_SITE_KEY` esta definido no ambiente local e no host de producao.
- Confirmar que `VITE_PORTAL_SELF_SIGNUP_ENABLED=false` esta definido no ambiente local e no host de producao.
- Confirmar que os secrets `SUPABASE_SERVICE_ROLE_KEY` e `TURNSTILE_SECRET_KEY` existem no projeto Supabase.
- Confirmar que as functions publicadas em producao respondem sem erro: `verify-turnstile`, `save-public-cadastro`, `admin-manage-user-nne`, `admin-manage-user`.
- Confirmar que a function legada `run-sql-temp` permanece neutralizada e nao exposta para uso operacional.

## Smoke test do frontend

- Abrir a home publica e validar carregamento sem erro no console.
- Navegar para o formulario publico e confirmar que o layout continua publico e acessivel sem login.
- Preencher o cadastro em fluxo completo ate o ultimo passo.
- Validar que o rascunho do cadastro persiste entre etapas sem perder dados.
- Confirmar que o Turnstile aparece no passo final e bloqueia envio sem validacao.
- Concluir o envio e verificar mensagem de sucesso sem duplicidade de submissao.
- Repetir o teste em viewport mobile para confirmar legibilidade e fluxo linear estilo formulario guiado.

## Smoke test do portal e autenticacao

- Validar login com aluno existente no portal.
- Validar recuperacao de senha e recebimento do fluxo de redefinicao.
- Confirmar que o botao ou fluxo de auto-cadastro do portal fica oculto ou bloqueado quando `VITE_PORTAL_SELF_SIGNUP_ENABLED=false`.
- Validar que o dashboard do portal carrega indicadores sem quebrar quando o usuario possui matriculas ativas.
- Validar logout e retorno para tela publica sem vazamento de sessao.

## Smoke test administrativo

- Acessar com usuario administrador da uniao.
- Abrir a rota `/configuracoes/usuario/:id` para um usuario existente.
- Confirmar carregamento das 4 abas da tela de edicao de usuario.
- Alterar campos de perfil e salvar.
- Alterar papeis ou vinculacoes organizacionais e salvar.
- Redefinir senha de um usuario de teste via fluxo administrativo.
- Confirmar que usuario sem permissao administrativa nao acessa essa rota diretamente.

## Seguranca e RLS

- Validar que tabelas do cadastro publico aceitam apenas os campos esperados para insercao publica.
- Validar que leituras sensiveis continuam protegidas por `auth.uid()` e por verificacao de papel.
- Testar acesso cruzado: usuario de igreja nao deve visualizar registros de outra organizacao sem permissao superior.
- Testar usuario autenticado comum tentando acessar dados administrativos via chamada direta ao Supabase.
- Revisar logs de erro nas edge functions apos os primeiros envios reais.
- Revisar no painel do Supabase se nao ha politica permissiva residual com `using (true)` ou `with check (true)` em tabelas sensiveis.

## Observabilidade operacional

- Conferir logs de `verify-turnstile` para tokens invalidos, timeout ou falha de secret.
- Conferir logs de `save-public-cadastro` para falhas de insert, colisoes de draft e payload invalido.
- Conferir volume de erros de autenticacao no portal nas primeiras 24 horas.
- Conferir se houve regressao de performance no primeiro carregamento das areas privadas apos code splitting.

## Cenarios de regressao que merecem atencao

- Cadastro publico salvando rascunho mas falhando no envio final.
- Usuario aluno acessando area administrativa por rota direta.
- Admin alterando usuario sem refletir permissao em nova sessao.
- Portal com auto-cadastro reativado por ambiente divergente.
- Function remota existente em producao, mas sem codigo versionado localmente.

## Evidencias a registrar

- Screenshot do Turnstile validado no passo final.
- Screenshot da tela `/configuracoes/usuario/:id`.
- Export dos logs de erro e sucesso das functions nas primeiras validacoes.
- Lista de politicas RLS revisadas nas tabelas do cadastro publico, portal e usuarios.
- Nome do ambiente validado, data e responsavel pelo teste.

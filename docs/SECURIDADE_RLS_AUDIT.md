# Auditoria RLS (Supabase)

Data: 2026-04-13

## Escopo
Revisao baseada em migracoes presentes no repositorio. Esta auditoria nao valida o estado real do banco em producao.
Conferir manualmente o schema no Supabase antes do deploy.

## Tabelas sensiveis (mapa por dominio)

### Secretaria / Cadastros
- usuarios
- pessoas
- familias
- transferencias
- dados_financeiros
- classes_es
- presenca_es
- classes_batismais
- relatorios_missionarios
- contagem_mensal
- cadastro_respostas
- planos_visita
- receita_campo

### Escola Biblica
- classes_biblicas
- classe_biblica_alunos
- classe_biblica_presenca
- classe_biblica_aulas
- classe_biblica_aula_presenca
- classe_biblica_liberacoes
- classe_biblica_respostas
- classe_biblica_resumos
- eb_modulos
- eb_pontos
- eb_liberacoes
- eb_progresso_pessoal
- eb_perfis_aluno
- eb_nps

### Missoes
- missionarios
- metas_missionario
- atividades_missionario
- avaliacoes_missionario
- historico_missionario
- relatorio_missionario_diario
- missionario_parametros
- missionario_igrejas
- missionario_snapshots
- google_calendar_tokens

### Configuracoes
- configuracoes
- documento_templates
- igreja_oficiais

### Gamificacao
- student_gamification
- teacher_gamification
- user_badges
- xp_transactions
- gamification_actions
- gamification_levels
- badges
- streak_logs

## Evidencias de RLS em migracoes

### supabase-migration.sql (baseline)
- Ativacao de RLS em: unioes, associacoes, igrejas, usuarios, pessoas, familias, transferencias, dados_financeiros, classes_es, presenca_es, classes_batismais, relatorios_missionarios, contagem_mensal, cadastro_respostas, planos_visita, receita_campo.
- Politicas de SELECT/ALL para os grupos acima, incluindo:
  - `usuarios_self`, `usuarios_select`, `usuarios_admin`
  - `pessoas_select`, `pessoas_manage`
  - `dados_financeiros` (select + manage)
  - `cadastro_respostas` (select, insert anon, manage auth)
  - `storage.objects` (fotos_upload/read/public_read/delete)

### supabase/migrations
- 20260315120000_fix_cadastro_rls_complete.sql (cadastro_respostas: anon + auth)
- 20260325000001_escola_biblica_content.sql (eb_modulos, eb_pontos, eb_liberacoes, classe_biblica_respostas, eb_progresso_pessoal)
- 20260325000002_nps_student_portal.sql (eb_nps)
- 20260326000001_gamification.sql (gamificacao completa)
- 20260401000001_recreate_perfis_aluno.sql (eb_perfis_aluno)
- 20260410000011_harden_cadastro_publico.sql (cadastro_respostas endurecido)
- 20260410000012_harden_escola_biblica_rls.sql (escola biblica endurecida)

### supabase-migrations
- 004_missionary_management.sql (missoes)
- 005_missionario_expansion.sql (historico_missionario)
- 007_missionario_campo.sql (missionario_igrejas, missionario_snapshots)
- 012_expand_igrejas_and_relatorio_diario.sql (relatorio_diario, missionario_parametros, igreja_oficiais)
- 016_configuracoes_cargo_labels.sql (configuracoes)
- 019_documento_templates.sql (documento_templates)
- 020_fix_dados_financeiros_upsert.sql (dados_financeiros)
- 027_pipeline_interessados.sql (classes_biblicas + relacionados)
- 028_classe_batismal_alunos.sql (classe_batismal_alunos + presenca)
- 029_escola_biblica_completa.sql (classe_biblica_aulas/presenca/liberacoes/respostas/resumos)

## Pendencias de verificacao (manual no Supabase)
1. Confirmar que as politicas do banco atual correspondem a ultima migracao aplicada.
2. Validar se politicas de ALL para service_role existem apenas onde necessario.
3. Checar tabelas que surgiram apos a ultima migracao (se houver).
4. Confirmar RLS ativado em tabelas novas de sessoes especificas.

## Recomendacoes imediatas
- Revisar se tabelas de financeiramente sensiveis (dados_financeiros, transferencias, receita_campo) restringem por igreja/associacao.
- Garantir que cadastro_respostas so aceite insert anon com limites (captcha e rate-limit via edge).
- Garantir que acessos por papel usem `auth.uid()` com scope correto.

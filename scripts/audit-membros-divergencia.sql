-- =============================================
-- Auditoria de divergência: igrejas.membros_ativos (Inventário) vs pessoas
--
-- Sintoma reportado: ARAM aparece com 2.750 membros no Censo (que lê
-- igrejas.membros_ativos) e com 3.005 no Painel Geral (que provavelmente
-- conta linhas em pessoas). Diferença = 255 → suspeita de duplicatas em
-- pessoas (mesmo nome importado mais de uma vez, ou status incorreto).
--
-- Rodar este script no SQL editor do Supabase. Tudo é SELECT — não muta nada.
-- =============================================

-- ─── 1. RESUMO POR ASSOCIAÇÃO ─────────────────────────────────────────────
-- Compara dois agregados: soma do inventário vs contagem de pessoas ativas.
-- Diferença positiva = pessoas tem mais linhas que o inventário declara
--                      (provável duplicatas)
-- Diferença negativa = pessoas tem menos (inventário foi atualizado mas
--                      cadastros ainda não foram digitados)
SELECT
  a.sigla,
  a.nome AS associacao,
  COUNT(DISTINCT i.id)                                                                 AS total_igrejas,
  COALESCE(SUM(i.membros_ativos), 0)                                                   AS membros_inventario,
  (
    SELECT COUNT(*) FROM public.pessoas p
    WHERE p.associacao_id = a.id
      AND p.tipo = 'membro'
      AND p.situacao = 'ativo'
  )                                                                                    AS pessoas_ativas,
  (
    SELECT COUNT(*) FROM public.pessoas p
    WHERE p.associacao_id = a.id
      AND p.tipo = 'membro'
      AND p.situacao = 'ativo'
  ) - COALESCE(SUM(i.membros_ativos), 0)                                               AS diferenca
FROM public.associacoes a
LEFT JOIN public.igrejas i ON i.associacao_id = a.id AND i.ativo = true
GROUP BY a.id, a.sigla, a.nome
ORDER BY ABS(
  (
    SELECT COUNT(*) FROM public.pessoas p
    WHERE p.associacao_id = a.id AND p.tipo = 'membro' AND p.situacao = 'ativo'
  ) - COALESCE(SUM(i.membros_ativos), 0)
) DESC;


-- ─── 2. DETALHAMENTO POR IGREJA — só ARAM ─────────────────────────────────
-- Substitua a sigla 'ARAM' se quiser auditar outra associação.
SELECT
  i.nome                                                          AS igreja,
  i.endereco_cidade                                               AS cidade,
  i.endereco_estado                                               AS uf,
  i.membros_ativos                                                AS inventario,
  COUNT(p.id) FILTER (WHERE p.tipo = 'membro' AND p.situacao = 'ativo') AS pessoas_ativos,
  COUNT(p.id) FILTER (WHERE p.tipo = 'membro' AND p.situacao = 'ativo')
    - COALESCE(i.membros_ativos, 0)                               AS diferenca
FROM public.igrejas i
LEFT JOIN public.pessoas p ON p.igreja_id = i.id
WHERE i.associacao_id = (SELECT id FROM public.associacoes WHERE sigla = 'ARAM')
GROUP BY i.id, i.nome, i.endereco_cidade, i.endereco_estado, i.membros_ativos
ORDER BY ABS(COUNT(p.id) FILTER (WHERE p.tipo = 'membro' AND p.situacao = 'ativo') - COALESCE(i.membros_ativos, 0)) DESC;


-- ─── 3. DUPLICATAS PROVÁVEIS EM PESSOAS ───────────────────────────────────
-- Mesmo nome (normalizado) + mesma data_nascimento, na mesma associação.
-- Se aparecer com count > 1, é a fonte da inflação.
SELECT
  LOWER(extensions.unaccent(TRIM(p.nome)))   AS nome_norm,
  p.data_nascimento,
  a.sigla                                     AS associacao,
  COUNT(*)                                    AS qtd,
  ARRAY_AGG(p.id::text)                       AS ids,
  ARRAY_AGG(DISTINCT i.nome)                  AS igrejas,
  ARRAY_AGG(DISTINCT p.situacao)              AS situacoes
FROM public.pessoas p
LEFT JOIN public.igrejas i      ON p.igreja_id = i.id
LEFT JOIN public.associacoes a  ON p.associacao_id = a.id
WHERE p.tipo = 'membro'
  AND p.nome IS NOT NULL
GROUP BY LOWER(extensions.unaccent(TRIM(p.nome))), p.data_nascimento, a.sigla
HAVING COUNT(*) > 1
ORDER BY qtd DESC, nome_norm
LIMIT 200;


-- ─── 4. PESSOAS SEM IGREJA / SEM ASSOCIAÇÃO ───────────────────────────────
-- Registros órfãos que entram em totais globais mas não têm hierarquia clara.
SELECT
  COUNT(*) FILTER (WHERE igreja_id IS NULL)                       AS sem_igreja,
  COUNT(*) FILTER (WHERE associacao_id IS NULL)                   AS sem_associacao,
  COUNT(*) FILTER (WHERE uniao_id IS NULL)                        AS sem_uniao,
  COUNT(*) FILTER (WHERE igreja_id IS NULL AND associacao_id IS NULL) AS sem_nada
FROM public.pessoas
WHERE tipo = 'membro' AND situacao = 'ativo';


-- ─── 5. CADASTROS DO CENSO SEM ESCOPO ─────────────────────────────────────
-- Antes de aplicar a Fase 2 (trigger de inferência), conta quantas respostas
-- estão "órfãs" para admin_uniao/admin_associacao.
SELECT
  COUNT(*) FILTER (WHERE associacao_id IS NULL)                                AS sem_associacao,
  COUNT(*) FILTER (WHERE uniao_id IS NULL)                                     AS sem_uniao,
  COUNT(*) FILTER (WHERE associacao_id IS NULL AND cidade IS NOT NULL
                        AND estado IS NOT NULL)                                AS sem_assoc_mas_tem_cidade,
  COUNT(*) FILTER (WHERE associacao_id IS NOT NULL AND uniao_id IS NULL)       AS assoc_sem_uniao,
  COUNT(*)                                                                      AS total
FROM public.cadastro_respostas;


-- ─── 6. CONFERÊNCIA: respostas por associação para admin União vs Admin Assoc.
-- Útil para entender porque Heber/Tito (admin_uniao) veem N e o admin local vê M.
SELECT
  a.sigla,
  a.nome,
  COUNT(*) FILTER (WHERE r.associacao_id = a.id)                                AS por_associacao_id,
  COUNT(*) FILTER (WHERE r.uniao_id = a.uniao_id AND r.associacao_id = a.id)    AS por_uniao_e_assoc,
  COUNT(*) FILTER (WHERE r.uniao_id = a.uniao_id AND r.associacao_id IS NULL)   AS na_uniao_mas_sem_assoc
FROM public.associacoes a
CROSS JOIN public.cadastro_respostas r
GROUP BY a.id, a.sigla, a.nome, a.uniao_id
ORDER BY a.sigla;

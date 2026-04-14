-- =============================================
-- Harden Escola Bíblica and pipeline RLS
-- Replace app-layer-only policies with scope-aware database rules.
-- =============================================

ALTER TABLE public.classes_biblicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_aniversario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acompanhamento_novo_membro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pequenos_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pequeno_grupo_encontros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_batismo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_aula_presenca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_liberacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classe_biblica_resumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eb_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eb_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eb_liberacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eb_progresso_pessoal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read" ON public.classes_biblicas;
DROP POLICY IF EXISTS "authenticated_write" ON public.classes_biblicas;
DROP POLICY IF EXISTS "authenticated_update" ON public.classes_biblicas;

DROP POLICY IF EXISTS "authenticated_read" ON public.classe_biblica_alunos;
DROP POLICY IF EXISTS "authenticated_write" ON public.classe_biblica_alunos;
DROP POLICY IF EXISTS "authenticated_update" ON public.classe_biblica_alunos;

DROP POLICY IF EXISTS "authenticated_read" ON public.classe_biblica_presenca;
DROP POLICY IF EXISTS "authenticated_write" ON public.classe_biblica_presenca;
DROP POLICY IF EXISTS "authenticated_update" ON public.classe_biblica_presenca;

DROP POLICY IF EXISTS "authenticated_read" ON public.interacoes;
DROP POLICY IF EXISTS "authenticated_write" ON public.interacoes;
DROP POLICY IF EXISTS "authenticated_update" ON public.interacoes;

DROP POLICY IF EXISTS "authenticated_read" ON public.notificacoes_aniversario;
DROP POLICY IF EXISTS "authenticated_write" ON public.notificacoes_aniversario;
DROP POLICY IF EXISTS "authenticated_update" ON public.notificacoes_aniversario;

DROP POLICY IF EXISTS "authenticated_read" ON public.acompanhamento_novo_membro;
DROP POLICY IF EXISTS "authenticated_write" ON public.acompanhamento_novo_membro;
DROP POLICY IF EXISTS "authenticated_update" ON public.acompanhamento_novo_membro;

DROP POLICY IF EXISTS "authenticated_read" ON public.pequenos_grupos;
DROP POLICY IF EXISTS "authenticated_write" ON public.pequenos_grupos;
DROP POLICY IF EXISTS "authenticated_update" ON public.pequenos_grupos;

DROP POLICY IF EXISTS "authenticated_read" ON public.pequeno_grupo_encontros;
DROP POLICY IF EXISTS "authenticated_write" ON public.pequeno_grupo_encontros;
DROP POLICY IF EXISTS "authenticated_update" ON public.pequeno_grupo_encontros;

DROP POLICY IF EXISTS "authenticated_read" ON public.metas_batismo;
DROP POLICY IF EXISTS "authenticated_write" ON public.metas_batismo;
DROP POLICY IF EXISTS "authenticated_update" ON public.metas_batismo;

DROP POLICY IF EXISTS "authenticated_read" ON public.classe_biblica_aulas;
DROP POLICY IF EXISTS "authenticated_write" ON public.classe_biblica_aulas;
DROP POLICY IF EXISTS "authenticated_update" ON public.classe_biblica_aulas;
DROP POLICY IF EXISTS "authenticated_delete" ON public.classe_biblica_aulas;

DROP POLICY IF EXISTS "authenticated_read" ON public.classe_biblica_aula_presenca;
DROP POLICY IF EXISTS "authenticated_write" ON public.classe_biblica_aula_presenca;
DROP POLICY IF EXISTS "authenticated_update" ON public.classe_biblica_aula_presenca;
DROP POLICY IF EXISTS "authenticated_delete" ON public.classe_biblica_aula_presenca;

DROP POLICY IF EXISTS "authenticated_read" ON public.classe_biblica_liberacoes;
DROP POLICY IF EXISTS "authenticated_write" ON public.classe_biblica_liberacoes;
DROP POLICY IF EXISTS "authenticated_delete" ON public.classe_biblica_liberacoes;

DROP POLICY IF EXISTS "authenticated_read" ON public.classe_biblica_respostas;
DROP POLICY IF EXISTS "authenticated_write" ON public.classe_biblica_respostas;
DROP POLICY IF EXISTS "authenticated_update" ON public.classe_biblica_respostas;
DROP POLICY IF EXISTS "authenticated_delete" ON public.classe_biblica_respostas;
DROP POLICY IF EXISTS "cb_respostas_all" ON public.classe_biblica_respostas;

DROP POLICY IF EXISTS "authenticated_read" ON public.classe_biblica_resumos;
DROP POLICY IF EXISTS "authenticated_write" ON public.classe_biblica_resumos;
DROP POLICY IF EXISTS "authenticated_update" ON public.classe_biblica_resumos;
DROP POLICY IF EXISTS "authenticated_delete" ON public.classe_biblica_resumos;

DROP POLICY IF EXISTS "eb_modulos_read" ON public.eb_modulos;
DROP POLICY IF EXISTS "eb_modulos_write" ON public.eb_modulos;
DROP POLICY IF EXISTS "eb_pontos_read" ON public.eb_pontos;
DROP POLICY IF EXISTS "eb_pontos_write" ON public.eb_pontos;
DROP POLICY IF EXISTS "eb_liberacoes_all" ON public.eb_liberacoes;
DROP POLICY IF EXISTS "eb_progresso_all" ON public.eb_progresso_pessoal;

CREATE POLICY "classes_biblicas_select_secure"
ON public.classes_biblicas
FOR SELECT
TO authenticated
USING (
  public.can_access_classe_biblica_secure(id)
);

CREATE POLICY "classes_biblicas_insert_secure"
ON public.classes_biblicas
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_scope_secure(uniao_id, associacao_id, igreja_id, instrutor_id)
);

CREATE POLICY "classes_biblicas_update_secure"
ON public.classes_biblicas
FOR UPDATE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(id)
)
WITH CHECK (
  public.can_manage_scope_secure(uniao_id, associacao_id, igreja_id, instrutor_id)
);

CREATE POLICY "classes_biblicas_delete_secure"
ON public.classes_biblicas
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(id)
);

CREATE POLICY "classe_biblica_alunos_select_secure"
ON public.classe_biblica_alunos
FOR SELECT
TO authenticated
USING (
  public.can_access_classe_biblica_aluno_secure(id)
);

CREATE POLICY "classe_biblica_alunos_insert_secure"
ON public.classe_biblica_alunos
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_alunos_update_secure"
ON public.classe_biblica_alunos
FOR UPDATE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
)
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_alunos_delete_secure"
ON public.classe_biblica_alunos
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_presenca_select_secure"
ON public.classe_biblica_presenca
FOR SELECT
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_presenca_insert_secure"
ON public.classe_biblica_presenca
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_presenca_update_secure"
ON public.classe_biblica_presenca
FOR UPDATE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
)
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_presenca_delete_secure"
ON public.classe_biblica_presenca
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "interacoes_select_secure"
ON public.interacoes
FOR SELECT
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "interacoes_insert_secure"
ON public.interacoes
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "interacoes_update_secure"
ON public.interacoes
FOR UPDATE
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
)
WITH CHECK (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "interacoes_delete_secure"
ON public.interacoes
FOR DELETE
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "notificacoes_aniversario_select_secure"
ON public.notificacoes_aniversario
FOR SELECT
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "notificacoes_aniversario_insert_secure"
ON public.notificacoes_aniversario
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "notificacoes_aniversario_update_secure"
ON public.notificacoes_aniversario
FOR UPDATE
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
)
WITH CHECK (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "notificacoes_aniversario_delete_secure"
ON public.notificacoes_aniversario
FOR DELETE
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "acompanhamento_novo_membro_select_secure"
ON public.acompanhamento_novo_membro
FOR SELECT
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "acompanhamento_novo_membro_insert_secure"
ON public.acompanhamento_novo_membro
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "acompanhamento_novo_membro_update_secure"
ON public.acompanhamento_novo_membro
FOR UPDATE
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
)
WITH CHECK (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "acompanhamento_novo_membro_delete_secure"
ON public.acompanhamento_novo_membro
FOR DELETE
TO authenticated
USING (
  public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "pequenos_grupos_select_secure"
ON public.pequenos_grupos
FOR SELECT
TO authenticated
USING (
  public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
);

CREATE POLICY "pequenos_grupos_insert_secure"
ON public.pequenos_grupos
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
);

CREATE POLICY "pequenos_grupos_update_secure"
ON public.pequenos_grupos
FOR UPDATE
TO authenticated
USING (
  public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
)
WITH CHECK (
  public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
);

CREATE POLICY "pequenos_grupos_delete_secure"
ON public.pequenos_grupos
FOR DELETE
TO authenticated
USING (
  public.can_manage_scope_secure(NULL, NULL, igreja_id, NULL)
);

CREATE POLICY "pequeno_grupo_encontros_select_secure"
ON public.pequeno_grupo_encontros
FOR SELECT
TO authenticated
USING (
  public.can_manage_pequeno_grupo_secure(grupo_id)
);

CREATE POLICY "pequeno_grupo_encontros_insert_secure"
ON public.pequeno_grupo_encontros
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_pequeno_grupo_secure(grupo_id)
);

CREATE POLICY "pequeno_grupo_encontros_update_secure"
ON public.pequeno_grupo_encontros
FOR UPDATE
TO authenticated
USING (
  public.can_manage_pequeno_grupo_secure(grupo_id)
)
WITH CHECK (
  public.can_manage_pequeno_grupo_secure(grupo_id)
);

CREATE POLICY "pequeno_grupo_encontros_delete_secure"
ON public.pequeno_grupo_encontros
FOR DELETE
TO authenticated
USING (
  public.can_manage_pequeno_grupo_secure(grupo_id)
);

CREATE POLICY "metas_batismo_select_secure"
ON public.metas_batismo
FOR SELECT
TO authenticated
USING (
  public.can_manage_scope_secure(
    COALESCE(
      (SELECT i.uniao_id FROM public.igrejas i WHERE i.id = igreja_id),
      (SELECT a.uniao_id FROM public.associacoes a WHERE a.id = associacao_id)
    ),
    COALESCE(
      (SELECT i.associacao_id FROM public.igrejas i WHERE i.id = igreja_id),
      associacao_id
    ),
    igreja_id,
    NULL
  )
);

CREATE POLICY "metas_batismo_insert_secure"
ON public.metas_batismo
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_scope_secure(
    COALESCE(
      (SELECT i.uniao_id FROM public.igrejas i WHERE i.id = igreja_id),
      (SELECT a.uniao_id FROM public.associacoes a WHERE a.id = associacao_id)
    ),
    COALESCE(
      (SELECT i.associacao_id FROM public.igrejas i WHERE i.id = igreja_id),
      associacao_id
    ),
    igreja_id,
    NULL
  )
);

CREATE POLICY "metas_batismo_update_secure"
ON public.metas_batismo
FOR UPDATE
TO authenticated
USING (
  public.can_manage_scope_secure(
    COALESCE(
      (SELECT i.uniao_id FROM public.igrejas i WHERE i.id = igreja_id),
      (SELECT a.uniao_id FROM public.associacoes a WHERE a.id = associacao_id)
    ),
    COALESCE(
      (SELECT i.associacao_id FROM public.igrejas i WHERE i.id = igreja_id),
      associacao_id
    ),
    igreja_id,
    NULL
  )
)
WITH CHECK (
  public.can_manage_scope_secure(
    COALESCE(
      (SELECT i.uniao_id FROM public.igrejas i WHERE i.id = igreja_id),
      (SELECT a.uniao_id FROM public.associacoes a WHERE a.id = associacao_id)
    ),
    COALESCE(
      (SELECT i.associacao_id FROM public.igrejas i WHERE i.id = igreja_id),
      associacao_id
    ),
    igreja_id,
    NULL
  )
);

CREATE POLICY "metas_batismo_delete_secure"
ON public.metas_batismo
FOR DELETE
TO authenticated
USING (
  public.can_manage_scope_secure(
    COALESCE(
      (SELECT i.uniao_id FROM public.igrejas i WHERE i.id = igreja_id),
      (SELECT a.uniao_id FROM public.associacoes a WHERE a.id = associacao_id)
    ),
    COALESCE(
      (SELECT i.associacao_id FROM public.igrejas i WHERE i.id = igreja_id),
      associacao_id
    ),
    igreja_id,
    NULL
  )
);

CREATE POLICY "classe_biblica_aulas_select_secure"
ON public.classe_biblica_aulas
FOR SELECT
TO authenticated
USING (
  public.can_access_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_aulas_insert_secure"
ON public.classe_biblica_aulas
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_aulas_update_secure"
ON public.classe_biblica_aulas
FOR UPDATE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
)
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_aulas_delete_secure"
ON public.classe_biblica_aulas
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_aula_presenca_select_secure"
ON public.classe_biblica_aula_presenca
FOR SELECT
TO authenticated
USING (
  public.can_manage_classe_biblica_secure((SELECT a.classe_id FROM public.classe_biblica_aulas a WHERE a.id = aula_id))
  OR public.can_access_classe_biblica_aluno_secure(aluno_id)
);

CREATE POLICY "classe_biblica_aula_presenca_insert_secure"
ON public.classe_biblica_aula_presenca
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_classe_biblica_secure((SELECT a.classe_id FROM public.classe_biblica_aulas a WHERE a.id = aula_id))
);

CREATE POLICY "classe_biblica_aula_presenca_update_secure"
ON public.classe_biblica_aula_presenca
FOR UPDATE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure((SELECT a.classe_id FROM public.classe_biblica_aulas a WHERE a.id = aula_id))
)
WITH CHECK (
  public.can_manage_classe_biblica_secure((SELECT a.classe_id FROM public.classe_biblica_aulas a WHERE a.id = aula_id))
);

CREATE POLICY "classe_biblica_aula_presenca_delete_secure"
ON public.classe_biblica_aula_presenca
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure((SELECT a.classe_id FROM public.classe_biblica_aulas a WHERE a.id = aula_id))
);

CREATE POLICY "classe_biblica_liberacoes_select_secure"
ON public.classe_biblica_liberacoes
FOR SELECT
TO authenticated
USING (
  public.can_manage_classe_biblica_secure((SELECT a.classe_id FROM public.classe_biblica_aulas a WHERE a.id = aula_id))
  OR public.can_access_classe_biblica_aluno_secure(aluno_id)
);

CREATE POLICY "classe_biblica_liberacoes_insert_secure"
ON public.classe_biblica_liberacoes
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_classe_biblica_secure((SELECT a.classe_id FROM public.classe_biblica_aulas a WHERE a.id = aula_id))
);

CREATE POLICY "classe_biblica_liberacoes_delete_secure"
ON public.classe_biblica_liberacoes
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure((SELECT a.classe_id FROM public.classe_biblica_aulas a WHERE a.id = aula_id))
);

CREATE POLICY "classe_biblica_respostas_select_secure"
ON public.classe_biblica_respostas
FOR SELECT
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
  OR public.can_access_classe_biblica_aluno_secure(aluno_id)
);

CREATE POLICY "classe_biblica_respostas_insert_secure"
ON public.classe_biblica_respostas
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
  OR public.can_access_classe_biblica_aluno_secure(aluno_id)
);

CREATE POLICY "classe_biblica_respostas_update_secure"
ON public.classe_biblica_respostas
FOR UPDATE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
)
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_respostas_delete_secure"
ON public.classe_biblica_respostas
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_resumos_select_secure"
ON public.classe_biblica_resumos
FOR SELECT
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_resumos_insert_secure"
ON public.classe_biblica_resumos
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_resumos_update_secure"
ON public.classe_biblica_resumos
FOR UPDATE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
)
WITH CHECK (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "classe_biblica_resumos_delete_secure"
ON public.classe_biblica_resumos
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(classe_id)
);

CREATE POLICY "eb_modulos_select_secure"
ON public.eb_modulos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "eb_modulos_write_secure"
ON public.eb_modulos
FOR ALL
TO authenticated
USING (
  public.can_manage_eb_content_secure()
)
WITH CHECK (
  public.can_manage_eb_content_secure()
);

CREATE POLICY "eb_pontos_select_secure"
ON public.eb_pontos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "eb_pontos_write_secure"
ON public.eb_pontos
FOR ALL
TO authenticated
USING (
  public.can_manage_eb_content_secure()
)
WITH CHECK (
  public.can_manage_eb_content_secure()
);

CREATE POLICY "eb_liberacoes_select_secure"
ON public.eb_liberacoes
FOR SELECT
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(turma_id)
  OR public.can_access_classe_biblica_aluno_secure(aluno_id)
);

CREATE POLICY "eb_liberacoes_insert_secure"
ON public.eb_liberacoes
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_classe_biblica_secure(turma_id)
);

CREATE POLICY "eb_liberacoes_update_secure"
ON public.eb_liberacoes
FOR UPDATE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(turma_id)
)
WITH CHECK (
  public.can_manage_classe_biblica_secure(turma_id)
);

CREATE POLICY "eb_liberacoes_delete_secure"
ON public.eb_liberacoes
FOR DELETE
TO authenticated
USING (
  public.can_manage_classe_biblica_secure(turma_id)
);

CREATE POLICY "eb_progresso_pessoal_select_secure"
ON public.eb_progresso_pessoal
FOR SELECT
TO authenticated
USING (
  pessoa_id = public.current_pessoa_id_secure()
  OR public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "eb_progresso_pessoal_insert_secure"
ON public.eb_progresso_pessoal
FOR INSERT
TO authenticated
WITH CHECK (
  pessoa_id = public.current_pessoa_id_secure()
  OR public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "eb_progresso_pessoal_update_secure"
ON public.eb_progresso_pessoal
FOR UPDATE
TO authenticated
USING (
  pessoa_id = public.current_pessoa_id_secure()
  OR public.can_access_pessoa_secure(pessoa_id)
)
WITH CHECK (
  pessoa_id = public.current_pessoa_id_secure()
  OR public.can_access_pessoa_secure(pessoa_id)
);

CREATE POLICY "eb_progresso_pessoal_delete_secure"
ON public.eb_progresso_pessoal
FOR DELETE
TO authenticated
USING (
  pessoa_id = public.current_pessoa_id_secure()
  OR public.can_access_pessoa_secure(pessoa_id)
);

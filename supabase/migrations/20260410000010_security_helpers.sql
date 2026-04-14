-- =============================================
-- Security Helpers
-- Shared helper functions used by hardened RLS policies
-- =============================================

CREATE OR REPLACE FUNCTION public.current_user_role_secure()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.papel::text
  FROM public.usuarios u
  WHERE u.id = auth.uid()
    AND COALESCE(u.ativo, true)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_uniao_id_secure()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.uniao_id
  FROM public.usuarios u
  WHERE u.id = auth.uid()
    AND COALESCE(u.ativo, true)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_associacao_id_secure()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.associacao_id
  FROM public.usuarios u
  WHERE u.id = auth.uid()
    AND COALESCE(u.ativo, true)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_igreja_id_secure()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.igreja_id
  FROM public.usuarios u
  WHERE u.id = auth.uid()
    AND COALESCE(u.ativo, true)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_auth_email_secure()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(COALESCE(auth.jwt() ->> 'email', ''));
$$;

CREATE OR REPLACE FUNCTION public.current_pessoa_id_secure()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.pessoas p
  WHERE lower(COALESCE(p.email, '')) = public.current_auth_email_secure()
  ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_scope_secure(
  p_uniao_id uuid,
  p_associacao_id uuid,
  p_igreja_id uuid,
  p_instrutor_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT
      auth.uid() AS user_id,
      public.current_user_role_secure() AS papel,
      public.current_user_uniao_id_secure() AS uniao_id,
      public.current_user_associacao_id_secure() AS associacao_id,
      public.current_user_igreja_id_secure() AS igreja_id
  )
  SELECT COALESCE(
    CASE
      WHEN me.user_id IS NULL THEN false
      WHEN me.papel = 'admin' THEN true
      WHEN me.papel = 'admin_uniao' THEN p_uniao_id IS NOT NULL AND me.uniao_id = p_uniao_id
      WHEN me.papel = 'admin_associacao' THEN p_associacao_id IS NOT NULL AND me.associacao_id = p_associacao_id
      WHEN me.papel IN ('secretario_igreja', 'diretor_es', 'secretario_es', 'pastor', 'lider') THEN p_igreja_id IS NOT NULL AND me.igreja_id = p_igreja_id
      WHEN me.papel = 'professor_es' THEN
        (p_instrutor_id IS NOT NULL AND p_instrutor_id = me.user_id)
        OR (p_igreja_id IS NOT NULL AND me.igreja_id = p_igreja_id)
      ELSE false
    END,
    false
  )
  FROM me;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_eb_content_secure()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.current_user_role_secure() IN (
      'admin',
      'admin_uniao',
      'admin_associacao',
      'secretario_igreja',
      'diretor_es',
      'professor_es',
      'secretario_es'
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_pessoa_secure(p_pessoa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pessoas p
    WHERE p.id = p_pessoa_id
      AND public.can_manage_scope_secure(p.uniao_id, p.associacao_id, p.igreja_id, NULL)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_classe_biblica_secure(p_classe_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes_biblicas c
    WHERE c.id = p_classe_id
      AND public.can_manage_scope_secure(c.uniao_id, c.associacao_id, c.igreja_id, c.instrutor_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_classe_biblica_secure(p_classe_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.can_manage_classe_biblica_secure(p_classe_id)
    OR EXISTS (
      SELECT 1
      FROM public.classe_biblica_alunos a
      WHERE a.classe_id = p_classe_id
        AND (
          a.pessoa_id = public.current_pessoa_id_secure()
          OR lower(COALESCE(a.aluno_email, '')) = public.current_auth_email_secure()
        )
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_classe_biblica_aluno_secure(p_aluno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classe_biblica_alunos a
    WHERE a.id = p_aluno_id
      AND (
        public.can_manage_classe_biblica_secure(a.classe_id)
        OR a.pessoa_id = public.current_pessoa_id_secure()
        OR lower(COALESCE(a.aluno_email, '')) = public.current_auth_email_secure()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pequeno_grupo_secure(p_grupo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pequenos_grupos g
    WHERE g.id = p_grupo_id
      AND public.can_manage_scope_secure(NULL, NULL, g.igreja_id, NULL)
  );
$$;

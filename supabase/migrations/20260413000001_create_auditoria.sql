-- =============================================
-- Audit Trail: tabela auditoria
-- =============================================

CREATE TABLE IF NOT EXISTS public.auditoria (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now()             NOT NULL,
  actor_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text        NOT NULL,
  payload    jsonb       DEFAULT '{}'::jsonb
);

-- Índices para consultas comuns
CREATE INDEX IF NOT EXISTS idx_auditoria_actor_id   ON public.auditoria (actor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_action     ON public.auditoria (action);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON public.auditoria (created_at DESC);

-- RLS
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Somente admins podem ler
CREATE POLICY "admin_read_auditoria"
  ON public.auditoria
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid()
        AND papel IN ('admin', 'admin_uniao', 'admin_associacao')
        AND ativo = true
    )
  );

-- Qualquer usuário autenticado pode inserir (o actor_id deve ser o próprio usuário)
CREATE POLICY "authenticated_insert_auditoria"
  ON public.auditoria
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND actor_id = auth.uid()
  );

-- =============================================
-- Marketing / Campanhas — cartões e posts para datas, redes sociais, eventos.
-- Estrutura preparada para:
--   1. Admin upload manual (fonte = 'manual')
--   2. Scraper Playwright importar da Escola da Inteligência ou outras fontes
--      (fonte = 'escola_inteligencia', com origem_externa_id pra dedup)
--   3. Futuro: membros logados ou portal público acessarem (publico = true)
-- =============================================

-- ─── Tipos / Categorias (TEXT com CHECK para evolução fácil) ────────────
-- tipo:
--   aniversario | post_instagram | post_whatsapp | post_facebook |
--   banner_site | flyer_impressao | story | reels | video | outro
-- categoria:
--   geral | escola_sabatina | missoes | jovens | criancas | terceira_idade
--   familia | saude | mulheres | homens | musica | data_civica | aniversario
--   bem_vindo | conviteespecial | outro

CREATE TABLE IF NOT EXISTS public.campanhas_marketing (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                text NOT NULL,
  descricao             text,
  tipo                  text NOT NULL DEFAULT 'outro',
  categoria             text NOT NULL DEFAULT 'geral',
  midia_urls            text[] NOT NULL DEFAULT '{}'::text[],
  thumbnail_url         text,
  texto_legenda         text,                              -- legenda sugerida pro post
  texto_compartilhar    text,                              -- texto para WhatsApp
  hashtags              text[],
  cores                 text[],                            -- paleta de cores hex usadas
  data_referencia       date,                              -- ex: data do aniversário/feriado
  fonte                 text NOT NULL DEFAULT 'manual',    -- manual | escola_inteligencia | canva | outro
  origem_externa_id     text,                              -- id na fonte externa pra dedup
  origem_externa_url    text,                              -- link de onde foi importado
  publico               boolean NOT NULL DEFAULT false,    -- liberado para membros/portal
  destaque              boolean NOT NULL DEFAULT false,    -- aparece em destaque na listagem
  ativo                 boolean NOT NULL DEFAULT true,
  uniao_id              uuid REFERENCES public.unioes(id) ON DELETE SET NULL,
  associacao_id         uuid REFERENCES public.associacoes(id) ON DELETE SET NULL,
  igreja_id             uuid REFERENCES public.igrejas(id) ON DELETE SET NULL,
  criado_por            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_tipo ON public.campanhas_marketing(tipo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_campanhas_categoria ON public.campanhas_marketing(categoria) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_campanhas_publico ON public.campanhas_marketing(publico) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_campanhas_fonte_origem ON public.campanhas_marketing(fonte, origem_externa_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_destaque ON public.campanhas_marketing(destaque) WHERE ativo = true AND destaque = true;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.campanhas_marketing_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campanhas_marketing_touch ON public.campanhas_marketing;
CREATE TRIGGER trg_campanhas_marketing_touch
BEFORE UPDATE ON public.campanhas_marketing
FOR EACH ROW EXECUTE FUNCTION public.campanhas_marketing_touch();

-- ─── RLS ────────────────────────────────────────────────────────────────
ALTER TABLE public.campanhas_marketing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campanhas_service_all" ON public.campanhas_marketing;
DROP POLICY IF EXISTS "campanhas_anon_select_publico" ON public.campanhas_marketing;
DROP POLICY IF EXISTS "campanhas_auth_select" ON public.campanhas_marketing;
DROP POLICY IF EXISTS "campanhas_admin_all" ON public.campanhas_marketing;

CREATE POLICY "campanhas_service_all"
ON public.campanhas_marketing FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Anônimo: só vê os marcados como público + ativo (para portal futuro)
CREATE POLICY "campanhas_anon_select_publico"
ON public.campanhas_marketing FOR SELECT TO anon
USING (publico = true AND ativo = true);

-- Autenticado: vê tudo ativo
CREATE POLICY "campanhas_auth_select"
ON public.campanhas_marketing FOR SELECT TO authenticated
USING (ativo = true);

-- Admin master, admin união e admin associação podem gerenciar tudo
CREATE POLICY "campanhas_admin_all"
ON public.campanhas_marketing FOR ALL TO authenticated
USING (
  public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao')
)
WITH CHECK (
  public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao')
);

COMMENT ON TABLE public.campanhas_marketing IS
  'Cartões e posts de marketing (aniversário, Instagram, WhatsApp, etc.). Manual upload + scrape automático. Liberação progressiva: admin → autenticado → público.';

-- ─── Bucket de storage ─────────────────────────────────────────────────
-- Cria bucket 'marketing' se não existir (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing',
  'marketing',
  true,    -- bucket público (URLs diretas funcionam sem auth)
  20971520,  -- 20 MB max por arquivo
  ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','video/mp4','application/pdf'];

-- Storage policies: leitura pública, upload autenticado admin
DROP POLICY IF EXISTS "marketing_public_read" ON storage.objects;
DROP POLICY IF EXISTS "marketing_admin_write" ON storage.objects;

CREATE POLICY "marketing_public_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'marketing');

CREATE POLICY "marketing_admin_write"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'marketing'
  AND public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao')
)
WITH CHECK (
  bucket_id = 'marketing'
  AND public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao')
);

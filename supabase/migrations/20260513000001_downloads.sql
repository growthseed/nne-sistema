-- =============================================
-- Área de Downloads — modelo inspirado em downloads.adventistas.org
--
-- Hierarquia:
--   downloads_categorias (departamentos: Escola Sabatina, Min. Criança,
--                         Família, Mordomia, Música, etc.)
--     └─ downloads_subcategorias (Manuais e Guias, Lições, Cartilhas...)
--         └─ downloads_items (cada publicação: "Chave Mestra 2º Tri 2026")
--             └─ downloads_files (cada formato: PDF Rol do Berço, PDF
--                                  Infantis, EPUB, etc. com tamanho)
--
-- Diferente de campanhas_marketing (que é pra REPOST: cartões, posts).
-- Downloads é pra CONSUMIR: manuais, guias, lições, livros, vídeos.
-- =============================================

-- ─── Categorias (departamentos) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.downloads_categorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  nome          text NOT NULL,
  descricao     text,
  icon          text,                                  -- emoji ou nome de ícone Hi
  cor           text,                                  -- cor primary do card (hex)
  imagem_capa   text,                                  -- url da imagem de fundo
  ordem         integer NOT NULL DEFAULT 100,
  ativo         boolean NOT NULL DEFAULT true,
  publico       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dl_cat_ordem ON public.downloads_categorias(ordem) WHERE ativo = true;

-- ─── Subcategorias (Manuais e Guias, Cartilhas, etc.) ──────────────────
CREATE TABLE IF NOT EXISTS public.downloads_subcategorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id  uuid NOT NULL REFERENCES public.downloads_categorias(id) ON DELETE CASCADE,
  slug          text NOT NULL,
  nome          text NOT NULL,
  descricao     text,
  ordem         integer NOT NULL DEFAULT 100,
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_dl_subcat_cat ON public.downloads_subcategorias(categoria_id, ordem) WHERE ativo = true;

-- ─── Items (cada publicação/material) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.downloads_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  titulo          text NOT NULL,
  subtitulo       text,
  descricao       text,
  categoria_id    uuid NOT NULL REFERENCES public.downloads_categorias(id) ON DELETE RESTRICT,
  subcategoria_id uuid REFERENCES public.downloads_subcategorias(id) ON DELETE SET NULL,
  capa_url        text,                                  -- thumbnail (480x270 ou similar)
  publicado_em    date,                                  -- data de publicação
  trimestre       integer CHECK (trimestre BETWEEN 1 AND 4),
  ano             integer,
  idioma          text NOT NULL DEFAULT 'pt-BR',
  tags            text[] DEFAULT '{}'::text[],
  destaque        boolean NOT NULL DEFAULT false,
  publico         boolean NOT NULL DEFAULT true,         -- visível em /downloads (público)
  ativo           boolean NOT NULL DEFAULT true,
  downloads_count integer NOT NULL DEFAULT 0,            -- contador de downloads
  views_count     integer NOT NULL DEFAULT 0,            -- contador de visualizações
  uniao_id        uuid REFERENCES public.unioes(id) ON DELETE SET NULL,
  associacao_id   uuid REFERENCES public.associacoes(id) ON DELETE SET NULL,
  fonte           text NOT NULL DEFAULT 'manual',        -- manual | adventistas_org | canva | pasta
  origem_externa_url text,
  criado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dl_items_cat ON public.downloads_items(categoria_id, publicado_em DESC) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_dl_items_destaque ON public.downloads_items(destaque, publicado_em DESC) WHERE ativo = true AND destaque = true;
CREATE INDEX IF NOT EXISTS idx_dl_items_publico ON public.downloads_items(publico, publicado_em DESC) WHERE ativo = true AND publico = true;
CREATE INDEX IF NOT EXISTS idx_dl_items_populares ON public.downloads_items(downloads_count DESC) WHERE ativo = true AND publico = true;
CREATE INDEX IF NOT EXISTS idx_dl_items_tags ON public.downloads_items USING gin(tags);

-- ─── Files (cada formato disponível por item) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.downloads_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES public.downloads_items(id) ON DELETE CASCADE,
  rotulo        text NOT NULL,                            -- "Rol do Berço", "Infantis", "Adolescentes", "Versão A4"
  formato       text NOT NULL,                            -- pdf | epub | mobi | png | jpg | mp4 | docx | pptx | outro
  url           text NOT NULL,                            -- supabase storage public url ou externa
  filename      text,
  tamanho_bytes bigint,
  mime_type     text,
  ordem         integer NOT NULL DEFAULT 100,
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dl_files_item ON public.downloads_files(item_id, ordem) WHERE ativo = true;

-- ─── Updated_at trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.downloads_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_downloads_items_touch ON public.downloads_items;
CREATE TRIGGER trg_downloads_items_touch BEFORE UPDATE ON public.downloads_items
FOR EACH ROW EXECUTE FUNCTION public.downloads_touch();

-- ─── RPC pra contador de downloads (incremento atômico) ───────────────
CREATE OR REPLACE FUNCTION public.downloads_increment_count(p_item_id uuid, p_field text DEFAULT 'downloads_count')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_field = 'views_count' THEN
    UPDATE public.downloads_items SET views_count = views_count + 1 WHERE id = p_item_id;
  ELSE
    UPDATE public.downloads_items SET downloads_count = downloads_count + 1 WHERE id = p_item_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.downloads_increment_count(uuid, text) TO anon, authenticated;

-- ─── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.downloads_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads_subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads_files ENABLE ROW LEVEL SECURITY;

-- Categorias: leitura pública dos ativos, admins gerenciam
DROP POLICY IF EXISTS "dl_cat_public_read" ON public.downloads_categorias;
DROP POLICY IF EXISTS "dl_cat_admin_all" ON public.downloads_categorias;
DROP POLICY IF EXISTS "dl_cat_service" ON public.downloads_categorias;

CREATE POLICY "dl_cat_service" ON public.downloads_categorias FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "dl_cat_public_read" ON public.downloads_categorias FOR SELECT TO anon, authenticated
USING (ativo = true AND publico = true);
CREATE POLICY "dl_cat_admin_all" ON public.downloads_categorias FOR ALL TO authenticated
USING (public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'))
WITH CHECK (public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'));

-- Subcategorias: leitura pública via join
DROP POLICY IF EXISTS "dl_subcat_public_read" ON public.downloads_subcategorias;
DROP POLICY IF EXISTS "dl_subcat_admin_all" ON public.downloads_subcategorias;
DROP POLICY IF EXISTS "dl_subcat_service" ON public.downloads_subcategorias;

CREATE POLICY "dl_subcat_service" ON public.downloads_subcategorias FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "dl_subcat_public_read" ON public.downloads_subcategorias FOR SELECT TO anon, authenticated
USING (ativo = true);
CREATE POLICY "dl_subcat_admin_all" ON public.downloads_subcategorias FOR ALL TO authenticated
USING (public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'))
WITH CHECK (public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'));

-- Items: leitura pública dos publicados, admins gerenciam
DROP POLICY IF EXISTS "dl_items_public_read" ON public.downloads_items;
DROP POLICY IF EXISTS "dl_items_auth_read_all" ON public.downloads_items;
DROP POLICY IF EXISTS "dl_items_admin_all" ON public.downloads_items;
DROP POLICY IF EXISTS "dl_items_service" ON public.downloads_items;

CREATE POLICY "dl_items_service" ON public.downloads_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "dl_items_public_read" ON public.downloads_items FOR SELECT TO anon
USING (ativo = true AND publico = true);
CREATE POLICY "dl_items_auth_read_all" ON public.downloads_items FOR SELECT TO authenticated
USING (ativo = true);
CREATE POLICY "dl_items_admin_all" ON public.downloads_items FOR ALL TO authenticated
USING (public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'))
WITH CHECK (public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'));

-- Files: leitura pública dos ativos, admins gerenciam
DROP POLICY IF EXISTS "dl_files_public_read" ON public.downloads_files;
DROP POLICY IF EXISTS "dl_files_admin_all" ON public.downloads_files;
DROP POLICY IF EXISTS "dl_files_service" ON public.downloads_files;

CREATE POLICY "dl_files_service" ON public.downloads_files FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "dl_files_public_read" ON public.downloads_files FOR SELECT TO anon, authenticated
USING (ativo = true);
CREATE POLICY "dl_files_admin_all" ON public.downloads_files FOR ALL TO authenticated
USING (public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'))
WITH CHECK (public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'));

-- ─── Bucket de storage 'downloads' ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'downloads',
  'downloads',
  true,
  104857600,  -- 100 MB max (PDF de manuais grandes)
  ARRAY[
    'application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook',
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif',
    'video/mp4',
    'application/zip', 'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600;

DROP POLICY IF EXISTS "downloads_public_read" ON storage.objects;
DROP POLICY IF EXISTS "downloads_admin_write" ON storage.objects;
CREATE POLICY "downloads_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'downloads');
CREATE POLICY "downloads_admin_write" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'downloads' AND public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'))
WITH CHECK (bucket_id = 'downloads' AND public.current_user_role_secure() IN ('admin', 'admin_uniao', 'admin_associacao'));

-- ─── Seed inicial de categorias (departamentos IASDMR equivalentes) ───
INSERT INTO public.downloads_categorias (slug, nome, descricao, icon, cor, ordem) VALUES
  ('escola-sabatina', 'Escola Sabatina', 'Lições, manuais e materiais da Escola Sabatina.', '📖', '#0F3999', 10),
  ('ministerio-crianca', 'Ministério da Criança', 'Recursos para o trabalho com crianças e adolescentes.', '🧒', '#EC4899', 20),
  ('ministerio-jovem', 'Ministério Jovem', 'Materiais para jovens e adolescentes.', '🎯', '#8B5CF6', 30),
  ('ministerio-mulher', 'Ministério da Mulher', 'Recursos do ministério da mulher.', '🌷', '#F472B6', 40),
  ('familia', 'Família', 'Manuais, devocionais e cartilhas para o lar.', '🏠', '#10B981', 50),
  ('mordomia', 'Mordomia Cristã', 'Revistas, lições e cartilhas de mordomia.', '💰', '#F59E0B', 60),
  ('saude', 'Saúde e Temperança', 'Materiais de saúde, reforma de saúde e temperança.', '❤️', '#EF4444', 70),
  ('missoes', 'Missões e Evangelismo', 'Cartilhas, projetos e relatórios missionários.', '🌍', '#006D43', 80),
  ('musica', 'Música e Hinário', 'Partituras, hinários e playbacks.', '🎵', '#06B6D4', 90),
  ('comunicacao', 'Comunicação', 'Logos, identidade visual e templates institucionais.', '📡', '#6366F1', 100),
  ('liderança', 'Liderança e Administração', 'Manuais de cargos, atas e procedimentos administrativos.', '🏛️', '#475569', 110),
  ('outros', 'Outros', 'Materiais diversos.', '📁', '#9CA3AF', 999)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.downloads_items IS
  'Materiais para consumo: manuais, guias, lições, livros. Inspirado em downloads.adventistas.org. Diferente de campanhas_marketing (cartões/posts pra repost).';

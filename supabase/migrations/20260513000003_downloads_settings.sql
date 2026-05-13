-- Downloads — Configurações editáveis pelo admin
-- (textos do hero, busca, ordem de seções, visibilidade)
-- Tabela singleton (id = 1)
CREATE TABLE IF NOT EXISTS public.downloads_settings (
  id                       integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- HERO
  hero_kicker              text NOT NULL DEFAULT 'Biblioteca digital · NNE',
  hero_titulo              text NOT NULL DEFAULT 'Materiais que apoiam o ministério da igreja',
  hero_titulo_destaque     text DEFAULT 'apoiam o ministério',
  hero_subtitulo           text NOT NULL DEFAULT 'Manuais, lições, cartilhas, hinários, recursos para crianças, jovens, família e liderança — tudo organizado, atualizado e pronto para baixar.',
  hero_imagem_url          text,

  -- BUSCA
  busca_placeholder        text NOT NULL DEFAULT 'Buscar manual, lição, ano, trimestre...',
  buscas_sugeridas         text[] NOT NULL DEFAULT ARRAY['Lições da Escola Sabatina','Material infantil','Mordomia','Hinário']::text[],

  -- VISIBILIDADE DAS SEÇÕES (home)
  mostrar_stats            boolean NOT NULL DEFAULT true,
  mostrar_destaques        boolean NOT NULL DEFAULT true,
  mostrar_grade_categorias boolean NOT NULL DEFAULT true,
  mostrar_populares        boolean NOT NULL DEFAULT true,
  mostrar_por_categoria    boolean NOT NULL DEFAULT true,
  mostrar_recentes         boolean NOT NULL DEFAULT true,

  -- TÍTULOS DAS SEÇÕES (opcional — sobrescreve padrão)
  titulo_destaques         text NOT NULL DEFAULT 'Em destaque',
  titulo_populares         text NOT NULL DEFAULT 'Mais baixados',
  titulo_grade_categorias  text NOT NULL DEFAULT 'Explorar por categoria',
  titulo_recentes          text NOT NULL DEFAULT 'Adicionados recentemente',

  -- FOOTER
  footer_descricao         text NOT NULL DEFAULT 'Biblioteca de materiais oficiais da União Norte Nordeste Brasileira da Igreja Adventista do Sétimo Dia Movimento de Reforma. Manuais, lições, cartilhas e recursos para o ministério.',
  footer_site_url          text NOT NULL DEFAULT 'https://unne.asdmr.org.br',
  footer_site_label        text NOT NULL DEFAULT 'unne.asdmr.org.br',

  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_downloads_settings_touch ON public.downloads_settings;
CREATE TRIGGER trg_downloads_settings_touch BEFORE UPDATE ON public.downloads_settings
FOR EACH ROW EXECUTE FUNCTION public.downloads_touch();

-- Seed
INSERT INTO public.downloads_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.downloads_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dl_settings_service" ON public.downloads_settings;
CREATE POLICY "dl_settings_service" ON public.downloads_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "dl_settings_public_read" ON public.downloads_settings;
CREATE POLICY "dl_settings_public_read" ON public.downloads_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "dl_settings_admin_all" ON public.downloads_settings;
CREATE POLICY "dl_settings_admin_all" ON public.downloads_settings
  FOR ALL TO authenticated
  USING (public.current_user_role_secure() IN ('admin','admin_uniao','admin_associacao'))
  WITH CHECK (public.current_user_role_secure() IN ('admin','admin_uniao','admin_associacao'));

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineSearch, HiOutlineDownload, HiOutlineArrowRight,
  HiOutlineDocumentText, HiOutlineCollection, HiOutlineSparkles,
  HiOutlineFire,
} from 'react-icons/hi'

interface Categoria {
  id: string; slug: string; nome: string; descricao: string | null
  icon: string | null; cor: string | null; imagem_capa: string | null
}

interface ItemPreview {
  id: string; slug: string; titulo: string; subtitulo: string | null
  capa_url: string | null; publicado_em: string | null
  downloads_count: number
  ano: number | null; trimestre: number | null
  categoria: { slug: string; nome: string; cor: string | null } | null
}

interface Settings {
  hero_kicker: string
  hero_titulo: string
  hero_titulo_destaque: string | null
  hero_subtitulo: string
  hero_imagem_url: string | null
  busca_placeholder: string
  buscas_sugeridas: string[]
  mostrar_stats: boolean
  mostrar_destaques: boolean
  mostrar_grade_categorias: boolean
  mostrar_populares: boolean
  mostrar_por_categoria: boolean
  mostrar_recentes: boolean
  titulo_destaques: string
  titulo_populares: string
  titulo_grade_categorias: string
  titulo_recentes: string
}

const DEFAULT_SETTINGS: Settings = {
  hero_kicker: 'Biblioteca digital · NNE',
  hero_titulo: 'Materiais que apoiam o ministério da igreja',
  hero_titulo_destaque: 'apoiam o ministério',
  hero_subtitulo: 'Manuais, lições, cartilhas, hinários, recursos para crianças, jovens, família e liderança — tudo organizado, atualizado e pronto para baixar.',
  hero_imagem_url: null,
  busca_placeholder: 'Buscar manual, lição, ano, trimestre...',
  buscas_sugeridas: ['Lições da Escola Sabatina', 'Material infantil', 'Mordomia', 'Hinário'],
  mostrar_stats: true,
  mostrar_destaques: true,
  mostrar_grade_categorias: true,
  mostrar_populares: true,
  mostrar_por_categoria: true,
  mostrar_recentes: true,
  titulo_destaques: 'Em destaque',
  titulo_populares: 'Mais baixados',
  titulo_grade_categorias: 'Explorar por categoria',
  titulo_recentes: 'Adicionados recentemente',
}

// Renderiza o título do hero realçando a parte em "destaque" (com itálico/cor)
function renderHeroTitulo(titulo: string, destaque: string | null): React.ReactNode {
  if (!destaque || !titulo.toLowerCase().includes(destaque.toLowerCase())) {
    return <>{titulo}</>
  }
  const idx = titulo.toLowerCase().indexOf(destaque.toLowerCase())
  const before = titulo.slice(0, idx)
  const match = titulo.slice(idx, idx + destaque.length)
  const after = titulo.slice(idx + destaque.length)
  return (
    <>
      {before}
      <em className="not-italic text-primary-200">{match}</em>
      {after}
    </>
  )
}

export default function DownloadsHomePage() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [destaques, setDestaques] = useState<ItemPreview[]>([])
  const [populares, setPopulares] = useState<ItemPreview[]>([])
  const [recentes, setRecentes] = useState<ItemPreview[]>([])
  const [itensPorCategoria, setItensPorCategoria] = useState<Record<string, ItemPreview[]>>({})
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState(q)

  useEffect(() => { load() }, [])
  useEffect(() => { setBusca(q) }, [q])

  async function load() {
    setLoading(true)
    try {
      const sel = `id, slug, titulo, subtitulo, capa_url, publicado_em, downloads_count, ano, trimestre, categoria:downloads_categorias(slug, nome, cor)`
      const [setRes, catRes, destRes, popRes, recRes] = await Promise.all([
        supabase.from('downloads_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('downloads_categorias').select('*').eq('ativo', true).eq('publico', true).order('ordem'),
        supabase.from('downloads_items').select(sel).eq('ativo', true).eq('publico', true).eq('destaque', true).order('publicado_em', { ascending: false, nullsFirst: false }).limit(8),
        supabase.from('downloads_items').select(sel).eq('ativo', true).eq('publico', true).order('downloads_count', { ascending: false }).limit(12),
        supabase.from('downloads_items').select(sel).eq('ativo', true).eq('publico', true).order('publicado_em', { ascending: false, nullsFirst: false }).limit(12),
      ])
      if (setRes.data) setSettings({ ...DEFAULT_SETTINGS, ...(setRes.data as any) })
      const cats = (catRes.data || []) as Categoria[]
      setCategorias(cats)
      setDestaques((destRes.data || []) as any)
      setPopulares((popRes.data || []) as any)
      setRecentes((recRes.data || []) as any)

      const porCat: Record<string, ItemPreview[]> = {}
      await Promise.all(cats.map(async c => {
        const { data } = await supabase.from('downloads_items')
          .select(sel)
          .eq('ativo', true).eq('publico', true).eq('categoria_id', c.id)
          .order('publicado_em', { ascending: false, nullsFirst: false }).limit(10)
        porCat[c.id] = (data || []) as any
      }))
      setItensPorCategoria(porCat)
    } finally { setLoading(false) }
  }

  const filtroBusca = busca.trim().toLowerCase()
  const resultadosBusca = useMemo(() => {
    if (!filtroBusca) return []
    const todos = [...recentes, ...populares, ...destaques]
    const seen = new Set<string>()
    return todos.filter(i => {
      if (seen.has(i.id)) return false
      const match =
        i.titulo.toLowerCase().includes(filtroBusca) ||
        (i.subtitulo || '').toLowerCase().includes(filtroBusca) ||
        (i.categoria?.nome || '').toLowerCase().includes(filtroBusca)
      if (match) { seen.add(i.id); return true }
      return false
    })
  }, [filtroBusca, recentes, populares, destaques])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-900">
        {settings.hero_imagem_url ? (
          <>
            <img
              src={settings.hero_imagem_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary-900/85 via-primary-800/80 to-stone-900/90" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-stone-900" />
        )}
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><defs><pattern id='p' width='32' height='32' patternUnits='userSpaceOnUse'><circle cx='16' cy='16' r='1' fill='white' fill-opacity='0.15'/></pattern></defs><rect width='200' height='200' fill='url(%23p)'/></svg>")`,
          }}
        />
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-primary-200 font-semibold mb-6">
              <span className="w-8 h-px bg-primary-300/60" />
              {settings.hero_kicker}
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight">
              {renderHeroTitulo(settings.hero_titulo, settings.hero_titulo_destaque)}
            </h1>
            <p className="mt-6 text-lg text-stone-200/90 max-w-2xl leading-relaxed">
              {settings.hero_subtitulo}
            </p>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-8 max-w-2xl"
            >
              <div className="relative">
                <HiOutlineSearch className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder={settings.busca_placeholder}
                  className="w-full pl-14 pr-4 py-4 rounded-2xl bg-white shadow-2xl text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-4 focus:ring-primary-300/50"
                />
              </div>
              {!filtroBusca && settings.buscas_sugeridas.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-primary-200/80">Buscas frequentes:</span>
                  {settings.buscas_sugeridas.map(s => (
                    <button
                      key={s}
                      onClick={() => setBusca(s)}
                      className="text-xs px-3 py-1 rounded-full bg-white/10 text-white border border-white/15 hover:bg-white/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {settings.mostrar_stats && (
              <div className="mt-10 flex flex-wrap gap-6 text-stone-200">
                <Stat icon={HiOutlineCollection} value={categorias.length} label="categorias" />
                <Stat icon={HiOutlineDocumentText} value={recentes.length + populares.length} label="materiais" />
                <Stat
                  icon={HiOutlineDownload}
                  value={populares.reduce((s, i) => s + (i.downloads_count || 0), 0)}
                  label="downloads"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Resultado de busca */}
        {filtroBusca && (
          <section>
            <SectionTitle
              kicker="Resultados"
              title={`"${busca}"`}
              subtitle={`${resultadosBusca.length} ${resultadosBusca.length === 1 ? 'material encontrado' : 'materiais encontrados'}`}
            />
            {resultadosBusca.length === 0 ? (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
                <p className="text-gray-500">Nada encontrado. Tente outra palavra-chave ou explore as categorias abaixo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {resultadosBusca.map(it => <ItemCard key={it.id} it={it} />)}
              </div>
            )}
          </section>
        )}

        {/* Skeleton */}
        {loading && !filtroBusca && (
          <div className="space-y-8">
            <div className="h-8 w-48 bg-stone-200 rounded animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-stone-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* Destaques */}
        {!filtroBusca && settings.mostrar_destaques && destaques.length > 0 && (
          <section>
            <SectionTitle
              icon={HiOutlineSparkles}
              kicker="Selecionados pela equipe"
              title={settings.titulo_destaques}
              link={{ to: '/downloads', label: '' }}
            />
            <HorizontalScroll>
              {destaques.map(it => <ItemCardLarge key={it.id} it={it} />)}
            </HorizontalScroll>
          </section>
        )}

        {/* Categorias em destaque visual */}
        {!filtroBusca && settings.mostrar_grade_categorias && categorias.length > 0 && (
          <section>
            <SectionTitle title={settings.titulo_grade_categorias} subtitle="Organizadas por ministério e tema" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categorias.map(cat => (
                <Link
                  key={cat.id}
                  to={`/downloads/${cat.slug}`}
                  className="group relative overflow-hidden rounded-2xl aspect-[5/4] bg-stone-100 hover:shadow-xl transition-all"
                  style={{
                    background: cat.imagem_capa
                      ? undefined
                      : `linear-gradient(135deg, ${cat.cor || '#047857'}, ${shade(cat.cor || '#047857', -25)})`,
                  }}
                >
                  {cat.imagem_capa && (
                    <img src={cat.imagem_capa} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end text-white">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/70 font-semibold mb-1">
                      {(itensPorCategoria[cat.id]?.length || 0)} {(itensPorCategoria[cat.id]?.length || 0) === 1 ? 'material' : 'materiais'}
                    </p>
                    <h3 className="font-serif text-xl sm:text-2xl leading-tight">{cat.nome}</h3>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium opacity-90 group-hover:gap-2 transition-all">
                      Ver materiais <HiOutlineArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Mais baixados */}
        {!filtroBusca && settings.mostrar_populares && populares.length > 0 && (
          <section>
            <SectionTitle
              icon={HiOutlineFire}
              kicker="Os mais procurados"
              title={settings.titulo_populares}
            />
            <HorizontalScroll>
              {populares.map(it => <ItemCard key={it.id} it={it} />)}
            </HorizontalScroll>
          </section>
        )}

        {/* Por categoria */}
        {!filtroBusca && settings.mostrar_por_categoria && categorias.map(cat => {
          const items = itensPorCategoria[cat.id] || []
          if (items.length === 0) return null
          return (
            <section key={cat.id}>
              <SectionTitle
                title={cat.nome}
                subtitle={cat.descricao || undefined}
                link={{ to: `/downloads/${cat.slug}`, label: 'Ver todos' }}
                accentColor={cat.cor}
              />
              <HorizontalScroll>
                {items.map(it => <ItemCard key={it.id} it={it} />)}
              </HorizontalScroll>
            </section>
          )
        })}

        {/* Recentes (fallback / final) */}
        {!filtroBusca && settings.mostrar_recentes && recentes.length > 0 && (
          <section>
            <SectionTitle title={settings.titulo_recentes} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              {recentes.slice(0, 12).map(it => <ItemCard key={it.id} it={it} />)}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function Stat({ icon: Icon, value, label }: { icon: any; value: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary-200" />
      </div>
      <div className="leading-tight">
        <div className="text-lg font-semibold text-white">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-stone-300/80">{label}</div>
      </div>
    </div>
  )
}

function SectionTitle({
  icon: Icon, kicker, title, subtitle, link, accentColor,
}: {
  icon?: any; kicker?: string; title: string; subtitle?: string
  link?: { to: string; label: string }; accentColor?: string | null
}) {
  return (
    <div className="mb-5 sm:mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && (
          <div className="flex items-center gap-2 mb-1.5">
            {Icon && <Icon className="w-4 h-4" style={{ color: accentColor || '#047857' }} />}
            <span className="text-[11px] uppercase tracking-[0.18em] font-semibold" style={{ color: accentColor || '#047857' }}>
              {kicker}
            </span>
          </div>
        )}
        <h2 className="font-serif text-2xl sm:text-3xl text-gray-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {link && link.label && (
        <Link
          to={link.to}
          className="hidden sm:inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-700 hover:gap-2 transition-all whitespace-nowrap"
        >
          {link.label} <HiOutlineArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative -mx-4 sm:-mx-6 lg:mx-0">
      <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 px-4 sm:px-6 lg:px-0 scrollbar-thin">
        {Array.isArray(children) ? children.map((child, i) => (
          <div key={i} className="snap-start shrink-0 w-[44%] sm:w-[28%] md:w-[22%] lg:w-[18%]">
            {child}
          </div>
        )) : children}
      </div>
    </div>
  )
}

function ItemCard({ it }: { it: ItemPreview }) {
  return (
    <Link
      to={`/downloads/${it.categoria?.slug || 'outros'}/${it.slug}`}
      className="group block"
    >
      <div className="relative aspect-[3/4] rounded-xl bg-stone-100 overflow-hidden border border-gray-200/70 group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all">
        {it.capa_url ? (
          <img
            src={it.capa_url}
            alt={it.titulo}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <HiOutlineDocumentText className="w-12 h-12 text-stone-300" />
          </div>
        )}
        {it.trimestre && it.ano && (
          <span className="absolute top-2 left-2 bg-white/95 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded">
            {it.trimestre}º TRI · {it.ano}
          </span>
        )}
        {it.downloads_count > 50 && (
          <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
            <HiOutlineDownload className="w-3 h-3" /> {it.downloads_count}
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        {it.categoria && (
          <p
            className="text-[10px] uppercase tracking-wider font-semibold truncate"
            style={{ color: it.categoria.cor || '#047857' }}
          >
            {it.categoria.nome}
          </p>
        )}
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 mt-0.5 leading-snug">
          {it.titulo}
        </p>
      </div>
    </Link>
  )
}

function ItemCardLarge({ it }: { it: ItemPreview }) {
  return (
    <Link
      to={`/downloads/${it.categoria?.slug || 'outros'}/${it.slug}`}
      className="group block"
    >
      <div className="relative aspect-[3/4] rounded-2xl bg-stone-100 overflow-hidden border border-gray-200/70 shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all">
        {it.capa_url ? (
          <img src={it.capa_url} alt={it.titulo} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <HiOutlineDocumentText className="w-12 h-12 text-stone-300" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-12 text-white">
          {it.categoria && (
            <p className="text-[10px] uppercase tracking-[0.15em] font-semibold opacity-90 mb-1">{it.categoria.nome}</p>
          )}
          <p className="font-serif text-base sm:text-lg leading-tight line-clamp-2">{it.titulo}</p>
          {it.subtitulo && <p className="text-xs text-white/75 mt-1 line-clamp-1">{it.subtitulo}</p>}
        </div>
      </div>
    </Link>
  )
}

function shade(hex: string, percent: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return hex
  const adj = (v: string) => Math.max(0, Math.min(255, parseInt(v, 16) + Math.round(255 * (percent / 100))))
  const r = adj(m[1]); const g = adj(m[2]); const b = adj(m[3])
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

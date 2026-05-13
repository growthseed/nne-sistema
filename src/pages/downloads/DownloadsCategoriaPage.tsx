import { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineSearch, HiOutlineDownload, HiOutlineDocumentText,
  HiOutlineFilter, HiOutlineHome, HiOutlineChevronRight, HiOutlineX,
  HiOutlineSortDescending,
} from 'react-icons/hi'

interface Categoria {
  id: string; slug: string; nome: string; descricao: string | null
  icon: string | null; cor: string | null; imagem_capa: string | null
}
interface Subcategoria { id: string; slug: string; nome: string; ordem: number }
interface Item {
  id: string; slug: string; titulo: string; subtitulo: string | null
  capa_url: string | null; publicado_em: string | null
  ano: number | null; trimestre: number | null
  downloads_count: number; tags: string[]
  subcategoria_id: string | null
  subcategoria: { slug: string; nome: string } | null
}

type Ordem = 'recentes' | 'populares' | 'titulo'

export default function DownloadsCategoriaPage() {
  const { slug } = useParams<{ slug: string }>()
  const [cat, setCat] = useState<Categoria | null>(null)
  const [subs, setSubs] = useState<Subcategoria[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroSub, setFiltroSub] = useState<string>('todas')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [filtrosMobileOpen, setFiltrosMobileOpen] = useState(false)

  useEffect(() => { if (slug) load() }, [slug])

  async function load() {
    setLoading(true)
    setBusca('')
    setFiltroSub('todas')
    setOrdem('recentes')
    try {
      const { data: catData } = await supabase
        .from('downloads_categorias')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle()
      if (!catData) { setCat(null); return }
      setCat(catData as Categoria)

      const [subRes, itRes] = await Promise.all([
        supabase.from('downloads_subcategorias')
          .select('id, slug, nome, ordem')
          .eq('categoria_id', (catData as any).id).eq('ativo', true).order('ordem'),
        supabase.from('downloads_items')
          .select('id, slug, titulo, subtitulo, capa_url, publicado_em, ano, trimestre, downloads_count, tags, subcategoria_id, subcategoria:downloads_subcategorias(slug, nome)')
          .eq('categoria_id', (catData as any).id).eq('ativo', true).eq('publico', true)
          .order('publicado_em', { ascending: false, nullsFirst: false }),
      ])
      setSubs((subRes.data || []) as Subcategoria[])
      setItems((itRes.data || []) as any)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    let list = items
    if (filtroSub !== 'todas') list = list.filter(i => i.subcategoria_id === filtroSub)
    if (busca.trim()) {
      const t = busca.toLowerCase()
      list = list.filter(i =>
        i.titulo.toLowerCase().includes(t) ||
        (i.subtitulo || '').toLowerCase().includes(t) ||
        i.tags.some(tag => tag.toLowerCase().includes(t)),
      )
    }
    if (ordem === 'populares') list = [...list].sort((a, b) => b.downloads_count - a.downloads_count)
    else if (ordem === 'titulo') list = [...list].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    return list
  }, [items, busca, filtroSub, ordem])

  // contagem por subcategoria
  const countsBySub = useMemo(() => {
    const map: Record<string, number> = { todas: items.length }
    subs.forEach(s => { map[s.id] = 0 })
    items.forEach(i => { if (i.subcategoria_id) map[i.subcategoria_id] = (map[i.subcategoria_id] || 0) + 1 })
    return map
  }, [items, subs])

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-48 bg-stone-200 rounded" />
        <div className="h-12 w-2/3 bg-stone-200 rounded" />
        <div className="h-64 bg-stone-200 rounded-2xl mt-6" />
      </div>
    </div>
  )

  if (!cat) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <HiOutlineDocumentText className="w-16 h-16 text-stone-300 mx-auto" />
      <p className="text-gray-500 mt-4">Categoria não encontrada.</p>
      <Link to="/downloads" className="mt-4 inline-flex items-center gap-1 text-primary-700 hover:underline">
        Voltar para Downloads
      </Link>
    </div>
  )

  const accent = cat.cor || '#047857'

  return (
    <>
      {/* Hero da categoria */}
      <section
        className="relative overflow-hidden"
        style={{
          background: cat.imagem_capa
            ? undefined
            : `linear-gradient(135deg, ${accent}, ${shade(accent, -25)})`,
        }}
      >
        {cat.imagem_capa && (
          <>
            <img src={cat.imagem_capa} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-black/65" />
          </>
        )}
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/80 mb-6">
            <Link to="/downloads" className="inline-flex items-center gap-1 hover:text-white">
              <HiOutlineHome className="w-3.5 h-3.5" /> Downloads
            </Link>
            <HiOutlineChevronRight className="w-3 h-3 opacity-60" />
            <span className="text-white font-medium truncate">{cat.nome}</span>
          </nav>

          <div className="max-w-3xl text-white">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/75 font-semibold mb-4">
              <span className="w-6 h-px bg-white/40" />
              Categoria
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.1] tracking-tight">
              {cat.nome}
            </h1>
            {cat.descricao && (
              <p className="mt-4 text-base sm:text-lg text-white/85 max-w-2xl leading-relaxed">
                {cat.descricao}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <HiOutlineDocumentText className="w-4 h-4" />
                {items.length} {items.length === 1 ? 'material' : 'materiais'}
              </span>
              {subs.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlineFilter className="w-4 h-4" />
                  {subs.length} {subs.length === 1 ? 'subcategoria' : 'subcategorias'}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Filtros: top bar para mobile, sidebar para desktop */}
        <div className="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-10">
          {/* Sidebar desktop */}
          <aside className="hidden lg:block sticky top-24 self-start space-y-8">
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-3">Buscar</h3>
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar nesta categoria..."
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            {subs.length > 0 && (
              <div>
                <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-3">Subcategorias</h3>
                <ul className="space-y-1">
                  <li>
                    <button
                      onClick={() => setFiltroSub('todas')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroSub === 'todas'
                          ? 'bg-primary-50 text-primary-800 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>Todas</span>
                      <span className="text-xs text-gray-400">{countsBySub.todas}</span>
                    </button>
                  </li>
                  {subs.map(s => (
                    <li key={s.id}>
                      <button
                        onClick={() => setFiltroSub(s.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroSub === s.id
                            ? 'bg-primary-50 text-primary-800 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="truncate">{s.nome}</span>
                        <span className="text-xs text-gray-400">{countsBySub[s.id] || 0}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-3">Ordenar</h3>
              <ul className="space-y-1">
                {([
                  ['recentes', 'Mais recentes'],
                  ['populares', 'Mais baixados'],
                  ['titulo', 'Ordem alfabética'],
                ] as [Ordem, string][]).map(([k, label]) => (
                  <li key={k}>
                    <button
                      onClick={() => setOrdem(k)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        ordem === k
                          ? 'bg-primary-50 text-primary-800 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Mobile filter bar */}
          <div className="lg:hidden sticky top-16 -mx-4 sm:-mx-6 bg-stone-50/95 backdrop-blur border-b border-gray-200 z-30 px-4 sm:px-6 py-3 mb-6 flex items-center gap-2">
            <div className="relative flex-1">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setFiltrosMobileOpen(true)}
              className="shrink-0 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 inline-flex items-center gap-1.5"
            >
              <HiOutlineFilter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          {/* Mobile filter sheet */}
          {filtrosMobileOpen && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltrosMobileOpen(false)} />
              <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-xl">Filtros</h3>
                  <button onClick={() => setFiltrosMobileOpen(false)} className="p-2 -mr-2 text-gray-500">
                    <HiOutlineX className="w-5 h-5" />
                  </button>
                </div>

                {subs.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-2">Subcategorias</h4>
                    <div className="flex flex-wrap gap-2">
                      <FilterChip active={filtroSub === 'todas'} onClick={() => setFiltroSub('todas')}>
                        Todas ({countsBySub.todas})
                      </FilterChip>
                      {subs.map(s => (
                        <FilterChip key={s.id} active={filtroSub === s.id} onClick={() => setFiltroSub(s.id)}>
                          {s.nome} ({countsBySub[s.id] || 0})
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h4 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-2">Ordenar</h4>
                  <div className="space-y-1">
                    {([
                      ['recentes', 'Mais recentes'],
                      ['populares', 'Mais baixados'],
                      ['titulo', 'Ordem alfabética'],
                    ] as [Ordem, string][]).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setOrdem(k)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                          ordem === k ? 'bg-primary-50 text-primary-800 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setFiltrosMobileOpen(false)}
                  className="w-full py-3 rounded-xl bg-primary-700 text-white text-sm font-medium"
                >
                  Aplicar filtros ({filtered.length} resultados)
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{filtered.length}</span> {filtered.length === 1 ? 'material encontrado' : 'materiais encontrados'}
              </p>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500">
                <HiOutlineSortDescending className="w-3.5 h-3.5" />
                {ordem === 'recentes' ? 'Mais recentes' : ordem === 'populares' ? 'Mais baixados' : 'A → Z'}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl">
                <HiOutlineDocumentText className="w-12 h-12 text-stone-300 mx-auto" />
                <p className="text-gray-500 mt-3">Nenhum material encontrado com esses filtros.</p>
                {(busca || filtroSub !== 'todas') && (
                  <button
                    onClick={() => { setBusca(''); setFiltroSub('todas') }}
                    className="mt-3 text-sm text-primary-700 hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {filtered.map(it => (
                  <Link
                    key={it.id}
                    to={`/downloads/${cat.slug}/${it.slug}`}
                    className="group block"
                  >
                    <div className="relative aspect-[3/4] rounded-xl bg-stone-100 overflow-hidden border border-gray-200/70 group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all">
                      {it.capa_url ? (
                        <img src={it.capa_url} alt={it.titulo} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
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
                    <div className="mt-2.5 px-0.5">
                      {it.subcategoria && (
                        <p className="text-[10px] uppercase tracking-wider font-semibold truncate" style={{ color: accent }}>
                          {it.subcategoria.nome}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 mt-0.5 leading-snug">{it.titulo}</p>
                      {it.subtitulo && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{it.subtitulo}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-primary-700 text-white border-primary-700'
          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-500 hover:text-primary-700'
      }`}
    >
      {children}
    </button>
  )
}

function shade(hex: string, percent: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return hex
  const adj = (v: string) => Math.max(0, Math.min(255, parseInt(v, 16) + Math.round(255 * (percent / 100))))
  const r = adj(m[1]); const g = adj(m[2]); const b = adj(m[3])
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

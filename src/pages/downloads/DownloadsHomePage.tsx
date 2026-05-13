import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { HiOutlineDownload, HiOutlineSearch, HiOutlineSparkles, HiOutlineFire } from 'react-icons/hi'

interface Categoria {
  id: string; slug: string; nome: string; descricao: string | null
  icon: string | null; cor: string | null; imagem_capa: string | null
}

interface ItemPreview {
  id: string; slug: string; titulo: string; capa_url: string | null
  publicado_em: string | null; downloads_count: number
  categoria: { slug: string; nome: string } | null
}

export default function DownloadsHomePage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [destaques, setDestaques] = useState<ItemPreview[]>([])
  const [populares, setPopulares] = useState<ItemPreview[]>([])
  const [itensRecentesPorCategoria, setItensRecentesPorCategoria] = useState<Record<string, ItemPreview[]>>({})
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [catRes, destRes, popRes] = await Promise.all([
        supabase.from('downloads_categorias').select('*').eq('ativo', true).eq('publico', true).order('ordem'),
        supabase.from('downloads_items').select('id, slug, titulo, capa_url, publicado_em, downloads_count, categoria:downloads_categorias(slug, nome)').eq('ativo', true).eq('publico', true).eq('destaque', true).order('publicado_em', { ascending: false, nullsFirst: false }).limit(6),
        supabase.from('downloads_items').select('id, slug, titulo, capa_url, publicado_em, downloads_count, categoria:downloads_categorias(slug, nome)').eq('ativo', true).eq('publico', true).order('downloads_count', { ascending: false }).limit(8),
      ])

      const cats = (catRes.data || []) as Categoria[]
      setCategorias(cats)
      setDestaques((destRes.data || []) as any)
      setPopulares((popRes.data || []) as any)

      // Carrega 5 itens mais recentes por categoria (paralelo)
      const recentes: Record<string, ItemPreview[]> = {}
      await Promise.all(cats.map(async c => {
        const { data } = await supabase.from('downloads_items')
          .select('id, slug, titulo, capa_url, publicado_em, downloads_count, categoria:downloads_categorias(slug, nome)')
          .eq('ativo', true).eq('publico', true).eq('categoria_id', c.id)
          .order('publicado_em', { ascending: false, nullsFirst: false }).limit(5)
        recentes[c.id] = (data || []) as any
      }))
      setItensRecentesPorCategoria(recentes)
    } finally { setLoading(false) }
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Carregando downloads...</div>
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white rounded-2xl p-8 shadow-lg">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-wider text-primary-200">Biblioteca de Materiais</p>
          <h1 className="text-3xl sm:text-4xl font-bold mt-2">Downloads NNE</h1>
          <p className="text-primary-100 mt-2 max-w-2xl">
            Manuais, lições, cartilhas, hinários e materiais para o ministério.
            Tudo em PDF, imagens e documentos prontos para imprimir, compartilhar ou estudar.
          </p>
          <div className="mt-5 relative max-w-xl">
            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && busca.trim()) window.location.href = `/downloads/buscar?q=${encodeURIComponent(busca)}` }}
              placeholder="Buscar manual, guia, cartilha, lição..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
      </div>

      {/* Destaques */}
      {destaques.length > 0 && (
        <section>
          <SectionHeader icon={HiOutlineSparkles} title="Destaques" subtitle="Materiais selecionados pela equipe" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {destaques.map(it => <ItemCardLarge key={it.id} it={it} />)}
          </div>
        </section>
      )}

      {/* Populares */}
      {populares.length > 0 && (
        <section>
          <SectionHeader icon={HiOutlineFire} title="Mais baixados" subtitle="Os materiais mais acessados nas últimas semanas" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {populares.map(it => <ItemCardSmall key={it.id} it={it} />)}
          </div>
        </section>
      )}

      {/* Categorias com itens recentes (estilo home Adventistas) */}
      {categorias.map(cat => {
        const items = itensRecentesPorCategoria[cat.id] || []
        if (items.length === 0) {
          return (
            <section key={cat.id}>
              <CategoriaHeader cat={cat} />
              <div className="card text-center py-8 text-sm text-gray-400">Nenhum material ainda nesta categoria.</div>
            </section>
          )
        }
        return (
          <section key={cat.id}>
            <CategoriaHeader cat={cat} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {items.map(it => <ItemCardSmall key={it.id} it={it} />)}
            </div>
          </section>
        )
      })}

      {/* Grid de categorias no rodapé */}
      <section>
        <SectionHeader title="Todas as categorias" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categorias.map(cat => (
            <Link
              key={cat.id}
              to={`/downloads/${cat.slug}`}
              className="card flex items-center gap-3 hover:shadow-md transition-shadow"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: (cat.cor || '#006D43') + '20', color: cat.cor || '#006D43' }}
              >
                {cat.icon || '📁'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{cat.nome}</p>
                {cat.descricao && <p className="text-[11px] text-gray-500 truncate">{cat.descricao}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon?: any; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-primary-600" />}
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
    </div>
  )
}

function CategoriaHeader({ cat }: { cat: Categoria }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{cat.icon || '📁'}</span>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{cat.nome}</h2>
          {cat.descricao && <p className="text-xs text-gray-500">{cat.descricao}</p>}
        </div>
      </div>
      <Link to={`/downloads/${cat.slug}`} className="text-sm text-primary-600 hover:underline whitespace-nowrap">
        Ver todos →
      </Link>
    </div>
  )
}

function ItemCardLarge({ it }: { it: ItemPreview }) {
  return (
    <Link
      to={`/downloads/${it.categoria?.slug || 'outros'}/${it.slug}`}
      className="card p-0 overflow-hidden hover:shadow-lg transition-shadow group"
    >
      <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
        {it.capa_url ? (
          <img src={it.capa_url} alt={it.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">📄</div>
        )}
        {it.categoria && (
          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded">
            {it.categoria.nome}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-gray-800 text-sm line-clamp-2" title={it.titulo}>{it.titulo}</p>
        {it.publicado_em && <p className="text-[11px] text-gray-400 mt-1">{fmtDate(it.publicado_em)}</p>}
      </div>
    </Link>
  )
}

function ItemCardSmall({ it }: { it: ItemPreview }) {
  return (
    <Link
      to={`/downloads/${it.categoria?.slug || 'outros'}/${it.slug}`}
      className="block hover:shadow-md transition-shadow rounded-xl overflow-hidden bg-white border border-gray-100"
    >
      <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
        {it.capa_url ? (
          <img src={it.capa_url} alt={it.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">📄</div>
        )}
        {it.downloads_count > 0 && (
          <span className="absolute top-2 right-2 bg-white/90 text-gray-700 text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <HiOutlineDownload className="w-3 h-3" /> {it.downloads_count}
          </span>
        )}
      </div>
      <div className="p-2.5">
        {it.categoria && <p className="text-[10px] text-gray-400 uppercase tracking-wider truncate">{it.categoria.nome}</p>}
        <p className="text-xs font-semibold text-gray-800 line-clamp-2 mt-0.5" title={it.titulo}>{it.titulo}</p>
      </div>
    </Link>
  )
}

function fmtDate(s: string): string {
  try {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  } catch { return s }
}

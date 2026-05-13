import { useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { HiOutlineArrowLeft, HiOutlineSearch, HiOutlineDownload } from 'react-icons/hi'

interface Categoria {
  id: string; slug: string; nome: string; descricao: string | null
  icon: string | null; cor: string | null
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

export default function DownloadsCategoriaPage() {
  const { slug } = useParams<{ slug: string }>()
  const [cat, setCat] = useState<Categoria | null>(null)
  const [subs, setSubs] = useState<Subcategoria[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroSub, setFiltroSub] = useState<string>('todas')
  const [ordem, setOrdem] = useState<'recentes' | 'populares' | 'titulo'>('recentes')

  useEffect(() => { if (slug) load() }, [slug])

  async function load() {
    setLoading(true)
    try {
      const { data: catData } = await supabase
        .from('downloads_categorias')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle()
      if (!catData) { setCat(null); return }
      setCat(catData as Categoria)

      const [subRes, itRes] = await Promise.all([
        supabase.from('downloads_subcategorias').select('id, slug, nome, ordem').eq('categoria_id', (catData as any).id).eq('ativo', true).order('ordem'),
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

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>
  if (!cat) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Categoria não encontrada</p>
      <Link to="/downloads" className="text-primary-600 hover:underline mt-2 inline-block">Voltar para Downloads</Link>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/downloads" className="hover:text-primary-700 inline-flex items-center gap-1">
          <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Downloads
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{cat.nome}</span>
      </div>

      {/* Hero da categoria */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${cat.cor || '#006D43'}, ${shade(cat.cor || '#006D43', -20)})` }}
      >
        <div className="flex items-start gap-4">
          <div className="text-5xl">{cat.icon || '📁'}</div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{cat.nome}</h1>
            {cat.descricao && <p className="text-white/90 mt-1 text-sm">{cat.descricao}</p>}
            <p className="text-white/70 text-xs mt-2">{items.length} {items.length === 1 ? 'material disponível' : 'materiais disponíveis'}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar nesta categoria..."
            className="input-field pl-10"
          />
        </div>
        {subs.length > 0 && (
          <select value={filtroSub} onChange={e => setFiltroSub(e.target.value)} className="input-field w-auto text-sm">
            <option value="todas">Todas as subcategorias</option>
            {subs.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        )}
        <select value={ordem} onChange={e => setOrdem(e.target.value as any)} className="input-field w-auto text-sm">
          <option value="recentes">Mais recentes</option>
          <option value="populares">Mais baixados</option>
          <option value="titulo">A → Z</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-500">Nenhum material encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(it => (
            <Link
              key={it.id}
              to={`/downloads/${cat.slug}/${it.slug}`}
              className="block hover:shadow-md transition-shadow rounded-xl overflow-hidden bg-white border border-gray-100 group"
            >
              <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                {it.capa_url ? (
                  <img src={it.capa_url} alt={it.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">📄</div>
                )}
                {it.downloads_count > 0 && (
                  <span className="absolute top-2 right-2 bg-white/90 text-gray-700 text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <HiOutlineDownload className="w-3 h-3" /> {it.downloads_count}
                  </span>
                )}
                {it.trimestre && it.ano && (
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded">
                    {it.trimestre}º Tri · {it.ano}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                {it.subcategoria && <p className="text-[10px] text-gray-400 uppercase tracking-wider truncate">{it.subcategoria.nome}</p>}
                <p className="text-xs font-semibold text-gray-800 line-clamp-2" title={it.titulo}>{it.titulo}</p>
                {it.subtitulo && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{it.subtitulo}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Escurece/clareia um hex; valor negativo escurece.
function shade(hex: string, percent: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return hex
  const r = Math.max(0, Math.min(255, parseInt(m[1], 16) + Math.round(255 * (percent / 100))))
  const g = Math.max(0, Math.min(255, parseInt(m[2], 16) + Math.round(255 * (percent / 100))))
  const b = Math.max(0, Math.min(255, parseInt(m[3], 16) + Math.round(255 * (percent / 100))))
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

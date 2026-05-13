import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineArrowLeft, HiOutlineDownload, HiOutlineCalendar, HiOutlineEye,
  HiOutlineDocumentText, HiOutlinePhotograph, HiOutlineVideoCamera, HiOutlineShare,
} from 'react-icons/hi'

interface Item {
  id: string; slug: string; titulo: string; subtitulo: string | null
  descricao: string | null; capa_url: string | null
  publicado_em: string | null; trimestre: number | null; ano: number | null
  idioma: string; tags: string[]; downloads_count: number; views_count: number
  origem_externa_url: string | null
  categoria: { id: string; slug: string; nome: string; icon: string | null; cor: string | null } | null
  subcategoria: { slug: string; nome: string } | null
}

interface FileRow {
  id: string; rotulo: string; formato: string; url: string
  filename: string | null; tamanho_bytes: number | null
  mime_type: string | null; ordem: number
}

function fmtBytes(b: number | null): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function iconForFormato(f: string) {
  const fl = f.toLowerCase()
  if (fl === 'pdf' || fl === 'epub' || fl === 'mobi' || fl === 'docx') return HiOutlineDocumentText
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fl)) return HiOutlinePhotograph
  if (fl === 'mp4' || fl === 'mov') return HiOutlineVideoCamera
  return HiOutlineDocumentText
}

function colorForFormato(f: string): { bg: string; text: string } {
  const fl = f.toLowerCase()
  if (fl === 'pdf') return { bg: 'bg-red-50', text: 'text-red-700' }
  if (['png', 'jpg', 'jpeg', 'webp'].includes(fl)) return { bg: 'bg-blue-50', text: 'text-blue-700' }
  if (['mp4', 'mov'].includes(fl)) return { bg: 'bg-purple-50', text: 'text-purple-700' }
  if (['epub', 'mobi'].includes(fl)) return { bg: 'bg-amber-50', text: 'text-amber-700' }
  return { bg: 'bg-gray-50', text: 'text-gray-700' }
}

export default function DownloadsItemPage() {
  const { categoria_slug, item_slug } = useParams<{ categoria_slug: string; item_slug: string }>()
  const [item, setItem] = useState<Item | null>(null)
  const [files, setFiles] = useState<FileRow[]>([])
  const [relacionados, setRelacionados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => { if (item_slug) load() }, [item_slug])

  async function load() {
    setLoading(true)
    try {
      const { data: itemData } = await supabase
        .from('downloads_items')
        .select(`id, slug, titulo, subtitulo, descricao, capa_url, publicado_em, trimestre, ano, idioma, tags, downloads_count, views_count, origem_externa_url, categoria:downloads_categorias(id, slug, nome, icon, cor), subcategoria:downloads_subcategorias(slug, nome)`)
        .eq('slug', item_slug!)
        .maybeSingle()
      if (!itemData) { setItem(null); return }
      setItem(itemData as any)

      // Incrementa view (fire and forget)
      supabase.rpc('downloads_increment_count', { p_item_id: (itemData as any).id, p_field: 'views_count' }).then(() => {})

      const [filesRes, relRes] = await Promise.all([
        supabase.from('downloads_files').select('*').eq('item_id', (itemData as any).id).eq('ativo', true).order('ordem'),
        supabase.from('downloads_items')
          .select('id, slug, titulo, capa_url, categoria:downloads_categorias(slug)')
          .eq('categoria_id', (itemData as any).categoria.id)
          .neq('id', (itemData as any).id)
          .eq('ativo', true).eq('publico', true)
          .order('publicado_em', { ascending: false, nullsFirst: false })
          .limit(6),
      ])
      setFiles((filesRes.data || []) as any)
      setRelacionados((relRes.data || []))
    } finally { setLoading(false) }
  }

  async function handleDownload(f: FileRow) {
    if (item) {
      supabase.rpc('downloads_increment_count', { p_item_id: item.id, p_field: 'downloads_count' }).then(() => {})
    }
    // Trigger download em nova aba
    window.open(f.url, '_blank', 'noopener,noreferrer')
  }

  function share() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: item?.titulo || 'Download', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>
  if (!item) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Material não encontrado.</p>
      <Link to="/downloads" className="text-primary-600 hover:underline mt-2 inline-block">← Voltar para Downloads</Link>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
        <Link to="/downloads" className="hover:text-primary-700 inline-flex items-center gap-1">
          <HiOutlineArrowLeft className="w-3.5 h-3.5" /> Downloads
        </Link>
        <span>/</span>
        {item.categoria && (
          <>
            <Link to={`/downloads/${item.categoria.slug}`} className="hover:text-primary-700">{item.categoria.nome}</Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-700 font-medium truncate">{item.titulo}</span>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-gray-100 rounded-2xl overflow-hidden aspect-[3/4] shadow-md">
            {item.capa_url ? (
              <img src={item.capa_url} alt={item.titulo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl text-gray-300">📄</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {item.categoria && (
            <Link
              to={`/downloads/${item.categoria.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: (item.categoria.cor || '#006D43') + '20', color: item.categoria.cor || '#006D43' }}
            >
              <span>{item.categoria.icon}</span> {item.categoria.nome}
            </Link>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{item.titulo}</h1>
            {item.subtitulo && <p className="text-gray-500 mt-1">{item.subtitulo}</p>}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            {item.publicado_em && (
              <span className="inline-flex items-center gap-1"><HiOutlineCalendar className="w-4 h-4" /> {fmtDate(item.publicado_em)}</span>
            )}
            {item.trimestre && item.ano && (
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{item.trimestre}º Trimestre · {item.ano}</span>
            )}
            {item.idioma && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">🌐 {item.idioma}</span>}
            <span className="inline-flex items-center gap-1"><HiOutlineEye className="w-4 h-4" /> {item.views_count}</span>
            <span className="inline-flex items-center gap-1"><HiOutlineDownload className="w-4 h-4" /> {item.downloads_count}</span>
            <button onClick={share} className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 hover:underline">
              <HiOutlineShare className="w-4 h-4" /> {copiado ? 'Link copiado!' : 'Compartilhar'}
            </button>
          </div>

          {/* Descrição */}
          {item.descricao && (
            <div className="card">
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{item.descricao}</p>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((t, i) => (
                <span key={i} className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded">#{t}</span>
              ))}
            </div>
          )}

          {/* Lista de arquivos para download */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Arquivos disponíveis</h2>
            {files.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum arquivo cadastrado neste material.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {files.map(f => {
                  const Icon = iconForFormato(f.formato)
                  const cor = colorForFormato(f.formato)
                  return (
                    <li key={f.id} className="py-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cor.bg}`}>
                        <Icon className={`w-5 h-5 ${cor.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{f.rotulo}</p>
                        <p className="text-[11px] text-gray-500">
                          <span className="uppercase font-semibold">{f.formato}</span>
                          {f.tamanho_bytes && <> · {fmtBytes(f.tamanho_bytes)}</>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(f)}
                        className="btn-primary text-xs inline-flex items-center gap-1.5"
                      >
                        <HiOutlineDownload className="w-4 h-4" /> Baixar
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {item.origem_externa_url && (
            <p className="text-[11px] text-gray-400">
              Fonte original: <a href={item.origem_externa_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{item.origem_externa_url}</a>
            </p>
          )}
        </div>
      </div>

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Materiais relacionados</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {relacionados.map((r: any) => (
              <Link
                key={r.id}
                to={`/downloads/${r.categoria?.slug || categoria_slug}/${r.slug}`}
                className="block rounded-lg overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="aspect-[3/4] bg-gray-100">
                  {r.capa_url ? (
                    <img src={r.capa_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📄</div>
                  )}
                </div>
                <p className="p-2 text-xs font-medium text-gray-800 line-clamp-2">{r.titulo}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function fmtDate(s: string): string {
  try {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  } catch { return s }
}

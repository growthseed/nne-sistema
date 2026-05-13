import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineDownload, HiOutlineCalendar, HiOutlineEye,
  HiOutlineDocumentText, HiOutlinePhotograph, HiOutlineVideoCamera,
  HiOutlineShare, HiOutlineHome, HiOutlineChevronRight, HiOutlineGlobe,
  HiOutlineDocument, HiOutlineArchive, HiOutlineLink, HiOutlineCheck,
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

interface Relacionado {
  id: string; slug: string; titulo: string; capa_url: string | null
  categoria: { slug: string } | null
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
  if (fl === 'pdf') return HiOutlineDocumentText
  if (['epub', 'mobi', 'docx', 'doc'].includes(fl)) return HiOutlineDocument
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fl)) return HiOutlinePhotograph
  if (['mp4', 'mov', 'webm'].includes(fl)) return HiOutlineVideoCamera
  if (['zip', 'rar', '7z'].includes(fl)) return HiOutlineArchive
  return HiOutlineDocumentText
}

function styleForFormato(f: string): { bg: string; ring: string; text: string } {
  const fl = f.toLowerCase()
  if (fl === 'pdf') return { bg: 'bg-red-50', ring: 'ring-red-100', text: 'text-red-600' }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fl)) return { bg: 'bg-blue-50', ring: 'ring-blue-100', text: 'text-blue-600' }
  if (['mp4', 'mov', 'webm'].includes(fl)) return { bg: 'bg-purple-50', ring: 'ring-purple-100', text: 'text-purple-600' }
  if (['epub', 'mobi'].includes(fl)) return { bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-600' }
  if (['zip', 'rar'].includes(fl)) return { bg: 'bg-orange-50', ring: 'ring-orange-100', text: 'text-orange-600' }
  return { bg: 'bg-stone-100', ring: 'ring-stone-200', text: 'text-stone-600' }
}

export default function DownloadsItemPage() {
  const { categoria_slug, item_slug } = useParams<{ categoria_slug: string; item_slug: string }>()
  const [item, setItem] = useState<Item | null>(null)
  const [files, setFiles] = useState<FileRow[]>([])
  const [relacionados, setRelacionados] = useState<Relacionado[]>([])
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

      supabase.rpc('downloads_increment_count', {
        p_item_id: (itemData as any).id,
        p_field: 'views_count',
      }).then(() => {})

      const [filesRes, relRes] = await Promise.all([
        supabase.from('downloads_files').select('*').eq('item_id', (itemData as any).id).eq('ativo', true).order('ordem'),
        supabase.from('downloads_items')
          .select('id, slug, titulo, capa_url, categoria:downloads_categorias(slug)')
          .eq('categoria_id', (itemData as any).categoria.id)
          .neq('id', (itemData as any).id)
          .eq('ativo', true).eq('publico', true)
          .order('publicado_em', { ascending: false, nullsFirst: false })
          .limit(8),
      ])
      setFiles((filesRes.data || []) as any)
      setRelacionados((relRes.data || []) as any)
    } finally { setLoading(false) }
  }

  async function handleDownload(f: FileRow) {
    if (item) {
      supabase.rpc('downloads_increment_count', { p_item_id: item.id, p_field: 'downloads_count' }).then(() => {})
    }
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

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="animate-pulse grid lg:grid-cols-3 gap-10">
        <div className="aspect-[3/4] bg-stone-200 rounded-2xl" />
        <div className="lg:col-span-2 space-y-4">
          <div className="h-4 w-24 bg-stone-200 rounded" />
          <div className="h-10 w-3/4 bg-stone-200 rounded" />
          <div className="h-4 w-1/2 bg-stone-200 rounded" />
          <div className="h-40 bg-stone-200 rounded mt-6" />
        </div>
      </div>
    </div>
  )

  if (!item) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <HiOutlineDocumentText className="w-16 h-16 text-stone-300 mx-auto" />
      <p className="text-gray-500 mt-4">Material não encontrado.</p>
      <Link to="/downloads" className="mt-4 inline-flex items-center gap-1 text-primary-700 hover:underline">
        Voltar para Downloads
      </Link>
    </div>
  )

  const accent = item.categoria?.cor || '#047857'
  const total = files.reduce((s, f) => s + (f.tamanho_bytes || 0), 0)

  return (
    <>
      {/* Top banner: breadcrumb + accent strip */}
      <div className="bg-gradient-to-b from-stone-100 to-stone-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
            <Link to="/downloads" className="inline-flex items-center gap-1 hover:text-primary-700">
              <HiOutlineHome className="w-3.5 h-3.5" /> Downloads
            </Link>
            {item.categoria && (
              <>
                <HiOutlineChevronRight className="w-3 h-3 opacity-60" />
                <Link to={`/downloads/${item.categoria.slug}`} className="hover:text-primary-700">
                  {item.categoria.nome}
                </Link>
              </>
            )}
            <HiOutlineChevronRight className="w-3 h-3 opacity-60" />
            <span className="text-gray-900 font-medium truncate max-w-xs">{item.titulo}</span>
          </nav>
        </div>
      </div>

      <article className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-[22rem_1fr] xl:grid-cols-[26rem_1fr] gap-8 lg:gap-12">
          {/* Cover (sticky on desktop) */}
          <div>
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 shadow-xl ring-1 ring-black/5">
                {item.capa_url ? (
                  <img src={item.capa_url} alt={item.titulo} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400">
                    <HiOutlineDocumentText className="w-20 h-20" />
                    <p className="text-xs mt-3 uppercase tracking-wider">Material</p>
                  </div>
                )}
              </div>

              {/* CTAs mobile-friendly */}
              {files.length > 0 && (
                <div className="hidden lg:block">
                  <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-2">Resumo</p>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Arquivos</span>
                      <span className="font-semibold text-gray-900">{files.length}</span>
                    </div>
                    {total > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tamanho total</span>
                        <span className="font-semibold text-gray-900">{fmtBytes(total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Visualizações</span>
                      <span className="font-semibold text-gray-900">{item.views_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Downloads</span>
                      <span className="font-semibold text-gray-900">{item.downloads_count}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="min-w-0 space-y-8">
            {/* Header */}
            <header>
              {item.categoria && (
                <Link
                  to={`/downloads/${item.categoria.slug}`}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] font-semibold mb-3 hover:opacity-80"
                  style={{ color: accent }}
                >
                  <span className="w-6 h-px" style={{ background: accent }} />
                  {item.categoria.nome}
                  {item.subcategoria && ` · ${item.subcategoria.nome}`}
                </Link>
              )}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-gray-900 leading-[1.1] tracking-tight">
                {item.titulo}
              </h1>
              {item.subtitulo && (
                <p className="mt-4 text-lg text-gray-600 leading-relaxed max-w-2xl">{item.subtitulo}</p>
              )}

              {/* Meta */}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 pb-6 border-b border-gray-200">
                {item.publicado_em && (
                  <span className="inline-flex items-center gap-1.5">
                    <HiOutlineCalendar className="w-4 h-4" />
                    {fmtDate(item.publicado_em)}
                  </span>
                )}
                {item.trimestre && item.ano && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-medium text-gray-700">{item.trimestre}º Trimestre · {item.ano}</span>
                  </span>
                )}
                {item.idioma && (
                  <span className="inline-flex items-center gap-1.5">
                    <HiOutlineGlobe className="w-4 h-4" /> {item.idioma}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlineEye className="w-4 h-4" /> {item.views_count} visualizações
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlineDownload className="w-4 h-4" /> {item.downloads_count} downloads
                </span>
                <button
                  onClick={share}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 -my-1.5 rounded-full text-primary-700 hover:bg-primary-50 transition-colors"
                >
                  {copiado ? (
                    <><HiOutlineCheck className="w-4 h-4" /> Link copiado</>
                  ) : (
                    <><HiOutlineShare className="w-4 h-4" /> Compartilhar</>
                  )}
                </button>
              </div>
            </header>

            {/* Descrição */}
            {item.descricao && (
              <section>
                <h2 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-3">Sobre este material</h2>
                <div className="prose prose-stone max-w-none text-base text-gray-700 leading-relaxed whitespace-pre-line">
                  {item.descricao}
                </div>
              </section>
            )}

            {/* Arquivos */}
            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="font-serif text-2xl text-gray-900">Arquivos para download</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {files.length === 0
                      ? 'Nenhum arquivo disponível ainda.'
                      : `${files.length} ${files.length === 1 ? 'arquivo disponível' : 'arquivos disponíveis'}${total > 0 ? ` · ${fmtBytes(total)} no total` : ''}`}
                  </p>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-xl">
                  <HiOutlineDocumentText className="w-10 h-10 text-stone-300 mx-auto" />
                  <p className="text-sm text-gray-500 mt-2">Nenhum arquivo cadastrado neste material.</p>
                </div>
              ) : (
                <ul className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                  {files.map(f => {
                    const Icon = iconForFormato(f.formato)
                    const s = styleForFormato(f.formato)
                    return (
                      <li key={f.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-stone-50/70 transition-colors">
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${s.bg} ring-1 ${s.ring} shrink-0`}>
                          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{f.rotulo}</p>
                          <p className="text-[11px] sm:text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className="uppercase font-semibold tracking-wider">{f.formato}</span>
                            {f.tamanho_bytes && <span className="text-gray-400">·</span>}
                            {f.tamanho_bytes && <span>{fmtBytes(f.tamanho_bytes)}</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownload(f)}
                          className="shrink-0 inline-flex items-center gap-1.5 bg-primary-700 hover:bg-primary-800 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-sm transition-colors"
                        >
                          <HiOutlineDownload className="w-4 h-4" />
                          <span className="hidden sm:inline">Baixar</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <section>
                <h2 className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mb-3">Tópicos relacionados</h2>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((t, i) => (
                    <span key={i} className="text-xs text-gray-700 bg-stone-100 px-2.5 py-1 rounded-full">#{t}</span>
                  ))}
                </div>
              </section>
            )}

            {item.origem_externa_url && (
              <section className="text-xs text-gray-400 border-t border-gray-100 pt-4">
                <span className="inline-flex items-center gap-1.5">
                  <HiOutlineLink className="w-3.5 h-3.5" />
                  Fonte original:{' '}
                  <a
                    href={item.origem_externa_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 hover:underline truncate"
                  >
                    {item.origem_externa_url}
                  </a>
                </span>
              </section>
            )}
          </div>
        </div>
      </article>

      {/* Relacionados */}
      {relacionados.length > 0 && (
        <section className="bg-stone-100/70 border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: accent }}>
                  Continue explorando
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl text-gray-900">Materiais relacionados</h2>
              </div>
              {item.categoria && (
                <Link to={`/downloads/${item.categoria.slug}`} className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
                  Ver toda a categoria →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
              {relacionados.map(r => (
                <Link
                  key={r.id}
                  to={`/downloads/${r.categoria?.slug || categoria_slug}/${r.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[3/4] rounded-xl bg-stone-100 overflow-hidden border border-gray-200/70 group-hover:shadow-md group-hover:-translate-y-0.5 transition-all">
                    {r.capa_url ? (
                      <img src={r.capa_url} alt={r.titulo} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <HiOutlineDocumentText className="w-10 h-10 text-stone-300" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug px-0.5">{r.titulo}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function fmtDate(s: string): string {
  try {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  } catch { return s }
}

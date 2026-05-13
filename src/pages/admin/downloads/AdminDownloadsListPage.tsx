import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineTrash,
  HiOutlineEye, HiOutlineEyeOff, HiOutlineStar, HiOutlineDownload,
  HiOutlineDocumentText, HiOutlineCollection, HiOutlineFolderOpen,
  HiOutlineExternalLink, HiOutlineRefresh, HiOutlineAdjustments,
} from 'react-icons/hi'

interface AdminItem {
  id: string; slug: string; titulo: string; subtitulo: string | null
  capa_url: string | null; publicado_em: string | null
  ano: number | null; trimestre: number | null
  destaque: boolean; publico: boolean; ativo: boolean
  downloads_count: number; views_count: number
  updated_at: string
  categoria: { id: string; slug: string; nome: string; cor: string | null } | null
  files_count?: number
}

interface CategoriaOpt { id: string; slug: string; nome: string; cor: string | null }

interface Stats { items: number; arquivos: number; downloads: number; views: number }

export default function AdminDownloadsListPage() {
  const [items, setItems] = useState<AdminItem[]>([])
  const [categorias, setCategorias] = useState<CategoriaOpt[]>([])
  const [stats, setStats] = useState<Stats>({ items: 0, arquivos: 0, downloads: 0, views: 0 })
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroCat, setFiltroCat] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'publicado' | 'rascunho' | 'destaque'>('todos')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [catRes, itRes, filesRes] = await Promise.all([
        supabase.from('downloads_categorias').select('id, slug, nome, cor').order('ordem'),
        supabase.from('downloads_items')
          .select('id, slug, titulo, subtitulo, capa_url, publicado_em, ano, trimestre, destaque, publico, ativo, downloads_count, views_count, updated_at, categoria:downloads_categorias(id, slug, nome, cor)')
          .order('updated_at', { ascending: false }),
        supabase.from('downloads_files').select('item_id', { count: 'exact', head: false }).eq('ativo', true),
      ])
      const cats = (catRes.data || []) as CategoriaOpt[]
      const its = (itRes.data || []) as any as AdminItem[]
      const filesByItem: Record<string, number> = {}
      ;(filesRes.data || []).forEach((f: any) => {
        filesByItem[f.item_id] = (filesByItem[f.item_id] || 0) + 1
      })
      its.forEach(i => { i.files_count = filesByItem[i.id] || 0 })

      setCategorias(cats)
      setItems(its)
      setStats({
        items: its.length,
        arquivos: filesRes.data?.length || 0,
        downloads: its.reduce((s, i) => s + (i.downloads_count || 0), 0),
        views: its.reduce((s, i) => s + (i.views_count || 0), 0),
      })
    } catch (e: any) {
      toast.error(`Erro carregando: ${e.message || e}`)
    } finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    let list = items
    if (filtroCat !== 'todas') list = list.filter(i => i.categoria?.id === filtroCat)
    if (filtroStatus === 'publicado') list = list.filter(i => i.ativo && i.publico)
    else if (filtroStatus === 'rascunho') list = list.filter(i => !i.publico || !i.ativo)
    else if (filtroStatus === 'destaque') list = list.filter(i => i.destaque)
    if (busca.trim()) {
      const t = busca.toLowerCase()
      list = list.filter(i =>
        i.titulo.toLowerCase().includes(t) ||
        (i.subtitulo || '').toLowerCase().includes(t) ||
        i.slug.toLowerCase().includes(t),
      )
    }
    return list
  }, [items, busca, filtroCat, filtroStatus])

  async function togglePublico(it: AdminItem) {
    const novo = !it.publico
    const { error } = await supabase.from('downloads_items').update({ publico: novo }).eq('id', it.id)
    if (error) return toast.error(error.message)
    setItems(prev => prev.map(p => p.id === it.id ? { ...p, publico: novo } : p))
    toast.success(novo ? 'Publicado' : 'Despublicado')
  }

  async function toggleDestaque(it: AdminItem) {
    const novo = !it.destaque
    const { error } = await supabase.from('downloads_items').update({ destaque: novo }).eq('id', it.id)
    if (error) return toast.error(error.message)
    setItems(prev => prev.map(p => p.id === it.id ? { ...p, destaque: novo } : p))
    toast.success(novo ? 'Marcado como destaque' : 'Removido dos destaques')
  }

  async function excluir(it: AdminItem) {
    if (!confirm(`Excluir "${it.titulo}"?\n\nEsta ação remove o material e seus arquivos do banco. Não há volta.`)) return
    const { error } = await supabase.from('downloads_items').delete().eq('id', it.id)
    if (error) return toast.error(error.message)
    setItems(prev => prev.filter(p => p.id !== it.id))
    toast.success('Material excluído')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Downloads</h1>
          <p className="text-sm text-gray-500">
            Biblioteca de materiais publicada em{' '}
            <Link to="/downloads" target="_blank" className="text-primary-700 hover:underline inline-flex items-center gap-1">
              /downloads <HiOutlineExternalLink className="w-3 h-3" />
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
            title="Recarregar"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            <span className="hidden sm:inline">Recarregar</span>
          </button>
          <Link to="/admin/downloads/configuracoes" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <HiOutlineAdjustments className="w-4 h-4" />
            <span className="hidden sm:inline">Configurar página</span>
            <span className="sm:hidden">Configurar</span>
          </Link>
          <Link to="/admin/downloads/categorias" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <HiOutlineFolderOpen className="w-4 h-4" />
            Categorias
          </Link>
          <Link to="/admin/downloads/novo" className="btn-primary inline-flex items-center gap-1.5 text-sm">
            <HiOutlinePlus className="w-4 h-4" />
            Novo material
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={HiOutlineCollection} label="Materiais" value={stats.items} accent="text-primary-700" />
        <StatCard icon={HiOutlineDocumentText} label="Arquivos" value={stats.arquivos} accent="text-blue-700" />
        <StatCard icon={HiOutlineDownload} label="Downloads" value={stats.downloads} accent="text-emerald-700" />
        <StatCard icon={HiOutlineEye} label="Visualizações" value={stats.views} accent="text-amber-700" />
      </div>

      {/* Filtros */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por título, subtítulo ou slug..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={filtroCat}
          onChange={e => setFiltroCat(e.target.value)}
          className="input-field sm:w-auto text-sm"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value as any)}
          className="input-field sm:w-auto text-sm"
        >
          <option value="todos">Todos os status</option>
          <option value="publicado">Publicados</option>
          <option value="rascunho">Rascunhos / despublicados</option>
          <option value="destaque">Em destaque</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <HiOutlineDocumentText className="w-12 h-12 text-stone-300 mx-auto" />
          <p className="text-gray-500 mt-3">Nenhum material encontrado.</p>
          {items.length === 0 && (
            <Link to="/admin/downloads/novo" className="btn-primary inline-flex items-center gap-1.5 text-sm mt-4">
              <HiOutlinePlus className="w-4 h-4" /> Adicionar primeiro material
            </Link>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 border-b border-gray-200">
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 font-semibold">Material</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Período</th>
                  <th className="px-4 py-3 font-semibold text-center">Arquivos</th>
                  <th className="px-4 py-3 font-semibold text-center hidden sm:table-cell">Downloads</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(it => (
                  <tr key={it.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-16 rounded-md bg-stone-100 overflow-hidden ring-1 ring-gray-200 shrink-0">
                          {it.capa_url ? (
                            <img src={it.capa_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <HiOutlineDocumentText className="w-5 h-5 text-stone-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900 truncate">{it.titulo}</p>
                            {it.destaque && <HiOutlineStar className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Destaque" />}
                          </div>
                          {it.subtitulo && <p className="text-xs text-gray-500 truncate">{it.subtitulo}</p>}
                          <p className="text-[10px] text-gray-400 truncate font-mono">{it.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {it.categoria && (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded"
                          style={{
                            background: (it.categoria.cor || '#047857') + '15',
                            color: it.categoria.cor || '#047857',
                          }}
                        >
                          {it.categoria.nome}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-600">
                      {it.trimestre && it.ano
                        ? `${it.trimestre}º TRI · ${it.ano}`
                        : it.publicado_em
                          ? fmtDate(it.publicado_em)
                          : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      <span className={it.files_count ? 'text-gray-700 font-semibold' : 'text-gray-400'}>
                        {it.files_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs hidden sm:table-cell">
                      <span className="text-gray-700 font-semibold">{it.downloads_count}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {it.publico && it.ativo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Publicado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Rascunho
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleDestaque(it)}
                          className={`p-2 rounded-lg transition-colors ${it.destaque ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={it.destaque ? 'Remover destaque' : 'Marcar como destaque'}
                        >
                          <HiOutlineStar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => togglePublico(it)}
                          className={`p-2 rounded-lg transition-colors ${it.publico ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={it.publico ? 'Despublicar' : 'Publicar'}
                        >
                          {it.publico ? <HiOutlineEye className="w-4 h-4" /> : <HiOutlineEyeOff className="w-4 h-4" />}
                        </button>
                        {it.categoria && (
                          <Link
                            to={`/downloads/${it.categoria.slug}/${it.slug}`}
                            target="_blank"
                            className="p-2 rounded-lg text-gray-400 hover:text-primary-700 hover:bg-gray-100"
                            title="Ver no site"
                          >
                            <HiOutlineExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <Link
                          to={`/admin/downloads/${it.id}`}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-700 hover:bg-gray-100"
                          title="Editar"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => excluir(it)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Excluir"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value.toLocaleString('pt-BR')}</p>
      </div>
    </div>
  )
}

function fmtDate(s: string): string {
  try {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  } catch { return s }
}

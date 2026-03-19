import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calcularIdade } from '@/lib/secretaria-constants'
import { exportToExcel, exportToPDF, MEMBROS_COLUMNS } from '@/lib/export-utils'
import {
  FiPlus, FiSearch, FiFilter, FiEye, FiPhone, FiMail,
  FiDownload, FiChevronDown, FiChevronUp, FiFileText
} from 'react-icons/fi'

interface MembroResumo {
  id: string
  nome: string
  foto: string | null
  celular: string | null
  telefone: string | null
  email: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  situacao: string
  tipo: string
  cargo: string | null
  sexo: string | null
  data_nascimento: string | null
  created_at: string
  igreja: { nome: string } | null
}

const situacaoColors: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-600',
  transferido: 'bg-blue-100 text-blue-700',
  excluido: 'bg-red-100 text-red-700',
  falecido: 'bg-purple-100 text-purple-700',
}

const tipoColors: Record<string, string> = {
  membro: 'bg-primary-100 text-primary-700',
  interessado: 'bg-amber-100 text-amber-700',
}

export default function MembrosPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [membros, setMembros] = useState<MembroResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroSexo, setFiltroSexo] = useState('todos')
  const [filtroCidade, setFiltroCidade] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Pagination
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  // Counters
  const [countAtivos, setCountAtivos] = useState(0)
  const [countInativos, setCountInativos] = useState(0)
  const [countInteressados, setCountInteressados] = useState(0)

  useEffect(() => {
    fetchMembros()
  }, [page, filtroSituacao, filtroTipo, filtroSexo, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (profile) fetchCounts()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  function buildScopeFilter(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id!)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id!)
    return query.eq('igreja_id', profile.igreja_id!)
  }

  async function fetchCounts() {
    const [ativosRes, inativosRes, interessadosRes] = await Promise.all([
      buildScopeFilter(supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'ativo')),
      buildScopeFilter(supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'inativo')),
      buildScopeFilter(supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('tipo', 'interessado')),
    ])
    setCountAtivos(ativosRes.count || 0)
    setCountInativos(inativosRes.count || 0)
    setCountInteressados(interessadosRes.count || 0)
  }

  async function fetchMembros() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('pessoas')
        .select('id, nome, foto, celular, telefone, email, endereco_cidade, endereco_estado, situacao, tipo, cargo, sexo, data_nascimento, created_at, igreja:igrejas(nome)', { count: 'exact' })
        .order('nome')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      query = buildScopeFilter(query)

      if (filtroSituacao !== 'todos') {
        query = query.eq('situacao', filtroSituacao)
      }
      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo)
      }
      if (filtroSexo !== 'todos') {
        query = query.eq('sexo', filtroSexo)
      }
      if (busca.trim()) {
        query = query.ilike('nome', `%${busca.trim()}%`)
      }
      if (filtroCidade.trim()) {
        query = query.ilike('endereco_cidade', `%${filtroCidade.trim()}%`)
      }

      const { data, count, error } = await query
      if (error) throw error

      setMembros(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Erro ao buscar membros:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    fetchMembros()
  }

  function resetFilters() {
    setBusca('')
    setFiltroSituacao('todos')
    setFiltroTipo('todos')
    setFiltroSexo('todos')
    setFiltroCidade('')
    setPage(0)
  }

  const hasActiveFilters = filtroSituacao !== 'todos' || filtroTipo !== 'todos' || filtroSexo !== 'todos' || filtroCidade.trim() !== '' || busca.trim() !== ''

  async function handleExport(format: 'excel' | 'pdf') {
    setExporting(true)
    try {
      // Fetch all (no pagination) for export
      let query = supabase
        .from('pessoas')
        .select('id, nome, celular, telefone, email, endereco_cidade, endereco_estado, situacao, tipo, cargo, sexo, data_nascimento, igreja:igrejas(nome)')
        .order('nome')
        .limit(10000)

      query = buildScopeFilter(query)

      if (filtroSituacao !== 'todos') query = query.eq('situacao', filtroSituacao)
      if (filtroTipo !== 'todos') query = query.eq('tipo', filtroTipo)
      if (filtroSexo !== 'todos') query = query.eq('sexo', filtroSexo)
      if (busca.trim()) query = query.ilike('nome', `%${busca.trim()}%`)
      if (filtroCidade.trim()) query = query.ilike('endereco_cidade', `%${filtroCidade.trim()}%`)

      const { data } = await query
      if (!data || data.length === 0) return

      const exportData = data.map(p => ({
        ...p,
        igreja_nome: (p.igreja as any)?.nome || '',
        data_nascimento: p.data_nascimento ? new Date(p.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '',
        sexo: p.sexo === 'masculino' ? 'M' : p.sexo === 'feminino' ? 'F' : '',
      }))

      const filename = `membros_${new Date().toISOString().slice(0, 10)}`
      if (format === 'excel') {
        exportToExcel(exportData, MEMBROS_COLUMNS, filename)
      } else {
        exportToPDF(exportData, MEMBROS_COLUMNS, filename, 'Relatório de Membros')
      }
    } catch (err) {
      console.error('Erro ao exportar:', err)
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Membros & Interessados</h1>
          <p className="text-gray-500 mt-1">{totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              disabled={exporting}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
              onClick={() => handleExport('excel')}
            >
              <FiDownload className="w-4 h-4" />
              {exporting ? 'Exportando...' : 'Excel'}
            </button>
          </div>
          <button
            disabled={exporting}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
            onClick={() => handleExport('pdf')}
          >
            <FiFileText className="w-4 h-4" />
            PDF
          </button>
          <Link to="/cadastro" className="btn-primary inline-flex items-center gap-2">
            <FiPlus className="w-4 h-4" />
            Novo Cadastro
          </Link>
        </div>
      </div>

      {/* Quick counters */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => { setFiltroTipo('membro'); setFiltroSituacao('ativo'); setPage(0) }}
          className={`card py-3 text-center transition-all ${filtroTipo === 'membro' && filtroSituacao === 'ativo' ? 'ring-2 ring-green-400' : 'hover:shadow-md'}`}
        >
          <p className="text-2xl font-bold text-green-600">{countAtivos}</p>
          <p className="text-xs text-gray-500">Membros Ativos</p>
        </button>
        <button
          onClick={() => { setFiltroTipo('membro'); setFiltroSituacao('inativo'); setPage(0) }}
          className={`card py-3 text-center transition-all ${filtroTipo === 'membro' && filtroSituacao === 'inativo' ? 'ring-2 ring-gray-400' : 'hover:shadow-md'}`}
        >
          <p className="text-2xl font-bold text-gray-500">{countInativos}</p>
          <p className="text-xs text-gray-500">Membros Inativos</p>
        </button>
        <button
          onClick={() => { setFiltroTipo('interessado'); setFiltroSituacao('todos'); setPage(0) }}
          className={`card py-3 text-center transition-all ${filtroTipo === 'interessado' ? 'ring-2 ring-amber-400' : 'hover:shadow-md'}`}
        >
          <p className="text-2xl font-bold text-amber-600">{countInteressados}</p>
          <p className="text-xs text-gray-500">Interessados</p>
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + main filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="input-field pl-10"
                placeholder="Buscar por nome..."
              />
            </form>
            <select
              value={filtroTipo}
              onChange={(e) => { setFiltroTipo(e.target.value); setPage(0) }}
              className="input-field w-auto"
            >
              <option value="todos">Todos os tipos</option>
              <option value="membro">Membros</option>
              <option value="interessado">Interessados</option>
            </select>
            <select
              value={filtroSituacao}
              onChange={(e) => { setFiltroSituacao(e.target.value); setPage(0) }}
              className="input-field w-auto"
            >
              <option value="todos">Todas situações</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="transferido">Transferido</option>
              <option value="excluido">Excluído</option>
              <option value="falecido">Falecido</option>
            </select>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn-secondary inline-flex items-center gap-1.5 text-sm"
            >
              <FiFilter className="w-4 h-4" />
              Filtros
              {showAdvanced ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Row 2: Advanced filters (collapsible) */}
          {showAdvanced && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
              <select
                value={filtroSexo}
                onChange={(e) => { setFiltroSexo(e.target.value); setPage(0) }}
                className="input-field w-auto"
              >
                <option value="todos">Ambos os sexos</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
              <input
                value={filtroCidade}
                onChange={(e) => setFiltroCidade(e.target.value)}
                onBlur={() => { setPage(0); fetchMembros() }}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(0); fetchMembros() } }}
                className="input-field"
                placeholder="Filtrar por cidade..."
              />
              {hasActiveFilters && (
                <button onClick={resetFilters} className="text-sm text-red-500 hover:text-red-700 whitespace-nowrap">
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
                </div>
                <div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ) : membros.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum registro encontrado</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-primary-600 hover:underline text-sm mt-2">
                Limpar filtros e tentar novamente
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Cidade/UF</th>
                    <th className="px-4 py-3">Igreja</th>
                    <th className="px-4 py-3">Idade</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {membros.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => navigate(`/membros/${m.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {m.foto ? (
                            <img src={m.foto} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${m.tipo === 'interessado' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                              {m.nome.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-800">{m.nome}</span>
                            {m.cargo && <p className="text-xs text-gray-400">{m.cargo}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColors[m.tipo] || 'bg-gray-100 text-gray-600'}`}>
                          {m.tipo === 'membro' ? 'Membro' : 'Interessado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          {(m.celular || m.telefone) && (() => {
                            const fone = (m.celular || m.telefone || '').replace(/\D/g, '')
                            const whatsNum = fone.length <= 11 ? `55${fone}` : fone
                            return (
                              <span className="flex items-center gap-1 text-xs">
                                <FiPhone className="w-3 h-3" /> {m.celular || m.telefone}
                                {fone.length >= 10 && (
                                  <a href={`https://wa.me/${whatsNum}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 ml-1" title="WhatsApp">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741 .981.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                  </a>
                                )}
                              </span>
                            )
                          })()}
                          {m.email && (
                            <span className="flex items-center gap-1 text-xs truncate max-w-[180px]">
                              <FiMail className="w-3 h-3" /> {m.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {m.endereco_cidade && m.endereco_estado ? `${m.endereco_cidade}/${m.endereco_estado}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[140px]">
                        {(m.igreja as any)?.nome || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {m.data_nascimento ? `${calcularIdade(m.data_nascimento)} anos` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${situacaoColors[m.situacao] || 'bg-gray-100 text-gray-600'}`}>
                          {m.situacao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/membros/${m.id}`) }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                          title="Ver detalhes"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {membros.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/membros/${m.id}`)}
                  className="p-4 flex items-center gap-3 cursor-pointer active:bg-gray-50"
                >
                  {m.foto ? (
                    <img src={m.foto} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${m.tipo === 'interessado' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
                      {m.nome.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{m.nome}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {(m.igreja as any)?.nome || m.endereco_cidade || 'Sem igreja'}
                      {m.data_nascimento && ` • ${calcularIdade(m.data_nascimento)} anos`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${situacaoColors[m.situacao] || 'bg-gray-100 text-gray-600'}`}>
                      {m.situacao}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tipoColors[m.tipo] || 'bg-gray-100 text-gray-600'}`}>
                      {m.tipo === 'membro' ? 'Membro' : 'Interessado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-gray-500">
                  Página {page + 1} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

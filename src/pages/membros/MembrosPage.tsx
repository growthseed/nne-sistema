import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { FiPlus, FiSearch, FiFilter, FiEye, FiEdit, FiPhone, FiMail } from 'react-icons/fi'

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
  cargo: string | null
  created_at: string
}

const situacaoColors: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-600',
  transferido: 'bg-blue-100 text-blue-700',
  excluido: 'bg-red-100 text-red-700',
  falecido: 'bg-purple-100 text-purple-700',
}

export default function MembrosPage() {
  const { profile } = useAuth()
  const [membros, setMembros] = useState<MembroResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('todos')
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    fetchMembros()
  }, [page, filtroSituacao, profile])

  async function fetchMembros() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('pessoas')
        .select('id, nome, foto, celular, telefone, email, endereco_cidade, endereco_estado, situacao, cargo, created_at', { count: 'exact' })
        .order('nome')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      // Filtro hierarquico por escopo do usuario
      if (profile.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile.uniao_id!)
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      if (filtroSituacao !== 'todos') {
        query = query.eq('situacao', filtroSituacao)
      }

      if (busca.trim()) {
        query = query.ilike('nome', `%${busca.trim()}%`)
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Membros</h1>
          <p className="text-gray-500 mt-1">{totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/cadastro" className="btn-primary inline-flex items-center gap-2 w-fit">
          <FiPlus className="w-4 h-4" />
          Novo Cadastro
        </Link>
      </div>

      {/* Filtros */}
      <div className="card">
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
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400 w-4 h-4" />
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
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : membros.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum membro encontrado</p>
            <Link to="/cadastro" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
              Cadastrar primeiro membro
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Membro</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Cidade/UF</th>
                    <th className="px-4 py-3">Cargo</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {membros.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {m.foto ? (
                            <img src={m.foto} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                              {m.nome.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{m.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          {(m.celular || m.telefone) && (
                            <span className="flex items-center gap-1 text-xs">
                              <FiPhone className="w-3 h-3" /> {(m.celular || m.telefone)}
                            </span>
                          )}
                          {m.email && (
                            <span className="flex items-center gap-1 text-xs">
                              <FiMail className="w-3 h-3" /> {m.email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {m.endereco_cidade && m.endereco_estado ? `${m.endereco_cidade}/${m.endereco_estado}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.cargo || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${situacaoColors[m.situacao] || 'bg-gray-100 text-gray-600'}`}>
                          {m.situacao}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600" title="Visualizar">
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600" title="Editar">
                            <FiEdit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {membros.map((m) => (
                <div key={m.id} className="p-4 flex items-center gap-3">
                  {m.foto ? (
                    <img src={m.foto} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0">
                      {m.nome.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{m.nome}</p>
                    <p className="text-xs text-gray-400">{m.endereco_cidade}/{m.endereco_estado} • {m.cargo || 'Membro'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${situacaoColors[m.situacao] || 'bg-gray-100 text-gray-600'}`}>
                    {m.situacao}
                  </span>
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

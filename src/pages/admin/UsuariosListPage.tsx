import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/types'
import {
  FiUsers, FiSearch, FiPlus, FiEdit, FiShield,
} from 'react-icons/fi'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  admin_uniao: 'Admin União',
  admin_associacao: 'Admin Associação',
  diretor_es: 'Diretor ES',
  professor_es: 'Professor ES',
  secretario_es: 'Secretário ES',
  tesoureiro: 'Tesoureiro',
  secretario_igreja: 'Secretário Igreja',
  membro: 'Membro',
}

interface UsuarioRow extends UserProfile {
  igreja?: { nome: string } | null
  associacao?: { nome: string; sigla: string } | null
  uniao?: { nome: string; sigla: string } | null
  avatar_url?: string | null
}

const PAGE_SIZE = 20

export default function UsuariosListPage() {
  const navigate = useNavigate()
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaAtiva, setBuscaAtiva] = useState('')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filterPapel, setFilterPapel] = useState<string>('')
  const [filterAtivo, setFilterAtivo] = useState<'all' | 'ativos' | 'inativos'>('all')

  useEffect(() => { fetchUsuarios() }, [page, buscaAtiva, filterPapel, filterAtivo])

  async function fetchUsuarios() {
    setLoading(true)
    try {
      let query = supabase
        .from('usuarios')
        .select(
          '*, igreja:igrejas(nome), associacao:associacoes(nome, sigla), uniao:unioes(nome, sigla)',
          { count: 'exact' },
        )
        .order('nome')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (buscaAtiva) query = query.or(`nome.ilike.%${buscaAtiva}%,email.ilike.%${buscaAtiva}%`)
      if (filterPapel) query = query.eq('papel', filterPapel)
      if (filterAtivo === 'ativos') query = query.eq('ativo', true)
      if (filterAtivo === 'inativos') query = query.eq('ativo', false)
      const { data, count, error } = await query
      if (error) throw error
      setUsuarios((data || []) as UsuarioRow[])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Erro ao buscar usuários:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    setBuscaAtiva(busca.trim())
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-500 p-3 rounded-xl text-white">
            <FiUsers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
            <p className="text-gray-500 mt-0.5">Gerencie acessos, permissões e senhas da plataforma</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/usuarios/novo')}
          className="btn-primary inline-flex items-center gap-2 shrink-0"
        >
          <FiPlus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="input-field pl-10"
                placeholder="Buscar por nome ou e-mail..."
              />
            </div>
            <button type="submit" className="btn-secondary inline-flex items-center gap-2 shrink-0">
              <FiSearch className="w-4 h-4" /> Buscar
            </button>
          </form>
          <div className="flex gap-2">
            <select
              value={filterPapel}
              onChange={e => { setFilterPapel(e.target.value); setPage(0) }}
              className="input-field"
            >
              <option value="">Todos os papéis</option>
              {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={filterAtivo}
              onChange={e => { setFilterAtivo(e.target.value as any); setPage(0) }}
              className="input-field"
            >
              <option value="all">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando usuários...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum usuário encontrado</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Papel</th>
                    <th className="px-4 py-3">Associação</th>
                    <th className="px-4 py-3">Igreja</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/usuarios/${u.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden">
                            {u.avatar_url
                              ? <img src={u.avatar_url} alt={u.nome} className="w-full h-full object-cover" />
                              : u.nome?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-800">{u.nome}</span>
                            {u.telefone && <p className="text-xs text-gray-400">{u.telefone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                          <FiShield className="w-3 h-3" />{roleLabels[u.papel] || u.papel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.associacao?.sigla || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.igreja?.nome || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/usuarios/${u.id}`) }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                          title="Editar"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {usuarios.map(u => (
                <div
                  key={u.id}
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/usuarios/${u.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold shrink-0 overflow-hidden">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.nome} className="w-full h-full object-cover" />
                      : u.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{u.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">{roleLabels[u.papel] || u.papel}</span>
                      {u.associacao?.sigla && <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{u.associacao.sigla}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <FiEdit className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary text-xs disabled:opacity-40">Anterior</button>
                <span className="text-gray-500">Página {page + 1} de {totalPages} · {totalCount} usuários</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-secondary text-xs disabled:opacity-40">Próxima</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

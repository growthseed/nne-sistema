import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Igreja, Associacao, Uniao } from '@/types'
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, FiMapPin, FiPhone, FiMail } from 'react-icons/fi'

type IgrejaComAssociacao = Igreja & {
  associacao: { nome: string; sigla: string } | null
}

const FORM_VAZIO = {
  nome: '',
  associacao_id: '',
  uniao_id: '',
  endereco_rua: '',
  endereco_numero: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_estado: '',
  endereco_cep: '',
  coordenadas_lat: '' as string | number,
  coordenadas_lng: '' as string | number,
  pastor: '',
  telefone: '',
  email: '',
  ativo: true,
}

export default function IgrejasPage() {
  const { profile, hasRole } = useAuth()

  const [igrejas, setIgrejas] = useState<IgrejaComAssociacao[]>([])
  const [associacoes, setAssociacoes] = useState<Associacao[]>([])
  const [unioes, setUnioes] = useState<Uniao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [erro, setErro] = useState('')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  const podeGerenciar = hasRole(['admin', 'admin_uniao', 'admin_associacao'])

  useEffect(() => {
    if (profile) {
      fetchIgrejas()
      fetchAssociacoes()
      fetchUnioes()
    }
  }, [profile, filtroAtivo, page])

  async function fetchUnioes() {
    try {
      const { data, error } = await supabase
        .from('unioes')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      setUnioes(data || [])
    } catch (err) {
      console.error('Erro ao buscar uniões:', err)
    }
  }

  async function fetchAssociacoes() {
    if (!profile) return
    try {
      let query = supabase
        .from('associacoes')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      // Filtro hierarquico para associacoes disponiveis
      if (profile.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile.uniao_id!)
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('id', profile.associacao_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setAssociacoes(data || [])
    } catch (err) {
      console.error('Erro ao buscar associações:', err)
    }
  }

  async function fetchIgrejas() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('igrejas')
        .select('*, associacao:associacoes(nome, sigla)', { count: 'exact' })
        .order('nome')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      // Filtro hierarquico
      if (profile.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile.uniao_id!)
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else if (profile.papel !== 'admin') {
        // Papeis abaixo veem apenas sua igreja
        if (profile.igreja_id) {
          query = query.eq('id', profile.igreja_id)
        }
      }

      if (filtroAtivo === 'ativo') query = query.eq('ativo', true)
      if (filtroAtivo === 'inativo') query = query.eq('ativo', false)

      if (busca.trim()) {
        query = query.ilike('nome', `%${busca.trim()}%`)
      }

      const { data, count, error } = await query
      if (error) throw error
      setIgrejas((data || []) as IgrejaComAssociacao[])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Erro ao buscar igrejas:', err)
    } finally {
      setLoading(false)
    }
  }

  function abrirModalNovo() {
    setForm({
      ...FORM_VAZIO,
      uniao_id: profile?.papel === 'admin_uniao' ? profile.uniao_id || '' : '',
      associacao_id: profile?.papel === 'admin_associacao' ? profile.associacao_id || '' : '',
    })
    setEditandoId(null)
    setErro('')
    setShowModal(true)
  }

  function abrirModalEditar(igreja: IgrejaComAssociacao) {
    setForm({
      nome: igreja.nome,
      associacao_id: igreja.associacao_id,
      uniao_id: igreja.uniao_id,
      endereco_rua: igreja.endereco_rua || '',
      endereco_numero: igreja.endereco_numero || '',
      endereco_bairro: igreja.endereco_bairro || '',
      endereco_cidade: igreja.endereco_cidade || '',
      endereco_estado: igreja.endereco_estado || '',
      endereco_cep: igreja.endereco_cep || '',
      coordenadas_lat: igreja.coordenadas_lat ?? '',
      coordenadas_lng: igreja.coordenadas_lng ?? '',
      pastor: igreja.pastor || '',
      telefone: igreja.telefone || '',
      email: igreja.email || '',
      ativo: igreja.ativo,
    })
    setEditandoId(igreja.id)
    setErro('')
    setShowModal(true)
  }

  function fecharModal() {
    setShowModal(false)
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setErro('')
  }

  // Quando seleciona a associacao, preenche automaticamente a uniao
  function handleAssociacaoChange(associacaoId: string) {
    const assoc = associacoes.find((a) => a.id === associacaoId)
    setForm({
      ...form,
      associacao_id: associacaoId,
      uniao_id: assoc?.uniao_id || form.uniao_id,
    })
  }

  async function salvar() {
    if (!form.nome.trim() || !form.associacao_id || !form.uniao_id) {
      setErro('Nome, associação e união são obrigatórios.')
      return
    }

    setSaving(true)
    setErro('')
    try {
      const payload = {
        nome: form.nome.trim(),
        associacao_id: form.associacao_id,
        uniao_id: form.uniao_id,
        endereco_rua: form.endereco_rua?.trim() || null,
        endereco_numero: form.endereco_numero?.trim() || null,
        endereco_bairro: form.endereco_bairro?.trim() || null,
        endereco_cidade: form.endereco_cidade?.trim() || null,
        endereco_estado: form.endereco_estado?.trim() || null,
        endereco_cep: form.endereco_cep?.trim() || null,
        coordenadas_lat: form.coordenadas_lat !== '' ? Number(form.coordenadas_lat) : null,
        coordenadas_lng: form.coordenadas_lng !== '' ? Number(form.coordenadas_lng) : null,
        pastor: form.pastor?.trim() || null,
        telefone: form.telefone?.trim() || null,
        email: form.email?.trim() || null,
        ativo: form.ativo,
      }

      if (editandoId) {
        const { error } = await supabase
          .from('igrejas')
          .update(payload)
          .eq('id', editandoId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('igrejas')
          .insert(payload)
        if (error) throw error
      }

      fecharModal()
      fetchIgrejas()
    } catch (err: any) {
      console.error('Erro ao salvar igreja:', err)
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function excluir(igreja: IgrejaComAssociacao) {
    if (!confirm(`Deseja realmente excluir a igreja "${igreja.nome}"?`)) return

    try {
      const { error } = await supabase
        .from('igrejas')
        .delete()
        .eq('id', igreja.id)
      if (error) throw error
      fetchIgrejas()
    } catch (err: any) {
      console.error('Erro ao excluir igreja:', err)
      alert(err.message || 'Erro ao excluir. Verifique se não existem membros vinculados.')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(0)
    fetchIgrejas()
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  // Filtrar associacoes por uniao selecionada no form (para o modal)
  const associacoesFiltradas = form.uniao_id
    ? associacoes.filter((a) => a.uniao_id === form.uniao_id)
    : associacoes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Igrejas</h1>
          <p className="text-gray-500 mt-1">
            {totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        {podeGerenciar && (
          <button onClick={abrirModalNovo} className="btn-primary inline-flex items-center gap-2 w-fit">
            <FiPlus className="w-4 h-4" />
            Nova Igreja
          </button>
        )}
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
              placeholder="Buscar por nome da igreja..."
            />
          </form>
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400 w-4 h-4" />
            <select
              value={filtroAtivo}
              onChange={(e) => { setFiltroAtivo(e.target.value as any); setPage(0) }}
              className="input-field w-auto"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : igrejas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhuma igreja encontrada</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Associação</th>
                    <th className="px-4 py-3">Cidade/UF</th>
                    <th className="px-4 py-3">Pastor</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    {podeGerenciar && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {igrejas.map((ig) => (
                    <tr key={ig.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{ig.nome}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {ig.associacao ? `${ig.associacao.nome} (${ig.associacao.sigla})` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {ig.endereco_cidade && ig.endereco_estado
                          ? `${ig.endereco_cidade}/${ig.endereco_estado}`
                          : ig.endereco_estado || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{ig.pastor || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          {ig.telefone && (
                            <span className="flex items-center gap-1 text-xs">
                              <FiPhone className="w-3 h-3" /> {ig.telefone}
                            </span>
                          )}
                          {ig.email && (
                            <span className="flex items-center gap-1 text-xs">
                              <FiMail className="w-3 h-3" /> {ig.email}
                            </span>
                          )}
                          {!ig.telefone && !ig.email && <span className="text-xs">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ig.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {ig.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(ig.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      {podeGerenciar && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => abrirModalEditar(ig)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                              title="Editar"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluir(ig)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                              title="Excluir"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {igrejas.map((ig) => (
                <div key={ig.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{ig.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ig.associacao?.sigla || '-'}
                        {ig.endereco_cidade ? ` - ${ig.endereco_cidade}/${ig.endereco_estado}` : ''}
                      </p>
                      {ig.pastor && (
                        <p className="text-xs text-gray-400">Pastor: {ig.pastor}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ig.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {ig.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {podeGerenciar && (
                        <>
                          <button
                            onClick={() => abrirModalEditar(ig)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => excluir(ig)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginacao */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary text-xs disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-gray-500">
                  Página {page + 1} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editandoId ? 'Editar Igreja' : 'Nova Igreja'}
            </h2>

            {erro && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {erro}
              </div>
            )}

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="label-field">Nome da Igreja *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Igreja Adventista Central de Recife"
                />
              </div>

              {/* Hierarquia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Uniao *</label>
                  <select
                    value={form.uniao_id}
                    onChange={(e) => setForm({ ...form, uniao_id: e.target.value, associacao_id: '' })}
                    className="input-field"
                    disabled={hasRole(['admin_uniao', 'admin_associacao'])}
                  >
                    <option value="">Selecione...</option>
                    {unioes.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.sigla})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">Associação *</label>
                  <select
                    value={form.associacao_id}
                    onChange={(e) => handleAssociacaoChange(e.target.value)}
                    className="input-field"
                    disabled={profile?.papel === 'admin_associacao'}
                  >
                    <option value="">Selecione...</option>
                    {associacoesFiltradas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} ({a.sigla})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Endereco */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                  <FiMapPin className="w-4 h-4" />
                  Endereço
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label-field">Rua</label>
                    <input
                      value={form.endereco_rua}
                      onChange={(e) => setForm({ ...form, endereco_rua: e.target.value })}
                      className="input-field"
                      placeholder="Rua / Avenida"
                    />
                  </div>
                  <div>
                    <label className="label-field">Número</label>
                    <input
                      value={form.endereco_numero}
                      onChange={(e) => setForm({ ...form, endereco_numero: e.target.value })}
                      className="input-field"
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                  <div>
                    <label className="label-field">Bairro</label>
                    <input
                      value={form.endereco_bairro}
                      onChange={(e) => setForm({ ...form, endereco_bairro: e.target.value })}
                      className="input-field"
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="label-field">Cidade</label>
                    <input
                      value={form.endereco_cidade}
                      onChange={(e) => setForm({ ...form, endereco_cidade: e.target.value })}
                      className="input-field"
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label-field">UF</label>
                      <input
                        value={form.endereco_estado}
                        onChange={(e) => setForm({ ...form, endereco_estado: e.target.value })}
                        className="input-field"
                        placeholder="PE"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <label className="label-field">CEP</label>
                      <input
                        value={form.endereco_cep}
                        onChange={(e) => setForm({ ...form, endereco_cep: e.target.value })}
                        className="input-field"
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="label-field">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={form.coordenadas_lat}
                      onChange={(e) => setForm({ ...form, coordenadas_lat: e.target.value })}
                      className="input-field"
                      placeholder="-8.0476"
                    />
                  </div>
                  <div>
                    <label className="label-field">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={form.coordenadas_lng}
                      onChange={(e) => setForm({ ...form, coordenadas_lng: e.target.value })}
                      className="input-field"
                      placeholder="-34.8770"
                    />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">Informações de Contato</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label-field">Pastor</label>
                    <input
                      value={form.pastor}
                      onChange={(e) => setForm({ ...form, pastor: e.target.value })}
                      className="input-field"
                      placeholder="Nome do pastor"
                    />
                  </div>
                  <div>
                    <label className="label-field">Telefone</label>
                    <input
                      value={form.telefone}
                      onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                      className="input-field"
                      placeholder="(81) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="label-field">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input-field"
                      placeholder="contato@igreja.com"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="igreja-ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="igreja-ativo" className="text-sm text-gray-700">
                  Ativo
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={fecharModal} className="btn-secondary" disabled={saving}>
                Cancelar
              </button>
              <button onClick={salvar} className="btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

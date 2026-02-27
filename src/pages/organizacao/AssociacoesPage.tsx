import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Associacao, Uniao } from '@/types'
import { FiPlus, FiEdit, FiTrash2, FiFilter, FiSearch } from 'react-icons/fi'

type AssociacaoComUniao = Associacao & {
  uniao: { nome: string; sigla: string } | null
}

const TIPOS_LABEL: Record<string, string> = {
  associacao: 'Associação',
  campo: 'Campo',
  missao: 'Missão',
}

const TIPO_COLORS: Record<string, string> = {
  associacao: 'bg-blue-100 text-blue-700',
  campo: 'bg-amber-100 text-amber-700',
  missao: 'bg-purple-100 text-purple-700',
}

const FORM_VAZIO = {
  nome: '',
  sigla: '',
  tipo: 'associacao' as 'associacao' | 'campo' | 'missao',
  uniao_id: '',
  estado: '',
  cidade: '',
  ativo: true,
}

export default function AssociacoesPage() {
  const { profile, hasRole } = useAuth()

  const [associacoes, setAssociacoes] = useState<AssociacaoComUniao[]>([])
  const [unioes, setUnioes] = useState<Uniao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')

  const podeGerenciar = hasRole(['admin', 'admin_uniao'])

  useEffect(() => {
    if (profile) {
      fetchAssociacoes()
      fetchUnioes()
    }
  }, [profile, filtroAtivo])

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
    setLoading(true)
    try {
      let query = supabase
        .from('associacoes')
        .select('*, uniao:unioes(nome, sigla)')
        .order('nome')

      // Filtro hierarquico
      if (profile.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile.uniao_id!)
      } else if (profile.papel !== 'admin') {
        // Papeis abaixo de admin_uniao veem apenas sua associacao
        if (profile.associacao_id) {
          query = query.eq('id', profile.associacao_id)
        }
      }

      if (filtroAtivo === 'ativo') query = query.eq('ativo', true)
      if (filtroAtivo === 'inativo') query = query.eq('ativo', false)

      if (busca.trim()) {
        query = query.ilike('nome', `%${busca.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setAssociacoes((data || []) as AssociacaoComUniao[])
    } catch (err) {
      console.error('Erro ao buscar associações:', err)
    } finally {
      setLoading(false)
    }
  }

  function abrirModalNovo() {
    setForm({
      ...FORM_VAZIO,
      uniao_id: profile?.papel === 'admin_uniao' ? profile.uniao_id || '' : '',
    })
    setEditandoId(null)
    setErro('')
    setShowModal(true)
  }

  function abrirModalEditar(assoc: AssociacaoComUniao) {
    setForm({
      nome: assoc.nome,
      sigla: assoc.sigla,
      tipo: assoc.tipo,
      uniao_id: assoc.uniao_id,
      estado: assoc.estado || '',
      cidade: assoc.cidade || '',
      ativo: assoc.ativo,
    })
    setEditandoId(assoc.id)
    setErro('')
    setShowModal(true)
  }

  function fecharModal() {
    setShowModal(false)
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setErro('')
  }

  async function salvar() {
    if (!form.nome.trim() || !form.sigla.trim() || !form.uniao_id) {
      setErro('Nome, sigla e união são obrigatórios.')
      return
    }

    setSaving(true)
    setErro('')
    try {
      const payload = {
        nome: form.nome.trim(),
        sigla: form.sigla.trim().toUpperCase(),
        tipo: form.tipo,
        uniao_id: form.uniao_id,
        estado: form.estado?.trim() || null,
        cidade: form.cidade?.trim() || null,
        ativo: form.ativo,
      }

      if (editandoId) {
        const { error } = await supabase
          .from('associacoes')
          .update(payload)
          .eq('id', editandoId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('associacoes')
          .insert(payload)
        if (error) throw error
      }

      fecharModal()
      fetchAssociacoes()
    } catch (err: any) {
      console.error('Erro ao salvar associação:', err)
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function excluir(assoc: AssociacaoComUniao) {
    if (!confirm(`Deseja realmente excluir "${assoc.nome}"?`)) return

    try {
      const { error } = await supabase
        .from('associacoes')
        .delete()
        .eq('id', assoc.id)
      if (error) throw error
      fetchAssociacoes()
    } catch (err: any) {
      console.error('Erro ao excluir associacao:', err)
      alert(err.message || 'Erro ao excluir. Verifique se não existem igrejas vinculadas.')
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchAssociacoes()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Associações / Campos / Missões</h1>
          <p className="text-gray-500 mt-1">
            {associacoes.length} registro{associacoes.length !== 1 ? 's' : ''}
          </p>
        </div>
        {podeGerenciar && (
          <button onClick={abrirModalNovo} className="btn-primary inline-flex items-center gap-2 w-fit">
            <FiPlus className="w-4 h-4" />
            Nova Associação
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
              placeholder="Buscar por nome..."
            />
          </form>
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400 w-4 h-4" />
            <select
              value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value as any)}
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
        ) : associacoes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhuma associação encontrada</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Sigla</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Uniao</th>
                    <th className="px-4 py-3">Cidade/UF</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    {podeGerenciar && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {associacoes.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{a.nome}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold">
                          {a.sigla}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          TIPO_COLORS[a.tipo] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {TIPOS_LABEL[a.tipo] || a.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {a.uniao ? `${a.uniao.nome} (${a.uniao.sigla})` : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {a.cidade && a.estado ? `${a.cidade}/${a.estado}` : a.estado || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {a.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(a.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      {podeGerenciar && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => abrirModalEditar(a)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                              title="Editar"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluir(a)}
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
              {associacoes.map((a) => (
                <div key={a.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{a.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.sigla} - {a.uniao?.sigla || '-'}
                        {a.cidade ? ` - ${a.cidade}/${a.estado}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        TIPO_COLORS[a.tipo] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {TIPOS_LABEL[a.tipo] || a.tipo}
                      </span>
                      {podeGerenciar && (
                        <>
                          <button
                            onClick={() => abrirModalEditar(a)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => excluir(a)}
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
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editandoId ? 'Editar Associação' : 'Nova Associação'}
            </h2>

            {erro && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                {erro}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label-field">Nome *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Associação Pernambucana"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Sigla *</label>
                  <input
                    value={form.sigla}
                    onChange={(e) => setForm({ ...form, sigla: e.target.value })}
                    className="input-field"
                    placeholder="Ex: APE"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="label-field">Tipo *</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="associacao">Associação</option>
                    <option value="campo">Campo</option>
                    <option value="missao">Missão</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-field">Uniao *</label>
                <select
                  value={form.uniao_id}
                  onChange={(e) => setForm({ ...form, uniao_id: e.target.value })}
                  className="input-field"
                  disabled={profile?.papel === 'admin_uniao'}
                >
                  <option value="">Selecione...</option>
                  {unioes.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.sigla})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Estado</label>
                  <input
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="input-field"
                    placeholder="Ex: PE"
                  />
                </div>
                <div>
                  <label className="label-field">Cidade</label>
                  <input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="input-field"
                    placeholder="Ex: Recife"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="assoc-ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="assoc-ativo" className="text-sm text-gray-700">
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

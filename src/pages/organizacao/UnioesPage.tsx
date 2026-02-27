import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Uniao } from '@/types'
import { FiPlus, FiEdit, FiTrash2, FiFilter } from 'react-icons/fi'

const FORM_VAZIO: Omit<Uniao, 'id' | 'created_at'> = {
  nome: '',
  sigla: '',
  estado: '',
  ativo: true,
}

export default function UnioesPage() {
  const { profile, hasRole } = useAuth()

  const [unioes, setUnioes] = useState<Uniao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [erro, setErro] = useState('')

  const podeGerenciar = hasRole(['admin'])

  useEffect(() => {
    if (profile) fetchUnioes()
  }, [profile, filtroAtivo])

  async function fetchUnioes() {
    setLoading(true)
    try {
      let query = supabase
        .from('unioes')
        .select('*')
        .order('nome')

      if (filtroAtivo === 'ativo') query = query.eq('ativo', true)
      if (filtroAtivo === 'inativo') query = query.eq('ativo', false)

      const { data, error } = await query
      if (error) throw error
      setUnioes(data || [])
    } catch (err) {
      console.error('Erro ao buscar unioes:', err)
    } finally {
      setLoading(false)
    }
  }

  function abrirModalNovo() {
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setErro('')
    setShowModal(true)
  }

  function abrirModalEditar(uniao: Uniao) {
    setForm({
      nome: uniao.nome,
      sigla: uniao.sigla,
      estado: uniao.estado || '',
      ativo: uniao.ativo,
    })
    setEditandoId(uniao.id)
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
    if (!form.nome.trim() || !form.sigla.trim()) {
      setErro('Nome e sigla são obrigatórios.')
      return
    }

    setSaving(true)
    setErro('')
    try {
      const payload = {
        nome: form.nome.trim(),
        sigla: form.sigla.trim().toUpperCase(),
        estado: form.estado?.trim() || null,
        ativo: form.ativo,
      }

      if (editandoId) {
        const { error } = await supabase
          .from('unioes')
          .update(payload)
          .eq('id', editandoId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('unioes')
          .insert(payload)
        if (error) throw error
      }

      fecharModal()
      fetchUnioes()
    } catch (err: any) {
      console.error('Erro ao salvar uniao:', err)
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function excluir(uniao: Uniao) {
    if (!confirm(`Deseja realmente excluir a união "${uniao.nome}"?`)) return

    try {
      const { error } = await supabase
        .from('unioes')
        .delete()
        .eq('id', uniao.id)
      if (error) throw error
      fetchUnioes()
    } catch (err: any) {
      console.error('Erro ao excluir uniao:', err)
      alert(err.message || 'Erro ao excluir. Verifique se não existem associações vinculadas.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Uniões</h1>
          <p className="text-gray-500 mt-1">
            {unioes.length} registro{unioes.length !== 1 ? 's' : ''}
          </p>
        </div>
        {podeGerenciar && (
          <button onClick={abrirModalNovo} className="btn-primary inline-flex items-center gap-2 w-fit">
            <FiPlus className="w-4 h-4" />
            Nova União
          </button>
        )}
      </div>

      {/* Filtro */}
      <div className="card">
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

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : unioes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhuma união encontrada</p>
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
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    {podeGerenciar && <th className="px-4 py-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unioes.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.nome}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold">
                          {u.sigla}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.estado || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          u.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      {podeGerenciar && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => abrirModalEditar(u)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                              title="Editar"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => excluir(u)}
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
              {unioes.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{u.nome}</p>
                    <p className="text-xs text-gray-400">
                      {u.sigla} {u.estado ? `- ${u.estado}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {podeGerenciar && (
                      <>
                        <button
                          onClick={() => abrirModalEditar(u)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => excluir(u)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editandoId ? 'Editar União' : 'Nova União'}
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
                  placeholder="Ex: União Norte Nordeste"
                />
              </div>

              <div>
                <label className="label-field">Sigla *</label>
                <input
                  value={form.sigla}
                  onChange={(e) => setForm({ ...form, sigla: e.target.value })}
                  className="input-field"
                  placeholder="Ex: NNE"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="label-field">Estado</label>
                <input
                  value={form.estado || ''}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className="input-field"
                  placeholder="Ex: PE"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="uniao-ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="uniao-ativo" className="text-sm text-gray-700">
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

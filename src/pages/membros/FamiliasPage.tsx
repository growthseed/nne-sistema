import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Familia } from '@/types'
import { FiPlus, FiEdit, FiUsers, FiSearch, FiHome, FiChevronDown, FiChevronUp, FiX, FiTrash2 } from 'react-icons/fi'

interface PessoaResumo {
  id: string
  nome: string
}

interface FamiliaComIgreja extends Familia {
  igreja?: { nome: string } | null
}

export default function FamiliasPage() {
  const { profile } = useAuth()
  const [familias, setFamilias] = useState<FamiliaComIgreja[]>([])
  const [pessoasDisponiveis, setPessoasDisponiveis] = useState<PessoaResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [membrosNomes, setMembrosNomes] = useState<Record<string, string>>({})

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cidade: '',
    endereco_estado: '',
    endereco_cep: '',
    membros: [] as string[],
  })
  const [buscaMembro, setBuscaMembro] = useState('')

  const fetchFamilias = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('familias')
        .select('*, igreja:igrejas(nome)')
        .order('nome')

      // Filtro hierarquico por escopo do usuario
      if (profile.papel === 'admin') {
        // admin ve tudo
      } else if (profile.papel === 'admin_uniao') {
        const { data: igrejas } = await supabase
          .from('igrejas')
          .select('id')
          .eq('uniao_id', profile.uniao_id!)
        const igrejaIds = igrejas?.map((i) => i.id) || []
        if (igrejaIds.length > 0) {
          query = query.in('igreja_id', igrejaIds)
        } else {
          query = query.eq('igreja_id', 'none')
        }
      } else if (profile.papel === 'admin_associacao') {
        const { data: igrejas } = await supabase
          .from('igrejas')
          .select('id')
          .eq('associacao_id', profile.associacao_id!)
        const igrejaIds = igrejas?.map((i) => i.id) || []
        if (igrejaIds.length > 0) {
          query = query.in('igreja_id', igrejaIds)
        } else {
          query = query.eq('igreja_id', 'none')
        }
      } else {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      if (busca.trim()) {
        query = query.ilike('nome', `%${busca.trim()}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setFamilias((data as FamiliaComIgreja[]) || [])
    } catch (err) {
      console.error('Erro ao buscar famílias:', err)
    } finally {
      setLoading(false)
    }
  }, [profile, busca])

  const fetchPessoas = useCallback(async () => {
    if (!profile) return
    try {
      let query = supabase
        .from('pessoas')
        .select('id, nome')
        .eq('situacao', 'ativo')
        .order('nome')

      if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setPessoasDisponiveis(data || [])
    } catch (err) {
      console.error('Erro ao buscar pessoas:', err)
    }
  }, [profile])

  useEffect(() => {
    fetchFamilias()
    fetchPessoas()
  }, [fetchFamilias, fetchPessoas])

  // Resolve member names for expanded family
  useEffect(() => {
    if (!expandedId) return
    const familia = familias.find((f) => f.id === expandedId)
    if (!familia || !familia.membros || familia.membros.length === 0) return

    const idsToResolve = familia.membros.filter((id) => !membrosNomes[id])
    if (idsToResolve.length === 0) return

    supabase
      .from('pessoas')
      .select('id, nome')
      .in('id', idsToResolve)
      .then(({ data }) => {
        if (data) {
          const newNomes: Record<string, string> = { ...membrosNomes }
          data.forEach((p) => { newNomes[p.id] = p.nome })
          setMembrosNomes(newNomes)
        }
      })
  }, [expandedId, familias])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchFamilias()
  }

  function openCreateModal() {
    setEditingId(null)
    setForm({
      nome: '',
      endereco_rua: '',
      endereco_numero: '',
      endereco_complemento: '',
      endereco_bairro: '',
      endereco_cidade: '',
      endereco_estado: '',
      endereco_cep: '',
      membros: [],
    })
    setBuscaMembro('')
    setShowModal(true)
  }

  function openEditModal(familia: FamiliaComIgreja) {
    setEditingId(familia.id)
    setForm({
      nome: familia.nome || '',
      endereco_rua: familia.endereco_rua || '',
      endereco_numero: familia.endereco_numero || '',
      endereco_complemento: familia.endereco_complemento || '',
      endereco_bairro: familia.endereco_bairro || '',
      endereco_cidade: familia.endereco_cidade || '',
      endereco_estado: familia.endereco_estado || '',
      endereco_cep: familia.endereco_cep || '',
      membros: familia.membros || [],
    })
    setBuscaMembro('')
    setShowModal(true)
  }

  function toggleMembro(pessoaId: string) {
    setForm((prev) => ({
      ...prev,
      membros: prev.membros.includes(pessoaId)
        ? prev.membros.filter((id) => id !== pessoaId)
        : [...prev.membros, pessoaId],
    }))
  }

  async function handleSave() {
    if (!profile || !form.nome.trim()) return
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        igreja_id: profile.igreja_id,
        endereco_rua: form.endereco_rua || null,
        endereco_numero: form.endereco_numero || null,
        endereco_complemento: form.endereco_complemento || null,
        endereco_bairro: form.endereco_bairro || null,
        endereco_cidade: form.endereco_cidade || null,
        endereco_estado: form.endereco_estado || null,
        endereco_cep: form.endereco_cep || null,
        membros: form.membros,
      }

      if (editingId) {
        const { error } = await supabase
          .from('familias')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('familias')
          .insert(payload)
        if (error) throw error
      }

      setShowModal(false)
      fetchFamilias()
    } catch (err) {
      console.error('Erro ao salvar família:', err)
      alert('Erro ao salvar família. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta família?')) return
    try {
      const { error } = await supabase.from('familias').delete().eq('id', id)
      if (error) throw error
      fetchFamilias()
    } catch (err) {
      console.error('Erro ao excluir família:', err)
      alert('Erro ao excluir família.')
    }
  }

  function formatEndereco(f: FamiliaComIgreja): string {
    const parts = [
      f.endereco_rua,
      f.endereco_numero,
      f.endereco_bairro,
      f.endereco_cidade,
      f.endereco_estado,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : '-'
  }

  const pessoasFiltradas = pessoasDisponiveis.filter((p) =>
    buscaMembro.trim() === '' || p.nome.toLowerCase().includes(buscaMembro.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Famílias</h1>
          <p className="text-gray-500 mt-1">
            {familias.length} família{familias.length !== 1 ? 's' : ''} cadastrada{familias.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary inline-flex items-center gap-2 w-fit">
          <FiPlus className="w-4 h-4" />
          Nova Família
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <form onSubmit={handleSearch} className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input-field pl-10"
            placeholder="Buscar família por nome..."
          />
        </form>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : familias.length === 0 ? (
          <div className="p-8 text-center">
            <FiHome className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma família encontrada</p>
            <button onClick={openCreateModal} className="text-primary-600 hover:underline text-sm mt-2 inline-block">
              Cadastrar primeira família
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Família</th>
                    <th className="px-4 py-3">Membros</th>
                    <th className="px-4 py-3">Igreja</th>
                    <th className="px-4 py-3">Endereço</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {familias.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                            <FiHome className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-gray-800">{f.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          <FiUsers className="w-3 h-3" />
                          {f.membros?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{f.igreja?.nome || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[250px] truncate">{formatEndereco(f)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                            title="Ver membros"
                          >
                            {expandedId === f.id ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEditModal(f)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                            title="Editar"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"
                            title="Excluir"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded detail row (desktop) */}
            {expandedId && (
              <div className="hidden md:block bg-gray-50 border-t border-gray-200 px-6 py-4">
                {(() => {
                  const familia = familias.find((f) => f.id === expandedId)
                  if (!familia) return null
                  const ids = familia.membros || []
                  if (ids.length === 0) return <p className="text-sm text-gray-400">Nenhum membro vinculado a esta família.</p>
                  return (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Membros da família {familia.nome} ({ids.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {ids.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-700"
                          >
                            <FiUsers className="w-3 h-3 text-gray-400" />
                            {membrosNomes[id] || 'Carregando...'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {familias.map((f) => (
                <div key={f.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                      <FiHome className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{f.nome}</p>
                      <p className="text-xs text-gray-400">{f.igreja?.nome || '-'}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                      <FiUsers className="w-3 h-3" /> {f.membros?.length || 0}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      {expandedId === f.id ? 'Ocultar membros' : 'Ver membros'}
                    </button>
                    <button onClick={() => openEditModal(f)} className="text-xs text-gray-500 hover:underline ml-auto">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="text-xs text-red-500 hover:underline">
                      Excluir
                    </button>
                  </div>
                  {expandedId === f.id && (
                    <div className="mt-3 pl-2 border-l-2 border-primary-200">
                      {(f.membros || []).length === 0 ? (
                        <p className="text-xs text-gray-400">Nenhum membro vinculado.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(f.membros || []).map((id) => (
                            <span key={id} className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-700">
                              {membrosNomes[id] || '...'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingId ? 'Editar Família' : 'Nova Família'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Nome */}
              <div>
                <label className="label-field">Nome da Família *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Família Silva"
                />
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Endereço</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="label-field">Rua</label>
                    <input
                      value={form.endereco_rua}
                      onChange={(e) => setForm({ ...form, endereco_rua: e.target.value })}
                      className="input-field"
                      placeholder="Rua, Avenida..."
                    />
                  </div>
                  <div>
                    <label className="label-field">Número</label>
                    <input
                      value={form.endereco_numero}
                      onChange={(e) => setForm({ ...form, endereco_numero: e.target.value })}
                      className="input-field"
                      placeholder="Nº"
                    />
                  </div>
                  <div>
                    <label className="label-field">Complemento</label>
                    <input
                      value={form.endereco_complemento}
                      onChange={(e) => setForm({ ...form, endereco_complemento: e.target.value })}
                      className="input-field"
                      placeholder="Apto, Bloco..."
                    />
                  </div>
                  <div>
                    <label className="label-field">Bairro</label>
                    <input
                      value={form.endereco_bairro}
                      onChange={(e) => setForm({ ...form, endereco_bairro: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Cidade</label>
                    <input
                      value={form.endereco_cidade}
                      onChange={(e) => setForm({ ...form, endereco_cidade: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">Estado</label>
                    <input
                      value={form.endereco_estado}
                      onChange={(e) => setForm({ ...form, endereco_estado: e.target.value })}
                      className="input-field"
                      placeholder="UF"
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

              {/* Membros */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Membros ({form.membros.length} selecionado{form.membros.length !== 1 ? 's' : ''})
                </h3>
                <input
                  value={buscaMembro}
                  onChange={(e) => setBuscaMembro(e.target.value)}
                  className="input-field mb-2"
                  placeholder="Buscar membro por nome..."
                />
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {pessoasFiltradas.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum membro encontrado</p>
                  ) : (
                    pessoasFiltradas.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={form.membros.includes(p.id)}
                          onChange={() => toggleMembro(p.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">{p.nome}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nome.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Família'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

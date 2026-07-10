import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Familia } from '@/types'
import { FiPlus, FiEdit, FiUsers, FiSearch, FiHome, FiChevronDown, FiChevronUp, FiX, FiTrash2, FiUserPlus } from 'react-icons/fi'

interface PessoaResumo {
  id: string
  nome: string
}

interface IgrejaOpt {
  id: string
  nome: string
}

interface FamiliaComIgreja extends Familia {
  igreja?: { nome: string } | null
}

const PARENTESCO_OPTIONS = ['Cônjuge', 'Filho(a)', 'Pai/Mãe', 'Irmão/Irmã', 'Avô/Avó', 'Neto(a)', 'Outro']

export default function FamiliasPage() {
  const { profile } = useAuth()
  const [familias, setFamilias] = useState<FamiliaComIgreja[]>([])
  const [pessoasDisponiveis, setPessoasDisponiveis] = useState<PessoaResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [membrosNomes, setMembrosNomes] = useState<Record<string, string>>({})

  // Escopo de igrejas do usuário: null = sem restrição (admin);
  // undefined = ainda resolvendo (não buscar antes disso).
  const [igrejasEscopo, setIgrejasEscopo] = useState<IgrejaOpt[] | null | undefined>(undefined)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '',
    igreja_id: '',
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

  // Modal "Adicionar familiar" — cria a pessoa no banco (entra na contagem)
  // e vincula à família. Usado pelo missionário em campo e pela secretaria.
  const [familiarFamilia, setFamiliarFamilia] = useState<FamiliaComIgreja | null>(null)
  const [savingFamiliar, setSavingFamiliar] = useState(false)
  const [familiarForm, setFamiliarForm] = useState({
    nome: '',
    parentesco: 'Cônjuge',
    sexo: '',
    data_nascimento: '',
    telefone: '',
    tipo: 'interessado' as 'membro' | 'interessado',
  })

  // Resolve o escopo de igrejas conforme o papel (missionário = igrejas do campo).
  useEffect(() => {
    if (!profile) return
    let cancelled = false
    async function resolveEscopo() {
      try {
        if (profile!.papel === 'admin') {
          const { data } = await supabase.from('igrejas').select('id, nome').order('nome')
          if (!cancelled) setIgrejasEscopo(data && data.length > 0 ? data : null)
          return
        }
        if (profile!.papel === 'admin_uniao' || profile!.papel === 'admin_associacao') {
          const col = profile!.papel === 'admin_uniao' ? 'uniao_id' : 'associacao_id'
          const val = profile!.papel === 'admin_uniao' ? profile!.uniao_id : profile!.associacao_id
          const { data } = await supabase.from('igrejas').select('id, nome').eq(col, val!).order('nome')
          if (!cancelled) setIgrejasEscopo(data || [])
          return
        }
        if (profile!.papel === 'missionario') {
          const { data: miss } = await supabase
            .from('missionarios')
            .select('igrejas_responsavel')
            .eq('usuario_id', profile!.id)
            .maybeSingle()
          const ids: string[] = miss?.igrejas_responsavel || []
          if (ids.length === 0) {
            if (!cancelled) setIgrejasEscopo([])
            return
          }
          const { data } = await supabase.from('igrejas').select('id, nome').in('id', ids).order('nome')
          if (!cancelled) setIgrejasEscopo(data || [])
          return
        }
        // Papéis de igreja (secretario etc.)
        if (profile!.igreja_id) {
          const { data } = await supabase.from('igrejas').select('id, nome').eq('id', profile!.igreja_id)
          if (!cancelled) setIgrejasEscopo(data || [])
        } else {
          if (!cancelled) setIgrejasEscopo([])
        }
      } catch (err) {
        console.error('Erro ao resolver escopo de igrejas:', err)
        if (!cancelled) setIgrejasEscopo([])
      }
    }
    resolveEscopo()
    return () => { cancelled = true }
  }, [profile])

  const igrejaIds = igrejasEscopo === null ? null : (igrejasEscopo || []).map((i) => i.id)

  const fetchFamilias = useCallback(async () => {
    if (!profile || igrejasEscopo === undefined) return
    setLoading(true)
    try {
      let query = supabase
        .from('familias')
        .select('*, igreja:igrejas(nome)')
        .order('nome')

      if (igrejaIds !== null) {
        if (igrejaIds.length === 0) {
          setFamilias([])
          setLoading(false)
          return
        }
        query = query.in('igreja_id', igrejaIds)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, busca, igrejasEscopo])

  const fetchPessoas = useCallback(async () => {
    if (!profile || igrejasEscopo === undefined) return
    try {
      let query = supabase
        .from('pessoas')
        .select('id, nome')
        .eq('situacao', 'ativo')
        .order('nome')

      if (igrejaIds !== null) {
        if (igrejaIds.length === 0) {
          setPessoasDisponiveis([])
          return
        }
        query = query.in('igreja_id', igrejaIds)
      }

      const { data, error } = await query
      if (error) throw error
      setPessoasDisponiveis(data || [])
    } catch (err) {
      console.error('Erro ao buscar pessoas:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, igrejasEscopo])

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

  const defaultIgrejaId = profile?.igreja_id
    || ((igrejasEscopo && igrejasEscopo.length === 1) ? igrejasEscopo[0].id : '')

  function openCreateModal() {
    setEditingId(null)
    setForm({
      nome: '',
      igreja_id: defaultIgrejaId || '',
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
      igreja_id: familia.igreja_id || defaultIgrejaId || '',
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
    if (!form.igreja_id) {
      alert('Selecione a igreja da família.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        igreja_id: form.igreja_id,
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
        // Mantém pessoas.familia_id em sincronia com o array da família
        await supabase.from('pessoas').update({ familia_id: editingId }).in('id', form.membros)
      } else {
        const { data, error } = await supabase
          .from('familias')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        if (data?.id && form.membros.length > 0) {
          await supabase.from('pessoas').update({ familia_id: data.id }).in('id', form.membros)
        }
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

  function openFamiliarModal(familia: FamiliaComIgreja) {
    setFamiliarForm({
      nome: '',
      parentesco: 'Cônjuge',
      sexo: '',
      data_nascimento: '',
      telefone: '',
      tipo: 'interessado',
    })
    setFamiliarFamilia(familia)
  }

  async function handleSaveFamiliar() {
    if (!familiarFamilia || !familiarForm.nome.trim()) return
    setSavingFamiliar(true)
    try {
      const payload: Record<string, unknown> = {
        nome: familiarForm.nome.trim(),
        tipo: familiarForm.tipo,
        situacao: 'ativo',
        ativo: true,
        sexo: familiarForm.sexo || null,
        data_nascimento: familiarForm.data_nascimento || null,
        telefone: familiarForm.telefone || null,
        igreja_id: familiarFamilia.igreja_id,
        familia_id: familiarFamilia.id,
        parentesco: familiarForm.parentesco,
        origem_cadastro: profile?.papel === 'missionario' ? 'missionario' : 'secretaria',
      }
      let { data: pessoa, error } = await supabase
        .from('pessoas')
        .insert(payload)
        .select('id, nome')
        .single()
      // Fallback enquanto a migration 039 (coluna origem_cadastro) não é aplicada
      if (error && `${error.message}`.includes('origem_cadastro')) {
        delete payload.origem_cadastro
        const retry = await supabase.from('pessoas').insert(payload).select('id, nome').single()
        pessoa = retry.data
        error = retry.error
      }
      if (error || !pessoa) throw error || new Error('Insert sem retorno')

      // Vincula ao array de membros da família
      const novosMembros = [...(familiarFamilia.membros || []), pessoa.id]
      const { error: famErr } = await supabase
        .from('familias')
        .update({ membros: novosMembros })
        .eq('id', familiarFamilia.id)
      if (famErr) throw famErr

      setMembrosNomes((prev) => ({ ...prev, [pessoa.id]: pessoa.nome }))
      setFamiliarFamilia(null)
      fetchFamilias()
      fetchPessoas()
    } catch (err) {
      console.error('Erro ao adicionar familiar:', err)
      alert('Erro ao adicionar familiar. Verifique os dados e tente novamente.')
    } finally {
      setSavingFamiliar(false)
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

  const mostraSelectIgreja = (igrejasEscopo === null) || ((igrejasEscopo || []).length > 1)

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
                            onClick={() => openFamiliarModal(f)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-600"
                            title="Adicionar familiar"
                          >
                            <FiUserPlus className="w-4 h-4" />
                          </button>
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
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Membros da família {familia.nome} ({ids.length})
                        </h4>
                        <button
                          onClick={() => openFamiliarModal(familia)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 hover:bg-emerald-100"
                        >
                          <FiUserPlus className="w-3 h-3" /> Adicionar familiar
                        </button>
                      </div>
                      {ids.length === 0 ? (
                        <p className="text-sm text-gray-400">Nenhum membro vinculado a esta família.</p>
                      ) : (
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
                      )}
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
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      {expandedId === f.id ? 'Ocultar membros' : 'Ver membros'}
                    </button>
                    <button onClick={() => openFamiliarModal(f)} className="text-xs text-emerald-600 hover:underline">
                      + Familiar
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

              {/* Igreja */}
              {mostraSelectIgreja && (
                <div>
                  <label className="label-field">Igreja *</label>
                  <select
                    value={form.igreja_id}
                    onChange={(e) => setForm({ ...form, igreja_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Selecione a igreja...</option>
                    {(igrejasEscopo || []).map((ig) => (
                      <option key={ig.id} value={ig.id}>{ig.nome}</option>
                    ))}
                  </select>
                </div>
              )}

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

      {/* Modal Adicionar Familiar */}
      {familiarFamilia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Adicionar Familiar</h2>
                <p className="text-xs text-gray-500">
                  Família {familiarFamilia.nome} · {familiarFamilia.igreja?.nome || 'igreja da família'}
                </p>
              </div>
              <button onClick={() => setFamiliarFamilia(null)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                A pessoa será cadastrada no banco de membros/interessados da igreja e passa a contar
                nas estatísticas, mesmo sem ter respondido o censo.
              </p>
              <div>
                <label className="label-field">Nome completo *</label>
                <input
                  value={familiarForm.nome}
                  onChange={(e) => setFamiliarForm({ ...familiarForm, nome: e.target.value })}
                  className="input-field"
                  placeholder="Nome do familiar"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Parentesco *</label>
                  <select
                    value={familiarForm.parentesco}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, parentesco: e.target.value })}
                    className="input-field"
                  >
                    {PARENTESCO_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-field">Vínculo *</label>
                  <select
                    value={familiarForm.tipo}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, tipo: e.target.value as 'membro' | 'interessado' })}
                    className="input-field"
                  >
                    <option value="interessado">Interessado</option>
                    <option value="membro">Membro</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Sexo</label>
                  <select
                    value={familiarForm.sexo}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, sexo: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Não informado</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Nascimento</label>
                  <input
                    type="date"
                    value={familiarForm.data_nascimento}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, data_nascimento: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="col-span-2">
                  <label className="label-field">Telefone / WhatsApp</label>
                  <input
                    value={familiarForm.telefone}
                    onChange={(e) => setFamiliarForm({ ...familiarForm, telefone: e.target.value })}
                    className="input-field"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setFamiliarFamilia(null)} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleSaveFamiliar}
                disabled={savingFamiliar || !familiarForm.nome.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {savingFamiliar ? 'Salvando...' : 'Adicionar Familiar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

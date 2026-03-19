import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ClasseBatismal, LicaoBatismal } from '@/types'
import { FiPlus, FiEdit, FiUsers, FiBook, FiCalendar } from 'react-icons/fi'

interface PessoaOption {
  id: string
  nome: string
}

type StatusFiltro = 'todas' | 'ativa' | 'concluida' | 'cancelada'

const STATUS_OPTIONS: { value: ClasseBatismal['status']; label: string }[] = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
]

const STATUS_COLORS: Record<ClasseBatismal['status'], string> = {
  ativa: 'bg-green-100 text-green-700',
  concluida: 'bg-blue-100 text-blue-700',
  cancelada: 'bg-red-100 text-red-700',
}

const STATUS_LABELS: Record<ClasseBatismal['status'], string> = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const emptyForm = {
  nome: '',
  instrutor: '',
  data_inicio: '',
  data_previsao_termino: '',
  status: 'ativa' as ClasseBatismal['status'],
  alunos: [] as string[],
}

const emptyLicao: Omit<LicaoBatismal, 'numero'> = {
  titulo: '',
  dataPrevista: '',
  dataRealizada: '',
  presentes: [],
}

export default function ClassesBatismaisPage() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<ClasseBatismal[]>([])
  const [pessoas, setPessoas] = useState<PessoaOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('ativa')

  // Lessons panel state
  const [showLicoes, setShowLicoes] = useState<string | null>(null)
  const [licoes, setLicoes] = useState<LicaoBatismal[]>([])
  const [showLicaoModal, setShowLicaoModal] = useState(false)
  const [editingLicaoIdx, setEditingLicaoIdx] = useState<number | null>(null)
  const [licaoForm, setLicaoForm] = useState(emptyLicao)
  const [savingLicao, setSavingLicao] = useState(false)

  // Student search filter inside modal
  const [buscaAluno, setBuscaAluno] = useState('')

  useEffect(() => {
    if (profile) {
      fetchClasses()
      fetchPessoas()
    }
  }, [profile, filtroStatus])

  async function fetchClasses() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('classes_batismais')
        .select('*')
        .order('created_at', { ascending: false })

      if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      if (filtroStatus !== 'todas') {
        query = query.eq('status', filtroStatus)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Erro ao buscar classes batismais:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPessoas() {
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
      setPessoas(data || [])
    } catch (err) {
      console.error('Erro ao buscar pessoas:', err)
    }
  }

  function getNomeAluno(id: string) {
    return pessoas.find(p => p.id === id)?.nome || 'Desconhecido'
  }

  // ---- Class CRUD ----

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setBuscaAluno('')
    setShowModal(true)
  }

  function openEdit(classe: ClasseBatismal) {
    setEditingId(classe.id)
    setForm({
      nome: classe.nome,
      instrutor: classe.instrutor,
      data_inicio: classe.data_inicio,
      data_previsao_termino: classe.data_previsao_termino || '',
      status: classe.status,
      alunos: classe.alunos || [],
    })
    setBuscaAluno('')
    setShowModal(true)
  }

  function toggleAluno(pessoaId: string) {
    setForm(f => ({
      ...f,
      alunos: f.alunos.includes(pessoaId)
        ? f.alunos.filter(id => id !== pessoaId)
        : [...f.alunos, pessoaId],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        instrutor: form.instrutor.trim(),
        data_inicio: form.data_inicio,
        data_previsao_termino: form.data_previsao_termino || null,
        status: form.status,
        alunos: form.alunos,
        igreja_id: profile.igreja_id,
      }

      if (editingId) {
        const { error } = await supabase
          .from('classes_batismais')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('classes_batismais')
          .insert({ ...payload, licoes: [] })
        if (error) throw error
      }

      setShowModal(false)
      setForm(emptyForm)
      setEditingId(null)
      fetchClasses()
    } catch (err) {
      console.error('Erro ao salvar classe bíblica:', err)
      alert('Erro ao salvar classe bíblica')
    } finally {
      setSaving(false)
    }
  }

  // ---- Lessons management ----

  function openLicoes(classe: ClasseBatismal) {
    setShowLicoes(classe.id)
    setLicoes(classe.licoes || [])
  }

  function closeLicoes() {
    setShowLicoes(null)
    setLicoes([])
    setShowLicaoModal(false)
    setEditingLicaoIdx(null)
  }

  function openCreateLicao() {
    setEditingLicaoIdx(null)
    setLicaoForm({
      titulo: '',
      dataPrevista: '',
      dataRealizada: '',
      presentes: [],
    })
    setShowLicaoModal(true)
  }

  function openEditLicao(idx: number) {
    const l = licoes[idx]
    setEditingLicaoIdx(idx)
    setLicaoForm({
      titulo: l.titulo,
      dataPrevista: l.dataPrevista,
      dataRealizada: l.dataRealizada || '',
      presentes: l.presentes || [],
    })
    setShowLicaoModal(true)
  }

  async function handleSaveLicao(e: React.FormEvent) {
    e.preventDefault()
    if (!showLicoes) return
    setSavingLicao(true)
    try {
      let updated: LicaoBatismal[]
      if (editingLicaoIdx !== null) {
        updated = licoes.map((l, i) =>
          i === editingLicaoIdx
            ? {
                ...l,
                titulo: licaoForm.titulo.trim(),
                dataPrevista: licaoForm.dataPrevista,
                dataRealizada: licaoForm.dataRealizada || undefined,
                presentes: licaoForm.presentes,
              }
            : l
        )
      } else {
        const nextNumero = licoes.length > 0 ? Math.max(...licoes.map(l => l.numero)) + 1 : 1
        updated = [
          ...licoes,
          {
            numero: nextNumero,
            titulo: licaoForm.titulo.trim(),
            dataPrevista: licaoForm.dataPrevista,
            dataRealizada: licaoForm.dataRealizada || undefined,
            presentes: licaoForm.presentes,
          },
        ]
      }

      const { error } = await supabase
        .from('classes_batismais')
        .update({ licoes: updated })
        .eq('id', showLicoes)
      if (error) throw error

      setLicoes(updated)
      setShowLicaoModal(false)
      setEditingLicaoIdx(null)
      // Also refresh main list so counts update
      fetchClasses()
    } catch (err) {
      console.error('Erro ao salvar lição:', err)
      alert('Erro ao salvar lição')
    } finally {
      setSavingLicao(false)
    }
  }

  // Find the full class record for the lessons panel
  const classeAtual = classes.find(c => c.id === showLicoes)
  const alunosDaClasse = classeAtual?.alunos || []

  const pessoasFiltradas = buscaAluno.trim()
    ? pessoas.filter(p => p.nome.toLowerCase().includes(buscaAluno.toLowerCase()))
    : pessoas

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Classes Bíblicas</h1>
          <p className="text-gray-500 mt-1">
            {classes.length} classe{classes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 w-fit" onClick={openCreate}>
          <FiPlus className="w-4 h-4" />
          Nova Classe Bíblica
        </button>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FiCalendar className="w-4 h-4" />
            Filtrar por status:
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusFiltro)}
            className="input-field w-auto"
          >
            <option value="todas">Todas</option>
            <option value="ativa">Ativa</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : classes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhuma classe bíblica encontrada</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Instrutor</th>
                    <th className="px-4 py-3">Data Início</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Alunos</th>
                    <th className="px-4 py-3 text-center">Lições</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classes.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                      <td className="px-4 py-3 text-gray-500">{c.instrutor}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {c.data_inicio
                          ? new Date(c.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <FiUsers className="w-3.5 h-3.5" />
                          {c.alunos?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openLicoes(c)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                          title="Ver lições"
                        >
                          <FiBook className="w-3.5 h-3.5" />
                          {c.licoes?.length || 0}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(c)}
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {classes.map((c) => (
                <div key={c.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800 truncate">{c.nome}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2 ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Instrutor: {c.instrutor} | Início:{' '}
                    {c.data_inicio
                      ? new Date(c.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '-'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <FiUsers className="w-3.5 h-3.5" />
                        {c.alunos?.length || 0} alunos
                      </span>
                      <button
                        onClick={() => openLicoes(c)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <FiBook className="w-3.5 h-3.5" />
                        {c.licoes?.length || 0} lições
                      </button>
                    </div>
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ========== Create/Edit Class Modal ========== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingId ? 'Editar Classe Bíblica' : 'Nova Classe Bíblica'}
              </h2>

              <div>
                <label className="label-field">Nome da Classe</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="input-field"
                  placeholder="Ex: Classe Bíblica 2026"
                  required
                />
              </div>

              <div>
                <label className="label-field">Instrutor</label>
                <input
                  type="text"
                  value={form.instrutor}
                  onChange={(e) => setForm(f => ({ ...f, instrutor: e.target.value }))}
                  className="input-field"
                  placeholder="Nome do instrutor"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Data de Início</label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Previsão de Término</label>
                  <input
                    type="date"
                    value={form.data_previsao_termino}
                    onChange={(e) => setForm(f => ({ ...f, data_previsao_termino: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="label-field">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value as ClasseBatismal['status'] }))}
                  className="input-field"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Student selection */}
              <div>
                <label className="label-field">
                  Alunos ({form.alunos.length} selecionado{form.alunos.length !== 1 ? 's' : ''})
                </label>
                <input
                  type="text"
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  className="input-field mb-2"
                  placeholder="Buscar pessoa..."
                />
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {pessoasFiltradas.length === 0 ? (
                    <p className="p-3 text-sm text-gray-400 text-center">Nenhuma pessoa encontrada</p>
                  ) : (
                    pessoasFiltradas.map(p => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.alunos.includes(p.id)}
                          onChange={() => toggleAluno(p.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">{p.nome}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowModal(false); setEditingId(null) }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Classe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== Lessons Panel Modal ========== */}
      {showLicoes && classeAtual && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Lições - {classeAtual.nome}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {licoes.length} lição{licoes.length !== 1 ? 'ões' : 'ão'}
                  </p>
                </div>
                <button
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                  onClick={openCreateLicao}
                >
                  <FiPlus className="w-4 h-4" />
                  Nova Lição
                </button>
              </div>

              {licoes.length === 0 ? (
                <div className="p-8 text-center">
                  <FiBook className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Nenhuma lição cadastrada</p>
                </div>
              ) : (
                <>
                  {/* Desktop lessons table */}
                  <div className="hidden md:block overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                          <th className="px-4 py-3">Nº</th>
                          <th className="px-4 py-3">Título</th>
                          <th className="px-4 py-3">Data Prevista</th>
                          <th className="px-4 py-3">Data Realizada</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {licoes.map((l, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800">{l.numero}</td>
                            <td className="px-4 py-3 text-gray-700">{l.titulo}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {l.dataPrevista
                                ? new Date(l.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {l.dataRealizada ? (
                                <span className="text-green-600 font-medium">
                                  {new Date(l.dataRealizada + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              ) : (
                                <span className="text-gray-400">Pendente</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => openEditLicao(idx)}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
                                title="Editar lição"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile lessons cards */}
                  <div className="md:hidden space-y-2">
                    {licoes.map((l, idx) => (
                      <div key={idx} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-800 text-sm">
                            Lição {l.numero} - {l.titulo}
                          </p>
                          <button
                            onClick={() => openEditLicao(idx)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Prevista:{' '}
                          {l.dataPrevista
                            ? new Date(l.dataPrevista + 'T00:00:00').toLocaleDateString('pt-BR')
                            : '-'}
                          {' | '}
                          Realizada:{' '}
                          {l.dataRealizada
                            ? new Date(l.dataRealizada + 'T00:00:00').toLocaleDateString('pt-BR')
                            : 'Pendente'}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={closeLicoes}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== Create/Edit Lesson Modal ========== */}
      {showLicaoModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveLicao} className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingLicaoIdx !== null ? 'Editar Lição' : 'Nova Lição'}
              </h2>

              <div>
                <label className="label-field">Título da Lição</label>
                <input
                  type="text"
                  value={licaoForm.titulo}
                  onChange={(e) => setLicaoForm(f => ({ ...f, titulo: e.target.value }))}
                  className="input-field"
                  placeholder="Ex: O Plano da Salvação"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Data Prevista</label>
                  <input
                    type="date"
                    value={licaoForm.dataPrevista}
                    onChange={(e) => setLicaoForm(f => ({ ...f, dataPrevista: e.target.value }))}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Data Realizada</label>
                  <input
                    type="date"
                    value={licaoForm.dataRealizada}
                    onChange={(e) => setLicaoForm(f => ({ ...f, dataRealizada: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Presence for this lesson (only students enrolled in the class) */}
              {alunosDaClasse.length > 0 && (
                <div>
                  <label className="label-field">
                    Presença ({licaoForm.presentes.length}/{alunosDaClasse.length})
                  </label>
                  <div className="border rounded-lg max-h-40 overflow-y-auto">
                    {alunosDaClasse.map(alunoId => (
                      <label
                        key={alunoId}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={licaoForm.presentes.includes(alunoId)}
                          onChange={() => {
                            setLicaoForm(f => ({
                              ...f,
                              presentes: f.presentes.includes(alunoId)
                                ? f.presentes.filter(id => id !== alunoId)
                                : [...f.presentes, alunoId],
                            }))
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">{getNomeAluno(alunoId)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setShowLicaoModal(false); setEditingLicaoIdx(null) }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={savingLicao}>
                  {savingLicao ? 'Salvando...' : editingLicaoIdx !== null ? 'Salvar Alterações' : 'Adicionar Lição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

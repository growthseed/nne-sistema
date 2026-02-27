import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ClasseES, PresencaES } from '@/types'
import { FiPlus, FiFilter, FiCalendar, FiCheck, FiX } from 'react-icons/fi'

interface PresencaComClasse extends PresencaES {
  classe?: { nome: string } | null
}

interface MembroPessoa {
  id: string
  nome: string
}

function calcularTrimestre(mes: number): number {
  if (mes <= 3) return 1
  if (mes <= 6) return 2
  if (mes <= 9) return 3
  return 4
}

export default function PresencaPage() {
  const { profile } = useAuth()

  // List state
  const [registros, setRegistros] = useState<PresencaComClasse[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroClasseId, setFiltroClasseId] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classes, setClasses] = useState<ClasseES[]>([])
  const [membrosClasse, setMembrosClasse] = useState<MembroPessoa[]>([])
  const [loadingMembros, setLoadingMembros] = useState(false)

  const [formClasseId, setFormClasseId] = useState('')
  const [formData, setFormData] = useState(new Date().toISOString().slice(0, 10))
  const [presentes, setPresentes] = useState<Set<string>>(new Set())
  const [visitantes, setVisitantes] = useState(0)
  const [oferta, setOferta] = useState(0)
  const [licaoEstudada, setLicaoEstudada] = useState(0)
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    if (profile) {
      fetchClasses()
      fetchRegistros()
    }
  }, [profile])

  useEffect(() => {
    if (profile) fetchRegistros()
  }, [filtroClasseId, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    if (formClasseId) fetchMembrosClasse(formClasseId)
    else setMembrosClasse([])
  }, [formClasseId])

  async function fetchClasses() {
    if (!profile) return
    try {
      let query = supabase
        .from('classes_es')
        .select('*')
        .eq('ativa', true)
        .order('nome')

      if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Erro ao buscar classes:', err)
    }
  }

  async function fetchRegistros() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('presenca_es')
        .select('*, classe:classes_es!classe_id(nome)')
        .order('data', { ascending: false })
        .limit(50)

      if (filtroClasseId) {
        query = query.eq('classe_id', filtroClasseId)
      }

      if (filtroDataInicio) {
        query = query.gte('data', filtroDataInicio)
      }

      if (filtroDataFim) {
        query = query.lte('data', filtroDataFim)
      }

      const { data, error } = await query
      if (error) throw error
      setRegistros(data || [])
    } catch (err) {
      console.error('Erro ao buscar presença:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMembrosClasse(classeId: string) {
    setLoadingMembros(true)
    try {
      const classe = classes.find(c => c.id === classeId)
      if (!classe || !classe.membros || classe.membros.length === 0) {
        setMembrosClasse([])
        setPresentes(new Set())
        return
      }

      const { data, error } = await supabase
        .from('pessoas')
        .select('id, nome')
        .in('id', classe.membros)
        .order('nome')

      if (error) throw error
      setMembrosClasse(data || [])
      // By default, mark all as present
      setPresentes(new Set((data || []).map(m => m.id)))
    } catch (err) {
      console.error('Erro ao buscar membros da classe:', err)
    } finally {
      setLoadingMembros(false)
    }
  }

  function togglePresente(membroId: string) {
    setPresentes(prev => {
      const next = new Set(prev)
      if (next.has(membroId)) {
        next.delete(membroId)
      } else {
        next.add(membroId)
      }
      return next
    })
  }

  function openForm() {
    setFormClasseId('')
    setFormData(new Date().toISOString().slice(0, 10))
    setPresentes(new Set())
    setVisitantes(0)
    setOferta(0)
    setLicaoEstudada(0)
    setObservacoes('')
    setMembrosClasse([])
    setShowForm(true)
  }

  const ausentes = useMemo(() => {
    return membrosClasse.filter(m => !presentes.has(m.id)).map(m => m.id)
  }, [membrosClasse, presentes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !formClasseId || !formData) return
    setSaving(true)
    try {
      const dateParts = formData.split('-')
      const mes = parseInt(dateParts[1], 10)
      const ano = parseInt(dateParts[0], 10)
      const trimestre = calcularTrimestre(mes)

      const payload: Omit<PresencaES, 'id' | 'created_at'> = {
        classe_id: formClasseId,
        data: formData,
        trimestre,
        ano,
        presentes: Array.from(presentes),
        ausentes,
        visitantes,
        oferta,
        licao_estudada: licaoEstudada || null,
        observacoes: observacoes.trim() || null,
      }

      const { error } = await supabase
        .from('presenca_es')
        .insert(payload)
      if (error) throw error

      setShowForm(false)
      fetchRegistros()
    } catch (err) {
      console.error('Erro ao salvar presença:', err)
      alert('Erro ao salvar presença')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(d: string) {
    const parts = d.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Presença - Escola Sabatina</h1>
          <p className="text-gray-500 mt-1">Registro de frequência das classes</p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 w-fit" onClick={openForm}>
          <FiPlus className="w-4 h-4" />
          Registrar Presença
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">Registrar Presença</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Classe</label>
              <select
                value={formClasseId}
                onChange={(e) => setFormClasseId(e.target.value)}
                className="input-field"
                required
              >
                <option value="">-- Selecione a classe --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Data</label>
              <input
                type="date"
                value={formData}
                onChange={(e) => setFormData(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          {/* Members checklist */}
          {formClasseId && (
            <div>
              <label className="label-field">
                Membros ({presentes.size} presentes / {ausentes.length} ausentes)
              </label>
              {loadingMembros ? (
                <p className="text-gray-400 text-sm py-2">Carregando membros...</p>
              ) : membrosClasse.length === 0 ? (
                <p className="text-gray-400 text-sm py-2">Nenhum membro nesta classe. Adicione membros primeiro.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {membrosClasse.map(m => {
                    const isPresente = presentes.has(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => togglePresente(m.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                          isPresente
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}
                      >
                        {isPresente ? (
                          <FiCheck className="w-4 h-4 shrink-0" />
                        ) : (
                          <FiX className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate">{m.nome}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Extra fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-field">Visitantes</label>
              <input
                type="number"
                min={0}
                value={visitantes}
                onChange={(e) => setVisitantes(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Oferta (R$)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={oferta}
                onChange={(e) => setOferta(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Lição Estudada</label>
              <input
                type="number"
                min={0}
                max={13}
                value={licaoEstudada}
                onChange={(e) => setLicaoEstudada(Number(e.target.value))}
                className="input-field"
                placeholder="1-13"
              />
            </div>
          </div>

          <div>
            <label className="label-field">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="input-field"
              rows={2}
              placeholder="Observações opcionais..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Presença'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="label-field">
              <FiFilter className="inline w-3.5 h-3.5 mr-1" />
              Classe
            </label>
            <select
              value={filtroClasseId}
              onChange={(e) => setFiltroClasseId(e.target.value)}
              className="input-field"
            >
              <option value="">Todas as classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">
              <FiCalendar className="inline w-3.5 h-3.5 mr-1" />
              De
            </label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Até</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Recent records table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : registros.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum registro de presença encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3 text-center">Presentes</th>
                  <th className="px-4 py-3 text-center">Ausentes</th>
                  <th className="px-4 py-3 text-center">Visitantes</th>
                  <th className="px-4 py-3 text-right">Oferta</th>
                  <th className="px-4 py-3 text-center">Lição</th>
                  <th className="px-4 py-3 text-center">Trim.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registros.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{formatDate(r.data)}</td>
                    <td className="px-4 py-3 text-gray-500">{r.classe?.nome || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-green-600 font-medium">{r.presentes?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-red-500 font-medium">{r.ausentes?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-blue-600">{r.visitantes || 0}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {r.oferta ? `R$ ${Number(r.oferta).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{r.licao_estudada || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        T{r.trimestre}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

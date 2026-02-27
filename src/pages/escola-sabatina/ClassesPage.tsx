import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ClasseES, Pessoa } from '@/types'
import { FiPlus, FiEdit, FiSearch, FiUsers } from 'react-icons/fi'

interface ClasseComJoin extends ClasseES {
  professor?: { nome: string } | null
  auxiliar?: { nome: string } | null
}

const FAIXAS_ETARIAS = ['Crianças', 'Adolescentes', 'Jovens', 'Adultos']

const emptyForm = {
  nome: '',
  faixa_etaria: 'Adultos',
  professor_id: '' as string | null,
  auxiliar_id: '' as string | null,
  ativa: true,
}

export default function ClassesPage() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<ClasseComJoin[]>([])
  const [pessoas, setPessoas] = useState<Pick<Pessoa, 'id' | 'nome'>[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [filtroAtiva, setFiltroAtiva] = useState<'todas' | 'ativas' | 'inativas'>('ativas')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (profile) {
      fetchClasses()
      fetchPessoas()
    }
  }, [profile, filtroAtiva])

  async function fetchClasses() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('classes_es')
        .select('*, professor:pessoas!professor_id(nome), auxiliar:pessoas!auxiliar_id(nome)')
        .order('nome')

      // Hierarchical filter
      if (profile.papel === 'admin_uniao') {
        // Admin uniao sees all classes from their union's churches - filter via igrejas
      } else if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      if (filtroAtiva === 'ativas') {
        query = query.eq('ativa', true)
      } else if (filtroAtiva === 'inativas') {
        query = query.eq('ativa', false)
      }

      const { data, error } = await query
      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      console.error('Erro ao buscar classes:', err)
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

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(classe: ClasseComJoin) {
    setEditingId(classe.id)
    setForm({
      nome: classe.nome,
      faixa_etaria: classe.faixa_etaria || 'Adultos',
      professor_id: classe.professor_id || '',
      auxiliar_id: classe.auxiliar_id || '',
      ativa: classe.ativa,
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        faixa_etaria: form.faixa_etaria,
        professor_id: form.professor_id || null,
        auxiliar_id: form.auxiliar_id || null,
        ativa: form.ativa,
        igreja_id: profile.igreja_id,
      }

      if (editingId) {
        const { error } = await supabase
          .from('classes_es')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('classes_es')
          .insert({ ...payload, membros: [] })
        if (error) throw error
      }

      setShowModal(false)
      setForm(emptyForm)
      setEditingId(null)
      fetchClasses()
    } catch (err) {
      console.error('Erro ao salvar classe:', err)
      alert('Erro ao salvar classe')
    } finally {
      setSaving(false)
    }
  }

  const classesFiltradas = busca.trim()
    ? classes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))
    : classes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Classes da Escola Sabatina</h1>
          <p className="text-gray-500 mt-1">
            {classesFiltradas.length} classe{classesFiltradas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 w-fit" onClick={openCreate}>
          <FiPlus className="w-4 h-4" />
          Nova Classe
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field pl-10"
              placeholder="Buscar por nome da classe..."
            />
          </div>
          <select
            value={filtroAtiva}
            onChange={(e) => setFiltroAtiva(e.target.value as typeof filtroAtiva)}
            className="input-field w-auto"
          >
            <option value="ativas">Ativas</option>
            <option value="inativas">Inativas</option>
            <option value="todas">Todas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : classesFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhuma classe encontrada</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Faixa Etária</th>
                    <th className="px-4 py-3">Professor</th>
                    <th className="px-4 py-3">Auxiliar</th>
                    <th className="px-4 py-3 text-center">Membros</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classesFiltradas.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          {c.faixa_etaria || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.professor?.nome || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.auxiliar?.nome || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <FiUsers className="w-3.5 h-3.5" />
                          {c.membros?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {c.ativa ? 'Ativa' : 'Inativa'}
                        </span>
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
              {classesFiltradas.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{c.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.faixa_etaria || '-'} | Prof: {c.professor?.nome || '-'} | {c.membros?.length || 0} membros
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {c.ativa ? 'Ativa' : 'Inativa'}
                    </span>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingId ? 'Editar Classe' : 'Nova Classe'}
              </h2>

              <div>
                <label className="label-field">Nome da Classe</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="input-field"
                  placeholder="Ex: Classe Adultos 1"
                  required
                />
              </div>

              <div>
                <label className="label-field">Faixa Etária</label>
                <select
                  value={form.faixa_etaria}
                  onChange={(e) => setForm(f => ({ ...f, faixa_etaria: e.target.value }))}
                  className="input-field"
                >
                  {FAIXAS_ETARIAS.map(fe => (
                    <option key={fe} value={fe}>{fe}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-field">Professor</label>
                <select
                  value={form.professor_id || ''}
                  onChange={(e) => setForm(f => ({ ...f, professor_id: e.target.value || null }))}
                  className="input-field"
                >
                  <option value="">-- Selecione --</option>
                  {pessoas.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-field">Auxiliar</label>
                <select
                  value={form.auxiliar_id || ''}
                  onChange={(e) => setForm(f => ({ ...f, auxiliar_id: e.target.value || null }))}
                  className="input-field"
                >
                  <option value="">-- Selecione --</option>
                  {pessoas.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="label-field mb-0">Classe Ativa</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, ativa: !f.ativa }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.ativa ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.ativa ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
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
    </div>
  )
}

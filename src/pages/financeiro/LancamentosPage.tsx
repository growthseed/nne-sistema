import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DadosFinanceiros, Igreja } from '@/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pendente: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700' },
  aprovado: { label: 'Aprovado', bg: 'bg-green-100', text: 'text-green-700' },
  rejeitado: { label: 'Rejeitado', bg: 'bg-red-100', text: 'text-red-700' },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ReceitaFields {
  receita_dizimos: number
  receita_primicias: number
  receita_oferta_regular: number
  receita_oferta_especial: number
  receita_oferta_missoes: number
  receita_oferta_agradecimento: number
  receita_oferta_es: number
  receita_doacoes: number
  receita_fundo_assistencial: number
  receita_evangelismo: number
  receita_radio_colportagem: number
  receita_construcao: number
  receita_proventos_imoveis: number
  receita_gratificacao_6: number
  receita_missoes_mundial: number
  receita_missoes_autonomas: number
  receita_outras: number
}

interface DespesaFields {
  despesa_salarios: number
  despesa_manutencao: number
  despesa_aluguel: number
  despesa_agua: number
  despesa_energia: number
  despesa_telefone: number
  despesa_internet: number
  despesa_transporte: number
  despesa_material_es: number
  despesa_eventos: number
  despesa_outras: number
}

interface FormData extends ReceitaFields, DespesaFields {
  igreja_id: string
  mes: number
  ano: number
  observacoes: string
}

const receitaLabels: { key: keyof ReceitaFields; label: string }[] = [
  { key: 'receita_dizimos', label: 'Dízimos' },
  { key: 'receita_primicias', label: 'Primícias' },
  { key: 'receita_oferta_regular', label: 'Oferta Regular' },
  { key: 'receita_oferta_especial', label: 'Oferta Especial' },
  { key: 'receita_oferta_missoes', label: 'Oferta Missões' },
  { key: 'receita_oferta_agradecimento', label: 'Oferta Agradecimento' },
  { key: 'receita_oferta_es', label: 'Oferta Escola Sabatina' },
  { key: 'receita_evangelismo', label: 'Evangelismo' },
  { key: 'receita_doacoes', label: 'Doações' },
  { key: 'receita_fundo_assistencial', label: 'Fundo Assistencial' },
  { key: 'receita_radio_colportagem', label: 'Rádio/Colportagem' },
  { key: 'receita_construcao', label: 'Construção' },
  { key: 'receita_proventos_imoveis', label: 'Proventos Imóveis' },
  { key: 'receita_gratificacao_6', label: 'Gratificação 6%' },
  { key: 'receita_missoes_mundial', label: 'Missões Mundial' },
  { key: 'receita_missoes_autonomas', label: 'Missões Autônomas' },
  { key: 'receita_outras', label: 'Outras Receitas' },
]

const despesaLabels: { key: keyof DespesaFields; label: string }[] = [
  { key: 'despesa_salarios', label: 'Salários' },
  { key: 'despesa_aluguel', label: 'Aluguel' },
  { key: 'despesa_manutencao', label: 'Manutenção' },
  { key: 'despesa_agua', label: 'Água' },
  { key: 'despesa_energia', label: 'Energia' },
  { key: 'despesa_telefone', label: 'Telefone' },
  { key: 'despesa_internet', label: 'Internet' },
  { key: 'despesa_transporte', label: 'Transporte' },
  { key: 'despesa_material_es', label: 'Material Escola Sabatina' },
  { key: 'despesa_eventos', label: 'Eventos/Atividades' },
  { key: 'despesa_outras', label: 'Outras Despesas' },
]

const emptyForm: FormData = {
  igreja_id: '',
  mes: new Date().getMonth() + 1,
  ano: new Date().getFullYear(),
  receita_dizimos: 0,
  receita_primicias: 0,
  receita_oferta_regular: 0,
  receita_oferta_especial: 0,
  receita_oferta_missoes: 0,
  receita_oferta_agradecimento: 0,
  receita_oferta_es: 0,
  receita_doacoes: 0,
  receita_fundo_assistencial: 0,
  receita_evangelismo: 0,
  receita_radio_colportagem: 0,
  receita_construcao: 0,
  receita_proventos_imoveis: 0,
  receita_gratificacao_6: 0,
  receita_missoes_mundial: 0,
  receita_missoes_autonomas: 0,
  receita_outras: 0,
  despesa_salarios: 0,
  despesa_aluguel: 0,
  despesa_manutencao: 0,
  despesa_agua: 0,
  despesa_energia: 0,
  despesa_telefone: 0,
  despesa_internet: 0,
  despesa_transporte: 0,
  despesa_material_es: 0,
  despesa_eventos: 0,
  despesa_outras: 0,
  observacoes: '',
}

function calcTotalReceitas(d: ReceitaFields): number {
  return (
    (d.receita_dizimos || 0) +
    ((d as any).dizimo || 0) +
    (d.receita_primicias || 0) +
    ((d as any).primicias || 0) +
    (d.receita_oferta_regular || 0) +
    (d.receita_oferta_especial || 0) +
    (d.receita_oferta_missoes || 0) +
    (d.receita_oferta_agradecimento || 0) +
    (d.receita_oferta_es || 0) +
    (d.receita_doacoes || 0) +
    (d.receita_fundo_assistencial || 0) +
    (d.receita_evangelismo || 0) +
    (d.receita_radio_colportagem || 0) +
    (d.receita_construcao || 0) +
    (d.receita_proventos_imoveis || 0) +
    (d.receita_gratificacao_6 || 0) +
    (d.receita_missoes_mundial || 0) +
    (d.receita_missoes_autonomas || 0) +
    (d.receita_outras || 0)
  )
}

function calcTotalDespesas(d: DespesaFields): number {
  return (
    (d.despesa_salarios || 0) +
    (d.despesa_aluguel || 0) +
    (d.despesa_manutencao || 0) +
    (d.despesa_agua || 0) +
    (d.despesa_energia || 0) +
    (d.despesa_telefone || 0) +
    (d.despesa_internet || 0) +
    (d.despesa_transporte || 0) +
    (d.despesa_material_es || 0) +
    (d.despesa_eventos || 0) +
    (d.despesa_outras || 0)
  )
}

interface EntryWithIgreja extends DadosFinanceiros {
  igreja?: { nome: string } | null
}

export default function LancamentosPage() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<EntryWithIgreja[]>([])
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())

  const canApprove = profile?.papel === 'admin' || profile?.papel === 'admin_uniao' || profile?.papel === 'admin_associacao'

  useEffect(() => {
    if (profile) {
      fetchEntries()
      fetchIgrejas()
    }
  }, [profile, filtroMes, filtroAno, filtroStatus])

  async function fetchIgrejas() {
    if (!profile) return
    try {
      let query = supabase
        .from('igrejas')
        .select('id, nome, associacao_id, uniao_id')
        .eq('ativo', true)
        .order('nome')

      if (profile.papel === 'admin') {
        // see all
      } else if (profile.papel === 'admin_uniao') {
        const { data: assocs } = await supabase
          .from('associacoes')
          .select('id')
          .eq('uniao_id', profile.uniao_id!)
        const assocIds = assocs?.map((a) => a.id) || []
        if (assocIds.length > 0) {
          query = query.in('associacao_id', assocIds)
        } else {
          query = query.eq('associacao_id', 'none')
        }
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else {
        if (profile.igreja_id) {
          query = query.eq('id', profile.igreja_id)
        }
      }

      const { data, error } = await query
      if (error) throw error
      setIgrejas((data as Igreja[]) || [])
    } catch (err) {
      console.error('Erro ao buscar igrejas:', err)
    }
  }

  const fetchEntries = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('dados_financeiros')
        .select('*, igreja:igrejas(nome)')
        .eq('mes', filtroMes)
        .eq('ano', filtroAno)
        .order('created_at', { ascending: false })

      // Hierarchical filter
      if (profile.papel === 'admin') {
        // admin sees all
      } else if (profile.papel === 'admin_uniao') {
        const { data: assocs } = await supabase
          .from('associacoes')
          .select('id')
          .eq('uniao_id', profile.uniao_id!)
        const assocIds = assocs?.map((a) => a.id) || []
        if (assocIds.length > 0) {
          query = query.in('associacao_id', assocIds)
        } else {
          query = query.eq('associacao_id', 'none')
        }
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else if (profile.papel === 'tesoureiro') {
        query = query.eq('igreja_id', profile.igreja_id!)
      } else {
        if (profile.igreja_id) {
          query = query.eq('igreja_id', profile.igreja_id)
        }
      }

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      const { data, error } = await query
      if (error) throw error
      setEntries((data as EntryWithIgreja[]) || [])
    } catch (err) {
      console.error('Erro ao buscar lançamentos:', err)
    } finally {
      setLoading(false)
    }
  }, [profile, filtroMes, filtroAno, filtroStatus])

  function handleNumericChange(field: string, value: string) {
    const num = value === '' ? 0 : parseFloat(value)
    setForm((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }))
  }

  function openNewForm() {
    setEditingId(null)
    const newForm = { ...emptyForm }
    // Pre-fill igreja_id if user has only one
    if (profile?.igreja_id && (profile.papel === 'tesoureiro' || profile.papel === 'secretario_igreja' || profile.papel === 'membro')) {
      newForm.igreja_id = profile.igreja_id
    }
    setForm(newForm)
    setShowForm(true)
  }

  function openEditForm(entry: EntryWithIgreja) {
    setEditingId(entry.id)
    setForm({
      igreja_id: entry.igreja_id,
      mes: entry.mes,
      ano: entry.ano,
      receita_dizimos: entry.receita_dizimos || 0,
      receita_primicias: entry.receita_primicias || 0,
      receita_oferta_regular: entry.receita_oferta_regular || 0,
      receita_oferta_especial: entry.receita_oferta_especial || 0,
      receita_oferta_missoes: entry.receita_oferta_missoes || 0,
      receita_oferta_agradecimento: entry.receita_oferta_agradecimento || 0,
      receita_oferta_es: entry.receita_oferta_es || 0,
      receita_doacoes: entry.receita_doacoes || 0,
      receita_fundo_assistencial: entry.receita_fundo_assistencial || 0,
      receita_evangelismo: entry.receita_evangelismo || 0,
      receita_radio_colportagem: entry.receita_radio_colportagem || 0,
      receita_construcao: entry.receita_construcao || 0,
      receita_proventos_imoveis: entry.receita_proventos_imoveis || 0,
      receita_gratificacao_6: entry.receita_gratificacao_6 || 0,
      receita_missoes_mundial: entry.receita_missoes_mundial || 0,
      receita_missoes_autonomas: entry.receita_missoes_autonomas || 0,
      receita_outras: entry.receita_outras || 0,
      despesa_salarios: entry.despesa_salarios || 0,
      despesa_aluguel: entry.despesa_aluguel || 0,
      despesa_manutencao: entry.despesa_manutencao || 0,
      despesa_agua: entry.despesa_agua || 0,
      despesa_energia: entry.despesa_energia || 0,
      despesa_telefone: entry.despesa_telefone || 0,
      despesa_internet: entry.despesa_internet || 0,
      despesa_transporte: entry.despesa_transporte || 0,
      despesa_material_es: entry.despesa_material_es || 0,
      despesa_eventos: entry.despesa_eventos || 0,
      despesa_outras: entry.despesa_outras || 0,
      observacoes: entry.observacoes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.igreja_id) {
      alert('Selecione uma igreja')
      return
    }
    setSaving(true)
    try {
      // Find associacao_id from the selected igreja
      const selectedIgreja = igrejas.find((i) => i.id === form.igreja_id)
      const payload = {
        ...form,
        associacao_id: selectedIgreja?.associacao_id || profile?.associacao_id || null,
        status: 'pendente' as const,
      }

      if (editingId) {
        const { error } = await supabase
          .from('dados_financeiros')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dados_financeiros')
          .insert(payload)
        if (error) throw error
      }

      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      fetchEntries()
    } catch (err) {
      console.error('Erro ao salvar lançamento:', err)
      alert('Erro ao salvar lançamento')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: string, newStatus: 'aprovado' | 'rejeitado') {
    try {
      const { error } = await supabase
        .from('dados_financeiros')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      fetchEntries()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      alert('Erro ao atualizar status')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return
    try {
      const { error } = await supabase
        .from('dados_financeiros')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchEntries()
    } catch (err) {
      console.error('Erro ao excluir lançamento:', err)
      alert('Erro ao excluir lançamento')
    }
  }

  const totalReceitas = useMemo(() => calcTotalReceitas(form), [form])
  const totalDespesas = useMemo(() => calcTotalDespesas(form), [form])
  const saldoForm = totalReceitas - totalDespesas

  const filteredEntries = useMemo(() => {
    if (!busca.trim()) return entries
    const term = busca.toLowerCase()
    return entries.filter((e) =>
      (e.igreja?.nome || '').toLowerCase().includes(term) ||
      (e.observacoes || '').toLowerCase().includes(term)
    )
  }, [entries, busca])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/financeiro" className="hover:text-blue-600">Financeiro</Link>
            <span>/</span>
            <span>Lançamentos</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Lançamentos Financeiros</h1>
        </div>
        <button className="btn-primary" onClick={() => showForm ? setShowForm(false) : openNewForm()}>
          {showForm ? 'Cancelar' : '+ Novo Lançamento'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>

          {/* Igreja + Período */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Igreja</label>
              <select
                value={form.igreja_id}
                onChange={(e) => setForm((p) => ({ ...p, igreja_id: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Selecione a igreja...</option>
                {igrejas.map((ig) => (
                  <option key={ig.id} value={ig.id}>{ig.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Mês</label>
              <select
                value={form.mes}
                onChange={(e) => setForm((p) => ({ ...p, mes: Number(e.target.value) }))}
                className="input-field"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Ano</label>
              <select
                value={form.ano}
                onChange={(e) => setForm((p) => ({ ...p, ano: Number(e.target.value) }))}
                className="input-field"
              >
                {[2024, 2025, 2026, 2027].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Receitas Section */}
          <div>
            <h3 className="text-base font-semibold text-green-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Receitas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {receitaLabels.map(({ key, label }) => (
                <div key={key}>
                  <label className="label-field">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form[key] || ''}
                    onChange={(e) => handleNumericChange(key, e.target.value)}
                    onFocus={(e) => { if (e.target.value === '0') e.target.value = '' }}
                    className="input-field"
                    placeholder="0,00"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <span className="text-sm text-gray-500">Total Receitas: </span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(totalReceitas)}</span>
            </div>
          </div>

          {/* Despesas Section */}
          <div>
            <h3 className="text-base font-semibold text-red-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              Despesas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {despesaLabels.map(({ key, label }) => (
                <div key={key}>
                  <label className="label-field">{label}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form[key] || ''}
                    onChange={(e) => handleNumericChange(key, e.target.value)}
                    onFocus={(e) => { if (e.target.value === '0') e.target.value = '' }}
                    className="input-field"
                    placeholder="0,00"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <span className="text-sm text-gray-500">Total Despesas: </span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(totalDespesas)}</span>
            </div>
          </div>

          {/* Saldo + Observacoes */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 border-t border-gray-200 pt-4">
            <div className="flex-1">
              <label className="label-field">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                className="input-field"
                rows={2}
                placeholder="Observações opcionais..."
              />
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm text-gray-500 block">Saldo</span>
              <span className={`text-2xl font-bold ${saldoForm >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(saldoForm)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setShowForm(false); setEditingId(null) }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field"
              placeholder="Buscar por igreja ou observação..."
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(Number(e.target.value))}
              className="input-field w-auto"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(Number(e.target.value))}
              className="input-field w-auto"
            >
              {[2024, 2025, 2026, 2027].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="input-field w-auto"
            >
              <option value="todos">Todos status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        {loading ? (
          <p className="text-center text-gray-400 py-8">Carregando...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Nenhum lançamento encontrado</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Igreja</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3 text-right">Receitas</th>
                    <th className="px-4 py-3 text-right">Despesas</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEntries.map((entry) => {
                    const receitas = calcTotalReceitas(entry)
                    const despesas = calcTotalDespesas(entry)
                    const saldo = receitas - despesas
                    const st = statusConfig[entry.status] || statusConfig.pendente
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {entry.igreja?.nome || '---'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {MESES[entry.mes - 1]} / {entry.ano}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          {formatCurrency(receitas)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">
                          {formatCurrency(despesas)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(saldo)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {entry.status === 'pendente' && (
                              <button
                                onClick={() => openEditForm(entry)}
                                className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                                title="Editar"
                              >
                                Editar
                              </button>
                            )}
                            {canApprove && entry.status === 'pendente' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(entry.id, 'aprovado')}
                                  className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => handleStatusChange(entry.id, 'rejeitado')}
                                  className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                  Rejeitar
                                </button>
                              </>
                            )}
                            {entry.status === 'pendente' && (
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                                title="Excluir"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredEntries.map((entry) => {
                const receitas = calcTotalReceitas(entry)
                const despesas = calcTotalDespesas(entry)
                const saldo = receitas - despesas
                const st = statusConfig[entry.status] || statusConfig.pendente
                return (
                  <div key={entry.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{entry.igreja?.nome || '---'}</p>
                        <p className="text-xs text-gray-400">{MESES[entry.mes - 1]} / {entry.ano}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-gray-400 block">Receitas</span>
                        <span className="text-green-600 font-medium">{formatCurrency(receitas)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Despesas</span>
                        <span className="text-red-600 font-medium">{formatCurrency(despesas)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Saldo</span>
                        <span className={`font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(saldo)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {entry.status === 'pendente' && (
                        <button
                          onClick={() => openEditForm(entry)}
                          className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          Editar
                        </button>
                      )}
                      {canApprove && entry.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(entry.id, 'aprovado')}
                            className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleStatusChange(entry.id, 'rejeitado')}
                            className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Rejeitar
                          </button>
                        </>
                      )}
                      {entry.status === 'pendente' && (
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

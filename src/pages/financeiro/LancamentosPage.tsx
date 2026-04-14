import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toastSuccess, toastError } from '@/lib/toast'
import { FinanceiroTableSkeleton } from '@/components/financeiro/FinanceiroSkeletons'
import { useAuth } from '@/contexts/AuthContext'
import { VirtualTable, type VColumn } from '@/components/ui/VirtualTable'
import {
  type EntryWithIgreja,
  useDeleteLancamento,
  useFinanceiroLancamentos,
  useSaveLancamento,
  useScopedFinanceiroIgrejas,
  useUpdateLancamentoStatus,
} from '@/hooks/useFinanceiroLancamentos'

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
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
  { key: 'receita_dizimos', label: 'Dizimos' },
  { key: 'receita_primicias', label: 'Primicias' },
  { key: 'receita_oferta_regular', label: 'Oferta Regular' },
  { key: 'receita_oferta_especial', label: 'Oferta Especial' },
  { key: 'receita_oferta_missoes', label: 'Oferta Missoes' },
  { key: 'receita_oferta_agradecimento', label: 'Oferta Agradecimento' },
  { key: 'receita_oferta_es', label: 'Oferta Escola Sabatina' },
  { key: 'receita_evangelismo', label: 'Evangelismo' },
  { key: 'receita_doacoes', label: 'Doacoes' },
  { key: 'receita_fundo_assistencial', label: 'Fundo Assistencial' },
  { key: 'receita_radio_colportagem', label: 'Radio/Colportagem' },
  { key: 'receita_construcao', label: 'Construcao' },
  { key: 'receita_proventos_imoveis', label: 'Proventos Imoveis' },
  { key: 'receita_gratificacao_6', label: 'Gratificacao 6%' },
  { key: 'receita_missoes_mundial', label: 'Missoes Mundial' },
  { key: 'receita_missoes_autonomas', label: 'Missoes Autonomas' },
  { key: 'receita_outras', label: 'Outras Receitas' },
]

const despesaLabels: { key: keyof DespesaFields; label: string }[] = [
  { key: 'despesa_salarios', label: 'Salarios' },
  { key: 'despesa_aluguel', label: 'Aluguel' },
  { key: 'despesa_manutencao', label: 'Manutencao' },
  { key: 'despesa_agua', label: 'Agua' },
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

export default function LancamentosPage() {
  const { profile } = useAuth()
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'approve' | 'reject' | 'delete' | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear())

  const { entries, loading, error, refetch } = useFinanceiroLancamentos({
    mes: filtroMes,
    ano: filtroAno,
    status: filtroStatus,
  })
  const { igrejas } = useScopedFinanceiroIgrejas()
  const saveLancamento = useSaveLancamento()
  const updateLancamentoStatus = useUpdateLancamentoStatus()
  const deleteLancamento = useDeleteLancamento()

  const saving = saveLancamento.isPending
  const canApprove = profile?.papel === 'admin' || profile?.papel === 'admin_uniao' || profile?.papel === 'admin_associacao'

  function handleNumericChange(field: string, value: string) {
    const num = value === '' ? 0 : parseFloat(value)
    setForm((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }))
  }

  function openNewForm() {
    setEditingId(null)
    const newForm = { ...emptyForm }

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
      toastError('Selecione uma igreja antes de salvar.')
      return
    }

    try {
      const selectedIgreja = igrejas.find((igreja) => igreja.id === form.igreja_id)
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        ...form,
        associacao_id: selectedIgreja?.associacao_id || profile?.associacao_id || null,
        status: 'pendente' as const,
      }

      await saveLancamento.mutateAsync(payload)

      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      toastSuccess(editingId ? 'Lancamento atualizado com sucesso.' : 'Lancamento salvo com sucesso.')
    } catch (mutationError) {
      console.error('Erro ao salvar lancamento:', mutationError)
      toastError('Nao foi possivel salvar o lancamento agora.')
    }
  }

  async function handleStatusChange(id: string, newStatus: 'aprovado' | 'rejeitado') {
    setBusyEntryId(id)
    setBusyAction(newStatus === 'aprovado' ? 'approve' : 'reject')

    try {
      await updateLancamentoStatus.mutateAsync({ id, status: newStatus })
      toastSuccess(newStatus === 'aprovado' ? 'Lancamento aprovado.' : 'Lancamento rejeitado.')
    } catch (mutationError) {
      console.error('Erro ao atualizar status:', mutationError)
      toastError('Nao foi possivel atualizar o status do lancamento.')
    } finally {
      setBusyEntryId(null)
      setBusyAction(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este lancamento?')) return

    setBusyEntryId(id)
    setBusyAction('delete')

    try {
      await deleteLancamento.mutateAsync(id)
      toastSuccess('Lancamento excluido com sucesso.')
    } catch (mutationError) {
      console.error('Erro ao excluir lancamento:', mutationError)
      toastError('Nao foi possivel excluir o lancamento.')
    } finally {
      setBusyEntryId(null)
      setBusyAction(null)
    }
  }

  const totalReceitas = useMemo(() => calcTotalReceitas(form), [form])
  const totalDespesas = useMemo(() => calcTotalDespesas(form), [form])
  const saldoForm = totalReceitas - totalDespesas

  const filteredEntries = useMemo(() => {
    if (!busca.trim()) return entries
    const term = busca.toLowerCase()

    return entries.filter((entry) =>
      (entry.igreja?.nome || '').toLowerCase().includes(term) ||
      (entry.observacoes || '').toLowerCase().includes(term),
    )
  }, [entries, busca])

  function isEntryBusy(entryId: string, action?: 'approve' | 'reject' | 'delete') {
    if (busyEntryId !== entryId) return false
    if (!action) return true
    return busyAction === action
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
            <Link to="/financeiro" className="hover:text-blue-600">Financeiro</Link>
            <span>/</span>
            <span>Lancamentos</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Lancamentos Financeiros</h1>
        </div>
        <button className="btn-primary" onClick={() => showForm ? setShowForm(false) : openNewForm()}>
          {showForm ? 'Cancelar' : '+ Novo Lancamento'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {editingId ? 'Editar Lancamento' : 'Novo Lancamento'}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label-field">Igreja</label>
              <select
                value={form.igreja_id}
                onChange={(e) => setForm((prev) => ({ ...prev, igreja_id: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Selecione a igreja...</option>
                {igrejas.map((igreja) => (
                  <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Mes</label>
              <select
                value={form.mes}
                onChange={(e) => setForm((prev) => ({ ...prev, mes: Number(e.target.value) }))}
                className="input-field"
              >
                {MESES.map((mes, index) => (
                  <option key={index} value={index + 1}>{mes}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Ano</label>
              <select
                value={form.ano}
                onChange={(e) => setForm((prev) => ({ ...prev, ano: Number(e.target.value) }))}
                className="input-field"
              >
                {[2024, 2025, 2026, 2027].map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-green-700">
              <span className="h-3 w-3 rounded-full bg-green-500"></span>
              Receitas
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-red-700">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              Despesas
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

          <div className="flex flex-col items-start gap-4 border-t border-gray-200 pt-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="label-field">Observacoes</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                className="input-field"
                rows={2}
                placeholder="Observacoes opcionais..."
              />
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-sm text-gray-500">Saldo</span>
              <span className={`text-2xl font-bold ${saldoForm >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(saldoForm)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Atualizar Lancamento' : 'Salvar Lancamento'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="card flex flex-col gap-3 border border-red-200 bg-red-50 text-sm text-red-700">
          <div>
            <p className="font-medium">Nao foi possivel carregar os lancamentos do periodo.</p>
            <p className="mt-1 text-red-600/90">{error}</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field"
              placeholder="Buscar por igreja ou observacao..."
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(Number(e.target.value))}
              className="input-field w-full lg:w-auto"
            >
              {MESES.map((mes, index) => (
                <option key={index} value={index + 1}>{mes}</option>
              ))}
            </select>
            <select
              value={filtroAno}
              onChange={(e) => setFiltroAno(Number(e.target.value))}
              className="input-field w-full lg:w-auto"
            >
              {[2024, 2025, 2026, 2027].map((ano) => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="input-field w-full lg:w-auto"
            >
              <option value="todos">Todos status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <FinanceiroTableSkeleton titleWidth="w-48" rows={4} embedded />
        ) : (
          <>
            <div className="hidden lg:block">
              <VirtualTable<EntryWithIgreja>
                items={filteredEntries}
                getKey={(e) => e.id}
                rowHeight={52}
                maxHeight={520}
                emptyMessage="Nenhum lancamento encontrado"
                columns={[
                  {
                    key: 'igreja',
                    header: 'Igreja',
                    width: '2fr',
                    render: (e) => <span className="font-medium text-gray-800">{e.igreja?.nome || '---'}</span>,
                  },
                  {
                    key: 'periodo',
                    header: 'Periodo',
                    width: '1fr',
                    render: (e) => <span className="text-gray-500">{MESES[e.mes - 1]} / {e.ano}</span>,
                  },
                  {
                    key: 'receitas',
                    header: 'Receitas',
                    width: '1fr',
                    headerClass: 'text-right',
                    cellClass: 'justify-end',
                    render: (e) => <span className="font-medium text-green-600">{formatCurrency(calcTotalReceitas(e))}</span>,
                  },
                  {
                    key: 'despesas',
                    header: 'Despesas',
                    width: '1fr',
                    headerClass: 'text-right',
                    cellClass: 'justify-end',
                    render: (e) => <span className="font-medium text-red-600">{formatCurrency(calcTotalDespesas(e))}</span>,
                  },
                  {
                    key: 'saldo',
                    header: 'Saldo',
                    width: '1fr',
                    headerClass: 'text-right',
                    cellClass: 'justify-end',
                    render: (e) => {
                      const s = calcTotalReceitas(e) - calcTotalDespesas(e)
                      return <span className={`font-medium ${s >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(s)}</span>
                    },
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    width: '100px',
                    headerClass: 'text-center',
                    cellClass: 'justify-center',
                    render: (e) => {
                      const st = statusConfig[e.status] || statusConfig.pendente
                      return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                    },
                  },
                  {
                    key: 'acoes',
                    header: 'Acoes',
                    width: '180px',
                    headerClass: 'text-right',
                    cellClass: 'justify-end gap-1',
                    render: (e) => (
                      <div className="flex items-center justify-end gap-1">
                        {e.status === 'pendente' && (
                          <button onClick={() => openEditForm(e)} disabled={isEntryBusy(e.id)}
                            className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60">
                            Editar
                          </button>
                        )}
                        {canApprove && e.status === 'pendente' && (
                          <>
                            <button onClick={() => void handleStatusChange(e.id, 'aprovado')} disabled={isEntryBusy(e.id)}
                              className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60">
                              {isEntryBusy(e.id, 'approve') ? 'Aprovando...' : 'Aprovar'}
                            </button>
                            <button onClick={() => void handleStatusChange(e.id, 'rejeitado')} disabled={isEntryBusy(e.id)}
                              className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60">
                              {isEntryBusy(e.id, 'reject') ? 'Rejeitando...' : 'Rejeitar'}
                            </button>
                          </>
                        )}
                        {e.status === 'pendente' && (
                          <button onClick={() => void handleDelete(e.id)} disabled={isEntryBusy(e.id)}
                            className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
                            {isEntryBusy(e.id, 'delete') ? 'Excluindo...' : 'Excluir'}
                          </button>
                        )}
                      </div>
                    ),
                  },
                ] satisfies VColumn<EntryWithIgreja>[]}
              />
            </div>

            <div className="divide-y divide-gray-100 lg:hidden">
              {filteredEntries.map((entry) => {
                const receitas = calcTotalReceitas(entry)
                const despesas = calcTotalDespesas(entry)
                const saldo = receitas - despesas
                const st = statusConfig[entry.status] || statusConfig.pendente

                return (
                  <div key={entry.id} className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{entry.igreja?.nome || '---'}</p>
                        <p className="text-xs text-gray-400">{MESES[entry.mes - 1]} / {entry.ano}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="block text-gray-400">Receitas</span>
                        <span className="font-medium text-green-600">{formatCurrency(receitas)}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400">Despesas</span>
                        <span className="font-medium text-red-600">{formatCurrency(despesas)}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400">Saldo</span>
                        <span className={`font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(saldo)}
                        </span>
                      </div>
                    </div>

                    {entry.observacoes && (
                      <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                        {entry.observacoes}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {entry.status === 'pendente' && (
                        <button
                          onClick={() => openEditForm(entry)}
                          disabled={isEntryBusy(entry.id)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Editar
                        </button>
                      )}
                      {canApprove && entry.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => void handleStatusChange(entry.id, 'aprovado')}
                            disabled={isEntryBusy(entry.id)}
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isEntryBusy(entry.id, 'approve') ? 'Aprovando...' : 'Aprovar'}
                          </button>
                          <button
                            onClick={() => void handleStatusChange(entry.id, 'rejeitado')}
                            disabled={isEntryBusy(entry.id)}
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isEntryBusy(entry.id, 'reject') ? 'Rejeitando...' : 'Rejeitar'}
                          </button>
                        </>
                      )}
                      {entry.status === 'pendente' && (
                        <button
                          onClick={() => void handleDelete(entry.id)}
                          disabled={isEntryBusy(entry.id)}
                          className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isEntryBusy(entry.id, 'delete') ? 'Excluindo...' : 'Excluir'}
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


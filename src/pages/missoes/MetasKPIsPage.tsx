import { useEffect, useState, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatMesAno } from '@/lib/projections'
import type { MetaMissionario, TipoPeriodoMeta, RelatorioMissionario } from '@/types'
import { FiPlus, FiTarget, FiEdit2, FiTrash2 } from 'react-icons/fi'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler)
const COLORS = ['#006D43', '#0F3999', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']
const chartOptions = (titleText?: string): any => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 12 } },
    ...(titleText ? { title: { display: true, text: titleText, font: { size: 14, weight: '600' } } } : {}),
  },
})

import { MISSOES_TABS } from '@/lib/missoes-constants'

function MissoesSubNav() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {MISSOES_TABS.map(tab => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) =>
          `px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`
        }>{tab.label}</NavLink>
      ))}
    </div>
  )
}

// ========== Constants ==========

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const KPI_FIELDS: { key: keyof MetaMissionario; label: string }[] = [
  { key: 'meta_estudos_biblicos', label: 'Estudos Biblicos' },
  { key: 'meta_visitas', label: 'Visitas' },
  { key: 'meta_literatura', label: 'Literatura' },
  { key: 'meta_pessoas_contatadas', label: 'Pessoas Contatadas' },
  { key: 'meta_convites', label: 'Convites' },
  { key: 'meta_pessoas_trazidas', label: 'Pessoas Trazidas' },
  { key: 'meta_horas_trabalho', label: 'Horas de Trabalho' },
  { key: 'meta_batismos', label: 'Batismos' },
  { key: 'meta_classes_batismais', label: 'Classes Batismais' },
  { key: 'meta_receita_dizimos', label: 'Receita Dizimos' },
  { key: 'meta_crescimento_membros', label: 'Crescimento Membros' },
]

const ACTUAL_MAPPING: Record<string, string> = {
  meta_estudos_biblicos: 'estudos_biblicos',
  meta_visitas: 'visitas_missionarias',
  meta_literatura: 'literatura_distribuida',
  meta_pessoas_contatadas: 'pessoas_contatadas',
  meta_convites: 'convites_feitos',
  meta_pessoas_trazidas: 'pessoas_trazidas',
  meta_horas_trabalho: 'horas_trabalho',
}

const emptyMetaForm = {
  missionario_id: '',
  tipo_periodo: 'mensal' as TipoPeriodoMeta,
  mes: new Date().getMonth() + 1,
  trimestre: Math.ceil((new Date().getMonth() + 1) / 3),
  ano: new Date().getFullYear(),
  meta_estudos_biblicos: 0,
  meta_visitas: 0,
  meta_literatura: 0,
  meta_pessoas_contatadas: 0,
  meta_convites: 0,
  meta_pessoas_trazidas: 0,
  meta_horas_trabalho: 0,
  meta_batismos: 0,
  meta_classes_batismais: 0,
  meta_receita_dizimos: 0,
  meta_crescimento_membros: 0,
}

// ========== Component ==========

export default function MetasKPIsPage() {
  const { profile } = useAuth()

  // Whether user is admin-level (can see all missionaries)
  const isAdmin = profile?.papel === 'admin' || profile?.papel === 'admin_uniao' || profile?.papel === 'admin_associacao'

  // State
  const [missionarios, setMissionarios] = useState<{ id: string; usuario_id: string; usuario: { nome: string } | null; igrejas_responsavel: string[] }[]>([])
  const [metas, setMetas] = useState<MetaMissionario[]>([])
  const [relatorios, setRelatorios] = useState<RelatorioMissionario[]>([])
  const [historicalMetas, setHistoricalMetas] = useState<MetaMissionario[]>([])
  const [historicalRelatorios, setHistoricalRelatorios] = useState<RelatorioMissionario[]>([])

  const [selectedMissionario, setSelectedMissionario] = useState('')
  const [selectedMissionarioIgrejas, setSelectedMissionarioIgrejas] = useState<string[]>([])
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoMeta>('mensal')
  const [selectedMes, setSelectedMes] = useState(new Date().getMonth() + 1)
  const [selectedTrimestre, setSelectedTrimestre] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear())

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyMetaForm)

  // ---- Data fetching ----

  useEffect(() => {
    if (profile) fetchMissionarios()
  }, [profile])

  useEffect(() => {
    if (selectedMissionario) {
      fetchMetas()
      fetchRelatorios()
      fetchHistorical()
    }
  }, [selectedMissionario, tipoPeriodo, selectedMes, selectedTrimestre, selectedAno])

  function scopeFilter(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id)
    return query.eq('usuario_id', profile.id)
  }

  async function fetchMissionarios() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('missionarios')
        .select('id, usuario_id, igrejas_responsavel, usuario:usuarios(nome)')
        .eq('status', 'ativo')

      query = scopeFilter(query)

      const { data, error } = await query.order('usuario_id')
      if (error) throw error

      const list = (data || []).map((m: any) => ({
        id: m.id,
        usuario_id: m.usuario_id,
        usuario: m.usuario,
        igrejas_responsavel: m.igrejas_responsavel || [],
      }))
      setMissionarios(list)

      // Auto-select self or first
      if (list.length > 0) {
        const self = list.find((m: any) => m.usuario_id === profile.id)
        const selected = self || list[0]
        setSelectedMissionario(selected.id)
        setSelectedMissionarioIgrejas(selected.igrejas_responsavel)
      }
    } catch (err) {
      console.error('Erro ao buscar missionarios:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMetas() {
    if (!selectedMissionario) return
    try {
      let query = supabase
        .from('metas_missionario')
        .select('*')
        .eq('missionario_id', selectedMissionario)
        .eq('tipo_periodo', tipoPeriodo)
        .eq('ano', selectedAno)

      if (tipoPeriodo === 'mensal') {
        query = query.eq('mes', selectedMes)
      } else if (tipoPeriodo === 'trimestral') {
        query = query.eq('trimestre', selectedTrimestre)
      }

      const { data, error } = await query
      if (error) throw error
      setMetas(data || [])
    } catch (err) {
      console.error('Erro ao buscar metas:', err)
    }
  }

  async function fetchRelatorios() {
    if (!selectedMissionarioIgrejas.length) {
      setRelatorios([])
      return
    }
    try {
      let query = supabase
        .from('relatorios_missionarios')
        .select('*')
        .in('igreja_id', selectedMissionarioIgrejas)
        .eq('ano', selectedAno)

      if (tipoPeriodo === 'mensal') {
        query = query.eq('mes', selectedMes)
      } else if (tipoPeriodo === 'trimestral') {
        const startMonth = (selectedTrimestre - 1) * 3 + 1
        const endMonth = selectedTrimestre * 3
        query = query.gte('mes', startMonth).lte('mes', endMonth)
      }

      const { data, error } = await query
      if (error) throw error
      setRelatorios(data || [])
    } catch (err) {
      console.error('Erro ao buscar relatorios:', err)
    }
  }

  async function fetchHistorical() {
    if (!selectedMissionario) return
    try {
      // Fetch last 12 months of goals
      const { data: metasHist } = await supabase
        .from('metas_missionario')
        .select('*')
        .eq('missionario_id', selectedMissionario)
        .eq('tipo_periodo', 'mensal')
        .gte('ano', selectedAno - 1)
        .order('ano')
        .order('mes')
      setHistoricalMetas(metasHist || [])

      // Fetch last 12 months of reports
      if (selectedMissionarioIgrejas.length) {
        const { data: relsHist } = await supabase
          .from('relatorios_missionarios')
          .select('*')
          .in('igreja_id', selectedMissionarioIgrejas)
          .gte('ano', selectedAno - 1)
        setHistoricalRelatorios(relsHist || [])
      }
    } catch (err) {
      console.error('Erro ao buscar historico:', err)
    }
  }

  // ---- Aggregated actuals ----

  const aggregatedActuals = useMemo(() => {
    return relatorios.reduce(
      (acc, r) => ({
        estudos_biblicos: acc.estudos_biblicos + (r.estudos_biblicos || 0),
        visitas_missionarias: acc.visitas_missionarias + (r.visitas_missionarias || 0),
        literatura_distribuida: acc.literatura_distribuida + (r.literatura_distribuida || 0),
        pessoas_contatadas: acc.pessoas_contatadas + (r.pessoas_contatadas || 0),
        convites_feitos: acc.convites_feitos + (r.convites_feitos || 0),
        pessoas_trazidas: acc.pessoas_trazidas + (r.pessoas_trazidas || 0),
        horas_trabalho: acc.horas_trabalho + (r.horas_trabalho || 0),
      }),
      {
        estudos_biblicos: 0,
        visitas_missionarias: 0,
        literatura_distribuida: 0,
        pessoas_contatadas: 0,
        convites_feitos: 0,
        pessoas_trazidas: 0,
        horas_trabalho: 0,
      }
    )
  }, [relatorios])

  // ---- Progress items from first meta (or combined) ----

  const activeMeta = metas.length > 0 ? metas[0] : null

  const progressItems = useMemo(() => {
    if (!activeMeta) return []
    return KPI_FIELDS.map(({ key, label }) => {
      const goal = (activeMeta[key] as number) || 0
      const actualKey = ACTUAL_MAPPING[key]
      const actual = actualKey ? (aggregatedActuals as any)[actualKey] || 0 : 0
      const pct = goal > 0 ? Math.round((actual / goal) * 100) : 0
      return { label, actual, goal, pct }
    }).filter(item => item.goal > 0) // Only show KPIs that have a goal set
  }, [activeMeta, aggregatedActuals])

  // ---- Historical chart data ----

  const historicalChartData = useMemo(() => {
    // Build last 12 months
    const months: { mes: number; ano: number; label: string }[] = []
    for (let i = 11; i >= 0; i--) {
      let m = new Date().getMonth() + 1 - i
      let y = new Date().getFullYear()
      while (m <= 0) { m += 12; y-- }
      months.push({ mes: m, ano: y, label: formatMesAno(m, y) })
    }

    const attainmentByMonth = months.map(({ mes, ano }) => {
      // Find meta for this month
      const meta = historicalMetas.find(m => m.mes === mes && m.ano === ano)
      if (!meta) return null

      // Sum actuals for this month
      const monthRels = historicalRelatorios.filter(r => r.mes === mes && r.ano === ano)
      const totalEstudos = monthRels.reduce((s, r) => s + (r.estudos_biblicos || 0), 0)
      const totalVisitas = monthRels.reduce((s, r) => s + (r.visitas_missionarias || 0), 0)
      const totalPessoas = monthRels.reduce((s, r) => s + (r.pessoas_trazidas || 0), 0)

      // Overall attainment: avg % across key metrics
      const pcts: number[] = []
      if (meta.meta_estudos_biblicos > 0) pcts.push(totalEstudos / meta.meta_estudos_biblicos * 100)
      if (meta.meta_visitas > 0) pcts.push(totalVisitas / meta.meta_visitas * 100)
      if (meta.meta_pessoas_trazidas > 0) pcts.push(totalPessoas / meta.meta_pessoas_trazidas * 100)

      return pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null
    })

    return {
      labels: months.map(m => m.label),
      datasets: [
        {
          label: '% Atingimento de Metas',
          data: attainmentByMonth,
          borderColor: COLORS[0],
          backgroundColor: COLORS[0] + '20',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: COLORS[0],
        },
        {
          label: 'Meta (100%)',
          data: Array(12).fill(100),
          borderColor: '#CBD5E1',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
      ],
    }
  }, [historicalMetas, historicalRelatorios])

  // ---- Form handlers ----

  function openNewMeta() {
    setEditingId(null)
    setForm({
      ...emptyMetaForm,
      missionario_id: selectedMissionario,
      tipo_periodo: tipoPeriodo,
      mes: selectedMes,
      trimestre: selectedTrimestre,
      ano: selectedAno,
    })
    setShowModal(true)
  }

  function openEditMeta(meta: MetaMissionario) {
    setEditingId(meta.id)
    setForm({
      missionario_id: meta.missionario_id,
      tipo_periodo: meta.tipo_periodo,
      mes: meta.mes || 1,
      trimestre: meta.trimestre || 1,
      ano: meta.ano,
      meta_estudos_biblicos: meta.meta_estudos_biblicos,
      meta_visitas: meta.meta_visitas,
      meta_literatura: meta.meta_literatura,
      meta_pessoas_contatadas: meta.meta_pessoas_contatadas,
      meta_convites: meta.meta_convites,
      meta_pessoas_trazidas: meta.meta_pessoas_trazidas,
      meta_horas_trabalho: meta.meta_horas_trabalho,
      meta_batismos: meta.meta_batismos,
      meta_classes_batismais: meta.meta_classes_batismais,
      meta_receita_dizimos: meta.meta_receita_dizimos,
      meta_crescimento_membros: meta.meta_crescimento_membros,
    })
    setShowModal(true)
  }

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault()
    if (!form.missionario_id) return
    setSaving(true)
    try {
      const payload = {
        missionario_id: form.missionario_id,
        tipo_periodo: form.tipo_periodo,
        mes: form.tipo_periodo === 'mensal' ? form.mes : null,
        trimestre: form.tipo_periodo === 'trimestral' ? form.trimestre : null,
        ano: form.ano,
        meta_estudos_biblicos: form.meta_estudos_biblicos,
        meta_visitas: form.meta_visitas,
        meta_literatura: form.meta_literatura,
        meta_pessoas_contatadas: form.meta_pessoas_contatadas,
        meta_convites: form.meta_convites,
        meta_pessoas_trazidas: form.meta_pessoas_trazidas,
        meta_horas_trabalho: form.meta_horas_trabalho,
        meta_batismos: form.meta_batismos,
        meta_classes_batismais: form.meta_classes_batismais,
        meta_receita_dizimos: form.meta_receita_dizimos,
        meta_crescimento_membros: form.meta_crescimento_membros,
        definido_por: profile?.id || null,
        status: 'ativa' as const,
      }

      if (editingId) {
        const { error } = await supabase
          .from('metas_missionario')
          .update(payload)
          .eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('metas_missionario')
          .insert(payload)
        if (error) throw error
      }

      setShowModal(false)
      fetchMetas()
      fetchHistorical()
    } catch (err) {
      console.error('Erro ao salvar meta:', err)
      alert('Erro ao salvar meta')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteMeta(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return
    try {
      const { error } = await supabase
        .from('metas_missionario')
        .delete()
        .eq('id', id)
      if (error) throw error
      fetchMetas()
    } catch (err) {
      console.error('Erro ao excluir meta:', err)
    }
  }

  function handleMissionarioChange(id: string) {
    setSelectedMissionario(id)
    const m = missionarios.find(m => m.id === id)
    setSelectedMissionarioIgrejas(m?.igrejas_responsavel || [])
  }

  // ---- Helpers ----

  function progressColor(pct: number) {
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  function progressColorText(pct: number) {
    if (pct >= 80) return 'text-green-700'
    if (pct >= 50) return 'text-yellow-700'
    return 'text-red-700'
  }

  function periodLabel(meta: MetaMissionario) {
    if (meta.tipo_periodo === 'mensal' && meta.mes) return `${MESES[meta.mes - 1]} ${meta.ano}`
    if (meta.tipo_periodo === 'trimestral' && meta.trimestre) return `${meta.trimestre}o Trimestre ${meta.ano}`
    return `${meta.ano}`
  }

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1)

  // ========== Render ==========

  if (loading) {
    return (
      <div className="space-y-6">
        <MissoesSubNav />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500">Carregando...</span>
        </div>
      </div>
    )
  }

  if (missionarios.length === 0) {
    return (
      <div className="space-y-6">
        <MissoesSubNav />
        <div className="card text-center py-12">
          <FiTarget className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">Nenhum missionario encontrado</h2>
          <p className="text-gray-400 mt-2">Nao ha missionarios cadastrados no seu escopo.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MissoesSubNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Metas e KPIs</h1>
          <p className="text-gray-500 mt-1">Defina e acompanhe metas dos missionarios</p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 w-fit" onClick={openNewMeta}>
          <FiPlus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {/* Period type toggle */}
          <div>
            <label className="label-field">Tipo de Periodo</label>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(['mensal', 'trimestral', 'anual'] as TipoPeriodoMeta[]).map(tp => (
                <button
                  key={tp}
                  onClick={() => setTipoPeriodo(tp)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    tipoPeriodo === tp
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tp === 'mensal' ? 'Mensal' : tp === 'trimestral' ? 'Trimestral' : 'Anual'}
                </button>
              ))}
            </div>
          </div>

          {/* Period selector */}
          {tipoPeriodo === 'mensal' && (
            <div className="flex-1">
              <label className="label-field">Mes</label>
              <select
                value={selectedMes}
                onChange={e => setSelectedMes(Number(e.target.value))}
                className="input-field"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {tipoPeriodo === 'trimestral' && (
            <div className="flex-1">
              <label className="label-field">Trimestre</label>
              <select
                value={selectedTrimestre}
                onChange={e => setSelectedTrimestre(Number(e.target.value))}
                className="input-field"
              >
                <option value={1}>1o Trimestre (Jan-Mar)</option>
                <option value={2}>2o Trimestre (Abr-Jun)</option>
                <option value={3}>3o Trimestre (Jul-Set)</option>
                <option value={4}>4o Trimestre (Out-Dez)</option>
              </select>
            </div>
          )}

          {/* Year */}
          <div>
            <label className="label-field">Ano</label>
            <select
              value={selectedAno}
              onChange={e => setSelectedAno(Number(e.target.value))}
              className="input-field"
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Missionary selector */}
          <div className="flex-1">
            <label className="label-field">Missionario</label>
            <select
              value={selectedMissionario}
              onChange={e => handleMissionarioChange(e.target.value)}
              className="input-field"
              disabled={!isAdmin && missionarios.length <= 1}
            >
              {missionarios.map(m => (
                <option key={m.id} value={m.id}>
                  {m.usuario?.nome || m.usuario_id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===== Progress Dashboard ===== */}
      {activeMeta ? (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Progresso - {periodLabel(activeMeta)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {progressItems.map(item => (
              <div key={item.label} className="p-4 rounded-xl bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className={`text-sm font-bold ${progressColorText(item.pct)}`}>
                    {item.pct}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(item.pct)}`}
                    style={{ width: `${Math.min(item.pct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{item.actual} / {item.goal}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card text-center py-8">
          <FiTarget className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma meta definida para este periodo.</p>
          <button
            onClick={openNewMeta}
            className="mt-3 text-primary-600 hover:underline text-sm font-medium"
          >
            Definir Meta
          </button>
        </div>
      )}

      {/* ===== Historical Chart ===== */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Historico de Atingimento (12 meses)</h3>
        <div className="h-72">
          <Line
            data={historicalChartData}
            options={{
              ...chartOptions(),
              scales: {
                y: {
                  beginAtZero: true,
                  max: 150,
                  ticks: { callback: (v: any) => `${v}%` },
                },
              },
            }}
          />
        </div>
      </div>

      {/* ===== Goals Table ===== */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">
            Metas Registradas ({metas.length})
          </h3>
        </div>

        {metas.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">Nenhuma meta registrada para este periodo e missionario.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3 text-center">Estudos</th>
                  <th className="px-4 py-3 text-center">Visitas</th>
                  <th className="px-4 py-3 text-center">Literatura</th>
                  <th className="px-4 py-3 text-center">Convites</th>
                  <th className="px-4 py-3 text-center">Trazidas</th>
                  <th className="px-4 py-3 text-center">Horas</th>
                  <th className="px-4 py-3 text-center">Batismos</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metas.map(meta => (
                  <tr key={meta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{periodLabel(meta)}</td>
                    <td className="px-4 py-3 text-center">{meta.meta_estudos_biblicos}</td>
                    <td className="px-4 py-3 text-center">{meta.meta_visitas}</td>
                    <td className="px-4 py-3 text-center">{meta.meta_literatura}</td>
                    <td className="px-4 py-3 text-center">{meta.meta_convites}</td>
                    <td className="px-4 py-3 text-center">{meta.meta_pessoas_trazidas}</td>
                    <td className="px-4 py-3 text-center">{meta.meta_horas_trabalho}</td>
                    <td className="px-4 py-3 text-center">{meta.meta_batismos}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        meta.status === 'ativa'
                          ? 'bg-green-50 text-green-700'
                          : meta.status === 'concluida'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {meta.status === 'ativa' ? 'Ativa' : meta.status === 'concluida' ? 'Concluida' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditMeta(meta)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMeta(meta.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
        )}
      </div>

      {/* ===== Meta Form Modal ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Meta' : 'Nova Meta'}
            </h2>

            <form onSubmit={handleSaveMeta} className="space-y-5">
              {/* Missionary + Period */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAdmin && (
                  <div>
                    <label className="label-field">Missionario</label>
                    <select
                      value={form.missionario_id}
                      onChange={e => setForm(f => ({ ...f, missionario_id: e.target.value }))}
                      className="input-field"
                      required
                    >
                      <option value="">-- Selecione --</option>
                      {missionarios.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.usuario?.nome || m.usuario_id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="label-field">Tipo de Periodo</label>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    {(['mensal', 'trimestral', 'anual'] as TipoPeriodoMeta[]).map(tp => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, tipo_periodo: tp }))}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                          form.tipo_periodo === tp
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {tp === 'mensal' ? 'Mensal' : tp === 'trimestral' ? 'Trim.' : 'Anual'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Period selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {form.tipo_periodo === 'mensal' && (
                  <div>
                    <label className="label-field">Mes</label>
                    <select
                      value={form.mes}
                      onChange={e => setForm(f => ({ ...f, mes: Number(e.target.value) }))}
                      className="input-field"
                    >
                      {MESES.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.tipo_periodo === 'trimestral' && (
                  <div>
                    <label className="label-field">Trimestre</label>
                    <select
                      value={form.trimestre}
                      onChange={e => setForm(f => ({ ...f, trimestre: Number(e.target.value) }))}
                      className="input-field"
                    >
                      <option value={1}>1o Trimestre</option>
                      <option value={2}>2o Trimestre</option>
                      <option value={3}>3o Trimestre</option>
                      <option value={4}>4o Trimestre</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="label-field">Ano</label>
                  <select
                    value={form.ano}
                    onChange={e => setForm(f => ({ ...f, ano: Number(e.target.value) }))}
                    className="input-field"
                  >
                    {anos.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* KPI Fields */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Metas Numericas</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {KPI_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className="label-field">{label}</label>
                      <input
                        type="number"
                        min={0}
                        step={key === 'meta_receita_dizimos' ? '0.01' : '1'}
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) || 0 }))}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Atualizar Meta' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

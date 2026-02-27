import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
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
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2'

ChartJS.register(
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
  Filler
)

const COLORS = ['#006D43', '#0F3999', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const chartOptions = (titleText?: string): any => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 12 } },
    ...(titleText ? { title: { display: true, text: titleText, font: { size: 14, weight: '600' } } } : {}),
  },
})

interface KPI {
  totalMembros: number
  totalIgrejas: number
  batismosAno: number
  taxaCrescimento: number
}

interface ContagemRow {
  mes: number
  total_membros: number
}

interface FinRow {
  mes: number
  receita_dizimos: number
  receita_oferta_regular: number
  receita_oferta_especial: number
  despesa_salarios: number
  despesa_manutencao: number
  despesa_agua: number
  despesa_energia: number
  despesa_internet: number
  despesa_material_es: number
  despesa_outras: number
}

interface RelMissRow {
  estudos_biblicos: number
  visitas_missionarias: number
  literatura_distribuida: number
  pessoas_contatadas: number
  horas_trabalho: number
}

interface PessoaRow {
  sexo: string | null
  estado_civil: string | null
  data_nascimento: string | null
  igreja_id: string | null
}

interface IgrejaRow {
  id: string
  nome: string
}

export default function AnalyticsPage() {
  const { profile } = useAuth()
  const currentYear = new Date().getFullYear()
  const [ano, setAno] = useState(currentYear)
  const [loading, setLoading] = useState(true)

  // KPIs
  const [kpi, setKpi] = useState<KPI>({ totalMembros: 0, totalIgrejas: 0, batismosAno: 0, taxaCrescimento: 0 })

  // Chart data
  const [pessoasSexo, setPessoasSexo] = useState<{ masculino: number; feminino: number }>({ masculino: 0, feminino: 0 })
  const [estadoCivil, setEstadoCivil] = useState<Record<string, number>>({})
  const [faixaEtaria, setFaixaEtaria] = useState<Record<string, number>>({})
  const [crescimentoMensal, setCrescimentoMensal] = useState<number[]>(new Array(12).fill(0))
  const [receitaDespesa, setReceitaDespesa] = useState<{ receita: number[]; despesa: number[] }>({ receita: new Array(12).fill(0), despesa: new Array(12).fill(0) })
  const [topIgrejas, setTopIgrejas] = useState<{ nome: string; count: number }[]>([])
  const [missaoData, setMissaoData] = useState<RelMissRow>({ estudos_biblicos: 0, visitas_missionarias: 0, literatura_distribuida: 0, pessoas_contatadas: 0, horas_trabalho: 0 })

  // ------- RBAC Scope -------
  function applyScope(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id!)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id!)
    return query.eq('igreja_id', profile.igreja_id!)
  }

  function applyScopeIgrejas(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id!)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id!)
    return query.eq('id', profile.igreja_id!)
  }

  // ------- Data Fetching -------
  useEffect(() => {
    if (profile) fetchAll()
  }, [profile, ano])

  async function fetchAll() {
    setLoading(true)
    try {
      await Promise.all([
        fetchKPIs(),
        fetchPessoas(),
        fetchCrescimento(),
        fetchFinanceiro(),
        fetchTopIgrejas(),
        fetchMissoes(),
      ])
    } finally {
      setLoading(false)
    }
  }

  async function fetchKPIs() {
    const [membrosRes, igrejasRes, batismosRes, contagemAnteriorRes] = await Promise.all([
      applyScope(
        supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'ativo')
      ),
      applyScopeIgrejas(
        supabase.from('igrejas').select('id', { count: 'exact', head: true }).eq('ativo', true)
      ),
      applyScope(
        supabase.from('contagem_mensal').select('batismos').eq('ano', ano)
      ),
      applyScope(
        supabase.from('contagem_mensal').select('total_membros').eq('ano', ano - 1).eq('mes', 12)
      ),
    ])

    const totalMembros = membrosRes.count || 0
    const totalIgrejas = igrejasRes.count || 0
    const batismosAno = (batismosRes.data || []).reduce((sum: number, r: any) => sum + (r.batismos || 0), 0)
    const membrosAnterior = (contagemAnteriorRes.data || []).reduce((sum: number, r: any) => sum + (r.total_membros || 0), 0)
    const taxaCrescimento = membrosAnterior > 0
      ? Number((((totalMembros - membrosAnterior) / membrosAnterior) * 100).toFixed(1))
      : 0

    setKpi({ totalMembros, totalIgrejas, batismosAno, taxaCrescimento })
  }

  async function fetchPessoas() {
    const { data } = await applyScope(
      supabase.from('pessoas').select('sexo, estado_civil, data_nascimento, igreja_id').eq('tipo', 'membro').eq('situacao', 'ativo')
    )

    const pessoas = (data || []) as PessoaRow[]

    // Sexo
    let masc = 0, fem = 0
    pessoas.forEach(p => {
      if (p.sexo === 'masculino') masc++
      else if (p.sexo === 'feminino') fem++
    })
    setPessoasSexo({ masculino: masc, feminino: fem })

    // Estado Civil
    const ecMap: Record<string, number> = {}
    pessoas.forEach(p => {
      const ec = p.estado_civil || 'Não informado'
      ecMap[ec] = (ecMap[ec] || 0) + 1
    })
    setEstadoCivil(ecMap)

    // Faixa Etária
    const hoje = new Date()
    const faixas: Record<string, number> = { '0-17': 0, '18-29': 0, '30-44': 0, '45-59': 0, '60+': 0 }
    pessoas.forEach(p => {
      if (!p.data_nascimento) return
      const nascimento = new Date(p.data_nascimento)
      let idade = hoje.getFullYear() - nascimento.getFullYear()
      const mesAniversario = nascimento.getMonth() - hoje.getMonth()
      if (mesAniversario > 0 || (mesAniversario === 0 && nascimento.getDate() > hoje.getDate())) {
        idade--
      }
      if (idade < 18) faixas['0-17']++
      else if (idade < 30) faixas['18-29']++
      else if (idade < 45) faixas['30-44']++
      else if (idade < 60) faixas['45-59']++
      else faixas['60+']++
    })
    setFaixaEtaria(faixas)
  }

  async function fetchCrescimento() {
    const { data } = await applyScope(
      supabase.from('contagem_mensal').select('mes, total_membros').eq('ano', ano)
    )

    const monthly = new Array(12).fill(0)
    ;(data || []).forEach((r: ContagemRow) => {
      if (r.mes >= 1 && r.mes <= 12) {
        monthly[r.mes - 1] += r.total_membros || 0
      }
    })
    setCrescimentoMensal(monthly)
  }

  async function fetchFinanceiro() {
    const { data } = await applyScope(
      supabase.from('dados_financeiros')
        .select('mes, receita_dizimos, receita_oferta_regular, receita_oferta_especial, despesa_salarios, despesa_manutencao, despesa_agua, despesa_energia, despesa_internet, despesa_material_es, despesa_outras')
        .eq('ano', ano)
    )

    const rec = new Array(12).fill(0)
    const desp = new Array(12).fill(0)

    ;(data || []).forEach((r: FinRow) => {
      if (r.mes >= 1 && r.mes <= 12) {
        const idx = r.mes - 1
        rec[idx] += (r.receita_dizimos || 0) + (r.receita_oferta_regular || 0) + (r.receita_oferta_especial || 0)
        desp[idx] += (r.despesa_salarios || 0) + (r.despesa_manutencao || 0) + (r.despesa_agua || 0) + (r.despesa_energia || 0) + (r.despesa_internet || 0) + (r.despesa_material_es || 0) + (r.despesa_outras || 0)
      }
    })

    setReceitaDespesa({ receita: rec, despesa: desp })
  }

  async function fetchTopIgrejas() {
    const [pessoasRes, igrejasRes] = await Promise.all([
      applyScope(
        supabase.from('pessoas').select('igreja_id').eq('tipo', 'membro').eq('situacao', 'ativo')
      ),
      applyScopeIgrejas(
        supabase.from('igrejas').select('id, nome').eq('ativo', true)
      ),
    ])

    const pessoasData = (pessoasRes.data || []) as { igreja_id: string | null }[]
    const igrejasData = (igrejasRes.data || []) as IgrejaRow[]

    const igrejaMap = new Map<string, string>()
    igrejasData.forEach(ig => igrejaMap.set(ig.id, ig.nome))

    const countMap: Record<string, number> = {}
    pessoasData.forEach(p => {
      if (p.igreja_id) {
        countMap[p.igreja_id] = (countMap[p.igreja_id] || 0) + 1
      }
    })

    const sorted = Object.entries(countMap)
      .map(([id, count]) => ({ nome: igrejaMap.get(id) || 'Desconhecida', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    setTopIgrejas(sorted)
  }

  async function fetchMissoes() {
    const { data } = await applyScope(
      supabase.from('relatorio_missionario')
        .select('estudos_biblicos, visitas_missionarias, literatura_distribuida, pessoas_contatadas, horas_trabalho')
        .eq('ano', ano)
    )

    const agg: RelMissRow = { estudos_biblicos: 0, visitas_missionarias: 0, literatura_distribuida: 0, pessoas_contatadas: 0, horas_trabalho: 0 }
    ;(data || []).forEach((r: RelMissRow) => {
      agg.estudos_biblicos += r.estudos_biblicos || 0
      agg.visitas_missionarias += r.visitas_missionarias || 0
      agg.literatura_distribuida += r.literatura_distribuida || 0
      agg.pessoas_contatadas += r.pessoas_contatadas || 0
      agg.horas_trabalho += r.horas_trabalho || 0
    })
    setMissaoData(agg)
  }

  // ------- Chart Configs -------

  const generoChartData = {
    labels: ['Masculino', 'Feminino'],
    datasets: [{
      data: [pessoasSexo.masculino, pessoasSexo.feminino],
      backgroundColor: [COLORS[1], COLORS[7]],
      borderWidth: 0,
    }],
  }

  const estadoCivilLabels = Object.keys(estadoCivil).map(k =>
    k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')
  )
  const estadoCivilChartData = {
    labels: estadoCivilLabels,
    datasets: [{
      data: Object.values(estadoCivil),
      backgroundColor: COLORS.slice(0, estadoCivilLabels.length),
      borderWidth: 0,
    }],
  }

  const faixaEtariaChartData = {
    labels: Object.keys(faixaEtaria),
    datasets: [{
      label: 'Membros',
      data: Object.values(faixaEtaria),
      backgroundColor: COLORS[0],
      borderRadius: 6,
    }],
  }

  const crescimentoChartData = {
    labels: MONTH_LABELS,
    datasets: [{
      label: 'Total Membros',
      data: crescimentoMensal,
      borderColor: COLORS[0],
      backgroundColor: COLORS[0] + '20',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: COLORS[0],
    }],
  }

  const recDespChartData = {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: 'Receita',
        data: receitaDespesa.receita,
        backgroundColor: COLORS[3],
        borderRadius: 4,
      },
      {
        label: 'Despesa',
        data: receitaDespesa.despesa,
        backgroundColor: COLORS[5],
        borderRadius: 4,
      },
    ],
  }

  const topIgrejasChartData = {
    labels: topIgrejas.map(i => i.nome.length > 25 ? i.nome.slice(0, 22) + '...' : i.nome),
    datasets: [{
      label: 'Membros',
      data: topIgrejas.map(i => i.count),
      backgroundColor: COLORS.slice(0, topIgrejas.length),
      borderRadius: 4,
    }],
  }

  const topIgrejasOptions = {
    ...chartOptions(),
    indexAxis: 'y' as const,
    plugins: {
      ...chartOptions().plugins,
      legend: { display: false },
    },
  }

  const radarChartData = {
    labels: ['Estudos Bíblicos', 'Visitas', 'Literaturas', 'Contatos', 'Horas'],
    datasets: [{
      label: `Missionário ${ano}`,
      data: [
        missaoData.estudos_biblicos,
        missaoData.visitas_missionarias,
        missaoData.literatura_distribuida,
        missaoData.pessoas_contatadas,
        missaoData.horas_trabalho,
      ],
      backgroundColor: COLORS[2] + '30',
      borderColor: COLORS[2],
      borderWidth: 2,
      pointBackgroundColor: COLORS[2],
    }],
  }

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 12 } },
    },
    scales: {
      r: {
        beginAtZero: true,
        ticks: { display: false },
        grid: { color: '#e5e7eb' },
        angleLines: { color: '#e5e7eb' },
      },
    },
  }

  // ------- KPI Cards -------
  const kpiCards = [
    { label: 'Total Membros', value: kpi.totalMembros.toLocaleString('pt-BR'), bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: '👥' },
    { label: 'Total Igrejas', value: kpi.totalIgrejas.toLocaleString('pt-BR'), bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: '🏛️' },
    { label: `Batismos ${ano}`, value: kpi.batismosAno.toLocaleString('pt-BR'), bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: '🎉' },
    { label: 'Taxa Crescimento', value: `${kpi.taxaCrescimento > 0 ? '+' : ''}${kpi.taxaCrescimento}%`, bg: kpi.taxaCrescimento >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200', text: kpi.taxaCrescimento >= 0 ? 'text-green-700' : 'text-red-700', icon: '📈' },
  ]

  // ------- Render -------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#006D43] border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Carregando análises...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Análises</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral de dados e indicadores</p>
        </div>
        <select
          className="input-field w-auto"
          value={ano}
          onChange={e => setAno(Number(e.target.value))}
        >
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
          <option value={2026}>2026</option>
        </select>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(kpiItem => (
          <div
            key={kpiItem.label}
            className={`card border ${kpiItem.bg} flex items-center gap-4 p-5`}
          >
            <span className="text-3xl">{kpiItem.icon}</span>
            <div>
              <p className="text-sm font-medium text-gray-500">{kpiItem.label}</p>
              <p className={`text-2xl font-bold ${kpiItem.text}`}>{kpiItem.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crescimento Mensal */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Crescimento Mensal</h3>
          <div className="h-[300px]">
            <Line data={crescimentoChartData} options={chartOptions()} />
          </div>
        </div>

        {/* Receita vs Despesa */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Receita vs Despesa</h3>
          <div className="h-[300px]">
            <Bar data={recDespChartData} options={chartOptions()} />
          </div>
        </div>

        {/* Distribuição por Gênero */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Distribuição por Gênero</h3>
          <div className="h-[300px]">
            <Doughnut data={generoChartData} options={chartOptions()} />
          </div>
        </div>

        {/* Estado Civil */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Estado Civil</h3>
          <div className="h-[300px]">
            <Doughnut data={estadoCivilChartData} options={chartOptions()} />
          </div>
        </div>

        {/* Faixa Etária */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Faixa Etária</h3>
          <div className="h-[300px]">
            <Bar data={faixaEtariaChartData} options={{ ...chartOptions(), plugins: { ...chartOptions().plugins, legend: { display: false } } }} />
          </div>
        </div>

        {/* Top 10 Igrejas */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Top 10 Igrejas</h3>
          <div className="h-[300px]">
            <Bar data={topIgrejasChartData} options={topIgrejasOptions} />
          </div>
        </div>

        {/* Atividade Missionária */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Atividade Missionária</h3>
          <div className="h-[300px]">
            <Radar data={radarChartData} options={radarOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}

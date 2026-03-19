import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Radar } from 'react-chartjs-2'
import {
  FiPlus,
  FiUsers,
  FiTarget,
  FiTrendingUp,
  FiCalendar,
  FiAward,
  FiDollarSign,
  FiUserPlus,
} from 'react-icons/fi'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

import { MESES_NOMES, MONTH_LABELS } from '@/lib/missoes-constants'
import { useCargoLabels } from '@/hooks/useCargoLabels'

const COLORS = ['#006D43', '#0F3999', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const MESES = MESES_NOMES

const chartOptions = (titleText?: string): any => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 12 } },
    ...(titleText ? { title: { display: true, text: titleText, font: { size: 14, weight: '600' } } } : {}),
  },
})

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface KPIData {
  totalMembros: number
  totalInteressados: number
  dizimosMes: number
  primiciasMes: number
}

interface MonthlyData {
  mes: number
  ano: number
  membros: number
  interessados: number
  dizimos: number
  primicias: number
}

interface RadarMonthData {
  membros: number
  interessados: number
  dizimos: number
  primicias: number
  ofertas: number
}

interface TopPerformer {
  pessoa_id: string
  nome: string
  cargo_ministerial: string
  estudos: number
  visitas: number
  pessoas_trazidas: number
  horas: number
  kpi: number
}

export default function MissoesDashboardPage() {
  const { profile } = useAuth()
  const { labels: CARGO_LABELS } = useCargoLabels()
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<KPIData>({
    totalMembros: 0,
    totalInteressados: 0,
    dizimosMes: 0,
    primiciasMes: 0,
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
  const [prevMonthData, setPrevMonthData] = useState<RadarMonthData>({
    membros: 0, interessados: 0, dizimos: 0, primicias: 0, ofertas: 0,
  })
  const [currMonthData, setCurrMonthData] = useState<RadarMonthData>({
    membros: 0, interessados: 0, dizimos: 0, primicias: 0, ofertas: 0,
  })
  const [cargoDistribution, setCargoDistribution] = useState<{cargo: string; count: number}[]>([])

  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  function scopeFilter(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id)
    return query.eq('igreja_id', profile.igreja_id)
  }

  useEffect(() => {
    if (profile) fetchAllData()
  }, [profile])

  async function fetchAllData() {
    setLoading(true)
    try {
      await Promise.all([
        fetchKPIs(),
        fetchMonthlyTrends(),
        fetchTopPerformers(),
        fetchRadarData(),
        fetchCargoDistribution(),
      ])
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCargoDistribution() {
    const { data: missDist } = await supabase
      .from('missionarios')
      .select('cargo_ministerial')
      .eq('status', 'ativo')
    if (missDist) {
      const dist: Record<string, number> = {}
      for (const m of missDist) {
        dist[m.cargo_ministerial] = (dist[m.cargo_ministerial] || 0) + 1
      }
      setCargoDistribution(
        Object.entries(dist)
          .map(([cargo, count]) => ({ cargo, count }))
          .sort((a, b) => b.count - a.count)
      )
    }
  }

  async function fetchKPIs() {
    // Count membros ativos and interessados from igrejas table
    let igrejasCountQuery = supabase
      .from('igrejas')
      .select('membros_ativos, interessados')
    igrejasCountQuery = scopeFilter(igrejasCountQuery)
    const { data: igrejasCountData } = await igrejasCountQuery

    let totalMembros = 0
    let totalInteressados = 0
    for (const ig of igrejasCountData || []) {
      totalMembros += ig.membros_ativos || 0
      totalInteressados += ig.interessados || 0
    }

    // Financeiro do mes atual
    let finQuery = supabase
      .from('dados_financeiros')
      .select('receita_dizimos, receita_primicias, dizimo, primicias')
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)
    finQuery = scopeFilter(finQuery)
    const { data: finData } = await finQuery

    let dizimos = 0, primicias = 0
    for (const f of finData || []) {
      dizimos += (f.receita_dizimos || 0) + (f.dizimo || 0)
      primicias += (f.receita_primicias || 0) + (f.primicias || 0)
    }

    setKpi({
      totalMembros: totalMembros || 0,
      totalInteressados: totalInteressados || 0,
      dizimosMes: dizimos,
      primiciasMes: primicias,
    })
  }

  async function fetchMonthlyTrends() {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    const startMes = twelveMonthsAgo.getMonth() + 1
    const startAno = twelveMonthsAgo.getFullYear()

    // Fetch contagem_mensal for membros/interessados
    let contagemQuery = supabase
      .from('contagem_mensal')
      .select('mes, ano, total_membros, total_interessados')
      .or(`and(ano.gt.${startAno}),and(ano.eq.${startAno},mes.gte.${startMes}),and(ano.eq.${anoAtual},mes.lte.${mesAtual})`)
    contagemQuery = scopeFilter(contagemQuery)
    const { data: contagemData } = await contagemQuery

    // Fetch dados_financeiros for dizimos/primicias
    let finQuery = supabase
      .from('dados_financeiros')
      .select('mes, ano, receita_dizimos, receita_primicias, dizimo, primicias')
      .or(`and(ano.gt.${startAno}),and(ano.eq.${startAno},mes.gte.${startMes}),and(ano.eq.${anoAtual},mes.lte.${mesAtual})`)
    finQuery = scopeFilter(finQuery)
    const { data: finData } = await finQuery

    // Initialize all 12 months
    const monthMap: Record<string, MonthlyData> = {}
    for (let i = 0; i < 12; i++) {
      const d = new Date(twelveMonthsAgo)
      d.setMonth(d.getMonth() + i)
      const m = d.getMonth() + 1
      const a = d.getFullYear()
      monthMap[`${a}-${m}`] = { mes: m, ano: a, membros: 0, interessados: 0, dizimos: 0, primicias: 0 }
    }

    // Aggregate contagem
    for (const r of contagemData || []) {
      const key = `${r.ano}-${r.mes}`
      if (monthMap[key]) {
        monthMap[key].membros += r.total_membros || 0
        monthMap[key].interessados += r.total_interessados || 0
      }
    }

    // Aggregate financeiro
    for (const r of finData || []) {
      const key = `${r.ano}-${r.mes}`
      if (monthMap[key]) {
        monthMap[key].dizimos += (r.receita_dizimos || 0) + (r.dizimo || 0)
        monthMap[key].primicias += (r.receita_primicias || 0) + (r.primicias || 0)
      }
    }

    const sorted = Object.values(monthMap).sort((a, b) =>
      a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
    )
    setMonthlyData(sorted)
  }

  async function fetchRadarData() {
    // Fetch current month: contagem + financeiro
    let currContagemQ = supabase
      .from('contagem_mensal')
      .select('total_membros, total_interessados')
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)
    currContagemQ = scopeFilter(currContagemQ)
    const { data: currContagem } = await currContagemQ

    let currFinQ = supabase
      .from('dados_financeiros')
      .select('receita_dizimos, receita_primicias, receita_oferta_regular, receita_oferta_especial, receita_oferta_missoes, receita_oferta_agradecimento, dizimo, primicias')
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)
    currFinQ = scopeFilter(currFinQ)
    const { data: currFin } = await currFinQ

    const curr: RadarMonthData = { membros: 0, interessados: 0, dizimos: 0, primicias: 0, ofertas: 0 }
    for (const r of currContagem || []) {
      curr.membros += r.total_membros || 0
      curr.interessados += r.total_interessados || 0
    }
    for (const r of currFin || []) {
      curr.dizimos += (r.receita_dizimos || 0) + (r.dizimo || 0)
      curr.primicias += (r.receita_primicias || 0) + (r.primicias || 0)
      curr.ofertas += (r.receita_oferta_regular || 0) + (r.receita_oferta_especial || 0) + (r.receita_oferta_missoes || 0) + (r.receita_oferta_agradecimento || 0)
    }
    setCurrMonthData(curr)

    // Previous month
    const prevMes = mesAtual === 1 ? 12 : mesAtual - 1
    const prevAno = mesAtual === 1 ? anoAtual - 1 : anoAtual

    let prevContagemQ = supabase
      .from('contagem_mensal')
      .select('total_membros, total_interessados')
      .eq('mes', prevMes)
      .eq('ano', prevAno)
    prevContagemQ = scopeFilter(prevContagemQ)
    const { data: prevContagem } = await prevContagemQ

    let prevFinQ = supabase
      .from('dados_financeiros')
      .select('receita_dizimos, receita_primicias, receita_oferta_regular, receita_oferta_especial, receita_oferta_missoes, receita_oferta_agradecimento, dizimo, primicias')
      .eq('mes', prevMes)
      .eq('ano', prevAno)
    prevFinQ = scopeFilter(prevFinQ)
    const { data: prevFin } = await prevFinQ

    const prev: RadarMonthData = { membros: 0, interessados: 0, dizimos: 0, primicias: 0, ofertas: 0 }
    for (const r of prevContagem || []) {
      prev.membros += r.total_membros || 0
      prev.interessados += r.total_interessados || 0
    }
    for (const r of prevFin || []) {
      prev.dizimos += (r.receita_dizimos || 0) + (r.dizimo || 0)
      prev.primicias += (r.receita_primicias || 0) + (r.primicias || 0)
      prev.ofertas += (r.receita_oferta_regular || 0) + (r.receita_oferta_especial || 0) + (r.receita_oferta_missoes || 0) + (r.receita_oferta_agradecimento || 0)
    }
    setPrevMonthData(prev)
  }

  async function fetchTopPerformers() {
    // Get current month reports with pessoa info
    let query = supabase
      .from('relatorios_missionarios')
      .select('pessoa_id, estudos_biblicos, visitas_missionarias, pessoas_trazidas, horas_trabalho, pessoa:pessoas(nome)')
      .eq('mes', mesAtual)
      .eq('ano', anoAtual)
    if (profile?.papel !== 'admin' && profile?.papel !== 'admin_uniao' && profile?.papel !== 'admin_associacao') {
      query = query.eq('igreja_id', profile?.igreja_id!)
    }
    const { data } = await query

    if (!data || data.length === 0) {
      setTopPerformers([])
      return
    }

    // Get cargo_ministerial from missionarios table (not pessoas.cargo)
    const pessoaIds = [...new Set(data.map(r => r.pessoa_id))]
    const cargoMap: Record<string, string> = {}
    for (let i = 0; i < pessoaIds.length; i += 20) {
      const batch = pessoaIds.slice(i, i + 20)
      const { data: missData } = await supabase
        .from('missionarios')
        .select('usuario_id, cargo_ministerial')
        .in('usuario_id', batch)
      for (const m of missData || []) {
        cargoMap[m.usuario_id] = m.cargo_ministerial || ''
      }
    }

    // Aggregate by person
    const personMap: Record<string, TopPerformer> = {}
    for (const r of data) {
      const pid = r.pessoa_id
      if (!personMap[pid]) {
        const pessoa = r.pessoa as any
        personMap[pid] = {
          pessoa_id: pid,
          nome: pessoa?.nome || 'Desconhecido',
          cargo_ministerial: cargoMap[pid] || '',
          estudos: 0,
          visitas: 0,
          pessoas_trazidas: 0,
          horas: 0,
          kpi: 0,
        }
      }
      personMap[pid].estudos += r.estudos_biblicos || 0
      personMap[pid].visitas += r.visitas_missionarias || 0
      personMap[pid].pessoas_trazidas += r.pessoas_trazidas || 0
      personMap[pid].horas += r.horas_trabalho || 0
    }

    // Calculate simple KPI score (activity-based)
    const performers = Object.values(personMap).map(p => ({
      ...p,
      kpi: Math.min(100, Math.round(
        (p.estudos * 3) + (p.visitas * 2) + (p.pessoas_trazidas * 5) + (p.horas * 0.5)
      )),
    }))

    // Sort by KPI desc and take top 10
    performers.sort((a, b) => b.kpi - a.kpi)
    setTopPerformers(performers.slice(0, 10))
  }

  // Chart data: monthly trends (2 y-axes: people left, currency right)
  const lineChartData = {
    labels: monthlyData.map(d => MONTH_LABELS[d.mes - 1]),
    datasets: [
      {
        label: 'Membros',
        data: monthlyData.map(d => d.membros),
        borderColor: COLORS[0],
        backgroundColor: COLORS[0] + '15',
        tension: 0.3,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Interessados',
        data: monthlyData.map(d => d.interessados),
        borderColor: COLORS[2],
        backgroundColor: COLORS[2] + '15',
        tension: 0.3,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Dizimos',
        data: monthlyData.map(d => d.dizimos),
        borderColor: COLORS[3],
        backgroundColor: COLORS[3] + '10',
        tension: 0.3,
        fill: false,
        borderDash: [5, 3],
        yAxisID: 'y1',
      },
      {
        label: 'Primicias',
        data: monthlyData.map(d => d.primicias),
        borderColor: COLORS[4],
        backgroundColor: COLORS[4] + '10',
        tension: 0.3,
        fill: false,
        borderDash: [5, 3],
        yAxisID: 'y1',
      },
    ],
  }

  const lineChartOptions: any = {
    ...chartOptions(),
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: 'Pessoas', font: { size: 11 } },
        beginAtZero: true,
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: { display: true, text: 'R$ (Financeiro)', font: { size: 11 } },
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (v: number) => currencyFmt.format(v),
        },
      },
    },
  }

  // Chart data: radar comparison (current vs previous month)
  const radarChartData = {
    labels: ['Membros', 'Interessados', 'Dizimos (R$)', 'Primicias (R$)', 'Ofertas (R$)'],
    datasets: [
      {
        label: MESES[mesAtual - 1],
        data: [
          currMonthData.membros,
          currMonthData.interessados,
          currMonthData.dizimos,
          currMonthData.primicias,
          currMonthData.ofertas,
        ],
        borderColor: COLORS[0],
        backgroundColor: COLORS[0] + '30',
        pointBackgroundColor: COLORS[0],
      },
      {
        label: mesAtual === 1 ? MESES[11] : MESES[mesAtual - 2],
        data: [
          prevMonthData.membros,
          prevMonthData.interessados,
          prevMonthData.dizimos,
          prevMonthData.primicias,
          prevMonthData.ofertas,
        ],
        borderColor: COLORS[1],
        backgroundColor: COLORS[1] + '20',
        pointBackgroundColor: COLORS[1],
      },
    ],
  }

  const radarOptions = {
    ...chartOptions('Mes Atual vs Mes Anterior'),
    scales: {
      r: {
        beginAtZero: true,
      },
    },
  }

  const kpiCards = [
    {
      label: 'Membros Ativos',
      value: kpi.totalMembros.toLocaleString('pt-BR'),
      icon: FiUsers,
      color: 'text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: 'Interessados',
      value: kpi.totalInteressados.toLocaleString('pt-BR'),
      icon: FiUserPlus,
      color: 'text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Dízimos (Mês)',
      value: currencyFmt.format(kpi.dizimosMes),
      icon: FiDollarSign,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Primícias (Mês)',
      value: currencyFmt.format(kpi.primiciasMes),
      icon: FiTrendingUp,
      color: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard Missionário</h1>
          <p className="text-gray-500 mt-1">
            Visão geral - {MESES[mesAtual - 1]} {anoAtual}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="card">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Distribuicao por Cargo */}
      {cargoDistribution.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Cargo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cargoDistribution.map(({ cargo, count }) => (
              <Link
                key={cargo}
                to={`/missoes/inventario?cargo=${cargo}`}
                className="p-3 rounded-xl bg-gray-50 hover:bg-green-50 transition-colors text-center border border-gray-100 hover:border-green-200"
              >
                <p className="text-2xl font-bold text-gray-800">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{CARGO_LABELS[cargo as keyof typeof CARGO_LABELS] || cargo}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: Monthly Trends */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tendência Mensal - Membros e Financeiro</h2>
          <div className="h-72">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Radar Chart: Current vs Previous Month */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Comparativo Mensal</h2>
          <div className="h-72">
            <Radar data={radarChartData} options={radarOptions} />
          </div>
        </div>
      </div>

      {/* Top Performers Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            <FiAward className="inline w-5 h-5 mr-2 text-amber-500" />
            Top 10 Missionários - {MESES[mesAtual - 1]}
          </h2>
        </div>
        {topPerformers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhum relatório registrado neste mês
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3 text-center">Estudos</th>
                  <th className="px-4 py-3 text-center">Visitas</th>
                  <th className="px-4 py-3 text-center">Trazidas</th>
                  <th className="px-4 py-3 text-center">Horas</th>
                  <th className="px-4 py-3 text-center">KPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topPerformers.map((p, idx) => (
                  <tr key={p.pessoa_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {CARGO_LABELS[p.cargo_ministerial as keyof typeof CARGO_LABELS] || p.cargo_ministerial || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-blue-600 font-medium">{p.estudos}</td>
                    <td className="px-4 py-3 text-center text-green-600">{p.visitas}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-medium">{p.pessoas_trazidas}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.horas}h</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.kpi >= 80
                            ? 'bg-green-100 text-green-700'
                            : p.kpi >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.kpi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/missoes/relatorio"
          className="card hover:shadow-md transition-shadow flex items-center gap-4 group"
        >
          <div className="p-3 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors">
            <FiPlus className="w-6 h-6 text-green-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Registrar Atividade</p>
            <p className="text-xs text-gray-500">Novo relatorio missionario</p>
          </div>
        </Link>

        <Link
          to="/missoes/metas"
          className="card hover:shadow-md transition-shadow flex items-center gap-4 group"
        >
          <div className="p-3 rounded-xl bg-blue-100 group-hover:bg-blue-200 transition-colors">
            <FiTarget className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Nova Meta</p>
            <p className="text-xs text-gray-500">Definir metas missionarias</p>
          </div>
        </Link>

        <Link
          to="/missoes/planejador-visitas"
          className="card hover:shadow-md transition-shadow flex items-center gap-4 group"
        >
          <div className="p-3 rounded-xl bg-purple-100 group-hover:bg-purple-200 transition-colors">
            <FiCalendar className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Planejar Visita</p>
            <p className="text-xs text-gray-500">Criar plano de visitas</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

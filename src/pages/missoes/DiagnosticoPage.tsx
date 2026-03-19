import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { calculateGrowthRate, MESES_LABELS } from '@/lib/projections'
import { FiTrendingUp, FiTrendingDown, FiMinus, FiAlertTriangle, FiCheckCircle, FiMapPin } from 'react-icons/fi'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Radar, Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, RadialLinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend)

const COLORS = ['#006D43', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

// ========== Formatters ==========

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
const numberFmt = new Intl.NumberFormat('pt-BR')

// ========== Types ==========

interface ContagemRow {
  mes: number
  ano: number
  total_membros: number
  total_interessados: number
  media_presenca: number
  batismos: number
  igreja_id: string
}

interface PessoaRow {
  id: string
  tipo: 'membro' | 'interessado'
  situacao: string
  endereco_cidade: string | null
  endereco_estado: string | null
  created_at: string
}

interface FinanceiroRow {
  mes: number
  ano: number
  receita_dizimos: number
  dizimo: number
  igreja_id: string
}

interface RelatorioRow {
  mes: number
  ano: number
  pessoas_contatadas: number
  pessoa_id: string
}

interface ClasseBatismalRow {
  id: string
  status: string
  alunos: string[]
  igreja_id: string
}

interface CityInfo {
  cidade: string
  estado: string
  membros: number
  populacao: number | null
  alcance: number | null
  loadingPop: boolean
}

type RiskLevel = 'GREEN' | 'YELLOW' | 'RED'

// ========== Component ==========

export default function DiagnosticoPage() {
  const { profile } = useAuth()

  // Loading states
  const [loading, setLoading] = useState(true)

  // Raw data
  const [pessoas, setPessoas] = useState<PessoaRow[]>([])
  const [contagem, setContagem] = useState<ContagemRow[]>([])
  const [financeiro, setFinanceiro] = useState<FinanceiroRow[]>([])
  const [relatorios, setRelatorios] = useState<RelatorioRow[]>([])
  const [classesBatismais, setClassesBatismais] = useState<ClasseBatismalRow[]>([])

  // City population data (Section 4)
  const [cityData, setCityData] = useState<CityInfo[]>([])
  const [loadingCities, setLoadingCities] = useState(false)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // ========== Scope filter helper ==========

  function applyScope(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id)
    if (['secretario_igreja', 'membro'].includes(profile.papel || '')) return query.eq('igreja_id', profile.igreja_id)
    return query
  }

  // ========== Data fetching ==========

  useEffect(() => {
    if (profile) {
      fetchAllData()
    }
  }, [profile])

  async function fetchAllData() {
    setLoading(true)
    try {
      await Promise.all([
        fetchPessoas(),
        fetchContagem(),
        fetchFinanceiro(),
        fetchRelatorios(),
        fetchClassesBatismais(),
      ])
    } catch (err) {
      console.error('Erro ao carregar dados do diagnostico:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPessoas() {
    let query = supabase
      .from('pessoas')
      .select('id, tipo, situacao, endereco_cidade, endereco_estado, created_at')
    query = applyScope(query)
    const { data, error } = await query
    if (error) throw error
    setPessoas(data || [])
  }

  async function fetchContagem() {
    let query = supabase
      .from('contagem_mensal')
      .select('mes, ano, total_membros, total_interessados, media_presenca, batismos, igreja_id')
      .gte('ano', currentYear - 1)
      .order('ano')
      .order('mes')
    query = applyScope(query)
    const { data, error } = await query
    if (error) throw error
    setContagem(data || [])
  }

  async function fetchFinanceiro() {
    let query = supabase
      .from('dados_financeiros')
      .select('mes, ano, receita_dizimos, igreja_id, dizimo')
      .gte('ano', currentYear - 1)
      .order('ano')
      .order('mes')
    query = applyScope(query)
    const { data, error } = await query
    if (error) throw error
    setFinanceiro(data || [])
  }

  async function fetchRelatorios() {
    let query = supabase
      .from('relatorios_missionarios')
      .select('mes, ano, pessoas_contatadas, pessoa_id')
      .eq('ano', currentYear)
    query = applyScope(query)
    const { data, error } = await query
    if (error) throw error
    setRelatorios(data || [])
  }

  async function fetchClassesBatismais() {
    let query = supabase
      .from('classes_batismais')
      .select('id, status, alunos, igreja_id')
      .eq('status', 'ativa')
    query = applyScope(query)
    const { data, error } = await query
    if (error) throw error
    setClassesBatismais(data || [])
  }

  // ========== Computed metrics ==========

  // Total counts
  const totalMembros = useMemo(() => pessoas.filter(p => p.tipo === 'membro').length, [pessoas])
  const membrosAtivos = useMemo(() => pessoas.filter(p => p.tipo === 'membro' && p.situacao === 'ativo').length, [pessoas])
  const totalInativos = useMemo(() => pessoas.filter(p => p.tipo === 'membro' && p.situacao !== 'ativo').length, [pessoas])
  const totalInteressados = useMemo(() => pessoas.filter(p => p.tipo === 'interessado').length, [pessoas])

  // New interessados this year
  const novosInteressadosYTD = useMemo(() => {
    return pessoas.filter(p => {
      if (p.tipo !== 'interessado') return false
      const createdYear = new Date(p.created_at).getFullYear()
      return createdYear === currentYear
    }).length
  }, [pessoas, currentYear])

  // Current year contagem
  const contagemCurrentYear = useMemo(() => contagem.filter(c => c.ano === currentYear), [contagem, currentYear])

  // Batismos YTD
  const batismosYTD = useMemo(() => {
    return contagemCurrentYear.reduce((sum, c) => sum + (c.batismos || 0), 0)
  }, [contagemCurrentYear])

  // Media presenca
  const mediaPresenca = useMemo(() => {
    const recent = contagemCurrentYear.filter(c => c.media_presenca > 0)
    if (recent.length === 0) return 0
    return Math.round(recent.reduce((s, c) => s + c.media_presenca, 0) / recent.length)
  }, [contagemCurrentYear])

  // Alunos em classes bíblicas
  const alunosClassesBatismais = useMemo(() => {
    return classesBatismais.reduce((sum, c) => sum + (c.alunos?.length || 0), 0)
  }, [classesBatismais])

  // Igrejas count
  const totalIgrejas = useMemo(() => {
    const igSet = new Set<string>()
    contagem.forEach(c => {
      if (c.igreja_id) igSet.add(c.igreja_id)
    })
    return igSet.size
  }, [contagem])

  // Contatos por mes media
  const mediaContatosMes = useMemo(() => {
    if (relatorios.length === 0) return 0
    const totalContatos = relatorios.reduce((s, r) => s + (r.pessoas_contatadas || 0), 0)
    // Count distinct months
    const monthSet = new Set(relatorios.map(r => `${r.ano}-${r.mes}`))
    const numMonths = monthSet.size || 1
    return Math.round(totalContatos / numMonths)
  }, [relatorios])

  // Financeiro current year
  const financeiroCurrentYear = useMemo(() => financeiro.filter(f => f.ano === currentYear), [financeiro, currentYear])
  const financeiroPrevYear = useMemo(() => financeiro.filter(f => f.ano === currentYear - 1), [financeiro, currentYear])

  // Dizimo per capita
  const totalDizimosCurrentYear = useMemo(() => {
    return financeiroCurrentYear.reduce((s, f) => s + (f.receita_dizimos || 0) + (f.dizimo || 0), 0)
  }, [financeiroCurrentYear])

  const dizimoPerCapita = useMemo(() => {
    if (totalMembros === 0) return 0
    return totalDizimosCurrentYear / totalMembros
  }, [totalDizimosCurrentYear, totalMembros])

  // Taxa crescimento dizimos
  const taxaCrescimentoDizimos = useMemo(() => {
    const prevTotal = financeiroPrevYear.reduce((s, f) => s + (f.receita_dizimos || 0) + (f.dizimo || 0), 0)
    return calculateGrowthRate(totalDizimosCurrentYear, prevTotal)
  }, [totalDizimosCurrentYear, financeiroPrevYear])

  // Score engajamento - % of distinct members who submitted relatorio this month
  const scoreEngajamento = useMemo(() => {
    if (totalMembros === 0) return 0
    const currentMonthRelatorios = relatorios.filter(r => r.mes === currentMonth && r.ano === currentYear)
    const distinctPessoas = new Set(currentMonthRelatorios.map(r => r.pessoa_id))
    return Math.round((distinctPessoas.size / totalMembros) * 100)
  }, [relatorios, totalMembros, currentMonth, currentYear])

  // ========== Section 1: Scorecard ==========

  const percentMembrosAtivos = useMemo(() => {
    if (totalMembros === 0) return 0
    return Math.round((membrosAtivos / totalMembros) * 100)
  }, [membrosAtivos, totalMembros])

  // ========== Section 2: Radar Chart ==========

  const radarScores = useMemo(() => {
    const retencao = totalMembros > 0 ? (membrosAtivos / totalMembros) * 100 : 0
    const evangelismo = totalMembros > 0 ? Math.min(100, (batismosYTD / totalMembros) * 500) : 0
    const formacao = totalInteressados > 0
      ? Math.min(100, (alunosClassesBatismais / totalInteressados) * 100)
      : 0
    const finScore = Math.min(100, (dizimoPerCapita / 100) * 100)
    const expansao = totalMembros > 0
      ? Math.min(100, (novosInteressadosYTD / totalMembros) * 200)
      : 0

    return {
      retencao: Math.round(retencao * 10) / 10,
      evangelismo: Math.round(evangelismo * 10) / 10,
      formacao: Math.round(formacao * 10) / 10,
      financeiro: Math.round(finScore * 10) / 10,
      expansao: Math.round(expansao * 10) / 10,
    }
  }, [totalMembros, membrosAtivos, batismosYTD, totalInteressados, alunosClassesBatismais, dizimoPerCapita, novosInteressadosYTD])

  const radarData = useMemo(() => ({
    labels: ['Retenção', 'Evangelismo', 'Formação', 'Financeiro', 'Expansão'],
    datasets: [{
      label: 'Score',
      data: [radarScores.retencao, radarScores.evangelismo, radarScores.formacao, radarScores.financeiro, radarScores.expansao],
      borderColor: '#006D43',
      backgroundColor: 'rgba(0, 109, 67, 0.3)',
      borderWidth: 2,
      pointBackgroundColor: '#006D43',
      pointBorderColor: '#006D43',
      pointRadius: 4,
    }],
  }), [radarScores])

  const radarOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, display: true, font: { size: 10 } },
        pointLabels: { font: { size: 13, weight: 'bold' as const } },
        grid: { color: '#E5E7EB' },
        angleLines: { color: '#E5E7EB' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.raw}/100`,
        },
      },
    },
  }), [])

  // ========== Section 3: Risk indicators ==========

  const riskMembros = useMemo((): { level: RiskLevel; detail: string } => {
    // Compare current month total vs 6 months ago
    const sorted = [...contagem].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
    if (sorted.length < 2) return { level: 'GREEN', detail: 'Dados insuficientes' }

    const latest = sorted[sorted.length - 1]
    const sixBack = sorted.find(c => {
      const target = (latest.ano * 12 + latest.mes) - 6
      return (c.ano * 12 + c.mes) <= target
    }) || sorted[0]

    // Aggregate totals for the latest month and 6-month-back month
    const latestTotal = sorted
      .filter(c => c.ano === latest.ano && c.mes === latest.mes)
      .reduce((s, c) => s + c.total_membros, 0)

    const oldTotal = sorted
      .filter(c => c.ano === sixBack.ano && c.mes === sixBack.mes)
      .reduce((s, c) => s + c.total_membros, 0)

    const rate = calculateGrowthRate(latestTotal, oldTotal)

    if (rate < 0) return { level: 'RED', detail: `${rate}% nos ultimos 6 meses` }
    if (rate < 2) return { level: 'YELLOW', detail: `+${rate}% nos ultimos 6 meses` }
    return { level: 'GREEN', detail: `+${rate}% nos ultimos 6 meses` }
  }, [contagem])

  const riskDizimos = useMemo((): { level: RiskLevel; detail: string } => {
    const sorted = [...financeiro].sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)
    if (sorted.length < 2) return { level: 'GREEN', detail: 'Dados insuficientes' }

    const latest = sorted[sorted.length - 1]
    const sixBack = sorted.find(f => {
      const target = (latest.ano * 12 + latest.mes) - 6
      return (f.ano * 12 + f.mes) <= target
    }) || sorted[0]

    const latestTotal = sorted
      .filter(f => f.ano === latest.ano && f.mes === latest.mes)
      .reduce((s, f) => s + (f.receita_dizimos || 0) + (f.dizimo || 0), 0)

    const oldTotal = sorted
      .filter(f => f.ano === sixBack.ano && f.mes === sixBack.mes)
      .reduce((s, f) => s + (f.receita_dizimos || 0) + (f.dizimo || 0), 0)

    const rate = calculateGrowthRate(latestTotal, oldTotal)

    if (rate < 0) return { level: 'RED', detail: `${rate}% nos ultimos 6 meses` }
    if (rate < 5) return { level: 'YELLOW', detail: `+${rate}% nos ultimos 6 meses` }
    return { level: 'GREEN', detail: `+${rate}% nos ultimos 6 meses` }
  }, [financeiro])

  const riskBatismos = useMemo((): { level: RiskLevel; detail: string } => {
    // Find months since last batismo
    const sorted = [...contagem]
      .filter(c => c.batismos > 0)
      .sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)

    if (sorted.length === 0) return { level: 'RED', detail: 'Nenhum batismo registrado' }

    const last = sorted[sorted.length - 1]
    const monthsSince = (currentYear * 12 + currentMonth) - (last.ano * 12 + last.mes)

    if (monthsSince >= 6) return { level: 'RED', detail: `${monthsSince} meses sem batismo` }
    if (monthsSince >= 3) return { level: 'YELLOW', detail: `${monthsSince} meses sem batismo` }
    return { level: 'GREEN', detail: `Ultimo batismo ha ${monthsSince} mes(es)` }
  }, [contagem, currentYear, currentMonth])

  const riskInativos = useMemo((): { level: RiskLevel; detail: string } => {
    if (totalMembros === 0) return { level: 'GREEN', detail: 'Sem membros cadastrados' }
    const pctInativos = (totalInativos / totalMembros) * 100

    if (pctInativos > 20) return { level: 'RED', detail: `${pctInativos.toFixed(1)}% inativos` }
    if (pctInativos > 10) return { level: 'YELLOW', detail: `${pctInativos.toFixed(1)}% inativos` }
    return { level: 'GREEN', detail: `${pctInativos.toFixed(1)}% inativos` }
  }, [totalMembros, totalInativos])

  // ========== Section 4: City data ==========

  const citiesFromPessoas = useMemo(() => {
    const cityMap = new Map<string, { cidade: string; estado: string; membros: number }>()
    for (const p of pessoas) {
      if (!p.endereco_cidade || !p.endereco_estado) continue
      const key = `${p.endereco_cidade.trim().toLowerCase()}|${p.endereco_estado.trim().toUpperCase()}`
      const existing = cityMap.get(key)
      if (existing) {
        existing.membros++
      } else {
        cityMap.set(key, {
          cidade: p.endereco_cidade.trim(),
          estado: p.endereco_estado.trim().toUpperCase(),
          membros: 1,
        })
      }
    }
    // Sort by member count descending, take top 10
    return Array.from(cityMap.values())
      .sort((a, b) => b.membros - a.membros)
      .slice(0, 10)
  }, [pessoas])

  // Fetch IBGE population data after main data loads
  const fetchPopulation = useCallback(async (cities: typeof citiesFromPessoas) => {
    if (cities.length === 0) return

    setLoadingCities(true)
    const results: CityInfo[] = cities.map(c => ({
      ...c,
      populacao: null,
      alcance: null,
      loadingPop: true,
    }))
    setCityData([...results])

    // Cache of UF -> municipios
    const ufCache = new Map<string, { id: number; nome: string }[]>()

    for (let i = 0; i < results.length; i++) {
      const city = results[i]
      try {
        // Step 1: Get municipios for UF
        let municipios = ufCache.get(city.estado)
        if (!municipios) {
          const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${city.estado}/municipios`)
          if (res.ok) {
            const data = await res.json()
            municipios = data.map((m: any) => ({ id: m.id, nome: m.nome }))
            ufCache.set(city.estado, municipios!)
          }
        }

        if (municipios) {
          // Find matching municipio (case-insensitive, accent-insensitive)
          const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
          const match = municipios.find(m => normalize(m.nome) === normalize(city.cidade))

          if (match) {
            // Step 2: Fetch population
            const popRes = await fetch(
              `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2021/variaveis/9324?localidades=N6[${match.id}]`
            )
            if (popRes.ok) {
              const popData = await popRes.json()
              try {
                const serie = popData[0]?.resultados?.[0]?.series?.[0]?.serie
                const popValue = serie ? parseInt(Object.values(serie)[0] as string, 10) : null
                if (popValue && !isNaN(popValue)) {
                  results[i].populacao = popValue
                  results[i].alcance = (city.membros / popValue) * 100
                }
              } catch {
                // Population parsing failed, leave as null
              }
            }
          }
        }
      } catch (err) {
        console.error(`Erro ao buscar populacao de ${city.cidade}/${city.estado}:`, err)
      } finally {
        results[i].loadingPop = false
        setCityData([...results])
      }
    }

    setLoadingCities(false)
  }, [])

  // Trigger city population fetch after main data loads
  useEffect(() => {
    if (!loading && citiesFromPessoas.length > 0) {
      fetchPopulation(citiesFromPessoas)
    }
  }, [loading, citiesFromPessoas, fetchPopulation])

  // Sort cities by alcance ascending (lowest first = biggest opportunity)
  const sortedCities = useMemo(() => {
    return [...cityData].sort((a, b) => {
      // Cities without population data go last
      if (a.alcance === null && b.alcance === null) return b.membros - a.membros
      if (a.alcance === null) return 1
      if (b.alcance === null) return -1
      return a.alcance - b.alcance
    })
  }, [cityData])

  // ========== Helper functions ==========

  function trendArrow(value: number) {
    if (value > 0) return <FiTrendingUp className="w-4 h-4 text-green-500" />
    if (value < 0) return <FiTrendingDown className="w-4 h-4 text-red-500" />
    return <FiMinus className="w-4 h-4 text-gray-400" />
  }

  function trendColor(value: number) {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  function riskBadgeClass(level: RiskLevel) {
    if (level === 'RED') return 'bg-red-100 text-red-700 border border-red-200'
    if (level === 'YELLOW') return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
    return 'bg-green-100 text-green-700 border border-green-200'
  }

  function riskIcon(level: RiskLevel) {
    if (level === 'RED') return <FiAlertTriangle className="w-5 h-5" />
    if (level === 'YELLOW') return <FiAlertTriangle className="w-5 h-5" />
    return <FiCheckCircle className="w-5 h-5" />
  }

  function alcanceBadge(alcance: number | null) {
    if (alcance === null) return <span className="text-gray-400 text-xs">-</span>
    if (alcance < 0.01) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Baixissima</span>
    if (alcance < 0.1) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Baixa</span>
    if (alcance < 1) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Moderada</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Alta</span>
  }

  // ========== Monthly bar chart for batismos ==========

  const batismosBarData = useMemo(() => {
    const monthlyBatismos = Array(12).fill(0)
    for (const c of contagemCurrentYear) {
      if (c.mes >= 1 && c.mes <= 12) {
        monthlyBatismos[c.mes - 1] += c.batismos || 0
      }
    }
    return {
      labels: MESES_LABELS,
      datasets: [{
        label: 'Batismos',
        data: monthlyBatismos,
        backgroundColor: COLORS[0] + '99',
        borderColor: COLORS[0],
        borderWidth: 1,
        borderRadius: 4,
      }],
    }
  }, [contagemCurrentYear])

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: `Batismos por Mes - ${currentYear}`, font: { size: 14, weight: 'bold' as const } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  }), [currentYear])

  // ========== Render ==========

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500">Carregando diagnostico...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Diagnóstico de Campo</h1>
        <p className="text-gray-500 mt-1">Visão estratégica da saúde do campo em 4 dimensões</p>
      </div>

      {/* ========== Section 1: Scorecard (2x2 grid) ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Q1 - Base Existente (Retencao) */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider">Base Existente (Retenção)</h3>
          </div>
          <div className="space-y-4">
            {/* Metric 1: % membros ativos */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">% Membros Ativos</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{percentMembrosAtivos}%</span>
                {trendArrow(percentMembrosAtivos >= 80 ? 1 : percentMembrosAtivos >= 60 ? 0 : -1)}
              </div>
            </div>
            {/* Metric 2: Tendencia inativos */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Inativos</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{numberFmt.format(totalInativos)}</span>
                {trendArrow(totalInativos > 0 ? -1 : 0)}
              </div>
            </div>
            {/* Metric 3: Taxa presenca media */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Presença Média</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{mediaPresenca}%</span>
                {trendArrow(mediaPresenca >= 60 ? 1 : mediaPresenca >= 40 ? 0 : -1)}
              </div>
            </div>
          </div>
        </div>

        {/* Q2 - Crescimento (Aquisicao) */}
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wider">Crescimento (Aquisição)</h3>
          </div>
          <div className="space-y-4">
            {/* Metric 1: Batismos YTD */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Batismos YTD</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{numberFmt.format(batismosYTD)}</span>
                {trendArrow(batismosYTD > 0 ? 1 : -1)}
              </div>
            </div>
            {/* Metric 2: Novos interessados */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Novos Interessados</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{numberFmt.format(novosInteressadosYTD)}</span>
                {trendArrow(novosInteressadosYTD > 0 ? 1 : 0)}
              </div>
            </div>
            {/* Metric 3: Alunos em classes bíblicas */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Alunos em Classes</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{numberFmt.format(alunosClassesBatismais)}</span>
                {trendArrow(alunosClassesBatismais > 0 ? 1 : 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Q3 - Volume (Quantidade) */}
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">Volume (Quantidade)</h3>
          </div>
          <div className="space-y-4">
            {/* Metric 1: Total membros */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Membros</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{numberFmt.format(totalMembros)}</span>
                <FiMinus className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            {/* Metric 2: Total igrejas */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Igrejas</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{numberFmt.format(totalIgrejas)}</span>
                <FiMinus className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            {/* Metric 3: Contatos/mes media */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Contatos/Mes (Media)</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{numberFmt.format(mediaContatosMes)}</span>
                {trendArrow(mediaContatosMes > 0 ? 1 : 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Q4 - Valor (Qualidade) */}
        <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wider">Valor (Qualidade)</h3>
          </div>
          <div className="space-y-4">
            {/* Metric 1: Dizimo per capita */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Dizimo Per Capita</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{currencyFmt.format(dizimoPerCapita)}</span>
                {trendArrow(dizimoPerCapita >= 100 ? 1 : dizimoPerCapita >= 50 ? 0 : -1)}
              </div>
            </div>
            {/* Metric 2: Taxa crescimento dizimos */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cresc. Dizimos</span>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${trendColor(taxaCrescimentoDizimos)}`}>
                  {taxaCrescimentoDizimos >= 0 ? '+' : ''}{taxaCrescimentoDizimos}%
                </span>
                {trendArrow(taxaCrescimentoDizimos)}
              </div>
            </div>
            {/* Metric 3: Score engajamento */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Engajamento</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{scoreEngajamento}%</span>
                {trendArrow(scoreEngajamento >= 30 ? 1 : scoreEngajamento >= 10 ? 0 : -1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Section 2: Radar Chart ========== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Radar de Saúde do Campo</h3>
        <p className="text-sm text-gray-500 mb-6">Cada eixo pontuado de 0 a 100 com base nos indicadores-chave</p>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-full lg:w-2/3" style={{ height: 380 }}>
            <Radar data={radarData} options={radarOptions} />
          </div>
          <div className="w-full lg:w-1/3 space-y-3">
            {[
              { label: 'Retenção', value: radarScores.retencao, color: '#006D43', desc: 'Membros ativos / total' },
              { label: 'Evangelismo', value: radarScores.evangelismo, color: '#10B981', desc: 'Batismos / membros' },
              { label: 'Formação', value: radarScores.formacao, color: '#F59E0B', desc: 'Alunos classe / interessados' },
              { label: 'Financeiro', value: radarScores.financeiro, color: '#8B5CF6', desc: 'Dizimo per capita' },
              { label: 'Expansão', value: radarScores.expansao, color: '#06B6D4', desc: 'Novos interessados / membros' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: item.color }}>
                  {Math.round(item.value)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm text-gray-500">{item.value}/100</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(item.value, 100)}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== Section 3: Indicadores de Risco ========== */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Indicadores de Risco</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Risk 1: Membros em declinio */}
          <div className={`rounded-xl p-4 ${riskBadgeClass(riskMembros.level)}`}>
            <div className="flex items-center gap-2 mb-2">
              {riskIcon(riskMembros.level)}
              <span className="text-sm font-semibold">Membros em Declinio</span>
            </div>
            <p className="text-xs mt-1">{riskMembros.detail}</p>
          </div>

          {/* Risk 2: Dizimos em declinio */}
          <div className={`rounded-xl p-4 ${riskBadgeClass(riskDizimos.level)}`}>
            <div className="flex items-center gap-2 mb-2">
              {riskIcon(riskDizimos.level)}
              <span className="text-sm font-semibold">Dizimos em Declinio</span>
            </div>
            <p className="text-xs mt-1">{riskDizimos.detail}</p>
          </div>

          {/* Risk 3: Sem batismos recentes */}
          <div className={`rounded-xl p-4 ${riskBadgeClass(riskBatismos.level)}`}>
            <div className="flex items-center gap-2 mb-2">
              {riskIcon(riskBatismos.level)}
              <span className="text-sm font-semibold">Sem Batismos Recentes</span>
            </div>
            <p className="text-xs mt-1">{riskBatismos.detail}</p>
          </div>

          {/* Risk 4: Inativos elevados */}
          <div className={`rounded-xl p-4 ${riskBadgeClass(riskInativos.level)}`}>
            <div className="flex items-center gap-2 mb-2">
              {riskIcon(riskInativos.level)}
              <span className="text-sm font-semibold">Inativos Elevados</span>
            </div>
            <p className="text-xs mt-1">{riskInativos.detail}</p>
          </div>
        </div>
      </div>

      {/* ========== Batismos Bar Chart ========== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div style={{ height: 280 }}>
          <Bar data={batismosBarData} options={barOptions} />
        </div>
      </div>

      {/* ========== Section 4: Mapa de Oportunidades ========== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FiMapPin className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-800">Mapa de Oportunidades</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">Cidades com presenca da igreja e alcance populacional (IBGE)</p>

        {citiesFromPessoas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiMapPin className="w-10 h-10 mx-auto mb-2" />
            <p>Nenhuma cidade identificada nos cadastros de pessoas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Membros</th>
                  <th className="px-4 py-3 text-right">Populacao</th>
                  <th className="px-4 py-3 text-right">Alcance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedCities.map((city, idx) => (
                  <tr key={`${city.cidade}-${city.estado}-${idx}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{city.cidade}</td>
                    <td className="px-4 py-3 text-gray-600">{city.estado}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{numberFmt.format(city.membros)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {city.loadingPop ? (
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                          Carregando...
                        </span>
                      ) : city.populacao !== null ? (
                        numberFmt.format(city.populacao)
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {city.loadingPop ? (
                        <span className="text-gray-400">-</span>
                      ) : city.alcance !== null ? (
                        `${city.alcance < 0.01 ? city.alcance.toExponential(1) : city.alcance.toFixed(4)}%`
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {city.loadingPop ? (
                        <span className="text-gray-400 text-xs">...</span>
                      ) : (
                        alcanceBadge(city.alcance)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loadingCities && (
          <div className="text-center py-2">
            <span className="text-xs text-gray-400">Buscando dados populacionais do IBGE...</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        Diagnostico gerado em {new Date().toLocaleDateString('pt-BR')} as {new Date().toLocaleTimeString('pt-BR')} - NNE Sistema
      </div>
    </div>
  )
}

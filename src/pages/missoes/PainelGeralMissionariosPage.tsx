import { useEffect, useState, useRef, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Missionario, CargoMinisterial } from '@/types'
import {
  FiUsers,
  FiCalendar,
  FiAward,
  FiTrendingUp,
  FiHome,
  FiDownload,
  FiMapPin,
  FiHeart,
  FiGlobe,
} from 'react-icons/fi'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { MISSOES_TABS, CARGO_LABELS } from '@/lib/missoes-constants'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface MissionarioComAssociacao extends Missionario {
  associacao: { nome: string; sigla: string } | null
}

interface IgrejaResumo {
  id: string
  nome: string
  endereco_cidade: string | null
  endereco_estado: string | null
  membros_ativos: number | null
  interessados: number | null
  tipo: string | null
  associacao_id: string
}

interface CidadeIBGE {
  cidade: string
  estado: string
  membros: number
  interessados: number
  igrejas: number
  populacao: number | null
  alcance: number | null
}

interface AssociacaoSummary {
  associacao_sigla: string
  total_missionarios: number
  media_idade: number
  percentual_ativos: number
  media_tempo_ministerio: number
  total_membros: number
  total_interessados: number
  total_igrejas: number
}

const ASSOCIACAO_COLORS: Record<string, string> = {
  ASPAR: '#16a34a',
  ARAM: '#0891b2',
  AMAPI: '#7c3aed',
  ANOB: '#dc2626',
  ASCE: '#ea580c',
  CAMISE: '#ca8a04',
  CAMAP: '#0d9488',
}

const CHART_COLORS = [
  '#006D43', '#0891b2', '#7c3aed', '#dc2626', '#ea580c',
  '#ca8a04', '#0d9488', '#059669', '#10b981', '#34d399',
  '#2563eb', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6',
  '#6366f1',
]

function calculateAge(dataNascimento: string | null): number {
  if (!dataNascimento) return 0
  const born = new Date(dataNascimento)
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const monthDiff = today.getMonth() - born.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
    age--
  }
  return age
}

function calculateYearsOfMinistry(dataInicio: string | null): number {
  if (!dataInicio) return 0
  const inicio = new Date(dataInicio)
  const today = new Date()
  const years = today.getFullYear() - inicio.getFullYear()
  const monthDiff = today.getMonth() - inicio.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < inicio.getDate())) {
    return Math.max(0, years - 1)
  }
  return years
}

function getAgeRange(age: number): string {
  if (age < 18) return '<18'
  if (age < 30) return '18-29'
  if (age < 40) return '30-39'
  if (age < 50) return '40-49'
  if (age < 60) return '50-59'
  return '60+'
}

function getMinistryRange(years: number): string {
  if (years < 6) return '0-5'
  if (years < 11) return '6-10'
  if (years < 21) return '11-20'
  if (years < 31) return '21-30'
  return '30+'
}

const numberFmt = new Intl.NumberFormat('pt-BR')

export default function PainelGeralMissionariosPage() {
  const { profile } = useAuth()
  const dashboardRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [missionarios, setMissionarios] = useState<MissionarioComAssociacao[]>([])
  const [igrejas, setIgrejas] = useState<IgrejaResumo[]>([])
  const [cidadesIBGE, setCidadesIBGE] = useState<CidadeIBGE[]>([])
  const [loadingIBGE, setLoadingIBGE] = useState(false)
  const [filtroAssociacao, setFiltroAssociacao] = useState('')
  const [associacoes, setAssociacoes] = useState<{ id: string; sigla: string; nome: string }[]>([])

  function scopeFilter(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id)
    return query.eq('igreja_id', profile.igreja_id)
  }

  useEffect(() => {
    if (profile) {
      fetchAll()
    }
  }, [profile])

  async function fetchAll() {
    setLoading(true)
    try {
      // Fetch associações for filter dropdown
      const { data: assocData } = await supabase.from('associacoes').select('id, sigla, nome').order('sigla')
      setAssociacoes(assocData || [])

      await Promise.all([fetchMissionarios(), fetchIgrejas()])
    } finally {
      setLoading(false)
    }
  }

  async function fetchMissionarios() {
    try {
      let query = supabase
        .from('missionarios')
        .select('*, associacao:associacoes(nome, sigla)')
      query = scopeFilter(query)
      const { data, error } = await query
      if (error) throw error
      setMissionarios(data || [])
    } catch (err) {
      console.error('Erro ao carregar missionários:', err)
      setMissionarios([])
    }
  }

  async function fetchIgrejas() {
    try {
      let query = supabase
        .from('igrejas')
        .select('id, nome, endereco_cidade, endereco_estado, membros_ativos, interessados, tipo, associacao_id')
        .eq('ativo', true)
      query = scopeFilter(query)
      const { data, error } = await query
      if (error) throw error
      const igData = (data || []) as IgrejaResumo[]
      setIgrejas(igData)
      // Build city grouping for IBGE
      buildCidadesAndFetchIBGE(igData)
    } catch (err) {
      console.error('Erro ao carregar igrejas:', err)
      setIgrejas([])
    }
  }

  async function buildCidadesAndFetchIBGE(igData: IgrejaResumo[]) {
    const cityMap = new Map<string, CidadeIBGE>()
    for (const ig of igData) {
      const cidade = ig.endereco_cidade?.trim()
      const estado = ig.endereco_estado?.trim()
      if (!cidade || !estado) continue
      const key = `${cidade}|${estado}`
      if (!cityMap.has(key)) {
        cityMap.set(key, { cidade, estado, membros: 0, interessados: 0, igrejas: 0, populacao: null, alcance: null })
      }
      const c = cityMap.get(key)!
      c.membros += ig.membros_ativos || 0
      c.interessados += ig.interessados || 0
      c.igrejas += 1
    }

    // Sort by membros desc, take top 15
    const sorted = [...cityMap.values()]
      .filter(c => c.membros > 0)
      .sort((a, b) => b.membros - a.membros)
      .slice(0, 15)

    setCidadesIBGE(sorted)
    // Fetch IBGE population for top cities
    if (sorted.length > 0) {
      setLoadingIBGE(true)
      try {
        await fetchIBGEPopulation(sorted)
      } finally {
        setLoadingIBGE(false)
      }
    }
  }

  async function fetchIBGEPopulation(cidades: CidadeIBGE[]) {
    // Get unique states
    const estados = [...new Set(cidades.map(c => c.estado))]

    for (const uf of estados) {
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
        if (!res.ok) continue
        const municipios: { id: number; nome: string }[] = await res.json()

        const cidadesUF = cidades.filter(c => c.estado === uf)
        for (const c of cidadesUF) {
          const mun = municipios.find(m =>
            m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
            c.cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          )
          if (!mun) continue

          try {
            const popRes = await fetch(
              `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2021/variaveis/9324?localidades=N6[${mun.id}]`
            )
            if (!popRes.ok) continue
            const popData = await popRes.json()
            const valor = popData?.[0]?.resultados?.[0]?.series?.[0]?.serie?.['2021']
            if (valor) {
              c.populacao = parseInt(valor, 10)
              c.alcance = c.populacao > 0 ? (c.membros / c.populacao) * 100 : null
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    setCidadesIBGE([...cidades])
  }

  // ========== KPI CALCULATIONS ==========

  // Filtered data by selected associação
  const missionariosFiltrados = useMemo(() => {
    if (!filtroAssociacao) return missionarios
    return missionarios.filter(m => m.associacao_id === filtroAssociacao)
  }, [missionarios, filtroAssociacao])

  const igrejasFiltradas = useMemo(() => {
    if (!filtroAssociacao) return igrejas
    return igrejas.filter(ig => ig.associacao_id === filtroAssociacao)
  }, [igrejas, filtroAssociacao])

  // Rebuild IBGE when filter changes
  useEffect(() => {
    if (igrejasFiltradas.length > 0) {
      buildCidadesAndFetchIBGE(igrejasFiltradas)
    } else {
      setCidadesIBGE([])
    }
  }, [filtroAssociacao]) // eslint-disable-line

  const totalMissionarios = missionariosFiltrados.length
  const totalMembros = useMemo(() => igrejasFiltradas.reduce((s, ig) => s + (ig.membros_ativos || 0), 0), [igrejasFiltradas])
  const totalInteressados = useMemo(() => igrejasFiltradas.reduce((s, ig) => s + (ig.interessados || 0), 0), [igrejasFiltradas])
  const totalIgrejas = igrejasFiltradas.length

  const idadeMedia = useMemo(() => {
    if (missionariosFiltrados.length === 0) return 0
    const idades = missionariosFiltrados.map(m => calculateAge(m.data_nascimento)).filter(age => age > 0)
    return idades.length > 0 ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0
  }, [missionariosFiltrados])

  const formacaoTeologicaTotal = useMemo(() => {
    return missionariosFiltrados.filter(m => m.formacao_teologica && m.formacao_teologica.trim()).length
  }, [missionariosFiltrados])

  const missionariosAtivos = useMemo(() => {
    return missionariosFiltrados.filter(m => m.status === 'ativo').length
  }, [missionariosFiltrados])

  const associacoesRepresentadas = useMemo(() => {
    const ids = new Set(missionariosFiltrados.map(m => m.associacao_id).filter(Boolean))
    return ids.size
  }, [missionariosFiltrados])

  const cidadesComPresenca = useMemo(() => {
    const cidades = new Set(igrejasFiltradas.filter(ig => ig.endereco_cidade).map(ig => `${ig.endereco_cidade}|${ig.endereco_estado}`))
    return cidades.size
  }, [igrejasFiltradas])

  // ========== CHART DATA ==========

  // Distribuição por Cargo → Bar horizontal
  const cargoDist = useMemo(() => {
    const dist: Record<string, number> = {}
    missionariosFiltrados.forEach(m => {
      if (m.cargo_ministerial) {
        dist[m.cargo_ministerial] = (dist[m.cargo_ministerial] || 0) + 1
      }
    })
    return Object.entries(dist).sort((a, b) => b[1] - a[1])
  }, [missionariosFiltrados])

  const cargoChartData = useMemo(() => ({
    labels: cargoDist.map(([cargo]) => CARGO_LABELS[cargo as CargoMinisterial] || cargo),
    datasets: [{
      label: 'Quantidade',
      data: cargoDist.map(([, count]) => count),
      backgroundColor: CHART_COLORS.slice(0, cargoDist.length),
      borderColor: '#fff',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [cargoDist])

  // Distribuição por Associação → Doughnut
  const associacaoDist = useMemo(() => {
    const dist: Record<string, number> = {}
    missionariosFiltrados.forEach(m => {
      const sigla = m.associacao?.sigla || 'Sem Associação'
      dist[sigla] = (dist[sigla] || 0) + 1
    })
    return Object.entries(dist).sort((a, b) => b[1] - a[1])
  }, [missionariosFiltrados])

  const associacaoChartData = useMemo(() => ({
    labels: associacaoDist.map(([sigla]) => sigla),
    datasets: [{
      label: 'Missionários',
      data: associacaoDist.map(([, count]) => count),
      backgroundColor: associacaoDist.map(([sigla]) => ASSOCIACAO_COLORS[sigla] || '#94a3b8'),
      borderColor: '#fff',
      borderWidth: 2,
    }],
  }), [associacaoDist])

  // Distribuição por Escolaridade → Bar horizontal
  const escolaridadeDist = useMemo(() => {
    const dist: Record<string, number> = {}
    missionariosFiltrados.forEach(m => {
      if (m.escolaridade) {
        dist[m.escolaridade] = (dist[m.escolaridade] || 0) + 1
      }
    })
    return Object.entries(dist).sort((a, b) => b[1] - a[1])
  }, [missionariosFiltrados])

  const escolaridadeChartData = useMemo(() => ({
    labels: escolaridadeDist.map(([e]) => e),
    datasets: [{
      label: 'Quantidade',
      data: escolaridadeDist.map(([, count]) => count),
      backgroundColor: '#006D43',
      borderColor: '#fff',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [escolaridadeDist])

  // Faixa Etária → Bar
  const faixaEtariaDist = useMemo(() => {
    const ranges = ['18-29', '30-39', '40-49', '50-59', '60+']
    const dist: Record<string, number> = {}
    ranges.forEach(r => (dist[r] = 0))
    missionariosFiltrados.forEach(m => {
      const age = calculateAge(m.data_nascimento)
      if (age >= 18) {
        const range = getAgeRange(age)
        dist[range] = (dist[range] || 0) + 1
      }
    })
    return ranges.map(r => ({ range: r, count: dist[r] }))
  }, [missionariosFiltrados])

  const faixaEtariaChartData = useMemo(() => ({
    labels: faixaEtariaDist.map(d => d.range),
    datasets: [{
      label: 'Missionários',
      data: faixaEtariaDist.map(d => d.count),
      backgroundColor: ['#10b981', '#059669', '#006D43', '#0891b2', '#7c3aed'],
      borderColor: '#fff',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [faixaEtariaDist])

  // Estado Civil → Doughnut
  const estadoCivilDist = useMemo(() => {
    const dist: Record<string, number> = {}
    missionariosFiltrados.forEach(m => {
      if (m.estado_civil) {
        dist[m.estado_civil] = (dist[m.estado_civil] || 0) + 1
      }
    })
    return Object.entries(dist).sort((a, b) => b[1] - a[1])
  }, [missionariosFiltrados])

  const estadoCivilLabels: Record<string, string> = {
    solteiro: 'Solteiro(a)',
    casado: 'Casado(a)',
    divorciado: 'Divorciado(a)',
    viuvo: 'Viúvo(a)',
    separado: 'Separado(a)',
    uniao_estavel: 'União Estável',
  }

  const estadoCivilChartData = useMemo(() => ({
    labels: estadoCivilDist.map(([e]) => estadoCivilLabels[e] || e),
    datasets: [{
      label: 'Quantidade',
      data: estadoCivilDist.map(([, count]) => count),
      backgroundColor: ['#006D43', '#0891b2', '#7c3aed', '#dc2626', '#ea580c', '#ca8a04'],
      borderColor: '#fff',
      borderWidth: 2,
    }],
  }), [estadoCivilDist])

  // Tempo de Ministério → Bar
  const tempoMinisterioDist = useMemo(() => {
    const ranges = ['0-5', '6-10', '11-20', '21-30', '30+']
    const dist: Record<string, number> = {}
    ranges.forEach(r => (dist[r] = 0))
    missionariosFiltrados.forEach(m => {
      const years = calculateYearsOfMinistry(m.data_inicio_ministerio)
      const range = getMinistryRange(years)
      dist[range] = (dist[range] || 0) + 1
    })
    return ranges.map(r => ({ range: r, count: dist[r] }))
  }, [missionariosFiltrados])

  const tempoMinisterioChartData = useMemo(() => ({
    labels: tempoMinisterioDist.map(d => `${d.range} anos`),
    datasets: [{
      label: 'Missionários',
      data: tempoMinisterioDist.map(d => d.count),
      backgroundColor: ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'],
      borderColor: '#fff',
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [tempoMinisterioDist])

  // ========== TABELA POR ASSOCIAÇÃO ==========

  const associacaoSummaries = useMemo<AssociacaoSummary[]>(() => {
    const mapa = new Map<string, MissionarioComAssociacao[]>()
    missionariosFiltrados.forEach(m => {
      const sigla = m.associacao?.sigla || 'Sem Associação'
      if (!mapa.has(sigla)) mapa.set(sigla, [])
      mapa.get(sigla)!.push(m)
    })

    // Map associacao sigla to igrejas
    const igrejasPorAssoc = new Map<string, IgrejaResumo[]>()
    for (const ig of igrejas) {
      // Find sigla by matching associacao_id in missionarios
      const m = missionarios.find(ms => ms.associacao_id === ig.associacao_id)
      const sigla = m?.associacao?.sigla || 'Sem Associação'
      if (!igrejasPorAssoc.has(sigla)) igrejasPorAssoc.set(sigla, [])
      igrejasPorAssoc.get(sigla)!.push(ig)
    }

    const summaries: AssociacaoSummary[] = []
    for (const [sigla, mss] of mapa) {
      const idades = mss.map(m => calculateAge(m.data_nascimento)).filter(a => a > 0)
      const mediaIdade = idades.length > 0 ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0
      const ativos = mss.filter(m => m.status === 'ativo').length
      const percentualAtivos = mss.length > 0 ? Math.round((ativos / mss.length) * 100) : 0
      const tempos = mss.map(m => calculateYearsOfMinistry(m.data_inicio_ministerio)).filter(t => t > 0)
      const mediaTempoMinisterio = tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0

      const igsAssoc = igrejasPorAssoc.get(sigla) || []
      const totalMemb = igsAssoc.reduce((s, ig) => s + (ig.membros_ativos || 0), 0)
      const totalInt = igsAssoc.reduce((s, ig) => s + (ig.interessados || 0), 0)

      summaries.push({
        associacao_sigla: sigla,
        total_missionarios: mss.length,
        media_idade: mediaIdade,
        percentual_ativos: percentualAtivos,
        media_tempo_ministerio: mediaTempoMinisterio,
        total_membros: totalMemb,
        total_interessados: totalInt,
        total_igrejas: igsAssoc.length,
      })
    }

    return summaries.sort((a, b) => b.total_missionarios - a.total_missionarios)
  }, [missionarios, igrejas])

  // ========== CHART OPTIONS ==========

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { font: { size: 11 }, padding: 10, boxWidth: 12, usePointStyle: true },
      },
      tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: 10 },
    },
    cutout: '55%',
  }

  const barHorizontalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: 10 },
    },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f3f4f6' } },
      y: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  }

  const barVerticalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: 10 },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f3f4f6' } },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  }

  // ========== EXPORT PDF ==========

  async function exportPDF() {
    if (!dashboardRef.current) return
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' })
      const pdf = new jsPDF('l', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20)

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 20)
      }

      pdf.save(`painel-geral-missionarios-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
    }
  }

  // ========== PENETRATION BADGE ==========

  function alcanceBadge(pct: number | null) {
    if (pct === null) return <span className="text-xs text-gray-400">—</span>
    if (pct >= 0.1) return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{pct.toFixed(3)}%</span>
    if (pct >= 0.01) return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">{pct.toFixed(3)}%</span>
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{pct.toFixed(4)}%</span>
  }

  return (
    <div className="space-y-6">
      {/* MISSOES TABS Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
        {MISSOES_TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/missoes'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Painel Geral — Corpo Missionário
          </h1>
          <p className="text-gray-500 mt-1">
            Visão estratégica completa: missionários, igrejas e inteligência territorial
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtroAssociacao}
            onChange={(e) => setFiltroAssociacao(e.target.value)}
            className="input-field text-sm py-2 w-48"
          >
            <option value="">Todas as Associações</option>
            {associacoes.map(a => (
              <option key={a.id} value={a.id}>{a.sigla} — {a.nome}</option>
            ))}
          </select>
          <button
            onClick={exportPDF}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <FiDownload className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500">Carregando dados...</span>
        </div>
      ) : (
        <div ref={dashboardRef} className="space-y-8">
          {/* ══════════ SEÇÃO 1: KPI CARDS — MISSIONÁRIOS ══════════ */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FiUsers className="w-4 h-4" /> Corpo Missionário
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <KPICard icon={<FiUsers className="w-5 h-5 text-green-600" />} bg="bg-green-100" value={totalMissionarios} label="Missionários" />
              <KPICard icon={<FiTrendingUp className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-100" value={missionariosAtivos} label="Ativos" sub={totalMissionarios > 0 ? `${Math.round((missionariosAtivos / totalMissionarios) * 100)}%` : ''} />
              <KPICard icon={<FiCalendar className="w-5 h-5 text-blue-600" />} bg="bg-blue-100" value={`${idadeMedia} anos`} label="Idade Média" />
              <KPICard icon={<FiAward className="w-5 h-5 text-amber-600" />} bg="bg-amber-100" value={formacaoTeologicaTotal} label="Formação Teológica" />
              <KPICard icon={<FiHome className="w-5 h-5 text-purple-600" />} bg="bg-purple-100" value={associacoesRepresentadas} label="Associações" />
            </div>
          </div>

          {/* ══════════ SEÇÃO 2: KPI CARDS — CAMPO ══════════ */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FiMapPin className="w-4 h-4" /> Campo Missionário
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPICard icon={<FiHome className="w-5 h-5 text-green-600" />} bg="bg-green-100" value={totalIgrejas} label="Igrejas" />
              <KPICard icon={<FiUsers className="w-5 h-5 text-blue-600" />} bg="bg-blue-100" value={numberFmt.format(totalMembros)} label="Membros Ativos" />
              <KPICard icon={<FiHeart className="w-5 h-5 text-rose-600" />} bg="bg-rose-100" value={numberFmt.format(totalInteressados)} label="Interessados" />
              <KPICard icon={<FiGlobe className="w-5 h-5 text-cyan-600" />} bg="bg-cyan-100" value={cidadesComPresenca} label="Cidades com Presença" />
            </div>
          </div>

          {/* ══════════ SEÇÃO 3: CHARTS MISSIONÁRIOS ══════════ */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Análise do Corpo Missionário
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Cargo → Bar horizontal */}
              <ChartCard title="Distribuição por Cargo" hasData={cargoDist.length > 0}>
                <Bar data={cargoChartData} options={barHorizontalOptions} />
              </ChartCard>

              {/* Associação → Doughnut */}
              <ChartCard title="Por Associação" hasData={associacaoDist.length > 0}>
                <Doughnut data={associacaoChartData} options={doughnutOptions} />
              </ChartCard>

              {/* Faixa Etária → Bar */}
              <ChartCard title="Faixa Etária" hasData={faixaEtariaDist.some(d => d.count > 0)}>
                <Bar data={faixaEtariaChartData} options={barVerticalOptions} />
              </ChartCard>

              {/* Escolaridade → Bar horizontal */}
              <ChartCard title="Escolaridade" hasData={escolaridadeDist.length > 0}>
                <Bar data={escolaridadeChartData} options={barHorizontalOptions} />
              </ChartCard>

              {/* Estado Civil → Doughnut */}
              <ChartCard title="Estado Civil" hasData={estadoCivilDist.length > 0}>
                <Doughnut data={estadoCivilChartData} options={doughnutOptions} />
              </ChartCard>

              {/* Tempo de Ministério → Bar */}
              <ChartCard title="Tempo de Ministério" hasData={tempoMinisterioDist.some(d => d.count > 0)}>
                <Bar data={tempoMinisterioChartData} options={barVerticalOptions} />
              </ChartCard>
            </div>
          </div>

          {/* ══════════ SEÇÃO 4: RESUMO POR ASSOCIAÇÃO ══════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiHome className="w-5 h-5 text-green-600" />
              Resumo por Associação
            </h3>
            {associacaoSummaries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider border-b">
                      <th className="px-4 py-3">Associação</th>
                      <th className="px-4 py-3 text-center">Missionários</th>
                      <th className="px-4 py-3 text-center">Igrejas</th>
                      <th className="px-4 py-3 text-center">Membros</th>
                      <th className="px-4 py-3 text-center">Interessados</th>
                      <th className="px-4 py-3 text-center">Idade Média</th>
                      <th className="px-4 py-3 text-center">% Ativos</th>
                      <th className="px-4 py-3 text-center">Tempo Ministério</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {associacaoSummaries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSOCIACAO_COLORS[row.associacao_sigla] || '#94a3b8' }} />
                            <span className="font-semibold text-gray-800">{row.associacao_sigla}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{row.total_missionarios}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{row.total_igrejas}</td>
                        <td className="px-4 py-3 text-center font-semibold text-green-700">{numberFmt.format(row.total_membros)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{numberFmt.format(row.total_interessados)}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{row.media_idade} anos</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${row.percentual_ativos}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600">{row.percentual_ativos}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{row.media_tempo_ministerio} anos</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                      <td className="px-4 py-3 text-gray-800">TOTAL</td>
                      <td className="px-4 py-3 text-center">{associacaoSummaries.reduce((s, r) => s + r.total_missionarios, 0)}</td>
                      <td className="px-4 py-3 text-center">{associacaoSummaries.reduce((s, r) => s + r.total_igrejas, 0)}</td>
                      <td className="px-4 py-3 text-center text-green-700">{numberFmt.format(associacaoSummaries.reduce((s, r) => s + r.total_membros, 0))}</td>
                      <td className="px-4 py-3 text-center">{numberFmt.format(associacaoSummaries.reduce((s, r) => s + r.total_interessados, 0))}</td>
                      <td className="px-4 py-3 text-center">{idadeMedia} anos</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          {totalMissionarios > 0 ? Math.round((missionariosAtivos / totalMissionarios) * 100) : 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Sem dados disponíveis</p>
            )}
          </div>

          {/* ══════════ SEÇÃO 5: INTELIGÊNCIA TERRITORIAL (IBGE) ══════════ */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <FiGlobe className="w-5 h-5 text-cyan-600" />
              Inteligência Territorial — Dados IBGE
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Top cidades por presença de membros cruzando com dados do Censo IBGE 2021
            </p>

            {cidadesIBGE.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider border-b">
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Cidade</th>
                      <th className="px-4 py-3">UF</th>
                      <th className="px-4 py-3 text-center">Igrejas</th>
                      <th className="px-4 py-3 text-center">Membros</th>
                      <th className="px-4 py-3 text-center">Interessados</th>
                      <th className="px-4 py-3 text-right">População (IBGE)</th>
                      <th className="px-4 py-3 text-center">Alcance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cidadesIBGE.map((c, idx) => (
                      <tr key={`${c.cidade}-${c.estado}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{c.cidade}</td>
                        <td className="px-4 py-3 text-gray-600">{c.estado}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{c.igrejas}</td>
                        <td className="px-4 py-3 text-center font-semibold text-green-700">{numberFmt.format(c.membros)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{numberFmt.format(c.interessados)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {c.populacao !== null ? numberFmt.format(c.populacao) : (
                            loadingIBGE ? <span className="text-xs text-gray-400 animate-pulse">Carregando...</span> : '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{alcanceBadge(c.alcance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FiGlobe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Nenhuma cidade com membros ativos encontrada</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ========== SUB-COMPONENTS ==========

function KPICard({ icon, bg, value, label, sub }: { icon: React.ReactNode; bg: string; value: string | number; label: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${bg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
          {sub && <p className="text-xs text-green-600 font-medium">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, hasData, children }: { title: string; hasData: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {hasData ? (
        <div className="h-72">
          {children}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-12 text-sm">Sem dados disponíveis</p>
      )}
    </div>
  )
}

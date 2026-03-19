import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Missionario, DadosFinanceiros, ClasseBatismal } from '@/types'
import { projectMembership, projectRevenue, calculateGrowthRate, analyzeAgeDistribution, formatMesAno } from '@/lib/projections'
import { FiDownload, FiFileText, FiUsers, FiTrendingUp, FiTrendingDown, FiDollarSign, FiBarChart2 } from 'react-icons/fi'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Line, Doughnut, Radar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, RadialLinearScale, Title, Tooltip, Legend, Filler)

const COLORS = ['#006D43', '#0F3999', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const chartOptions = (titleText?: string): any => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 12 } },
    ...(titleText ? { title: { display: true, text: titleText, font: { size: 14, weight: '600' } } } : {}),
  },
})

import { CARGO_LABELS } from '@/lib/missoes-constants'

interface PessoaResumo {
  data_nascimento: string | null
  sexo: 'masculino' | 'feminino' | null
  tipo: 'membro' | 'interessado'
  situacao: string
}

export default function RelatorioCampoPage() {
  const { profile } = useAuth()
  const reportRef = useRef<HTMLDivElement>(null)

  const [missionarios, setMissionarios] = useState<Missionario[]>([])
  const [selectedMissionarioId, setSelectedMissionarioId] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Report data
  const [missionario, setMissionario] = useState<Missionario | null>(null)
  const [igrejasNomes, setIgrejasNomes] = useState<string[]>([])
  const [pessoas, setPessoas] = useState<PessoaResumo[]>([])
  const [financeiro, setFinanceiro] = useState<DadosFinanceiros[]>([])
  const [classesBatismais, setClassesBatismais] = useState<ClasseBatismal[]>([])
  const [contagem, setContagem] = useState<{ mes: number; ano: number; total_membros: number }[]>([])
  // Aggregated daily activity data (from relatorio_missionario_diario)
  const [atividadesMissionario, setAtividadesMissionario] = useState<Record<string, number>>({})
  const [atividadesUniao, setAtividadesUniao] = useState<Record<string, number>>({})
  const [reportReady, setReportReady] = useState(false)

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (profile) {
      fetchMissionarios()
    }
  }, [profile])

  async function fetchMissionarios() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('missionarios')
        .select('*, usuario:profiles(nome, email), associacao:associacoes(nome, sigla)')
        .eq('status', 'ativo')
        .order('created_at')

      // If not admin, auto-select self
      if (profile.papel === 'admin') {
        // see all
      } else if (profile.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile.uniao_id!)
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else {
        query = query.eq('usuario_id', profile.id)
      }

      const { data, error } = await query
      if (error) throw error
      setMissionarios(data || [])

      // Auto-select if only one missionary or if user is the missionary
      if (data && data.length === 1) {
        setSelectedMissionarioId(data[0].id)
      } else if (data) {
        const self = data.find(m => m.usuario_id === profile.id)
        if (self) setSelectedMissionarioId(self.id)
      }
    } catch (err) {
      console.error('Erro ao buscar missionarios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedMissionarioId) {
      generateReport()
    } else {
      setReportReady(false)
    }
  }, [selectedMissionarioId])

  async function generateReport() {
    const selected = missionarios.find(m => m.id === selectedMissionarioId)
    if (!selected) return

    setGenerating(true)
    setReportReady(false)

    try {
      setMissionario(selected)
      const igrejasIds = selected.igrejas_responsavel || []

      // Fetch churches names
      if (igrejasIds.length > 0) {
        const { data: igData } = await supabase
          .from('igrejas')
          .select('nome')
          .in('id', igrejasIds)
        setIgrejasNomes(igData?.map(i => i.nome) || [])
      } else {
        setIgrejasNomes([])
      }

      // Fetch all data in parallel
      await Promise.all([
        fetchPessoas(igrejasIds),
        fetchFinanceiro(igrejasIds),
        fetchClasses(igrejasIds),
        fetchContagem(igrejasIds),
        fetchAtividades(selected.id),
        fetchAtividadesUniao(),
      ])

      setReportReady(true)
    } catch (err) {
      console.error('Erro ao gerar relatorio:', err)
    } finally {
      setGenerating(false)
    }
  }

  async function fetchPessoas(igrejasIds: string[]) {
    if (igrejasIds.length === 0) { setPessoas([]); return }
    const { data, error } = await supabase
      .from('pessoas')
      .select('data_nascimento, sexo, tipo, situacao')
      .in('igreja_id', igrejasIds)
      .eq('situacao', 'ativo')
    if (error) throw error
    setPessoas(data || [])
  }

  async function fetchFinanceiro(igrejasIds: string[]) {
    if (igrejasIds.length === 0) { setFinanceiro([]); return }
    const { data, error } = await supabase
      .from('dados_financeiros')
      .select('mes, ano, receita_dizimos, receita_primicias, receita_oferta_regular, receita_oferta_especial, receita_oferta_es, receita_doacoes, dizimo, primicias')
      .in('igreja_id', igrejasIds)
      .gte('ano', currentYear - 1)
      .order('ano')
      .order('mes')
    if (error) throw error
    setFinanceiro((data as any[]) || [])
  }

  async function fetchClasses(igrejasIds: string[]) {
    if (igrejasIds.length === 0) { setClassesBatismais([]); return }
    const { data, error } = await supabase
      .from('classes_batismais')
      .select('*')
      .in('igreja_id', igrejasIds)
      .eq('status', 'ativa')
    if (error) throw error
    setClassesBatismais(data || [])
  }

  async function fetchContagem(igrejasIds: string[]) {
    if (igrejasIds.length === 0) { setContagem([]); return }
    const { data, error } = await supabase
      .from('contagem_mensal')
      .select('mes, ano, total_membros')
      .in('igreja_id', igrejasIds)
      .gte('ano', currentYear - 1)
      .order('ano')
      .order('mes')
    if (error) throw error
    setContagem(data || [])
  }

  const RADAR_FIELDS = [
    'estudos_biblicos', 'familias_visitadas', 'membros_visitados',
    'interessados_visitados', 'contatos_missionarios', 'sermoes_conferencias',
    'pessoas_batizadas', 'classes_batismais_ativ', 'folhetos_distribuidos',
  ]

  async function fetchAtividades(missionarioId: string) {
    // Get reports for this missionary in current year
    const { data: reports } = await supabase
      .from('relatorios_missionarios')
      .select('id')
      .eq('missionario_id', missionarioId)
      .eq('ano', currentYear)

    if (!reports || reports.length === 0) { setAtividadesMissionario({}); return }

    const reportIds = reports.map(r => r.id)
    const { data: diarios } = await supabase
      .from('relatorio_missionario_diario')
      .select(RADAR_FIELDS.join(', '))
      .in('relatorio_id', reportIds)

    // Aggregate totals
    const agg: Record<string, number> = {}
    for (const f of RADAR_FIELDS) agg[f] = 0
    for (const d of diarios || []) {
      for (const f of RADAR_FIELDS) agg[f] += Number((d as any)[f]) || 0
    }
    setAtividadesMissionario(agg)
  }

  async function fetchAtividadesUniao() {
    // Fetch all reports for the current year (union-wide comparison)
    const { data: reports } = await supabase
      .from('relatorios_missionarios')
      .select('id')
      .eq('ano', currentYear)

    if (!reports || reports.length === 0) { setAtividadesUniao({}); return }

    const reportIds = reports.map(r => r.id)
    const { data: diarios } = await supabase
      .from('relatorio_missionario_diario')
      .select(RADAR_FIELDS.join(', '))
      .in('relatorio_id', reportIds)

    const agg: Record<string, number> = {}
    for (const f of RADAR_FIELDS) agg[f] = 0
    for (const d of diarios || []) {
      for (const f of RADAR_FIELDS) agg[f] += Number((d as any)[f]) || 0
    }
    // Average per missionary (divide by distinct missionaries)
    const uniqueMissionaries = new Set(reports.map(r => r.id)).size
    if (uniqueMissionaries > 1) {
      for (const f of RADAR_FIELDS) agg[f] = Math.round(agg[f] / uniqueMissionaries)
    }
    setAtividadesUniao(agg)
  }

  // Computed data
  const totalMembros = useMemo(() => pessoas.filter(p => p.tipo === 'membro').length, [pessoas])
  const totalInteressados = useMemo(() => pessoas.filter(p => p.tipo === 'interessado').length, [pessoas])

  // Age distribution
  const ageDistribution = useMemo(() => analyzeAgeDistribution(pessoas), [pessoas])
  const ageChartData = useMemo(() => ({
    labels: ageDistribution.map(d => d.faixa),
    datasets: [{
      label: 'Pessoas',
      data: ageDistribution.map(d => d.count),
      backgroundColor: COLORS.slice(0, ageDistribution.length).map(c => c + '99'),
      borderColor: COLORS.slice(0, ageDistribution.length),
      borderWidth: 1,
    }],
  }), [ageDistribution])

  // Gender distribution
  const genderData = useMemo(() => {
    const masc = pessoas.filter(p => p.sexo === 'masculino').length
    const fem = pessoas.filter(p => p.sexo === 'feminino').length
    const other = pessoas.length - masc - fem
    return {
      labels: ['Masculino', 'Feminino', ...(other > 0 ? ['Nao informado'] : [])],
      datasets: [{
        data: [masc, fem, ...(other > 0 ? [other] : [])],
        backgroundColor: ['#0F3999', '#EC4899', ...(other > 0 ? ['#9CA3AF'] : [])],
        borderWidth: 0,
      }],
    }
  }, [pessoas])

  // Financial trend
  const financialChartData = useMemo(() => {
    // Aggregate by mes/ano
    const aggregated: Record<string, { dizimos: number; ofertas: number }> = {}
    for (const f of financeiro) {
      const key = `${f.ano}-${String(f.mes).padStart(2, '0')}`
      if (!aggregated[key]) aggregated[key] = { dizimos: 0, ofertas: 0 }
      aggregated[key].dizimos += ((f as any).receita_dizimos || 0) + ((f as any).dizimo || 0)
      const ofertas = ((f as any).receita_oferta_regular || 0) + ((f as any).primicias || 0) + ((f as any).receita_oferta_especial || 0) + ((f as any).receita_oferta_es || 0)
      aggregated[key].ofertas += ofertas
    }

    const sortedKeys = Object.keys(aggregated).sort()
    const labels = sortedKeys.map(k => {
      const [ano, mes] = k.split('-')
      return formatMesAno(parseInt(mes), parseInt(ano))
    })

    return {
      labels,
      datasets: [
        {
          label: 'Dizimos',
          data: sortedKeys.map(k => aggregated[k].dizimos),
          borderColor: '#006D43',
          backgroundColor: '#006D4320',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Ofertas',
          data: sortedKeys.map(k => aggregated[k].ofertas),
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F620',
          fill: true,
          tension: 0.3,
        },
      ],
    }
  }, [financeiro])

  // Missionary activity radar (from relatorio_missionario_diario aggregated)
  const radarLabels = [
    'Estudos Biblicos', 'Familias Visitadas', 'Membros Visitados',
    'Interessados', 'Contatos', 'Sermoes',
    'Batizados', 'Classes Bíblicas', 'Folhetos',
  ]

  const radarData = useMemo(() => {
    const hasData = Object.values(atividadesMissionario).some(v => v > 0)
    if (!hasData) return null

    return {
      labels: radarLabels,
      datasets: [
        {
          label: 'Missionario',
          data: RADAR_FIELDS.map(f => atividadesMissionario[f] || 0),
          borderColor: '#006D43',
          backgroundColor: '#006D4340',
          borderWidth: 2,
          pointBackgroundColor: '#006D43',
        },
        {
          label: 'Media da Uniao',
          data: RADAR_FIELDS.map(f => atividadesUniao[f] || 0),
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F630',
          borderWidth: 2,
          pointBackgroundColor: '#3B82F6',
          borderDash: [4, 4],
        },
      ],
    }
  }, [atividadesMissionario, atividadesUniao])

  // Membership projection
  const membershipProjection = useMemo(() => {
    if (contagem.length < 2) return null

    // Aggregate contagem by mes/ano
    const aggregated: Record<string, number> = {}
    for (const c of contagem) {
      const key = `${c.ano}-${String(c.mes).padStart(2, '0')}`
      aggregated[key] = (aggregated[key] || 0) + c.total_membros
    }

    const sortedKeys = Object.keys(aggregated).sort()
    const historicalData = sortedKeys.map(k => {
      const [ano, mes] = k.split('-')
      return { mes: parseInt(mes), ano: parseInt(ano), total_membros: aggregated[k] }
    })

    const projected = projectMembership(historicalData, 6)
    const historicalLabels = historicalData.map(d => formatMesAno(d.mes, d.ano))
    const projectedLabels = projected.map(d => formatMesAno(d.mes, d.ano))
    const allLabels = [...historicalLabels, ...projectedLabels]

    // Growth rate
    const firstVal = historicalData[0]?.total_membros || 0
    const lastVal = historicalData[historicalData.length - 1]?.total_membros || 0
    const growthRate = calculateGrowthRate(lastVal, firstVal)

    return {
      data: {
        labels: allLabels,
        datasets: [
          {
            label: 'Real',
            data: [...historicalData.map(d => d.total_membros), ...Array(projected.length).fill(null)],
            borderColor: '#006D43',
            backgroundColor: '#006D4320',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          },
          {
            label: 'Projetado',
            data: [...Array(historicalData.length - 1).fill(null), lastVal, ...projected.map(d => d.projetado)],
            borderColor: '#006D43',
            borderDash: [5, 5],
            pointStyle: 'circle' as const,
            pointRadius: 3,
            tension: 0.3,
          },
        ],
      },
      growthRate,
    }
  }, [contagem])

  // Revenue projection
  const revenueProjection = useMemo(() => {
    if (financeiro.length < 2) return null

    // Aggregate revenue by mes/ano
    const aggregated: Record<string, number> = {}
    for (const f of financeiro) {
      const key = `${f.ano}-${String(f.mes).padStart(2, '0')}`
      const total = ((f as any).receita_dizimos || 0) + ((f as any).dizimo || 0) + ((f as any).receita_oferta_regular || 0) + ((f as any).primicias || 0) + ((f as any).receita_oferta_especial || 0) + ((f as any).receita_oferta_es || 0) + ((f as any).receita_doacoes || 0)
      aggregated[key] = (aggregated[key] || 0) + total
    }

    const sortedKeys = Object.keys(aggregated).sort()
    const historicalData = sortedKeys.map(k => {
      const [ano, mes] = k.split('-')
      return { mes: parseInt(mes), ano: parseInt(ano), receita: aggregated[k] }
    })

    const projected = projectRevenue(historicalData, 6)
    const historicalLabels = historicalData.map(d => formatMesAno(d.mes, d.ano))
    const projectedLabels = projected.map(d => formatMesAno(d.mes, d.ano))
    const allLabels = [...historicalLabels, ...projectedLabels]

    const firstVal = historicalData[0]?.receita || 0
    const lastVal = historicalData[historicalData.length - 1]?.receita || 0
    const growthRate = calculateGrowthRate(lastVal, firstVal)

    return {
      data: {
        labels: allLabels,
        datasets: [
          {
            label: 'Real',
            data: [...historicalData.map(d => d.receita), ...Array(projected.length).fill(null)],
            borderColor: '#0F3999',
            backgroundColor: '#0F399920',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          },
          {
            label: 'Projetado',
            data: [...Array(historicalData.length - 1).fill(null), lastVal, ...projected.map(d => d.projetado)],
            borderColor: '#0F3999',
            borderDash: [5, 5],
            pointStyle: 'circle' as const,
            pointRadius: 3,
            tension: 0.3,
          },
        ],
      },
      growthRate,
    }
  }, [financeiro])

  // PDF Export
  async function exportPDF() {
    const element = document.getElementById('report-content')
    if (!element) return
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      let heightLeft = pdfHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pdf.internal.pageSize.getHeight()

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pdf.internal.pageSize.getHeight()
      }

      const nome = missionario?.nome || missionario?.usuario?.nome || 'missionario'
      pdf.save(`relatorio-campo-${nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      alert('Erro ao gerar PDF.')
    }
  }

  // Excel Export
  function exportExcel() {
    if (!missionario) return
    try {
      const wb = XLSX.utils.book_new()

      // Summary sheet
      const summaryData = [
        ['Relatório do Campo - ' + (missionario.nome || missionario.usuario?.nome || '')],
        ['Cargo', CARGO_LABELS[missionario.cargo_ministerial] || missionario.cargo_ministerial],
        ['Igrejas', igrejasNomes.join(', ')],
        ['Total Membros', totalMembros],
        ['Total Interessados', totalInteressados],
        ['Total Igrejas', igrejasNomes.length],
        [],
        ['Distribuição Etária'],
        ['Faixa', 'Quantidade', 'Percentual'],
        ...ageDistribution.map(d => [d.faixa, d.count, `${d.percentage}%`]),
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo')

      // Financial sheet
      if (financeiro.length > 0) {
        const finHeaders = ['Mes', 'Ano', 'Dizimos', 'Ofertas Regular', 'Ofertas Especial', 'Ofertas ES', 'Doacoes']
        const finData = financeiro.map(f => [
          f.mes, f.ano,
          ((f as any).receita_dizimos || 0) + ((f as any).dizimo || 0),
          ((f as any).receita_oferta_regular || 0) + ((f as any).primicias || 0),
          (f as any).receita_oferta_especial || 0,
          (f as any).receita_oferta_es || 0,
          (f as any).receita_doacoes || 0,
        ])
        const wsFin = XLSX.utils.aoa_to_sheet([finHeaders, ...finData])
        XLSX.utils.book_append_sheet(wb, wsFin, 'Financeiro')
      }

      // Classes sheet
      if (classesBatismais.length > 0) {
        const classHeaders = ['Nome', 'Instrutor', 'Data Inicio', 'Total Alunos', 'Status']
        const classData = classesBatismais.map(c => [
          c.nome, c.instrutor, c.data_inicio, c.alunos?.length || 0, c.status,
        ])
        const wsCl = XLSX.utils.aoa_to_sheet([classHeaders, ...classData])
        XLSX.utils.book_append_sheet(wb, wsCl, 'Classes Bíblicas')
      }

      // Missionary activity sheet (aggregated from daily reports)
      if (Object.values(atividadesMissionario).some(v => v > 0)) {
        const repHeaders = ['Campo', 'Total']
        const repData = RADAR_FIELDS.map((f, i) => [radarLabels[i], atividadesMissionario[f] || 0])
        const wsRep = XLSX.utils.aoa_to_sheet([repHeaders, ...repData])
        XLSX.utils.book_append_sheet(wb, wsRep, 'Atividade Missionaria')
      }

      const nome = missionario.nome || missionario.usuario?.nome || 'missionario'
      XLSX.writeFile(wb, `relatorio-campo-${nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      console.error('Erro ao exportar Excel:', err)
      alert('Erro ao gerar Excel.')
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-800">Relatório do Campo</h1>
          <p className="text-gray-500 mt-1">Relatório visual com gráficos e projeções</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="label-field">Missionario</label>
            <select
              value={selectedMissionarioId}
              onChange={e => setSelectedMissionarioId(e.target.value)}
              className="input-field"
            >
              <option value="">-- Selecione um missionário --</option>
              {missionarios.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome || m.usuario?.nome || m.id} - {CARGO_LABELS[m.cargo_ministerial] || m.cargo_ministerial}
                </option>
              ))}
            </select>
          </div>
          {reportReady && (
            <div className="flex gap-2 shrink-0">
              <button onClick={exportPDF} className="btn-primary inline-flex items-center gap-2">
                <FiDownload className="w-4 h-4" />
                Gerar PDF
              </button>
              <button onClick={exportExcel} className="btn-secondary inline-flex items-center gap-2">
                <FiFileText className="w-4 h-4" />
                Exportar Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generating indicator */}
      {generating && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500">Gerando relatorio...</span>
        </div>
      )}

      {/* Report Content */}
      {reportReady && missionario && (
        <div id="report-content" ref={reportRef} className="space-y-6">

          {/* a. Resumo do Campo */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <FiUsers className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{missionario.nome || missionario.usuario?.nome || 'Missionario'}</h2>
                <p className="text-sm text-gray-500">
                  {CARGO_LABELS[missionario.cargo_ministerial] || missionario.cargo_ministerial}
                  {missionario.associacao && ` - ${missionario.associacao.sigla}`}
                </p>
              </div>
            </div>

            {igrejasNomes.length > 0 && (
              <p className="text-sm text-gray-600 mb-4">
                <span className="font-medium">Igrejas:</span> {igrejasNomes.join(', ')}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{totalMembros}</p>
                <p className="text-sm text-green-600">Membros Ativos</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-700">{totalInteressados}</p>
                <p className="text-sm text-blue-600">Interessados</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-purple-700">{igrejasNomes.length}</p>
                <p className="text-sm text-purple-600">Igrejas</p>
              </div>
            </div>
          </div>

          {/* b. Indice Etario + c. Genero */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Age distribution */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiBarChart2 className="w-5 h-5 text-gray-400" />
                Indice Etario
              </h3>
              <div style={{ height: 280 }}>
                {ageDistribution.some(d => d.count > 0) ? (
                  <Bar data={ageChartData} options={chartOptions()} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Sem dados de idade disponveis
                  </div>
                )}
              </div>
            </div>

            {/* Gender distribution */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-gray-400" />
                Distribuicao por Genero
              </h3>
              <div style={{ height: 280 }} className="flex items-center justify-center">
                {pessoas.length > 0 ? (
                  <Doughnut data={genderData} options={{
                    ...chartOptions(),
                    cutout: '55%',
                  }} />
                ) : (
                  <div className="text-gray-400">Sem dados disponiveis</div>
                )}
              </div>
            </div>
          </div>

          {/* d. Tendencia Financeira */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiDollarSign className="w-5 h-5 text-gray-400" />
              Tendencia Financeira
            </h3>
            <div style={{ height: 300 }}>
              {financeiro.length > 0 ? (
                <Line data={financialChartData} options={chartOptions()} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Sem dados financeiros disponiveis
                </div>
              )}
            </div>
          </div>

          {/* e. Atividade Missionaria (Radar) */}
          {radarData && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FiBarChart2 className="w-5 h-5 text-gray-400" />
                Atividade Missionaria (Media Mensal)
              </h3>
              <div style={{ height: 350 }} className="flex items-center justify-center">
                <Radar data={radarData} options={{
                  ...chartOptions(),
                  scales: {
                    r: {
                      beginAtZero: true,
                      ticks: { display: true, stepSize: 5 },
                      pointLabels: { font: { size: 12 } },
                    },
                  },
                }} />
              </div>
            </div>
          )}

          {/* f. Classes Batismais */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Classes Batismais Ativas</h3>
            {classesBatismais.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">Nenhuma classe batismal ativa encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Instrutor</th>
                      <th className="px-4 py-3">Data Inicio</th>
                      <th className="px-4 py-3 text-center">Total Alunos</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classesBatismais.map(classe => (
                      <tr key={classe.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{classe.nome}</td>
                        <td className="px-4 py-3 text-gray-600">{classe.instrutor}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {classe.data_inicio ? new Date(classe.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-blue-600">
                          {classe.alunos?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Ativa
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* g. Projecao de Crescimento */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5 text-gray-400" />
                Projecao de Crescimento (Membros)
              </h3>
              {membershipProjection && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  membershipProjection.growthRate >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {membershipProjection.growthRate >= 0 ? (
                    <FiTrendingUp className="w-4 h-4" />
                  ) : (
                    <FiTrendingDown className="w-4 h-4" />
                  )}
                  {membershipProjection.growthRate >= 0 ? '+' : ''}{membershipProjection.growthRate}%
                </div>
              )}
            </div>
            <div style={{ height: 300 }}>
              {membershipProjection ? (
                <Line data={membershipProjection.data} options={chartOptions()} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Dados insuficientes para projecao (minimo 2 meses de historico)
                </div>
              )}
            </div>
          </div>

          {/* h. Projecao de Receita */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiDollarSign className="w-5 h-5 text-gray-400" />
                Projecao de Receita
              </h3>
              {revenueProjection && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                  revenueProjection.growthRate >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {revenueProjection.growthRate >= 0 ? (
                    <FiTrendingUp className="w-4 h-4" />
                  ) : (
                    <FiTrendingDown className="w-4 h-4" />
                  )}
                  {revenueProjection.growthRate >= 0 ? '+' : ''}{revenueProjection.growthRate}%
                </div>
              )}
            </div>
            <div style={{ height: 300 }}>
              {revenueProjection ? (
                <Line data={revenueProjection.data} options={chartOptions()} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Dados insuficientes para projecao (minimo 2 meses de historico)
                </div>
              )}
            </div>
          </div>

          {/* Report footer */}
          <div className="text-center text-xs text-gray-400 py-4">
            Relatorio gerado em {new Date().toLocaleDateString('pt-BR')} as {new Date().toLocaleTimeString('pt-BR')} - NNE Sistema
          </div>
        </div>
      )}

      {/* No missionary selected state */}
      {!generating && !reportReady && selectedMissionarioId === '' && (
        <div className="card text-center py-12">
          <FiFileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Selecione um missionário para gerar o relatório do campo.</p>
        </div>
      )}
    </div>
  )
}

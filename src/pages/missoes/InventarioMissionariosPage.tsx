import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  StatusMissionario,
  CargoMinisterial,
  InventarioCampo,
} from '@/types'
import {
  FiUsers,
  FiTrendingUp,
  FiHome,
  FiBarChart2,
  FiDownload,
  FiFilter,
  FiChevronUp,
  FiChevronDown,
  FiSearch,
  FiFileText,
  FiDollarSign,
} from 'react-icons/fi'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'

import { STATUS_COLORS } from '@/lib/missoes-constants'
import { useCargoLabels, useStatusLabels } from '@/hooks/useCargoLabels'

type SortField = 'nome' | 'cargo_ministerial' | 'total_igrejas' | 'total_membros' | 'dizimos_total' | 'kpi_score'
type SortDir = 'asc' | 'desc'

interface GrupoAssociacao {
  associacao_id: string
  associacao_nome: string
  associacao_sigla: string
  missionarios: InventarioCampo[]
  totais: {
    membros: number
    igrejas: number
    dizimos: number
    por_cargo: Record<string, number>
  }
}

export default function InventarioMissionariosPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { labels: CARGO_LABELS } = useCargoLabels()
  const { labels: STATUS_LABELS } = useStatusLabels()
  const tableRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [inventario, setInventario] = useState<InventarioCampo[]>([])
  const [associacoes, setAssociacoes] = useState<{ id: string; nome: string; sigla: string }[]>([])
  const [membrosPorIgreja, setMembrosPorIgreja] = useState<Record<string, number>>({})
  const [igrejaNames, setIgrejaNames] = useState<Record<string, string>>({})

  // Filters
  const [filtroAssociacao, setFiltroAssociacao] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroCargo, setFiltroCargo] = useState<string>('')
  const [busca, setBusca] = useState('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('nome')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Accordion state
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})

  const [searchParams] = useSearchParams()

  // Apply URL filters on mount
  useEffect(() => {
    const urlCargo = searchParams.get('cargo')
    const urlStatus = searchParams.get('status')
    const urlAssoc = searchParams.get('associacao')
    if (urlCargo) setFiltroCargo(urlCargo)
    if (urlStatus) setFiltroStatus(urlStatus)
    if (urlAssoc) setFiltroAssociacao(urlAssoc)
  }, [])

  function scopeFilter(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id)
    return query.eq('igreja_id', profile.igreja_id)
  }

  useEffect(() => {
    if (profile) {
      fetchAssociacoes()
      fetchInventario()
    }
  }, [profile])

  async function fetchAssociacoes() {
    let query = supabase.from('associacoes').select('id, nome, sigla').eq('ativo', true).order('nome')
    if (profile?.papel === 'admin_uniao') {
      query = query.eq('uniao_id', profile.uniao_id)
    } else if (profile?.papel === 'admin_associacao') {
      query = query.eq('id', profile.associacao_id)
    }
    const { data } = await query
    setAssociacoes(data || [])
  }

  async function fetchInventario() {
    setLoading(true)
    try {
      // 1. Fetch missionaries
      let mQuery = supabase
        .from('missionarios')
        .select('*, usuario:usuarios(nome, email), associacao:associacoes(nome, sigla)')
      mQuery = scopeFilter(mQuery)
      const { data: missionarios, error: mErr } = await mQuery
      if (mErr) throw mErr
      if (!missionarios || missionarios.length === 0) {
        setInventario([])
        setLoading(false)
        return
      }

      // 2. Collect all church IDs
      const allIgrejaIds: string[] = []
      for (const m of missionarios) {
        if (m.igrejas_responsavel?.length) {
          allIgrejaIds.push(...m.igrejas_responsavel)
        }
      }
      const uniqueIgrejaIds = [...new Set(allIgrejaIds)]

      // 3. Get member counts per church from igrejas table
      const memberCounts: Record<string, number> = {}
      const interestCounts: Record<string, number> = {}
      const nameMap: Record<string, string> = {}
      if (uniqueIgrejaIds.length > 0) {
        for (let i = 0; i < uniqueIgrejaIds.length; i += 50) {
          const batch = uniqueIgrejaIds.slice(i, i + 50)
          const { data: igrejasData } = await supabase
            .from('igrejas')
            .select('id, nome, membros_ativos, interessados')
            .in('id', batch)
          for (const ig of igrejasData || []) {
            memberCounts[ig.id] = ig.membros_ativos || 0
            interestCounts[ig.id] = ig.interessados || 0
            nameMap[ig.id] = ig.nome
          }
        }
      }

      // 4. Get reports for last 3 months for averages
      const now = new Date()
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2)
      const startMes = threeMonthsAgo.getMonth() + 1
      const startAno = threeMonthsAgo.getFullYear()

      const reportsByChurch: Record<string, { estudos: number; visitas: number; trazidas: number; horas: number; count: number }> = {}
      if (uniqueIgrejaIds.length > 0) {
        for (let i = 0; i < uniqueIgrejaIds.length; i += 20) {
          const batch = uniqueIgrejaIds.slice(i, i + 20)
          let rQuery = supabase
            .from('relatorios_missionarios')
            .select('igreja_id, estudos_biblicos, visitas_missionarias, pessoas_trazidas, horas_trabalho')
            .in('igreja_id', batch)
          if (startAno === now.getFullYear()) {
            rQuery = rQuery.eq('ano', now.getFullYear()).gte('mes', startMes).lte('mes', now.getMonth() + 1)
          } else {
            rQuery = rQuery.or(
              `and(ano.eq.${startAno},mes.gte.${startMes}),and(ano.eq.${now.getFullYear()},mes.lte.${now.getMonth() + 1})`
            )
          }
          const { data: reports } = await rQuery
          for (const r of reports || []) {
            if (!reportsByChurch[r.igreja_id]) {
              reportsByChurch[r.igreja_id] = { estudos: 0, visitas: 0, trazidas: 0, horas: 0, count: 0 }
            }
            reportsByChurch[r.igreja_id].estudos += r.estudos_biblicos || 0
            reportsByChurch[r.igreja_id].visitas += r.visitas_missionarias || 0
            reportsByChurch[r.igreja_id].trazidas += r.pessoas_trazidas || 0
            reportsByChurch[r.igreja_id].horas += r.horas_trabalho || 0
            reportsByChurch[r.igreja_id].count += 1
          }
        }
      }

      // 5. Get financial data
      const finByChurch: Record<string, { receita: number; dizimos: number }> = {}
      if (uniqueIgrejaIds.length > 0) {
        for (let i = 0; i < uniqueIgrejaIds.length; i += 20) {
          const batch = uniqueIgrejaIds.slice(i, i + 20)
          const fQuery = supabase
            .from('dados_financeiros')
            .select('igreja_id, receita_dizimos, receita_oferta_regular, receita_oferta_especial, dizimo, primicias, receita_primicias')
            .in('igreja_id', batch)
            .eq('ano', now.getFullYear())
          const { data: fins } = await fQuery
          for (const f of fins || []) {
            if (!finByChurch[f.igreja_id]) {
              finByChurch[f.igreja_id] = { receita: 0, dizimos: 0 }
            }
            // Sum both new fields (receita_*) and legacy fields (dizimo, primicias)
            const diz = (f.receita_dizimos || 0) + (f.dizimo || 0)
            const oferta = (f.receita_oferta_regular || 0) + (f.receita_oferta_especial || 0) + (f.primicias || 0) + (f.receita_primicias || 0)
            finByChurch[f.igreja_id].dizimos += diz
            finByChurch[f.igreja_id].receita += diz + oferta
          }
        }
      }

      // 6. Get baptismal classes
      const classesByChurch: Record<string, { ativas: number; alunos: number }> = {}
      if (uniqueIgrejaIds.length > 0) {
        for (let i = 0; i < uniqueIgrejaIds.length; i += 20) {
          const batch = uniqueIgrejaIds.slice(i, i + 20)
          const { data: classes } = await supabase
            .from('classes_batismais')
            .select('igreja_id, status, alunos')
            .in('igreja_id', batch)
            .eq('status', 'ativa')
          for (const c of classes || []) {
            if (!classesByChurch[c.igreja_id]) {
              classesByChurch[c.igreja_id] = { ativas: 0, alunos: 0 }
            }
            classesByChurch[c.igreja_id].ativas += 1
            classesByChurch[c.igreja_id].alunos += (c.alunos as string[])?.length || 0
          }
        }
      }

      // 7. Build inventario
      const result: InventarioCampo[] = missionarios.map((m: any) => {
        const igrejaIds: string[] = m.igrejas_responsavel || []
        let totalMembros = 0
        let totalInteressados = 0
        let totalEstudos = 0
        let totalVisitas = 0
        let totalTrazidas = 0
        let totalHoras = 0
        let receitaTotal = 0
        let dizimosTotal = 0
        let classesAtivas = 0
        let alunosClasse = 0

        for (const igId of igrejaIds) {
          totalMembros += memberCounts[igId] || 0
          totalInteressados += interestCounts[igId] || 0
          const rep = reportsByChurch[igId]
          if (rep) {
            totalEstudos += rep.estudos
            totalVisitas += rep.visitas
            totalTrazidas += rep.trazidas
            totalHoras += rep.horas
          }
          const fin = finByChurch[igId]
          if (fin) {
            receitaTotal += fin.receita
            dizimosTotal += fin.dizimos
          }
          const cls = classesByChurch[igId]
          if (cls) {
            classesAtivas += cls.ativas
            alunosClasse += cls.alunos
          }
        }

        const months = 3
        const mediaEstudos = months > 0 ? Math.round(totalEstudos / months) : 0
        const mediaVisitas = months > 0 ? Math.round(totalVisitas / months) : 0
        const mediaTrazidas = months > 0 ? Math.round(totalTrazidas / months) : 0
        const mediaHoras = months > 0 ? Math.round(totalHoras / months) : 0

        const kpi = Math.min(100, Math.round(
          (mediaEstudos * 2.5) + (mediaVisitas * 2) + (mediaTrazidas * 5) +
          (classesAtivas * 5) + (mediaHoras > 20 ? 10 : mediaHoras * 0.5)
        ))

        const assoc = m.associacao as any
        const usuario = m.usuario as any

        return {
          missionario_id: m.id,
          nome: m.nome || usuario?.nome || 'Sem nome',
          cargo_ministerial: m.cargo_ministerial,
          status: m.status,
          associacao_id: m.associacao_id,
          associacao_nome: assoc?.nome || null,
          igrejas_ids: igrejaIds,
          total_igrejas: igrejaIds.length,
          total_membros: totalMembros,
          total_interessados: totalInteressados,
          media_estudos: mediaEstudos,
          media_visitas: mediaVisitas,
          media_pessoas_trazidas: mediaTrazidas,
          media_horas: mediaHoras,
          receita_total: receitaTotal,
          dizimos_total: dizimosTotal,
          classes_batismais_ativas: classesAtivas,
          alunos_em_classe: alunosClasse,
          kpi_score: kpi,
        }
      })

      setInventario(result)
      setMembrosPorIgreja(memberCounts)
      setIgrejaNames(nameMap)

      // Expand all association groups by default
      const expand: Record<string, boolean> = {}
      for (const r of result) {
        const key = r.associacao_id || 'sem-associacao'
        expand[key] = true
      }
      setExpandidos(expand)
    } catch (err) {
      console.error('Erro ao montar inventario:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtered data
  const filteredData = useMemo(() => {
    let data = [...inventario]
    if (filtroAssociacao) data = data.filter(d => d.associacao_id === filtroAssociacao)
    if (filtroStatus) data = data.filter(d => d.status === filtroStatus)
    if (filtroCargo) data = data.filter(d => d.cargo_ministerial === filtroCargo)
    if (busca.trim()) {
      const term = busca.toLowerCase()
      data = data.filter(d =>
        d.nome.toLowerCase().includes(term) ||
        d.associacao_nome?.toLowerCase().includes(term) ||
        (d.igrejas_ids || []).some(igId => {
          const ig = igrejaNames[igId]
          return ig && ig.toLowerCase().includes(term)
        })
      )
    }
    data.sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA == null) valA = ''
      if (valB == null) valB = ''
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return data
  }, [inventario, filtroAssociacao, filtroStatus, filtroCargo, busca, sortField, sortDir, igrejaNames])

  // Group by association
  const grupos = useMemo<GrupoAssociacao[]>(() => {
    const mapa = new Map<string, GrupoAssociacao & { _igrejaIds: Set<string> }>()
    for (const d of filteredData) {
      const aId = d.associacao_id || 'sem-associacao'
      const aNome = d.associacao_nome || 'Sem Associação'
      if (!mapa.has(aId)) {
        mapa.set(aId, {
          associacao_id: aId,
          associacao_nome: aNome,
          associacao_sigla: '',
          missionarios: [],
          totais: { membros: 0, igrejas: 0, dizimos: 0, por_cargo: {} },
          _igrejaIds: new Set<string>(),
        })
      }
      const g = mapa.get(aId)!
      g.missionarios.push(d)
      // Collect unique church IDs (don't sum members yet - avoids double-counting)
      for (const igId of d.igrejas_ids || []) g._igrejaIds.add(igId)
      g.totais.dizimos += d.dizimos_total
      const cargo = d.cargo_ministerial || 'sem_cargo'
      g.totais.por_cargo[cargo] = (g.totais.por_cargo[cargo] || 0) + 1
    }
    // Fill sigla, deduplicated igrejas count, and CORRECT member totals
    for (const [, g] of mapa) {
      const found = associacoes.find(a => a.id === g.associacao_id)
      if (found) g.associacao_sigla = found.sigla
      g.totais.igrejas = g._igrejaIds.size
      // Sum members only once per unique church
      g.totais.membros = 0
      for (const igId of g._igrejaIds) {
        g.totais.membros += membrosPorIgreja[igId] || 0
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.associacao_nome.localeCompare(b.associacao_nome))
  }, [filteredData, associacoes, membrosPorIgreja])

  // Summary stats (deduplicado: igrejas compartilhadas não contam 2x)
  const summary = useMemo(() => {
    const uniqueIgrejas = new Set<string>()
    for (const d of filteredData) {
      for (const igId of d.igrejas_ids || []) uniqueIgrejas.add(igId)
    }
    // Sum members only once per unique church (fixes double-counting)
    let totalMembrosDedup = 0
    for (const igId of uniqueIgrejas) {
      totalMembrosDedup += membrosPorIgreja[igId] || 0
    }
    return {
      total: filteredData.length,
      mediaKPI: filteredData.length > 0
        ? Math.round(filteredData.reduce((s, d) => s + d.kpi_score, 0) / filteredData.length)
        : 0,
      totalIgrejas: uniqueIgrejas.size,
      totalMembros: totalMembrosDedup,
      totalDizimos: filteredData.reduce((s, d) => s + d.dizimos_total, 0),
    }
  }, [filteredData, membrosPorIgreja])

  const cargoDistribution = useMemo(() => {
    const dist: Record<string, number> = {}
    for (const d of inventario) {
      if (d.status === 'ativo') {
        dist[d.cargo_ministerial] = (dist[d.cargo_ministerial] || 0) + 1
      }
    }
    return Object.entries(dist)
      .map(([cargo, count]) => ({ cargo: cargo as CargoMinisterial, count }))
      .sort((a, b) => b.count - a.count)
  }, [inventario])

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <FiChevronDown className="inline w-3 h-3 ml-1 opacity-30" />
    return sortDir === 'asc'
      ? <FiChevronUp className="inline w-3 h-3 ml-1 text-green-600" />
      : <FiChevronDown className="inline w-3 h-3 ml-1 text-green-600" />
  }

  function kpiColor(score: number): string {
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 50) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  function toggleGrupo(id: string) {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function exportPDF() {
    if (!tableRef.current) return
    try {
      const canvas = await html2canvas(tableRef.current, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('l', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight)
      pdf.save(`ficha-campo-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
    }
  }

  function exportExcel() {
    const rows = filteredData.map(d => ({
      Associação: d.associacao_nome || '-',
      Nome: d.nome,
      Cargo: CARGO_LABELS[d.cargo_ministerial] || d.cargo_ministerial,
      Status: STATUS_LABELS[d.status as StatusMissionario] || d.status,
      Igrejas: d.total_igrejas,
      Membros: d.total_membros,
      Interessados: d.total_interessados,
      'Dízimos (R$)': d.dizimos_total.toFixed(2),
      'Classes Bíblicas': d.classes_batismais_ativas,
      'KPI Score': d.kpi_score,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ficha de Campo')
    XLSX.writeFile(wb, `ficha-campo-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const cargoOptions = Object.entries(CARGO_LABELS)
  const statusOptions = Object.entries(STATUS_LABELS)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ficha de Campo</h1>
          <p className="text-gray-500 mt-1">Gestão do corpo missionário por associação</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <FiDownload className="w-4 h-4" /> PDF
          </button>
          <button onClick={exportExcel} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <FiDownload className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Association Tabs (SAS-style) */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setFiltroAssociacao('')
            window.history.replaceState({}, '', window.location.pathname)
          }}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            !filtroAssociacao ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-green-50'
          }`}
        >
          Todas ({inventario.length})
        </button>
        {associacoes.map(a => {
          const count = inventario.filter(d => d.associacao_id === a.id).length
          return (
            <button
              key={a.id}
              onClick={() => {
                setFiltroAssociacao(a.id)
                window.history.replaceState({}, '', `${window.location.pathname}?associacao=${a.id}`)
              }}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filtroAssociacao === a.id ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-green-50'
              }`}
            >
              {a.sigla} ({count})
            </button>
          )
        })}
      </div>

      {/* Summary for selected association */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-100">
              <FiUsers className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{summary.total}</p>
              <p className="text-xs text-gray-500">Obreiros</p>
            </div>
          </div>
        </div>
        <div className="card py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100">
              <FiHome className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{summary.totalIgrejas}</p>
              <p className="text-xs text-gray-500">Igrejas</p>
            </div>
          </div>
        </div>
        <div className="card py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100">
              <FiTrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{summary.totalMembros.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Membros</p>
            </div>
          </div>
        </div>
        <div className="card py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100">
              <FiDollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">
                R$ {summary.totalDizimos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">Dízimos {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filters (SAS-style inline) */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field pl-10"
              placeholder="Buscar missionário ou igreja..."
            />
          </div>
          <select value={filtroCargo} onChange={(e) => setFiltroCargo(e.target.value)} className="input-field sm:w-48">
            <option value="">Todos os cargos</option>
            {cargoOptions.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="input-field sm:w-40">
            <option value="">Todos status</option>
            {statusOptions.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500">Carregando ficha de campo...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="card text-center py-12">
          <FiUsers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum obreiro encontrado</p>
        </div>
      ) : (
        <div ref={tableRef} className="space-y-3">
          {/* Card list of missionaries */}
          {filteredData.map((d) => (
            <div
              key={d.missionario_id}
              className="bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(`/missoes/missionario/${d.missionario_id}${filtroAssociacao ? `?from_assoc=${filtroAssociacao}` : ''}`)}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg shrink-0">
                  {d.nome.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{d.nome}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[d.status as StatusMissionario] || d.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {CARGO_LABELS[d.cargo_ministerial] || d.cargo_ministerial}
                    {d.associacao_nome && !filtroAssociacao && (
                      <span className="text-gray-400"> · {d.associacao_nome}</span>
                    )}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
                  <div className="text-center">
                    <p className="font-bold text-gray-800">{d.total_igrejas}</p>
                    <p className="text-xs text-gray-400">Igrejas</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-800">{d.total_membros}</p>
                    <p className="text-xs text-gray-400">Membros</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-emerald-700">
                      R$ {d.dizimos_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-400">Dízimos</p>
                  </div>
                  <div className="text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${kpiColor(d.kpi_score)}`}>
                      {d.kpi_score}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">KPI</p>
                  </div>
                </div>

                {/* Mobile stats */}
                <div className="sm:hidden text-right shrink-0">
                  <p className="font-bold text-emerald-700 text-sm">
                    R$ {d.dizimos_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-400">{d.total_membros} membros</p>
                </div>

                <FiChevronDown className="w-4 h-4 text-gray-300 shrink-0 rotate-[-90deg]" />
              </div>
            </div>
          ))}

          {/* Association totals footer */}
          {filtroAssociacao && grupos.length > 0 && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                {Object.entries(grupos[0].totais.por_cargo)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cargo, qtd]) => (
                    <span key={cargo} className="text-gray-600">
                      <span className="font-semibold">{CARGO_LABELS[cargo as CargoMinisterial] || cargo}:</span> {qtd}
                    </span>
                  ))}
                <span className="text-gray-500 ml-auto">
                  {grupos[0].missionarios.length} obreiros · {grupos[0].totais.igrejas} igrejas · {grupos[0].totais.membros} membros
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState, useRef, useMemo } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
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

import { MISSOES_TABS, CARGO_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/missoes-constants'

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
  const tableRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [inventario, setInventario] = useState<InventarioCampo[]>([])
  const [associacoes, setAssociacoes] = useState<{ id: string; nome: string; sigla: string }[]>([])

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
    if (urlCargo) setFiltroCargo(urlCargo)
    if (urlStatus) setFiltroStatus(urlStatus)
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

      // 3. Get member counts per church
      const memberCounts: Record<string, number> = {}
      const interestCounts: Record<string, number> = {}
      if (uniqueIgrejaIds.length > 0) {
        for (let i = 0; i < uniqueIgrejaIds.length; i += 20) {
          const batch = uniqueIgrejaIds.slice(i, i + 20)
          const { data: membros } = await supabase
            .from('pessoas')
            .select('igreja_id')
            .in('igreja_id', batch)
            .eq('situacao', 'ativo')
            .eq('tipo', 'membro')
          for (const m of membros || []) {
            if (m.igreja_id) {
              memberCounts[m.igreja_id] = (memberCounts[m.igreja_id] || 0) + 1
            }
          }

          const { data: interessados } = await supabase
            .from('pessoas')
            .select('igreja_id')
            .in('igreja_id', batch)
            .eq('situacao', 'ativo')
            .eq('tipo', 'interessado')
          for (const inter of interessados || []) {
            if (inter.igreja_id) {
              interestCounts[inter.igreja_id] = (interestCounts[inter.igreja_id] || 0) + 1
            }
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
            .select('igreja_id, receita_dizimos, receita_oferta_regular, receita_oferta_especial')
            .in('igreja_id', batch)
            .eq('ano', now.getFullYear())
          const { data: fins } = await fQuery
          for (const f of fins || []) {
            if (!finByChurch[f.igreja_id]) {
              finByChurch[f.igreja_id] = { receita: 0, dizimos: 0 }
            }
            finByChurch[f.igreja_id].dizimos += f.receita_dizimos || 0
            finByChurch[f.igreja_id].receita += (f.receita_dizimos || 0) + (f.receita_oferta_regular || 0) + (f.receita_oferta_especial || 0)
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
      data = data.filter(d => d.nome.toLowerCase().includes(term))
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
  }, [inventario, filtroAssociacao, filtroStatus, filtroCargo, busca, sortField, sortDir])

  // Group by association
  const grupos = useMemo<GrupoAssociacao[]>(() => {
    const mapa = new Map<string, GrupoAssociacao>()
    for (const d of filteredData) {
      const aId = d.associacao_id || 'sem-associacao'
      const aNome = d.associacao_nome || 'Sem Associacao'
      if (!mapa.has(aId)) {
        mapa.set(aId, {
          associacao_id: aId,
          associacao_nome: aNome,
          associacao_sigla: '',
          missionarios: [],
          totais: { membros: 0, igrejas: 0, dizimos: 0, por_cargo: {} },
        })
      }
      const g = mapa.get(aId)!
      g.missionarios.push(d)
      g.totais.membros += d.total_membros
      g.totais.igrejas += d.total_igrejas
      g.totais.dizimos += d.dizimos_total
      const cargo = d.cargo_ministerial || 'sem_cargo'
      g.totais.por_cargo[cargo] = (g.totais.por_cargo[cargo] || 0) + 1
    }
    // Fill sigla from associacoes list
    for (const [aId, g] of mapa) {
      const found = associacoes.find(a => a.id === aId)
      if (found) g.associacao_sigla = found.sigla
    }
    return Array.from(mapa.values()).sort((a, b) => a.associacao_nome.localeCompare(b.associacao_nome))
  }, [filteredData, associacoes])

  // Summary stats
  const summary = useMemo(() => ({
    total: filteredData.length,
    mediaKPI: filteredData.length > 0
      ? Math.round(filteredData.reduce((s, d) => s + d.kpi_score, 0) / filteredData.length)
      : 0,
    totalIgrejas: filteredData.reduce((s, d) => s + d.total_igrejas, 0),
    totalMembros: filteredData.reduce((s, d) => s + d.total_membros, 0),
    totalDizimos: filteredData.reduce((s, d) => s + d.dizimos_total, 0),
  }), [filteredData])

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
      Associacao: d.associacao_nome || '-',
      Nome: d.nome,
      Cargo: CARGO_LABELS[d.cargo_ministerial] || d.cargo_ministerial,
      Status: STATUS_LABELS[d.status as StatusMissionario] || d.status,
      Igrejas: d.total_igrejas,
      Membros: d.total_membros,
      Interessados: d.total_interessados,
      'Dizimos (R$)': d.dizimos_total.toFixed(2),
      'Classes Batismais': d.classes_batismais_ativas,
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
      {/* Sub-nav tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        {MISSOES_TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/missoes'}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors ${
                isActive
                  ? 'text-green-700 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ficha de Campo - Inventario</h1>
          <p className="text-gray-500 mt-1">
            Visao consolidada da Uniao Norte Nordeste · Agrupado por Associacao
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <FiDownload className="w-4 h-4" />
            PDF
          </button>
          <button onClick={exportExcel} className="btn-secondary inline-flex items-center gap-2 text-sm">
            <FiDownload className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <FiUsers className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{summary.total}</p>
              <p className="text-xs text-gray-500">Total Obreiros</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-100">
              <FiHome className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{summary.totalIgrejas}</p>
              <p className="text-xs text-gray-500">Igrejas / Campos</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <FiTrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{summary.totalMembros.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Membros</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <FiDollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {summary.totalDizimos > 0
                  ? `R$ ${(summary.totalDizimos / 1000).toFixed(0)}k`
                  : 'R$ 0'}
              </p>
              <p className="text-xs text-gray-500">Dizimos ({new Date().getFullYear()})</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <FiBarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{grupos.length}</p>
              <p className="text-xs text-gray-500">Associacoes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cargo Distribution */}
      {cargoDistribution.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {cargoDistribution.map(({ cargo, count }) => (
            <button
              key={cargo}
              onClick={() => setFiltroCargo(filtroCargo === cargo ? '' : cargo)}
              className={`p-3 rounded-xl text-center transition-all cursor-pointer border ${
                filtroCargo === cargo
                  ? 'bg-green-50 border-green-300 ring-2 ring-green-200'
                  : 'bg-white border-gray-200 hover:border-green-200 hover:bg-green-50/50'
              }`}
            >
              <p className="text-2xl font-bold text-gray-800">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{CARGO_LABELS[cargo] || cargo}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="label-field">
              <FiSearch className="inline w-3.5 h-3.5 mr-1" />
              Buscar
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-field"
              placeholder="Nome do obreiro..."
            />
          </div>
          <div>
            <label className="label-field">
              <FiFilter className="inline w-3.5 h-3.5 mr-1" />
              Associacao
            </label>
            <select
              value={filtroAssociacao}
              onChange={(e) => setFiltroAssociacao(e.target.value)}
              className="input-field"
            >
              <option value="">Todas</option>
              {associacoes.map(a => (
                <option key={a.id} value={a.id}>{a.sigla} - {a.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="input-field"
            >
              <option value="">Todos</option>
              {statusOptions.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Cargo</label>
            <select
              value={filtroCargo}
              onChange={(e) => setFiltroCargo(e.target.value)}
              className="input-field"
            >
              <option value="">Todos</option>
              {cargoOptions.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grouped Listing by Association */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <span className="ml-3 text-gray-500">Carregando inventario...</span>
        </div>
      ) : grupos.length === 0 ? (
        <div className="card text-center py-12">
          <FiUsers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum obreiro encontrado com os filtros selecionados</p>
        </div>
      ) : (
        <div ref={tableRef} className="space-y-4">
          {grupos.map(grupo => {
            const isExpanded = expandidos[grupo.associacao_id] !== false
            return (
              <div key={grupo.associacao_id} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                {/* Association Header (accordion toggle) */}
                <button
                  onClick={() => toggleGrupo(grupo.associacao_id)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-700 to-green-600 text-white hover:from-green-800 hover:to-green-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FiHome size={18} />
                    <span className="font-semibold text-lg">{grupo.associacao_nome}</span>
                    {grupo.associacao_sigla && (
                      <span className="text-green-200 text-sm">({grupo.associacao_sigla})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-green-100">
                      {grupo.missionarios.length} obreiro{grupo.missionarios.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-green-100">
                      {grupo.totais.membros} membros
                    </span>
                    <span className="text-green-100">
                      R$ {grupo.totais.dizimos.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                    {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                  </div>
                </button>

                {isExpanded && (
                  <div>
                    {/* Table of missionaries in this association */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 w-10">#</th>
                            <th
                              className="px-4 py-3 cursor-pointer select-none"
                              onClick={() => handleSort('nome')}
                            >
                              Nome <SortIcon field="nome" />
                            </th>
                            <th
                              className="px-4 py-3 cursor-pointer select-none"
                              onClick={() => handleSort('cargo_ministerial')}
                            >
                              Cargo <SortIcon field="cargo_ministerial" />
                            </th>
                            <th
                              className="px-4 py-3 text-center cursor-pointer select-none"
                              onClick={() => handleSort('total_igrejas')}
                            >
                              Igrejas <SortIcon field="total_igrejas" />
                            </th>
                            <th
                              className="px-4 py-3 text-center cursor-pointer select-none"
                              onClick={() => handleSort('total_membros')}
                            >
                              Membros <SortIcon field="total_membros" />
                            </th>
                            <th
                              className="px-4 py-3 text-right cursor-pointer select-none"
                              onClick={() => handleSort('dizimos_total')}
                            >
                              Dizimos <SortIcon field="dizimos_total" />
                            </th>
                            <th
                              className="px-4 py-3 text-center cursor-pointer select-none"
                              onClick={() => handleSort('kpi_score')}
                            >
                              KPI <SortIcon field="kpi_score" />
                            </th>
                            <th className="px-4 py-3 text-gray-500 font-medium">Status</th>
                            <th className="px-4 py-3 text-gray-500 font-medium">Acao</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {grupo.missionarios.map((d, idx) => (
                            <tr
                              key={d.missionario_id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-800">{d.nome}</div>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-xs">
                                {CARGO_LABELS[d.cargo_ministerial] || d.cargo_ministerial}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-700">{d.total_igrejas}</td>
                              <td className="px-4 py-3 text-center font-semibold text-gray-900">{d.total_membros}</td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                R$ {d.dizimos_total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${kpiColor(d.kpi_score)}`}>
                                  {d.kpi_score}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {STATUS_LABELS[d.status as StatusMissionario] || d.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => navigate(`/missoes/missionario/${d.missionario_id}`)}
                                  className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium"
                                >
                                  <FiFileText size={14} /> Ver Ficha
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Association footer: cargo summary */}
                    <div className="px-6 py-3 bg-gray-50 border-t flex flex-wrap gap-4">
                      {Object.entries(grupo.totais.por_cargo)
                        .sort(([, a], [, b]) => b - a)
                        .map(([cargo, qtd]) => (
                          <span key={cargo} className="text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">
                              {CARGO_LABELS[cargo as CargoMinisterial] || cargo}:
                            </span>{' '}
                            {qtd}
                          </span>
                        ))}
                      <span className="text-xs text-gray-400 ml-auto">
                        Total: {grupo.missionarios.length} obreiro{grupo.missionarios.length !== 1 ? 's' : ''} ·{' '}
                        {grupo.totais.igrejas} igreja{grupo.totais.igrejas !== 1 ? 's' : ''} ·{' '}
                        {grupo.totais.membros} membros
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

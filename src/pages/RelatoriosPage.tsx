import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Associacao, Igreja } from '@/types'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import {
  FiFileText,
  FiDownload,
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiRefreshCw,
} from 'react-icons/fi'

// ---- Types ----

type TipoRelatorio = 'membros' | 'financeiro' | 'contagem' | 'missoes' | 'transferencias'

interface ReportTypeOption {
  key: TipoRelatorio
  label: string
  icon: React.ElementType
  color: string
}

const REPORT_TYPES: ReportTypeOption[] = [
  { key: 'membros', label: 'Membros', icon: FiUsers, color: 'bg-blue-500' },
  { key: 'financeiro', label: 'Financeiro', icon: FiDollarSign, color: 'bg-emerald-500' },
  { key: 'contagem', label: 'Contagem Mensal', icon: FiTrendingUp, color: 'bg-purple-500' },
  { key: 'missoes', label: 'Missões', icon: FiRefreshCw, color: 'bg-amber-500' },
  { key: 'transferencias', label: 'Transferências', icon: FiFileText, color: 'bg-rose-500' },
]

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y)
  }
  return years
}

// ---- Component ----

export default function RelatoriosPage() {
  const { profile } = useAuth()
  const reportRef = useRef<HTMLDivElement>(null)

  // Filters
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('membros')
  const [mesInicio, setMesInicio] = useState<number>(1)
  const [anoInicio, setAnoInicio] = useState<number>(new Date().getFullYear())
  const [mesFim, setMesFim] = useState<number>(new Date().getMonth() + 1)
  const [anoFim, setAnoFim] = useState<number>(new Date().getFullYear())
  const [filterAssociacaoId, setFilterAssociacaoId] = useState<string>('')
  const [filterIgrejaId, setFilterIgrejaId] = useState<string>('')

  // Dropdown data
  const [associacoes, setAssociacoes] = useState<Associacao[]>([])
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [igrejasFiltered, setIgrejasFiltered] = useState<Igreja[]>([])

  // Report data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [exporting, setExporting] = useState(false)

  const yearOptions = buildYearOptions()

  // ---- RBAC helper ----

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyScope(query: any, table: string) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id!)
    if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id!)
    if (table === 'transferencias') return query
    return query.eq('igreja_id', profile.igreja_id!)
  }

  // ---- Load dropdown data ----

  useEffect(() => {
    if (profile) {
      fetchAssociacoes()
      fetchIgrejas()
    }
  }, [profile])

  // Cascade igrejas when associacao filter changes
  useEffect(() => {
    if (filterAssociacaoId) {
      setIgrejasFiltered(igrejas.filter((i) => i.associacao_id === filterAssociacaoId))
    } else {
      setIgrejasFiltered(igrejas)
    }
    setFilterIgrejaId('')
  }, [filterAssociacaoId, igrejas])

  async function fetchAssociacoes() {
    let query = supabase.from('associacoes').select('*').eq('ativo', true).order('nome')
    if (profile!.papel === 'admin_uniao') {
      query = query.eq('uniao_id', profile!.uniao_id!)
    } else if (profile!.papel === 'admin_associacao') {
      query = query.eq('id', profile!.associacao_id!)
    } else if (profile!.papel !== 'admin') {
      query = query.eq('id', profile!.associacao_id!)
    }
    const { data } = await query
    setAssociacoes((data as Associacao[]) || [])
  }

  async function fetchIgrejas() {
    let query = supabase.from('igrejas').select('*').eq('ativo', true).order('nome')
    if (profile!.papel === 'admin_uniao') {
      query = query.eq('uniao_id', profile!.uniao_id!)
    } else if (profile!.papel === 'admin_associacao') {
      query = query.eq('associacao_id', profile!.associacao_id!)
    } else if (profile!.papel !== 'admin') {
      query = query.eq('id', profile!.igreja_id!)
    }
    const { data } = await query
    setIgrejas((data as Igreja[]) || [])
  }

  // ---- Generate report ----

  async function handleGenerate() {
    setLoading(true)
    setGenerated(false)
    setReportData([])

    try {
      switch (tipoRelatorio) {
        case 'membros':
          await fetchMembrosReport()
          break
        case 'financeiro':
          await fetchFinanceiroReport()
          break
        case 'contagem':
          await fetchContagemReport()
          break
        case 'missoes':
          await fetchMissoesReport()
          break
        case 'transferencias':
          await fetchTransferenciasReport()
          break
      }
      setGenerated(true)
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
    } finally {
      setLoading(false)
    }
  }

  // ---- Fetch functions per report type ----

  async function fetchMembrosReport() {
    let query = supabase
      .from('pessoas')
      .select('id, nome, sexo, data_nascimento, situacao, tipo, data_batismo, igreja_id, endereco_cidade, endereco_estado, igreja:igrejas(nome)')
      .order('nome')

    query = applyScope(query, 'pessoas')

    if (filterAssociacaoId) query = query.eq('associacao_id', filterAssociacaoId)
    if (filterIgrejaId) query = query.eq('igreja_id', filterIgrejaId)

    const { data, error } = await query
    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data || []).map((p: any) => ({
      Nome: p.nome,
      Sexo: p.sexo === 'masculino' ? 'M' : p.sexo === 'feminino' ? 'F' : '-',
      'Data Nasc.': formatDate(p.data_nascimento),
      Situação: p.situacao,
      Tipo: p.tipo,
      'Data Batismo': formatDate(p.data_batismo),
      Igreja: p.igreja?.nome || '-',
      Cidade: p.endereco_cidade || '-',
      Estado: p.endereco_estado || '-',
    }))
    setReportData(rows)
  }

  async function fetchFinanceiroReport() {
    let query = supabase
      .from('dados_financeiros')
      .select('*, igreja:igrejas(nome)')
      .order('ano', { ascending: true })
      .order('mes', { ascending: true })

    query = applyScope(query, 'dados_financeiros')

    // Period filter
    query = query.or(
      `and(ano.gt.${anoInicio},ano.lt.${anoFim}),` +
      `and(ano.eq.${anoInicio},mes.gte.${mesInicio}),` +
      `and(ano.eq.${anoFim},mes.lte.${mesFim})`
    )

    if (filterAssociacaoId) query = query.eq('associacao_id', filterAssociacaoId)
    if (filterIgrejaId) query = query.eq('igreja_id', filterIgrejaId)

    const { data, error } = await query
    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data || []).map((r: any) => {
      const totalReceita =
        (r.receita_dizimos || 0) +
        (r.dizimo || 0) +
        (r.receita_oferta_regular || 0) +
        (r.primicias || 0) +
        (r.receita_oferta_especial || 0) +
        (r.receita_oferta_missoes || 0) +
        (r.receita_oferta_agradecimento || 0) +
        (r.receita_oferta_es || 0) +
        (r.receita_doacoes || 0) +
        (r.receita_fundo_assistencial || 0) +
        (r.receita_proventos_imoveis || 0) +
        (r.receita_outras || 0)

      const totalDespesa =
        (r.despesa_salarios || 0) +
        (r.despesa_manutencao || 0) +
        (r.despesa_agua || 0) +
        (r.despesa_energia || 0) +
        (r.despesa_internet || 0) +
        (r.despesa_material_es || 0) +
        (r.despesa_outras || 0)

      return {
        Igreja: r.igreja?.nome || '-',
        Mes: r.mes,
        Ano: r.ano,
        'Total Receita': BRL(totalReceita),
        'Total Despesa': BRL(totalDespesa),
        Saldo: BRL(totalReceita - totalDespesa),
        _totalReceita: totalReceita,
        _totalDespesa: totalDespesa,
        _saldo: totalReceita - totalDespesa,
      }
    })
    setReportData(rows)
  }

  async function fetchContagemReport() {
    let query = supabase
      .from('contagem_mensal')
      .select('*, igreja:igrejas(nome)')
      .order('ano', { ascending: true })
      .order('mes', { ascending: true })

    query = applyScope(query, 'contagem_mensal')

    query = query.or(
      `and(ano.gt.${anoInicio},ano.lt.${anoFim}),` +
      `and(ano.eq.${anoInicio},mes.gte.${mesInicio}),` +
      `and(ano.eq.${anoFim},mes.lte.${mesFim})`
    )

    if (filterIgrejaId) query = query.eq('igreja_id', filterIgrejaId)

    const { data, error } = await query
    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data || []).map((r: any) => ({
      Igreja: r.igreja?.nome || '-',
      Mes: r.mes,
      Ano: r.ano,
      'Total Membros': r.total_membros,
      Batismos: r.batismos,
      'Transf. Entrada': r.transferencias_entrada,
      'Transf. Saida': r.transferencias_saida,
    }))
    setReportData(rows)
  }

  async function fetchMissoesReport() {
    let query = supabase
      .from('relatorio_missionario')
      .select('*, pessoa:pessoas(nome), igreja:igrejas(nome)')
      .order('ano', { ascending: true })
      .order('mes', { ascending: true })

    query = applyScope(query, 'relatorio_missionario')

    query = query.or(
      `and(ano.gt.${anoInicio},ano.lt.${anoFim}),` +
      `and(ano.eq.${anoInicio},mes.gte.${mesInicio}),` +
      `and(ano.eq.${anoFim},mes.lte.${mesFim})`
    )

    if (filterIgrejaId) query = query.eq('igreja_id', filterIgrejaId)

    const { data, error } = await query
    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data || []).map((r: any) => ({
      Pessoa: r.pessoa?.nome || '-',
      Igreja: r.igreja?.nome || '-',
      Mes: r.mes,
      Ano: r.ano,
      'Estudos Bíblicos': r.estudos_biblicos,
      'Visitas Missionárias': r.visitas_missionarias,
      'Lit. Distribuída': r.literatura_distribuida,
    }))
    setReportData(rows)
  }

  async function fetchTransferenciasReport() {
    let query = supabase
      .from('transferencias')
      .select('*, pessoa:pessoas(nome), igreja_origem:igrejas!igreja_origem_id(nome), igreja_destino:igrejas!igreja_destino_id(nome)')
      .order('created_at', { ascending: false })

    query = applyScope(query, 'transferencias')

    // Date range filter for transferencias (uses created_at)
    const dtInicio = `${anoInicio}-${String(mesInicio).padStart(2, '0')}-01`
    const dtFimLastDay = new Date(anoFim, mesFim, 0).getDate()
    const dtFim = `${anoFim}-${String(mesFim).padStart(2, '0')}-${String(dtFimLastDay).padStart(2, '0')}`
    query = query.gte('created_at', dtInicio).lte('created_at', `${dtFim}T23:59:59`)

    if (filterIgrejaId) {
      query = query.or(`igreja_origem_id.eq.${filterIgrejaId},igreja_destino_id.eq.${filterIgrejaId}`)
    }

    const { data, error } = await query
    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data || []).map((r: any) => ({
      Pessoa: r.pessoa?.nome || '-',
      'Igreja Origem': r.igreja_origem?.nome || '-',
      'Igreja Destino': r.igreja_destino?.nome || '-',
      Tipo: r.tipo,
      Status: r.status,
      Data: formatDate(r.created_at),
    }))
    setReportData(rows)
  }

  // ---- Export functions ----

  async function exportPDF() {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const el = reportRef.current
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false })
      const pdf = new jsPDF('l', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Multi-page support
      if (imgHeight <= pageHeight) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
      } else {
        let position = 0
        let remainingHeight = imgHeight
        let isFirstPage = true
        while (remainingHeight > 0) {
          if (!isFirstPage) pdf.addPage()
          pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            0,
            -position,
            imgWidth,
            imgHeight
          )
          position += pageHeight
          remainingHeight -= pageHeight
          isFirstPage = false
        }
      }

      pdf.save(`relatorio-${tipoRelatorio}-${Date.now()}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  function exportExcel() {
    if (reportData.length === 0) return
    // Remove internal fields (prefixed with _)
    const cleanData = reportData.map((row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clean: Record<string, any> = {}
      for (const key of Object.keys(row)) {
        if (!key.startsWith('_')) {
          clean[key] = row[key]
        }
      }
      return clean
    })
    const ws = XLSX.utils.json_to_sheet(cleanData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
    XLSX.writeFile(wb, `relatório-${tipoRelatorio}-${Date.now()}.xlsx`)
  }

  // ---- Helpers ----

  function getReportLabel(): string {
    return REPORT_TYPES.find((r) => r.key === tipoRelatorio)?.label || ''
  }

  function getPeriodLabel(): string {
    if (tipoRelatorio === 'membros') return 'Todos os registros'
    const mesInicioLabel = MESES.find((m) => m.value === mesInicio)?.label || ''
    const mesFimLabel = MESES.find((m) => m.value === mesFim)?.label || ''
    return `${mesInicioLabel}/${anoInicio} - ${mesFimLabel}/${anoFim}`
  }

  function getColumns(): string[] {
    if (reportData.length === 0) return []
    return Object.keys(reportData[0]).filter((k) => !k.startsWith('_'))
  }

  const showPeriodFilter = tipoRelatorio !== 'membros'

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <p className="text-gray-500 mt-1">Gere e exporte relatórios em PDF ou Excel</p>
      </div>

      {/* Report type selection */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
          Tipo de Relatório
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {REPORT_TYPES.map((rt) => {
            const isActive = tipoRelatorio === rt.key
            const Icon = rt.icon
            return (
              <button
                key={rt.key}
                onClick={() => {
                  setTipoRelatorio(rt.key)
                  setGenerated(false)
                  setReportData([])
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`p-2.5 rounded-lg text-white ${rt.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive ? 'text-primary-700' : 'text-gray-700'
                  }`}
                >
                  {rt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
          Filtros
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          {/* Period filters - hidden for membros */}
          {showPeriodFilter && (
            <>
              <div>
                <label className="label-field">Mês Início</label>
                <select
                  className="input-field"
                  value={mesInicio}
                  onChange={(e) => setMesInicio(Number(e.target.value))}
                >
                  {MESES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Ano Início</label>
                <select
                  className="input-field"
                  value={anoInicio}
                  onChange={(e) => setAnoInicio(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Mês Fim</label>
                <select
                  className="input-field"
                  value={mesFim}
                  onChange={(e) => setMesFim(Number(e.target.value))}
                >
                  {MESES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Ano Fim</label>
                <select
                  className="input-field"
                  value={anoFim}
                  onChange={(e) => setAnoFim(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Associacao filter */}
          {(profile?.papel === 'admin' || profile?.papel === 'admin_uniao') && (
            <div className={showPeriodFilter ? '' : 'sm:col-span-1'}>
              <label className="label-field">Associação</label>
              <select
                className="input-field"
                value={filterAssociacaoId}
                onChange={(e) => setFilterAssociacaoId(e.target.value)}
              >
                <option value="">Todas</option>
                {associacoes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.sigla} - {a.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Igreja filter */}
          <div className={showPeriodFilter ? '' : 'sm:col-span-1'}>
            <label className="label-field">Igreja</label>
            <select
              className="input-field"
              value={filterIgrejaId}
              onChange={(e) => setFilterIgrejaId(e.target.value)}
              disabled={
                profile?.papel !== 'admin' &&
                profile?.papel !== 'admin_uniao' &&
                profile?.papel !== 'admin_associacao'
              }
            >
              <option value="">Todas</option>
              {igrejasFiltered.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Gerando...
                </>
              ) : (
                <>
                  <FiFileText className="w-4 h-4" />
                  Gerar Relatório
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report preview */}
      {loading && (
        <div className="card">
          <div className="flex items-center justify-center h-40">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="animate-spin h-8 w-8 text-primary-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-gray-500 text-sm">Carregando dados do relatório...</p>
            </div>
          </div>
        </div>
      )}

      {generated && !loading && (
        <div className="card p-0 overflow-hidden">
          {/* Title bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Relatório de {getReportLabel()}
              </h3>
              <p className="text-sm text-gray-500">{getPeriodLabel()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportPDF}
                disabled={reportData.length === 0 || exporting}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <FiDownload className="w-4 h-4" />
                {exporting ? 'Exportando...' : 'PDF'}
              </button>
              <button
                onClick={exportExcel}
                disabled={reportData.length === 0}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <FiDownload className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          {/* Table or empty state */}
          {reportData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <FiFileText className="w-10 h-10 mb-2" />
              <p className="text-sm">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div ref={reportRef} className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    {getColumns().map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      } hover:bg-blue-50 transition-colors`}
                    >
                      {getColumns().map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2.5 text-gray-700 whitespace-nowrap"
                        >
                          {row[col] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary row for financeiro */}
              {tipoRelatorio === 'financeiro' && reportData.length > 0 && (
                <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 flex flex-wrap gap-6 text-sm font-semibold">
                  <span className="text-gray-600">
                    Total Receitas:{' '}
                    <span className="text-green-600">
                      {BRL(
                        reportData.reduce(
                          (sum, r) => sum + (r._totalReceita || 0),
                          0
                        )
                      )}
                    </span>
                  </span>
                  <span className="text-gray-600">
                    Total Despesas:{' '}
                    <span className="text-red-600">
                      {BRL(
                        reportData.reduce(
                          (sum, r) => sum + (r._totalDespesa || 0),
                          0
                        )
                      )}
                    </span>
                  </span>
                  <span className="text-gray-600">
                    Saldo:{' '}
                    <span
                      className={
                        reportData.reduce((sum, r) => sum + (r._saldo || 0), 0) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {BRL(
                        reportData.reduce(
                          (sum, r) => sum + (r._saldo || 0),
                          0
                        )
                      )}
                    </span>
                  </span>
                </div>
              )}

              {/* Record count */}
              <div className="px-4 py-2 text-xs text-gray-400 bg-white border-t border-gray-100">
                {reportData.length} registro(s) encontrado(s)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

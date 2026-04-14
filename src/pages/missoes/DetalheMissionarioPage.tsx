import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  Missionario,
  MetaMissionario,
  AtividadeMissionario,
  AvaliacaoMissionario,
  RelatorioMissionario,
  HistoricoMissionario,
} from '@/types'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  FiArrowLeft,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiUsers,
  FiTarget,
  FiActivity,
  FiFileText,
  FiStar,
  FiDollarSign,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiUser,
  FiFile,
  FiAward,
  FiDownload,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
} from 'react-icons/fi'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { STATUS_COLORS, TIPO_ATIVIDADE_ICONS, TIPO_ATIVIDADE_LABELS, MESES_NOMES, MONTH_LABELS, ORDENACAO_MARCOS, ESCOLARIDADE_OPTIONS, ESTADO_CIVIL_OPTIONS, UF_OPTIONS, SEXO_OPTIONS } from '@/lib/missoes-constants'
import { useCargoLabels, useStatusLabels } from '@/hooks/useCargoLabels'
import TermoCompromissoDisplay from '@/components/missoes/TermoCompromissoDisplay'

// ── MoneyInput: handles Brazilian decimal format properly ──
function MoneyInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label?: string }) {
  const [localValue, setLocalValue] = useState(value ? value.toString() : '')
  const [focused, setFocused] = useState(false)

  // Sync from parent when not focused
  useEffect(() => {
    if (!focused) {
      setLocalValue(value ? value.toString() : '')
    }
  }, [value, focused])

  return (
    <div>
      {label && <label className="label-field text-xs">{label}</label>}
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
        <input
          type="text"
          inputMode="decimal"
          className="input-field pl-8"
          value={focused ? localValue : (value ? value.toFixed(2) : '')}
          placeholder="0,00"
          onFocus={() => {
            setFocused(true)
            setLocalValue(value ? value.toString() : '')
          }}
          onChange={e => {
            // Allow digits, dots, and commas
            let raw = e.target.value.replace(/[^0-9.,]/g, '')
            // Convert comma to dot for calculation
            setLocalValue(raw)
            const numStr = raw.replace(',', '.')
            const num = parseFloat(numStr)
            if (!isNaN(num)) {
              onChange(num)
            } else if (raw === '' || raw === '0') {
              onChange(0)
            }
          }}
          onBlur={() => {
            setFocused(false)
            // Final parse on blur
            const numStr = localValue.replace(',', '.')
            const num = parseFloat(numStr)
            if (!isNaN(num)) {
              onChange(Math.round(num * 100) / 100)
            } else {
              onChange(0)
            }
          }}
        />
      </div>
    </div>
  )
}

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

type TabKey = 'ficha_biografica' | 'visao_geral' | 'campo' | 'atividades' | 'relatorios' | 'avaliacoes' | 'metas'

const DETAIL_TABS: { key: TabKey; label: string; icon: typeof FiActivity }[] = [
  { key: 'visao_geral', label: 'Visão Geral', icon: FiActivity },
  { key: 'ficha_biografica', label: 'Ficha Biográfica', icon: FiUser },
  { key: 'campo', label: 'Campo', icon: FiMapPin },
  { key: 'atividades', label: 'Atividades', icon: FiCalendar },
  { key: 'relatorios', label: 'Relatórios', icon: FiFileText },
  { key: 'avaliacoes', label: 'Avaliações', icon: FiStar },
  { key: 'metas', label: 'Metas', icon: FiTarget },
]

interface ReportRow {
  mes: number
  ano: number
  estudos_biblicos: number
  visitas_missionarias: number
  literatura_distribuida: number
  pessoas_contatadas: number
  convites_feitos: number
  pessoas_trazidas: number
  horas_trabalho: number
  observacoes: string | null
}

interface FinancialDetailRow {
  igreja_id: string
  igreja_nome: string
  dizimo: number
  primicias: number
  assist_social: number
  esc_sabatina: number
  evangelismo: number
  radio_curso_biblico: number
  construcao: number
  musica: number
  gratidao_6pct: number
  diverso_assoc: number
  soma_assoc: number
  missoes_estrang: number
  total: number
}

interface FinancialSummary {
  mes: number
  ano: number
  dizimos: number
  ofertas: number
  total: number
  // Detailed breakdown totals
  dizimo: number
  primicias: number
  assist_social: number
  esc_sabatina: number
  evangelismo: number
  radio_curso_biblico: number
  construcao: number
  musica: number
  gratidao_6pct: number
  diverso_assoc: number
  missoes_estrang: number
  // Per-church detail
  churches: FinancialDetailRow[]
}

export default function DetalheMissionarioPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const fromAssoc = searchParams.get('from_assoc')
  const backUrl = fromAssoc ? `/missoes/inventario?associacao=${fromAssoc}` : '/missoes/inventario'
  const { profile } = useAuth()
  const { labels: CARGO_LABELS } = useCargoLabels()
  const { labels: STATUS_LABELS } = useStatusLabels()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('visao_geral')

  // Data
  const [missionario, setMissionario] = useState<Missionario | null>(null)
  const [igrejas, setIgrejas] = useState<{ id: string; nome: string; endereco_cidade: string | null; endereco_estado: string | null; telefone: string | null; membros_ativos: number | null; interessados: number | null; tipo: string | null }[]>([])
  const [igrejaFuncaoMap, setIgrejaFuncaoMap] = useState<Record<string, string>>({})
  const [expandedIgreja, setExpandedIgreja] = useState<string | null>(null)
  const [financeiroByIgreja, setFinanceiroByIgreja] = useState<Record<string, { dizimos: number; ofertas: number; total: number }>>({})
  const [relatorios, setRelatorios] = useState<(RelatorioMissionario & { pessoa?: { nome: string } | null })[]>([])
  const [atividades, setAtividades] = useState<AtividadeMissionario[]>([])
  const [metas, setMetas] = useState<MetaMissionario[]>([])
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoMissionario[]>([])
  const [totalMembros, setTotalMembros] = useState(0)
  const [totalInteressados, setTotalInteressados] = useState(0)
  const [financeiro, setFinanceiro] = useState<FinancialSummary[]>([])
  const [classesBatismais, setClassesBatismais] = useState<{ id: string; nome: string; status: string; alunos: string[] }[]>([])
  const [monthlyReports, setMonthlyReports] = useState<ReportRow[]>([])
  const [historico, setHistorico] = useState<HistoricoMissionario[]>([])
  const [parametros, setParametros] = useState<Record<string, any> | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [editHistorico, setEditHistorico] = useState<HistoricoMissionario[]>([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [allAssociacoes, setAllAssociacoes] = useState<{ id: string; sigla: string; nome: string; uniao_id: string | null }[]>([])
  const [showParamModal, setShowParamModal] = useState(false)
  const [editParamForm, setEditParamForm] = useState<Record<string, any>>({})
  const [savingParam, setSavingParam] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Editable modals state
  const [showIgrejasModal, setShowIgrejasModal] = useState(false)
  const [allIgrejas, setAllIgrejas] = useState<{ id: string; nome: string }[]>([])
  const [selectedIgrejasIds, setSelectedIgrejasIds] = useState<string[]>([])
  const [selectedIgrejasFuncao, setSelectedIgrejasFuncao] = useState<Record<string, string>>({})
  const [igrejasSearch, setIgrejasSearch] = useState('')
  const [savingIgrejas, setSavingIgrejas] = useState(false)

  const [showContagensModal, setShowContagensModal] = useState(false)
  const [editIgrejaContagens, setEditIgrejaContagens] = useState<Record<string, { membros_ativos: number; interessados: number }>>({})
  const [savingContagens, setSavingContagens] = useState(false)

  const [showFinanceiroModal, setShowFinanceiroModal] = useState(false)
  const [editFinanceiroData, setEditFinanceiroData] = useState<{
    igreja_id: string; igreja_nome: string; mes: number; ano: number;
    receita_dizimos: number; receita_oferta_regular: number; receita_oferta_especial: number;
    dizimo: number; primicias: number; assist_social: number; esc_sabatina: number;
    evangelismo: number; radio_curso_biblico: number; construcao: number; musica: number;
    gratidao_6pct: number; diverso_assoc: number; missoes_mensais: number; missoes_anuais: number;
    of_cultos_construcao: number; of_missionaria: number; of_juvenil: number;
    of_gratidao_pobres: number; diversos_local: number; flores: number;
  }[]>([])
  const [savingFinanceiro, setSavingFinanceiro] = useState(false)
  const [financeiroMes, setFinanceiroMes] = useState(new Date().getMonth() + 1)
  const [financeiroAno, setFinanceiroAno] = useState(new Date().getFullYear())
  const [expandedFinMonth, setExpandedFinMonth] = useState<string | null>(null)

  useEffect(() => {
    if (profile && id) fetchMissionario()
  }, [profile, id])

  // Load available associações once (for the edit modal select)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('associacoes')
        .select('id, sigla, nome, uniao_id')
        .order('sigla')
      if (!cancelled && !error && data) setAllAssociacoes(data as any)
    })()
    return () => { cancelled = true }
  }, [])

  // ---- Photo upload: resize + compress + save as data URL ----
  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !missionario) return
    setUploadingFoto(true)
    try {
      const dataUrl = await resizeImage(file, 300, 300, 0.8)
      const { error } = await supabase
        .from('missionarios')
        .update({ foto_url: dataUrl })
        .eq('id', missionario.id)
      if (error) throw error
      setMissionario({ ...missionario, foto_url: dataUrl })
    } catch (err) {
      console.error('Erro ao salvar foto:', err)
      alert('Erro ao salvar foto. Tente novamente.')
    } finally {
      setUploadingFoto(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
    }
  }

  function resizeImage(file: File, maxW: number, maxH: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let w = img.width, h = img.height
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h)
            w = Math.round(w * ratio)
            h = Math.round(h * ratio)
          }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.onerror = reject
        img.src = ev.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function fetchMissionario() {
    setLoading(true)
    try {
      // 1. Main missionary data (with associação join)
      const { data: mData, error: mErr } = await supabase
        .from('missionarios')
        .select('*, usuario:usuarios(nome, email), associacao:associacoes(nome, sigla)')
        .eq('id', id!)
        .single()
      if (mErr) throw mErr
      setMissionario(mData)

      // 2. Igrejas (expandido com membros, endereco, tipo)
      const igrejasIds: string[] = mData.igrejas_responsavel || []
      let igData: any[] = []
      if (igrejasIds.length > 0) {
        const { data: igResult } = await supabase
          .from('igrejas')
          .select('id, nome, endereco_cidade, endereco_estado, telefone, membros_ativos, interessados, tipo')
          .in('id', igrejasIds)
        igData = igResult || []
        setIgrejas(igData)
        // Calcular totais de membros direto das igrejas (nao da tabela pessoas)
        const totalM = igData.reduce((sum: number, ig: any) => sum + (ig.membros_ativos || 0), 0)
        const totalI = igData.reduce((sum: number, ig: any) => sum + (ig.interessados || 0), 0)
        setTotalMembros(totalM)
        setTotalInteressados(totalI)

        // Load funcao from junction table
        const { data: juncData } = await supabase
          .from('missionario_igrejas')
          .select('igreja_id, funcao')
          .eq('missionario_id', id!)
        const funcMap: Record<string, string> = {}
        for (const r of juncData || []) {
          if (r.funcao) funcMap[r.igreja_id] = r.funcao
        }
        setIgrejaFuncaoMap(funcMap)
      }

      // Load all tab data in parallel
      await Promise.all([
        fetchReports(igrejasIds),
        fetchActivities(),
        fetchGoals(),
        fetchEvaluations(),
        fetchFinancial(igrejasIds, igData),
        fetchBaptismalClasses(igrejasIds),
        fetchHistorico(),
        fetchParametros(),
      ])
    } catch (err) {
      console.error('Erro ao buscar missionario:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchReports(igrejasIds: string[]) {
    if (igrejasIds.length === 0) return
    const { data } = await supabase
      .from('relatorios_missionarios')
      .select('*, pessoa:pessoas(nome)')
      .in('igreja_id', igrejasIds)
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
    setRelatorios(data || [])

    // Build monthly aggregated for chart
    const monthMap: Record<string, ReportRow> = {}
    for (const r of data || []) {
      const key = `${r.ano}-${r.mes}`
      if (!monthMap[key]) {
        monthMap[key] = {
          mes: r.mes,
          ano: r.ano,
          estudos_biblicos: 0,
          visitas_missionarias: 0,
          literatura_distribuida: 0,
          pessoas_contatadas: 0,
          convites_feitos: 0,
          pessoas_trazidas: 0,
          horas_trabalho: 0,
          observacoes: null,
        }
      }
      monthMap[key].estudos_biblicos += r.estudos_biblicos || 0
      monthMap[key].visitas_missionarias += r.visitas_missionarias || 0
      monthMap[key].literatura_distribuida += r.literatura_distribuida || 0
      monthMap[key].pessoas_contatadas += r.pessoas_contatadas || 0
      monthMap[key].convites_feitos += r.convites_feitos || 0
      monthMap[key].pessoas_trazidas += r.pessoas_trazidas || 0
      monthMap[key].horas_trabalho += r.horas_trabalho || 0
    }
    const sorted = Object.values(monthMap).sort((a, b) =>
      a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
    )
    setMonthlyReports(sorted.slice(-12))
  }

  async function fetchActivities() {
    const { data } = await supabase
      .from('atividades_missionario')
      .select('*, igreja:igrejas(nome)')
      .eq('missionario_id', id!)
      .order('data', { ascending: false })
      .limit(50)
    setAtividades(data || [])
  }

  async function fetchGoals() {
    const { data } = await supabase
      .from('metas_missionario')
      .select('*')
      .eq('missionario_id', id!)
      .order('ano', { ascending: false })
    setMetas(data || [])
  }

  async function fetchEvaluations() {
    const { data } = await supabase
      .from('avaliacoes_missionario')
      .select('*')
      .eq('missionario_id', id!)
      .order('ano', { ascending: false })
    setAvaliacoes(data || [])
  }

  // fetchMemberCount removido — totais calculados direto do fetch de igrejas

  async function fetchFinancial(igrejasIds: string[], igrejasData?: { id: string; nome: string }[]) {
    if (igrejasIds.length === 0) return

    const { data } = await supabase
      .from('dados_financeiros')
      .select('igreja_id, mes, ano, receita_dizimos, receita_oferta_regular, receita_oferta_especial, dizimo, primicias, assist_social, esc_sabatina, evangelismo, radio_curso_biblico, construcao, musica, gratidao_6pct, diverso_assoc, missoes_mensais, missoes_anuais, of_cultos_construcao, of_missionaria, of_juvenil, of_gratidao_pobres, diversos_local, flores')
      .in('igreja_id', igrejasIds)
      .eq('ano', new Date().getFullYear())
      .order('mes', { ascending: false })
      .limit(50)

    // Build church name map (use passed data to avoid stale state)
    const igNameMap: Record<string, string> = {}
    for (const ig of (igrejasData || igrejas)) igNameMap[ig.id] = ig.nome

    // Aggregate by month with detailed breakdown
    const monthMap: Record<string, FinancialSummary> = {}
    const igrejaMap: Record<string, { dizimos: number; ofertas: number; total: number }> = {}
    // Per-month per-church detail
    const monthChurchMap: Record<string, Record<string, FinancialDetailRow>> = {}

    for (const f of data || []) {
      const d = f as any
      const key = `${d.ano}-${d.mes}`
      if (!monthMap[key]) {
        monthMap[key] = { mes: d.mes, ano: d.ano, dizimos: 0, ofertas: 0, total: 0, dizimo: 0, primicias: 0, assist_social: 0, esc_sabatina: 0, evangelismo: 0, radio_curso_biblico: 0, construcao: 0, musica: 0, gratidao_6pct: 0, diverso_assoc: 0, missoes_estrang: 0, churches: [] }
      }
      if (!monthChurchMap[key]) monthChurchMap[key] = {}

      const dizimo_val = (d.receita_dizimos || 0) + (d.dizimo || 0)
      const primicias_val = d.primicias || 0
      const diz = dizimo_val + primicias_val
      const assist_social = d.assist_social || 0
      const esc_sabatina = d.esc_sabatina || 0
      const evangelismo_val = d.evangelismo || 0
      const radio_cb = d.radio_curso_biblico || 0
      const construcao_val = d.construcao || 0
      const musica_val = d.musica || 0
      const gratidao = d.gratidao_6pct || 0
      const diverso = d.diverso_assoc || 0
      const missoes_m = d.missoes_mensais || 0
      const missoes_a = d.missoes_anuais || 0
      const missoes_estrang = missoes_m + missoes_a

      const soma_assoc = dizimo_val + primicias_val + assist_social + esc_sabatina + evangelismo_val + radio_cb + construcao_val + musica_val + gratidao + diverso
      const ofe = (d.receita_oferta_regular || 0) + (d.receita_oferta_especial || 0)
        + assist_social + esc_sabatina + evangelismo_val
        + radio_cb + construcao_val + musica_val
        + gratidao + diverso + missoes_m + missoes_a
        + (d.of_cultos_construcao || 0) + (d.of_missionaria || 0) + (d.of_juvenil || 0)
        + (d.of_gratidao_pobres || 0) + (d.diversos_local || 0) + (d.flores || 0)

      monthMap[key].dizimos += diz
      monthMap[key].ofertas += ofe
      monthMap[key].total += diz + ofe
      monthMap[key].dizimo += dizimo_val
      monthMap[key].primicias += primicias_val
      monthMap[key].assist_social += assist_social
      monthMap[key].esc_sabatina += esc_sabatina
      monthMap[key].evangelismo += evangelismo_val
      monthMap[key].radio_curso_biblico += radio_cb
      monthMap[key].construcao += construcao_val
      monthMap[key].musica += musica_val
      monthMap[key].gratidao_6pct += gratidao
      monthMap[key].diverso_assoc += diverso
      monthMap[key].missoes_estrang += missoes_estrang

      // Per-church detail row
      const igId = d.igreja_id as string
      monthChurchMap[key][igId] = {
        igreja_id: igId,
        igreja_nome: igNameMap[igId] || igId,
        dizimo: dizimo_val,
        primicias: primicias_val,
        assist_social,
        esc_sabatina,
        evangelismo: evangelismo_val,
        radio_curso_biblico: radio_cb,
        construcao: construcao_val,
        musica: musica_val,
        gratidao_6pct: gratidao,
        diverso_assoc: diverso,
        soma_assoc,
        missoes_estrang,
        total: soma_assoc + missoes_estrang,
      }

      // Aggregate by church (yearly)
      if (!igrejaMap[igId]) igrejaMap[igId] = { dizimos: 0, ofertas: 0, total: 0 }
      igrejaMap[igId].dizimos += diz
      igrejaMap[igId].ofertas += ofe
      igrejaMap[igId].total += diz + ofe
    }

    // Attach church rows to each month
    for (const key of Object.keys(monthMap)) {
      monthMap[key].churches = Object.values(monthChurchMap[key] || {}).sort((a, b) => a.igreja_nome.localeCompare(b.igreja_nome))
    }

    const sorted = Object.values(monthMap).sort((a, b) =>
      a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
    )
    setFinanceiro(sorted.slice(-6))
    setFinanceiroByIgreja(igrejaMap)
  }

  async function fetchBaptismalClasses(igrejasIds: string[]) {
    if (igrejasIds.length === 0) return
    const { data } = await supabase
      .from('classes_batismais')
      .select('id, nome, status, alunos')
      .in('igreja_id', igrejasIds)
    setClassesBatismais(data || [])
  }

  async function fetchHistorico() {
    const { data } = await supabase
      .from('historico_missionario')
      .select('*')
      .eq('missionario_id', id!)
      .order('data', { ascending: true })
    setHistorico(data || [])
  }

  async function fetchParametros() {
    const { data } = await supabase
      .from('missionario_parametros')
      .select('*')
      .eq('missionario_id', id!)
      .maybeSingle()
    setParametros(data)
  }

  function openEditModal() {
    if (!missionario) return
    setEditForm({ ...missionario })
    setEditHistorico([...historico])
    setShowEditModal(true)
  }

  async function saveEditForm() {
    if (!missionario) return
    setSavingEdit(true)
    try {
      const { id: _id, usuario, igrejas: _igs, associacao: _assoc, created_at, updated_at, ...updateData } = editForm
      await supabase.from('missionarios').update(updateData).eq('id', missionario.id)

      // Sync historico: delete all and re-insert
      await supabase.from('historico_missionario').delete().eq('missionario_id', missionario.id)
      if (editHistorico.length > 0) {
        const inserts = editHistorico.map(h => ({
          missionario_id: missionario.id,
          data: h.data || null,
          cidade_uf: h.cidade_uf || null,
          funcao: h.funcao || null,
          decisao: h.decisao || null,
          observacoes: h.observacoes || null,
        }))
        await supabase.from('historico_missionario').insert(inserts)
      }

      setShowEditModal(false)
      fetchMissionario()
    } catch (err) {
      console.error('Erro ao salvar ficha:', err)
    } finally {
      setSavingEdit(false)
    }
  }


  async function saveParamForm() {
    if (!id) return
    setSavingParam(true)
    try {
      const { id: _id, created_at, updated_at, ...fields } = editParamForm
      const payload = { ...fields, missionario_id: id, updated_at: new Date().toISOString() }

      if (parametros?.id) {
        await supabase.from('missionario_parametros').update(payload).eq('id', parametros.id)
      } else {
        await supabase.from('missionario_parametros').insert(payload)
      }

      setShowParamModal(false)
      fetchParametros()
    } catch (err) {
      console.error('Erro ao salvar parametros:', err)
    } finally {
      setSavingParam(false)
    }
  }

  // PDF generation
  async function generatePDF(mode: 'digital' | 'print' = 'digital') {
    if (!pdfRef.current || !missionario) return
    try {
      const element = pdfRef.current

      // Pre-load all images inside the PDF element to ensure they render
      const images = element.querySelectorAll('img')
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalHeight > 0) {
                resolve()
              } else {
                img.onload = () => resolve()
                img.onerror = () => resolve()
                if (img.src && !img.crossOrigin) {
                  img.crossOrigin = 'anonymous'
                  const src = img.src
                  img.src = ''
                  img.src = src
                }
              }
            })
        )
      )

      await new Promise(resolve => setTimeout(resolve, 300))

      if (mode === 'print') {
        // ── Print mode: open print dialog with clean content ──
        const printWindow = window.open('', '_blank')
        if (!printWindow) return
        printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório - ${(missionario as any).usuario?.nome || missionario.nome || 'Missionário'}</title><style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; color: #333; font-size: 11px; line-height: 1.4; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px 6px; border: 1px solid #ccc; font-size: 10px; }
          th { background-color: #f0f0f0; font-weight: bold; text-align: left; }
          .section { page-break-inside: avoid; margin-bottom: 12px; }
          .page-break { page-break-before: always; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px; }
          .signatures { page-break-inside: avoid; margin-top: 40px; }
          .sig-line { border-top: 1px solid #333; padding-top: 6px; margin-top: 50px; text-align: center; }
          h2 { font-size: 13px; margin: 0 0 6px 0; text-transform: uppercase; border-bottom: 1px solid #999; padding-bottom: 4px; }
          .total-row { background-color: #f0f0f0; font-weight: bold; }
          img { max-width: 60px; max-height: 60px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style></head><body>`)
        printWindow.document.write(element.innerHTML)
        printWindow.document.write('</body></html>')
        printWindow.document.close()
        printWindow.onload = () => {
          printWindow.print()
        }
        return
      }

      // ── Digital mode: section-aware PDF generation ──
      // Find all sections in the PDF content
      const sections = element.querySelectorAll('[data-pdf-section]')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfPageHeight = pdf.internal.pageSize.getHeight()
      const margin = 8
      const usableWidth = pdfWidth - margin * 2
      const usablePageHeight = pdfPageHeight - margin * 2
      const scale = 2

      if (sections.length === 0) {
        // Fallback: render entire element as before (section-unaware)
        const canvas = await html2canvas(element, {
          scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          height: element.scrollHeight,
          width: element.scrollWidth,
          windowHeight: element.scrollHeight,
          windowWidth: element.scrollWidth,
        })
        const imgH = (canvas.height * usableWidth) / canvas.width
        if (imgH <= usablePageHeight) {
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableWidth, imgH)
        } else {
          const pixelsPerPage = (usablePageHeight / usableWidth) * canvas.width
          let yOff = 0, pg = 0
          while (yOff < canvas.height) {
            if (pg > 0) pdf.addPage()
            const sliceH = Math.min(canvas.height - yOff, pixelsPerPage)
            const sc = document.createElement('canvas')
            sc.width = canvas.width; sc.height = sliceH
            const ctx = sc.getContext('2d')!
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sc.width, sc.height)
            ctx.drawImage(canvas, 0, yOff, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
            pdf.addImage(sc.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableWidth, (sliceH * usableWidth) / canvas.width)
            yOff += sliceH; pg++
          }
        }
      } else {
        // Section-aware: render each section individually and place with intelligent page breaks
        let currentY = margin
        let pageNum = 0

        for (let i = 0; i < sections.length; i++) {
          const section = sections[i] as HTMLElement
          const canvas = await html2canvas(section, {
            scale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: element.scrollWidth,
            onclone: (clonedDoc: Document) => {
              const imgs = clonedDoc.querySelectorAll('img')
              imgs.forEach(img => { img.crossOrigin = 'anonymous' })
            },
          })

          const sectionImgHeight = (canvas.height * usableWidth) / canvas.width

          // If section doesn't fit on current page, start a new page
          if (currentY + sectionImgHeight > pdfPageHeight - margin && currentY > margin + 1) {
            pdf.addPage()
            pageNum++
            currentY = margin
          }

          // If single section is taller than a full page, slice it
          if (sectionImgHeight > usablePageHeight) {
            const pixelsPerPage = (usablePageHeight / usableWidth) * canvas.width
            let yOff = 0
            while (yOff < canvas.height) {
              if (yOff > 0) { pdf.addPage(); pageNum++; currentY = margin }
              const sliceH = Math.min(canvas.height - yOff, pixelsPerPage)
              const sc = document.createElement('canvas')
              sc.width = canvas.width; sc.height = sliceH
              const ctx = sc.getContext('2d')!
              ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sc.width, sc.height)
              ctx.drawImage(canvas, 0, yOff, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
              const h = (sliceH * usableWidth) / canvas.width
              pdf.addImage(sc.toDataURL('image/jpeg', 0.95), 'JPEG', margin, currentY, usableWidth, h)
              currentY += h
              yOff += sliceH
            }
          } else {
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, currentY, usableWidth, sectionImgHeight)
            currentY += sectionImgHeight
          }
        }
      }

      const nomeArquivo = (missionario as any).usuario?.nome || missionario.nome || 'missionario'
      pdf.save(`campo_${nomeArquivo.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
    }
  }

  const isAdmin = profile?.papel === 'admin' || profile?.papel === 'admin_uniao' || profile?.papel === 'admin_associacao'

  // ── Igrejas Modal Functions ──
  async function openIgrejasModal() {
    // Fetch all churches for multi-select
    const { data } = await supabase
      .from('igrejas')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    setAllIgrejas(data || [])
    setSelectedIgrejasIds(missionario?.igrejas_responsavel || [])

    // Load existing funcao from missionario_igrejas junction table
    if (missionario) {
      const { data: juncData } = await supabase
        .from('missionario_igrejas')
        .select('igreja_id, funcao')
        .eq('missionario_id', missionario.id)
      const funcaoMap: Record<string, string> = {}
      for (const row of juncData || []) {
        if (row.funcao) funcaoMap[row.igreja_id] = row.funcao
      }
      setSelectedIgrejasFuncao(funcaoMap)
    }

    setIgrejasSearch('')
    setShowIgrejasModal(true)
  }

  async function saveIgrejas() {
    if (!missionario) return
    setSavingIgrejas(true)
    try {
      // 1. Update missionarios.igrejas_responsavel array
      const { error } = await supabase
        .from('missionarios')
        .update({ igrejas_responsavel: selectedIgrejasIds })
        .eq('id', missionario.id)
      if (error) throw error

      // 2. Sync missionario_igrejas junction table
      // Remove old entries
      await supabase
        .from('missionario_igrejas')
        .delete()
        .eq('missionario_id', missionario.id)

      // Insert new entries with funcao
      if (selectedIgrejasIds.length > 0) {
        const rows = selectedIgrejasIds.map((igId, i) => ({
          missionario_id: missionario.id,
          igreja_id: igId,
          funcao: selectedIgrejasFuncao[igId] || 'Pastor',
          principal: i === 0,
          ativo: true,
        }))
        await supabase.from('missionario_igrejas').insert(rows)
      }

      // 3. Update igrejas.pastor_id / obreiro_id based on funcao
      for (const igId of selectedIgrejasIds) {
        const funcao = (selectedIgrejasFuncao[igId] || 'Pastor').toLowerCase()
        if (funcao.includes('pastor')) {
          await supabase.from('igrejas').update({ pastor_id: missionario.id }).eq('id', igId)
        }
        if (funcao.includes('obreiro') || funcao.includes('auxiliar')) {
          await supabase.from('igrejas').update({ obreiro_id: missionario.id }).eq('id', igId)
        }
      }

      setShowIgrejasModal(false)
      fetchMissionario()
    } catch (err) {
      console.error('Erro ao salvar igrejas:', err)
    } finally {
      setSavingIgrejas(false)
    }
  }

  // ── Contagens Modal Functions ──
  function openContagensModal() {
    const contagens: Record<string, { membros_ativos: number; interessados: number }> = {}
    for (const ig of igrejas) {
      contagens[ig.id] = {
        membros_ativos: ig.membros_ativos || 0,
        interessados: ig.interessados || 0,
      }
    }
    setEditIgrejaContagens(contagens)
    setShowContagensModal(true)
  }

  async function saveContagens() {
    setSavingContagens(true)
    try {
      for (const [igId, vals] of Object.entries(editIgrejaContagens)) {
        await supabase
          .from('igrejas')
          .update({ membros_ativos: vals.membros_ativos, interessados: vals.interessados })
          .eq('id', igId)
      }
      setShowContagensModal(false)
      fetchMissionario()
    } catch (err) {
      console.error('Erro ao salvar contagens:', err)
    } finally {
      setSavingContagens(false)
    }
  }

  // ── Financeiro Modal Functions ──
  async function openFinanceiroModal(mes?: number, ano?: number) {
    const mesNum = mes || new Date().getMonth() + 1
    const anoNum = ano || new Date().getFullYear()
    setFinanceiroMes(mesNum)
    setFinanceiroAno(anoNum)

    await loadFinanceiroData(mesNum, anoNum)
    setShowFinanceiroModal(true)
  }

  async function loadFinanceiroData(mesNum: number, anoNum: number) {
    const finFields = 'igreja_id, receita_dizimos, receita_oferta_regular, receita_oferta_especial, dizimo, primicias, assist_social, esc_sabatina, evangelismo, radio_curso_biblico, construcao, musica, gratidao_6pct, diverso_assoc, missoes_mensais, missoes_anuais, of_cultos_construcao, of_missionaria, of_juvenil, of_gratidao_pobres, diversos_local, flores'

    // Build one row per church
    const emptyRow = (ig: { id: string; nome: string }) => ({
      igreja_id: ig.id, igreja_nome: ig.nome, mes: mesNum, ano: anoNum,
      receita_dizimos: 0, receita_oferta_regular: 0, receita_oferta_especial: 0,
      dizimo: 0, primicias: 0, assist_social: 0, esc_sabatina: 0,
      evangelismo: 0, radio_curso_biblico: 0, construcao: 0, musica: 0,
      gratidao_6pct: 0, diverso_assoc: 0, missoes_mensais: 0, missoes_anuais: 0,
      of_cultos_construcao: 0, of_missionaria: 0, of_juvenil: 0,
      of_gratidao_pobres: 0, diversos_local: 0, flores: 0,
    })
    const rows = igrejas.map(ig => emptyRow(ig))

    const igIds = igrejas.map(ig => ig.id)
    if (igIds.length > 0) {
      const { data } = await supabase
        .from('dados_financeiros')
        .select(finFields)
        .in('igreja_id', igIds)
        .eq('mes', mesNum)
        .eq('ano', anoNum)

      if (data) {
        for (const d of data) {
          const row = rows.find(r => r.igreja_id === (d as any).igreja_id)
          if (row) {
            for (const key of Object.keys(d) as string[]) {
              if (key !== 'igreja_id' && key in row) {
                (row as any)[key] = (d as any)[key] || 0
              }
            }
          }
        }
      }
    }

    setEditFinanceiroData(rows)
  }

  async function saveFinanceiro() {
    setSavingFinanceiro(true)
    try {
      for (const row of editFinanceiroData) {
        const { igreja_nome, ...payload } = row as any
        payload.updated_at = new Date().toISOString()

        // Check if record already exists
        const { data: existing } = await supabase
          .from('dados_financeiros')
          .select('id')
          .eq('igreja_id', payload.igreja_id)
          .eq('mes', payload.mes)
          .eq('ano', payload.ano)
          .maybeSingle()

        if (existing?.id) {
          // UPDATE existing record
          const { error } = await supabase
            .from('dados_financeiros')
            .update(payload)
            .eq('id', existing.id)
          if (error) {
            console.error('Erro ao atualizar financeiro:', error)
            alert(`Erro ao salvar ${row.igreja_nome}: ${error.message}`)
          }
        } else {
          // INSERT new record
          const { error } = await supabase
            .from('dados_financeiros')
            .insert(payload)
          if (error) {
            console.error('Erro ao inserir financeiro:', error)
            alert(`Erro ao salvar ${row.igreja_nome}: ${error.message}`)
          }
        }
      }
      setShowFinanceiroModal(false)
      fetchMissionario()
    } catch (err) {
      console.error('Erro ao salvar financeiro:', err)
      alert('Erro inesperado ao salvar. Verifique o console.')
    } finally {
      setSavingFinanceiro(false)
    }
  }

  // Helper: initials from name
  function getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('')
  }

  // Helper: progress bar percentage
  function progressPct(actual: number, goal: number): number {
    if (goal === 0) return actual > 0 ? 100 : 0
    return Math.min(100, Math.round((actual / goal) * 100))
  }

  function progressColor(pct: number): string {
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  // Current month totals from reports
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()
  const currentMonthReport = monthlyReports.find(r => r.mes === mesAtual && r.ano === anoAtual)
  const currentGoal = metas.find(m => m.status === 'ativa' && m.ano === anoAtual && (m.tipo_periodo === 'mensal' ? m.mes === mesAtual : true))

  // Chart data
  const lineChartData = {
    labels: monthlyReports.map(r => MONTH_LABELS[r.mes - 1]),
    datasets: [
      {
        label: 'Estudos',
        data: monthlyReports.map(r => r.estudos_biblicos),
        borderColor: COLORS[0],
        backgroundColor: COLORS[0] + '20',
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Visitas',
        data: monthlyReports.map(r => r.visitas_missionarias),
        borderColor: COLORS[1],
        backgroundColor: COLORS[1] + '20',
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Pessoas Trazidas',
        data: monthlyReports.map(r => r.pessoas_trazidas),
        borderColor: COLORS[4],
        backgroundColor: COLORS[4] + '20',
        tension: 0.3,
        fill: false,
      },
    ],
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

  if (!missionario) {
    return (
      <div className="space-y-6">
        <div className="card text-center py-12">
          <p className="text-gray-500">Missionário não encontrado</p>
          <Link to={backUrl} className="text-green-600 hover:underline text-sm mt-2 inline-block">
            Voltar ao inventário
          </Link>
        </div>
      </div>
    )
  }

  const usuario = missionario.usuario as { nome: string; email: string } | null
  const nomeDisplay = missionario.nome || usuario?.nome || 'Sem nome'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to={backUrl} className="hover:text-green-600 flex items-center gap-1">
          <FiArrowLeft className="w-4 h-4" />
          Inventário
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{nomeDisplay}</span>
      </div>

      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar com upload */}
          <div className="flex-shrink-0 relative group">
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFotoUpload}
            />
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              className="relative rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
              title="Clique para alterar a foto"
              disabled={uploadingFoto}
            >
              {missionario.foto_url ? (
                <img
                  src={missionario.foto_url}
                  alt={nomeDisplay}
                  className="w-24 h-24 rounded-full object-cover border-4 border-green-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center border-4 border-green-50">
                  <span className="text-2xl font-bold text-green-700">
                    {getInitials(nomeDisplay)}
                  </span>
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                {uploadingFoto ? (
                  <svg className="animate-spin w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                )}
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{nomeDisplay}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[missionario.status] || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[missionario.status] || missionario.status}
              </span>
              {isAdmin && (
                <button onClick={openEditModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-green-600 transition-colors" title="Editar ficha completa">
                  <FiEdit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-sm text-green-700 font-medium mb-3">
              {CARGO_LABELS[missionario.cargo_ministerial] || missionario.cargo_ministerial}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
              {usuario?.email && (
                <span className="flex items-center gap-1.5">
                  <FiMail className="w-4 h-4" />
                  {usuario.email}
                </span>
              )}
              {missionario.telefone_ministerial && (
                <span className="flex items-center gap-1.5">
                  <FiPhone className="w-4 h-4" />
                  {missionario.telefone_ministerial}
                </span>
              )}
              {missionario.data_inicio_ministerio && (
                <span className="flex items-center gap-1.5">
                  <FiCalendar className="w-4 h-4" />
                  Início: {new Date(missionario.data_inicio_ministerio).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>

            {/* Churches */}
            {igrejas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {igrejas.map(ig => (
                  <span key={ig.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    <FiMapPin className="w-3 h-3" />
                    {ig.nome}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-px">
        {DETAIL_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'text-green-700 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Ficha Biográfica */}
      {activeTab === 'ficha_biografica' && (
        <div className="space-y-6">
          {/* Edit Button */}
          {(profile?.papel === 'admin' || profile?.papel === 'admin_uniao' || profile?.papel === 'admin_associacao') && (
            <div className="flex justify-end">
              <button onClick={openEditModal} className="btn-primary flex items-center gap-2">
                <FiEdit2 className="w-4 h-4" />
                Editar Ficha
              </button>
            </div>
          )}

          {/* Secao A - Dados Pessoais */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiUser className="w-5 h-5 text-green-600" />
              Dados Pessoais
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Nome', nomeDisplay],
                ['Sexo', missionario.sexo === 'masculino' ? 'Masculino' : missionario.sexo === 'feminino' ? 'Feminino' : null],
                ['Data de Nascimento', missionario.data_nascimento ? new Date(missionario.data_nascimento).toLocaleDateString('pt-BR') : null],
                ['Naturalidade', missionario.cidade_nascimento && missionario.uf_nascimento ? `${missionario.cidade_nascimento} - ${missionario.uf_nascimento}` : missionario.cidade_nascimento],
                ['Nacionalidade', missionario.nacionalidade],
                ['Profissão', missionario.profissao],
                ['Escolaridade', missionario.escolaridade],
                ['Nome do Pai', missionario.nome_pai],
                ['Nome da Mãe', missionario.nome_mae],
                ['Estado Civil', missionario.estado_civil],
                ['Data de Casamento', missionario.data_casamento ? new Date(missionario.data_casamento).toLocaleDateString('pt-BR') : null],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{(value as string) || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Secao B - Documentos */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiFile className="w-5 h-5 text-blue-600" />
              Documentos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['RG', missionario.rg_numero ? `${missionario.rg_numero}${missionario.rg_orgao ? ` (${missionario.rg_orgao})` : ''}` : null],
                ['CPF', missionario.cpf],
                ['PIS', missionario.pis_numero ? `${missionario.pis_numero}${missionario.pis_orgao ? ` (${missionario.pis_orgao})` : ''}` : null],
                ['NIT', missionario.nit_numero],
                ['Título Eleitor', missionario.titulo_eleitor],
                ['CTPS Serie/UF', missionario.ctps_serie_uf],
                ['CNH', missionario.cnh],
                ['Passaporte', missionario.passaporte],
                ['Reservista', missionario.reservista],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{(value as string) || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Secao C - Contato */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiPhone className="w-5 h-5 text-purple-600" />
              Contato e Endereço
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Endereço', missionario.endereco],
                ['Bairro', missionario.endereco_bairro],
                ['Cidade/UF', missionario.endereco_cidade && missionario.endereco_uf ? `${missionario.endereco_cidade} - ${missionario.endereco_uf}` : missionario.endereco_cidade],
                ['CEP', missionario.endereco_cep],
                ['Telefone', missionario.telefone],
                ['Celular', missionario.celular],
                ['Email Pessoal', missionario.email_pessoal],
                ['Telefone Ministerial', missionario.telefone_ministerial],
                ['Email Institucional', usuario?.email],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{(value as string) || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Secao D - Dependentes */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiUsers className="w-5 h-5 text-amber-600" />
              Dependentes
            </h2>
            {/* Cônjuge */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Cônjuge</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  ['Nome', missionario.conjuge_nome],
                  ['Data de Nascimento', missionario.conjuge_nascimento ? new Date(missionario.conjuge_nascimento).toLocaleDateString('pt-BR') : null],
                  ['Naturalidade', missionario.conjuge_cidade && missionario.conjuge_uf ? `${missionario.conjuge_cidade} - ${missionario.conjuge_uf}` : missionario.conjuge_cidade],
                  ['Nacionalidade', missionario.conjuge_nacionalidade],
                  ['Escolaridade', missionario.conjuge_escolaridade],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{(value as string) || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Filhos */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Filhos</h3>
              {(missionario.filhos && missionario.filhos.length > 0) ? (
                <div className="space-y-2">
                  {missionario.filhos.map((f, i) => (
                    <div key={i} className="flex items-center gap-4 p-2 bg-gray-50 rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-medium">{i + 1}</span>
                      <span className="text-sm text-gray-800 font-medium">{f.nome}</span>
                      {f.nascimento && <span className="text-xs text-gray-500">{new Date(f.nascimento).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nenhum filho cadastrado</p>
              )}
            </div>
          </div>

          {/* Secao E - Dados Religiosos (Timeline) */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FiAward className="w-5 h-5 text-green-600" />
              Ordenações e Marcos
            </h2>
            <div className="mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Religião Anterior</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{missionario.religiao_anterior || '-'}</p>
            </div>
            <div className="relative pl-8">
              {ORDENACAO_MARCOS.map((marco, idx) => {
                const dataKey = `data_${marco.key}` as keyof typeof missionario
                const oficianteKey = `${marco.key}_oficiante` as keyof typeof missionario
                const localKey = `${marco.key}_local` as keyof typeof missionario
                const ufKey = `${marco.key}_uf` as keyof typeof missionario
                const data = missionario[dataKey] as string | null
                const oficiante = missionario[oficianteKey] as string | null
                const local = missionario[localKey] as string | null
                const uf = missionario[ufKey] as string | null
                const hasData = !!data

                return (
                  <div key={marco.key} className="relative mb-6 last:mb-0">
                    {/* Vertical line */}
                    {idx < ORDENACAO_MARCOS.length - 1 && (
                      <div className={`absolute left-[-20px] top-6 w-0.5 h-full ${hasData ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                    {/* Circle */}
                    <div className={`absolute left-[-24px] top-1 w-4 h-4 rounded-full border-2 ${hasData ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300'}`} />
                    {/* Content */}
                    <div className={hasData ? '' : 'opacity-40'}>
                      <p className="text-sm font-semibold text-gray-800">{marco.label}</p>
                      {hasData ? (
                        <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                          <p>Data: {new Date(data!).toLocaleDateString('pt-BR')}</p>
                          {oficiante && <p>Oficiante: {oficiante}</p>}
                          {local && <p>Local: {local}{uf ? ` - ${uf}` : ''}</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Não registrado</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Secao F - Histórico Biográfico */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Histórico Biográfico</h2>
            </div>
            {historico.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhum histórico registrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Cidade/UF</th>
                      <th className="px-4 py-3">Função</th>
                      <th className="px-4 py-3">Decisão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historico.map(h => (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{h.data ? new Date(h.data).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="px-4 py-3 text-gray-800">{h.cidade_uf || '-'}</td>
                        <td className="px-4 py-3 text-gray-800">{h.funcao || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{h.decisao || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seções G e H (Bancário/Parâmetros) removidas conforme solicitado */}
        </div>
      )}

      {/* TAB: Visão Geral */}
      {activeTab === 'visao_geral' && (
        <div className="space-y-6">
          {/* Header with PDF button */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Visão Geral do Campo</h2>
            <div className="relative">
              <button
                onClick={() => setShowPdfMenu(!showPdfMenu)}
                disabled={generatingPdf}
                className="btn-primary flex items-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                {generatingPdf ? 'Gerando...' : 'Gerar PDF'}
                <FiChevronDown className="w-3 h-3" />
              </button>
              {showPdfMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPdfMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 w-56">
                    <button
                      onClick={async () => { setShowPdfMenu(false); setGeneratingPdf(true); await generatePDF('digital'); setGeneratingPdf(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                    >
                      <FiDownload className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-800">PDF Digital</p>
                        <p className="text-xs text-gray-500">Visual completo com cores</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setShowPdfMenu(false); generatePDF('print') }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-3"
                    >
                      <FiFile className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-800">PDF Impressão</p>
                        <p className="text-xs text-gray-500">Otimizado para imprimir</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card relative">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-100">
                  <FiUsers className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{totalMembros}</p>
                  <p className="text-xs text-gray-500">Membros Ativos</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={openContagensModal} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600" title="Editar contagens">
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="card relative">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100">
                  <FiUsers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{totalInteressados}</p>
                  <p className="text-xs text-gray-500">Interessados</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={openContagensModal} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600" title="Editar contagens">
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="card relative">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100">
                  <FiMapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{igrejas.length}</p>
                  <p className="text-xs text-gray-500">Igrejas</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={openIgrejasModal} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-purple-600" title="Editar igrejas">
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="card relative">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100">
                  <FiDollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {financeiro.length > 0
                      ? `R$ ${financeiro.reduce((s, f) => s + f.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : 'R$ 0'}
                  </p>
                  <p className="text-xs text-gray-500">Receita {new Date().getFullYear()}</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => openFinanceiroModal()} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-600" title="Editar dados financeiros">
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Church Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Igrejas do Campo</h3>
              {isAdmin && (
                <button onClick={openIgrejasModal} className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 font-medium">
                  <FiEdit2 className="w-3.5 h-3.5" />
                  Editar Igrejas
                </button>
              )}
            </div>
            {igrejas.length === 0 ? (
              <div className="card text-center py-8">
                <FiMapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Nenhuma igreja vinculada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {igrejas.map(ig => {
                  const igFin = financeiroByIgreja[ig.id]
                  const isExpanded = expandedIgreja === ig.id
                  return (
                    <div key={ig.id} className="card p-0 overflow-hidden">
                      <button
                        onClick={() => setExpandedIgreja(isExpanded ? null : ig.id)}
                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-800">{ig.nome}</h4>
                              {igrejaFuncaoMap[ig.id] && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  {igrejaFuncaoMap[ig.id]}
                                </span>
                              )}
                              {ig.tipo && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  ig.tipo === 'Templo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {ig.tipo}
                                </span>
                              )}
                            </div>
                            {(ig.endereco_cidade || ig.endereco_estado) && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <FiMapPin className="w-3 h-3" />
                                {[ig.endereco_cidade, ig.endereco_estado].filter(Boolean).join(' - ')}
                              </p>
                            )}
                          </div>
                          {isExpanded ? <FiChevronUp className="w-4 h-4 text-gray-400" /> : <FiChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-green-700 font-medium">{ig.membros_ativos || 0} membros</span>
                          <span className="text-blue-600">{ig.interessados || 0} interessados</span>
                          {igFin && <span className="text-emerald-600">R$ {igFin.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Membros Ativos</p>
                              <p className="font-semibold text-gray-800">{ig.membros_ativos || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Interessados</p>
                              <p className="font-semibold text-gray-800">{ig.interessados || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Tipo</p>
                              <p className="font-semibold text-gray-800">{ig.tipo || '-'}</p>
                            </div>
                            {ig.telefone && (
                              <div>
                                <p className="text-xs text-gray-500">Telefone</p>
                                <p className="font-semibold text-gray-800">{ig.telefone}</p>
                              </div>
                            )}
                            {igFin && (
                              <>
                                <div>
                                  <p className="text-xs text-gray-500">Dízimo/Primícia ({new Date().getFullYear()})</p>
                                  <p className="font-semibold text-green-700">R$ {igFin.dizimos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Ofertas ({new Date().getFullYear()})</p>
                                  <p className="font-semibold text-blue-600">R$ {igFin.ofertas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Financial Summary - Detailed Breakdown */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                <FiDollarSign className="inline w-5 h-5 mr-1" />
                Caixa da Associação
              </h3>
              {isAdmin && (
                <button onClick={() => openFinanceiroModal()} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600" title="Editar dados financeiros">
                  <FiEdit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {financeiro.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Sem dados financeiros disponíveis</p>
                {isAdmin && (
                  <button onClick={() => openFinanceiroModal()} className="mt-3 text-sm text-green-600 hover:text-green-800 font-medium">
                    + Adicionar dados financeiros
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-gray-100">
                {financeiro.map(f => {
                  const monthKey = `${f.ano}-${f.mes}`
                  const isExpanded = expandedFinMonth === monthKey
                  const fmt = (v: number) => v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'

                  return (
                    <div key={monthKey}>
                      {/* Month header row - clickable */}
                      <button
                        onClick={() => setExpandedFinMonth(isExpanded ? null : monthKey)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <FiChevronUp className="w-4 h-4 text-gray-400" /> : <FiChevronDown className="w-4 h-4 text-gray-400" />}
                          <span className="font-semibold text-gray-800">{MESES[f.mes - 1]} {f.ano}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-green-700">Díz: R$ {fmt(f.dizimo)}</span>
                          <span className="text-blue-600">Prim: R$ {fmt(f.primicias)}</span>
                          <span className="font-bold text-gray-800">Total: R$ {fmt(f.total)}</span>
                          {isAdmin && (
                            <button onClick={(e) => { e.stopPropagation(); openFinanceiroModal(f.mes, f.ano) }} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-green-600" title="Editar">
                              <FiEdit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </button>

                      {/* Expanded detail: per-church breakdown table */}
                      {isExpanded && (
                        <div className="bg-gray-50 border-t border-gray-200 overflow-x-auto">
                          <table className="w-full text-xs whitespace-nowrap">
                            <thead>
                              <tr className="bg-green-700 text-white text-center">
                                <th className="px-2 py-2 text-left font-medium sticky left-0 bg-green-700 z-10">Igreja</th>
                                <th className="px-2 py-2 font-medium">Díz.</th>
                                <th className="px-2 py-2 font-medium">Prim.</th>
                                <th className="px-2 py-2 font-medium">A.Soci</th>
                                <th className="px-2 py-2 font-medium">E.Sab</th>
                                <th className="px-2 py-2 font-medium">Evang</th>
                                <th className="px-2 py-2 font-medium">Rd/CB</th>
                                <th className="px-2 py-2 font-medium">Const.</th>
                                <th className="px-2 py-2 font-medium">Mús.</th>
                                <th className="px-2 py-2 font-medium">Grt6%</th>
                                <th className="px-2 py-2 font-medium">Div.</th>
                                <th className="px-2 py-2 font-medium bg-green-800">SOMA</th>
                                <th className="px-2 py-2 font-medium">Miss.Estr</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {f.churches.map((ch, ci) => (
                                <tr key={ch.igreja_id} className={ci % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-2 py-1.5 text-left font-medium text-gray-700 sticky left-0 z-10" style={{ backgroundColor: ci % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                    {ch.igreja_nome.replace('Igreja ', '').replace(' - ', ' ')}
                                  </td>
                                  <td className="px-2 py-1.5 text-right text-green-700 font-medium">{fmt(ch.dizimo)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.primicias)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.assist_social)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.esc_sabatina)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.evangelismo)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.radio_curso_biblico)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.construcao)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.musica)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.gratidao_6pct)}</td>
                                  <td className="px-2 py-1.5 text-right">{fmt(ch.diverso_assoc)}</td>
                                  <td className="px-2 py-1.5 text-right font-bold text-gray-800 bg-green-50">{fmt(ch.soma_assoc)}</td>
                                  <td className="px-2 py-1.5 text-right text-blue-600">{fmt(ch.missoes_estrang)}</td>
                                </tr>
                              ))}
                              {/* Total row */}
                              <tr className="bg-green-50 font-bold border-t-2 border-green-300">
                                <td className="px-2 py-2 text-left text-green-800 sticky left-0 bg-green-50 z-10">TOTAL</td>
                                <td className="px-2 py-2 text-right text-green-800">{fmt(f.dizimo)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.primicias)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.assist_social)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.esc_sabatina)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.evangelismo)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.radio_curso_biblico)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.construcao)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.musica)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.gratidao_6pct)}</td>
                                <td className="px-2 py-2 text-right">{fmt(f.diverso_assoc)}</td>
                                <td className="px-2 py-2 text-right text-green-800 bg-green-100">{fmt(f.dizimo + f.primicias + f.assist_social + f.esc_sabatina + f.evangelismo + f.radio_curso_biblico + f.construcao + f.musica + f.gratidao_6pct + f.diverso_assoc)}</td>
                                <td className="px-2 py-2 text-right text-blue-700">{fmt(f.missoes_estrang)}</td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="px-4 py-2 text-right text-sm font-bold text-green-800 border-t border-green-200 bg-green-50">
                            Total Geral: R$ {fmt(f.total)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Classes Bíblicas */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                <FiCheckCircle className="inline w-5 h-5 mr-1 text-green-500" />
                Classes Bíblicas
                {classesBatismais.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({classesBatismais.reduce((s, c) => s + (c.alunos?.length || 0), 0)} alunos total)
                  </span>
                )}
              </h3>
              <Link
                to="/escola-sabatina/batismais"
                className="btn-primary text-xs inline-flex items-center gap-1 px-3 py-1.5"
              >
                <FiPlus className="w-3.5 h-3.5" /> Nova Classe
              </Link>
            </div>
            {classesBatismais.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Nenhuma classe bíblica registrada</p>
                <Link to="/escola-sabatina/batismais" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
                  Criar classe bíblica →
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3 text-center">Alunos</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classesBatismais.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.nome}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{c.alunos?.length || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'ativa' ? 'bg-green-100 text-green-700' :
                          c.status === 'concluida' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {c.status === 'ativa' ? 'Ativa' : c.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Monthly Trend Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendência Mensal</h3>
            {monthlyReports.length > 0 ? (
              <div className="h-72">
                <Line data={lineChartData} options={chartOptions()} />
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">Sem dados de relatórios para exibir</p>
            )}
          </div>

          {/* Termo de Compromisso (online view) */}
          <TermoCompromissoDisplay missionarioNome={nomeDisplay} />

          {/* Progress Bars (if goals exist) */}
          {currentGoal && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Progresso das Metas - {MESES[mesAtual - 1]} {anoAtual}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Estudos Bíblicos', actual: currentMonthReport?.estudos_biblicos || 0, goal: currentGoal.meta_estudos_biblicos },
                  { label: 'Visitas', actual: currentMonthReport?.visitas_missionarias || 0, goal: currentGoal.meta_visitas },
                  { label: 'Pessoas Trazidas', actual: currentMonthReport?.pessoas_trazidas || 0, goal: currentGoal.meta_pessoas_trazidas },
                  { label: 'Horas Trabalho', actual: currentMonthReport?.horas_trabalho || 0, goal: currentGoal.meta_horas_trabalho },
                  { label: 'Literatura', actual: currentMonthReport?.literatura_distribuida || 0, goal: currentGoal.meta_literatura },
                  { label: 'Convites', actual: currentMonthReport?.convites_feitos || 0, goal: currentGoal.meta_convites },
                ].map(item => {
                  const pct = progressPct(item.actual, item.goal)
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-medium text-gray-800">{item.actual} / {item.goal}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${progressColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 text-right">{pct}%</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Campo */}
      {activeTab === 'campo' && (
        <div className="space-y-6">
          {/* KPI Cards with edit buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card relative">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <FiUsers className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{totalMembros}</p>
                  <p className="text-xs text-gray-500">Membros Ativos</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={openContagensModal} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600" title="Editar">
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="card relative">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <FiUsers className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{totalInteressados}</p>
                  <p className="text-xs text-gray-500">Interessados</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={openContagensModal} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600" title="Editar">
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="card relative">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100">
                  <FiMapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{igrejas.length}</p>
                  <p className="text-xs text-gray-500">Igrejas</p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={openIgrejasModal} className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-purple-600" title="Editar igrejas">
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions for Admin */}
          {isAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button onClick={openEditModal} className="card hover:shadow-md transition-shadow text-left flex items-center gap-3 cursor-pointer">
                <div className="p-2 rounded-lg bg-gray-100"><FiUser className="w-5 h-5 text-gray-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Editar Ficha Biográfica</p>
                  <p className="text-xs text-gray-500">Dados pessoais, documentos</p>
                </div>
              </button>
              <button onClick={openIgrejasModal} className="card hover:shadow-md transition-shadow text-left flex items-center gap-3 cursor-pointer">
                <div className="p-2 rounded-lg bg-purple-100"><FiMapPin className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Editar Igrejas</p>
                  <p className="text-xs text-gray-500">Adicionar/remover igrejas</p>
                </div>
              </button>
              <button onClick={openContagensModal} className="card hover:shadow-md transition-shadow text-left flex items-center gap-3 cursor-pointer">
                <div className="p-2 rounded-lg bg-blue-100"><FiUsers className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Editar Membros</p>
                  <p className="text-xs text-gray-500">Membros e interessados</p>
                </div>
              </button>
              <button onClick={() => openFinanceiroModal()} className="card hover:shadow-md transition-shadow text-left flex items-center gap-3 cursor-pointer">
                <div className="p-2 rounded-lg bg-emerald-100"><FiDollarSign className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Editar Financeiro</p>
                  <p className="text-xs text-gray-500">Dízimos, primícias, ofertas</p>
                </div>
              </button>
            </div>
          )}

          {/* Link to Relatório de Campo */}
          <div className="card text-center py-6">
            <FiFileText className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">Veja os dados detalhados na aba <strong>Visão Geral</strong> ou acesse o relatório completo.</p>
            <Link to="/missoes/relatorio-campo" className="btn-primary inline-flex items-center gap-2">
              <FiFileText className="w-4 h-4" />
              Abrir Relatório de Campo
            </Link>
          </div>
        </div>
      )}

      {/* TAB: Atividades */}
      {activeTab === 'atividades' && (
        <div className="space-y-4">
          {atividades.length === 0 ? (
            <div className="card text-center py-12">
              <FiCalendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Nenhuma atividade registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {atividades.map(a => {
                const Icon = TIPO_ATIVIDADE_ICONS[a.tipo] || FiActivity
                const igreja = a.igreja as { nome: string } | null
                return (
                  <div key={a.id} className="card flex gap-4">
                    <div className="flex-shrink-0 p-2.5 rounded-xl bg-green-50">
                      <Icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-800">{a.titulo}</h3>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {TIPO_ATIVIDADE_LABELS[a.tipo] || a.tipo}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3" />
                          {new Date(a.data).toLocaleDateString('pt-BR')}
                        </span>
                        {a.hora_inicio && (
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {a.hora_inicio}{a.hora_fim ? ` - ${a.hora_fim}` : ''}
                          </span>
                        )}
                        {igreja?.nome && (
                          <span className="flex items-center gap-1">
                            <FiMapPin className="w-3 h-3" />
                            {igreja.nome}
                          </span>
                        )}
                        {a.numero_participantes > 0 && (
                          <span className="flex items-center gap-1">
                            <FiUsers className="w-3 h-3" />
                            {a.numero_participantes} participantes
                          </span>
                        )}
                      </div>
                      {a.descricao && (
                        <p className="text-sm text-gray-600 mt-1">{a.descricao}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Relatórios */}
      {activeTab === 'relatorios' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">
              Relatórios Mensais ({relatorios.length})
            </h2>
          </div>
          {relatorios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum relatório encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Membro</th>
                    <th className="px-4 py-3 text-center">Estudos</th>
                    <th className="px-4 py-3 text-center">Visitas</th>
                    <th className="px-4 py-3 text-center">Literatura</th>
                    <th className="px-4 py-3 text-center">Contatos</th>
                    <th className="px-4 py-3 text-center">Trazidas</th>
                    <th className="px-4 py-3 text-right">Horas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {relatorios.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600">
                        {MESES[r.mes - 1]} {r.ano}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {r.pessoa?.nome || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-blue-600 font-medium">{r.estudos_biblicos}</td>
                      <td className="px-4 py-3 text-center text-green-600">{r.visitas_missionarias}</td>
                      <td className="px-4 py-3 text-center text-purple-600">{r.literatura_distribuida}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.pessoas_contatadas}</td>
                      <td className="px-4 py-3 text-center text-amber-600 font-medium">{r.pessoas_trazidas}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{r.horas_trabalho}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Avaliacoes */}
      {activeTab === 'avaliacoes' && (
        <div className="space-y-4">
          {avaliacoes.length === 0 ? (
            <div className="card text-center py-12">
              <FiStar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Nenhuma avaliação registrada</p>
            </div>
          ) : (
            avaliacoes.map(av => (
              <div key={av.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Avaliação{av.tipo_periodo === 'mensal' ? `${MESES[(av.mes || 1) - 1]}` : av.tipo_periodo === 'trimestral' ? `${av.trimestre}o Trimestre` : av.tipo_periodo} {av.ano}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      av.status === 'publicada' ? 'bg-green-100 text-green-700' :
                      av.status === 'vista' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {av.status === 'publicada' ? 'Publicada' : av.status === 'vista' ? 'Vista' : 'Rascunho'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-800">{av.nota_geral.toFixed(1)}</p>
                    <p className="text-xs text-gray-500">Nota Geral</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                  {[
                    { label: 'Pastoral', value: av.nota_pastoral },
                    { label: 'Evangelismo', value: av.nota_evangelismo },
                    { label: 'Lideranca', value: av.nota_lideranca },
                    { label: 'Administrativa', value: av.nota_administrativa },
                    { label: 'Financeiro', value: av.nota_financeiro },
                  ].map(n => (
                    <div key={n.label} className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-semibold text-gray-700">{n.value.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">{n.label}</p>
                    </div>
                  ))}
                </div>

                {av.pontos_fortes && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Pontos Fortes</p>
                    <p className="text-sm text-gray-700">{av.pontos_fortes}</p>
                  </div>
                )}
                {av.pontos_melhoria && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Pontos de Melhoria</p>
                    <p className="text-sm text-gray-700">{av.pontos_melhoria}</p>
                  </div>
                )}
                {av.plano_acao && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Plano de Ação</p>
                    <p className="text-sm text-gray-700">{av.plano_acao}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: Metas */}
      {activeTab === 'metas' && (
        <div className="space-y-4">
          {metas.length === 0 ? (
            <div className="card text-center py-12">
              <FiTarget className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Nenhuma meta registrada</p>
            </div>
          ) : (
            metas.map(m => (
              <div key={m.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Meta {m.tipo_periodo === 'mensal' ? `${MESES[(m.mes || 1) - 1]}` : m.tipo_periodo === 'trimestral' ? `${m.trimestre}o Trimestre` : 'Anual'} {m.ano}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      m.status === 'ativa' ? 'bg-green-100 text-green-700' :
                      m.status === 'concluida' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {m.status === 'ativa' ? 'Ativa' : m.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Estudos Bíblicos', value: m.meta_estudos_biblicos },
                    { label: 'Visitas', value: m.meta_visitas },
                    { label: 'Literatura', value: m.meta_literatura },
                    { label: 'Pessoas Contatadas', value: m.meta_pessoas_contatadas },
                    { label: 'Convites', value: m.meta_convites },
                    { label: 'Pessoas Trazidas', value: m.meta_pessoas_trazidas },
                    { label: 'Horas Trabalho', value: m.meta_horas_trabalho },
                    { label: 'Batismos', value: m.meta_batismos },
                    { label: 'Classes Bíblicas', value: m.meta_classes_batismais },
                    { label: 'Crescimento Membros', value: m.meta_crescimento_membros },
                  ].filter(item => item.value > 0).map(item => (
                    <div key={item.label} className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-gray-800">{item.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                {m.observacoes && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-600">{m.observacoes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-800">Editar Ficha Biográfica</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowEditModal(false)} className="btn-secondary">Cancelar</button>
                <button onClick={saveEditForm} disabled={savingEdit} className="btn-primary">
                  {savingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Cargo e Status */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Cargo e Status</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="label-field">Cargo Ministerial</label>
                    <select className="input-field" value={editForm.cargo_ministerial || ''} onChange={e => setEditForm(f => ({...f, cargo_ministerial: e.target.value}))}>
                      {Object.entries(CARGO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Status</label>
                    <select className="input-field" value={editForm.status || ''} onChange={e => setEditForm(f => ({...f, status: e.target.value}))}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Formação Teológica</label>
                    <input className="input-field" value={editForm.formacao_teologica || ''} onChange={e => setEditForm(f => ({...f, formacao_teologica: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-field">Especialidade</label>
                    <input className="input-field" value={editForm.especialidade || ''} onChange={e => setEditForm(f => ({...f, especialidade: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-field">Motivo Inativo</label>
                    <input className="input-field" value={editForm.motivo_inativo || ''} onChange={e => setEditForm(f => ({...f, motivo_inativo: e.target.value}))} />
                  </div>
                  <div>
                    <label className="label-field">Associação / Campo</label>
                    <select
                      className="input-field"
                      value={editForm.associacao_id || ''}
                      onChange={e => {
                        const newId = e.target.value || null
                        const assoc = allAssociacoes.find(a => a.id === newId)
                        setEditForm(f => ({
                          ...f,
                          associacao_id: newId,
                          uniao_id: assoc?.uniao_id ?? f.uniao_id ?? null,
                        }))
                      }}
                    >
                      <option value="">— Sem associação —</option>
                      {allAssociacoes.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.sigla} — {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Dados Pessoais */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Dados Pessoais</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="label-field">Sexo</label>
                    <select className="input-field" value={editForm.sexo || ''} onChange={e => setEditForm(f => ({...f, sexo: e.target.value || null}))}>
                      <option value="">-</option>
                      {SEXO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Data de Nascimento</label>
                    <input type="date" className="input-field" value={editForm.data_nascimento || ''} onChange={e => setEditForm(f => ({...f, data_nascimento: e.target.value || null}))} />
                  </div>
                  <div>
                    <label className="label-field">Cidade Nascimento</label>
                    <input className="input-field" value={editForm.cidade_nascimento || ''} onChange={e => setEditForm(f => ({...f, cidade_nascimento: e.target.value || null}))} />
                  </div>
                  <div>
                    <label className="label-field">UF Nascimento</label>
                    <select className="input-field" value={editForm.uf_nascimento || ''} onChange={e => setEditForm(f => ({...f, uf_nascimento: e.target.value || null}))}>
                      <option value="">-</option>
                      {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Nacionalidade</label>
                    <input className="input-field" value={editForm.nacionalidade || ''} onChange={e => setEditForm(f => ({...f, nacionalidade: e.target.value || null}))} />
                  </div>
                  <div>
                    <label className="label-field">Profissão</label>
                    <input className="input-field" value={editForm.profissao || ''} onChange={e => setEditForm(f => ({...f, profissao: e.target.value || null}))} />
                  </div>
                  <div>
                    <label className="label-field">Escolaridade</label>
                    <select className="input-field" value={editForm.escolaridade || ''} onChange={e => setEditForm(f => ({...f, escolaridade: e.target.value || null}))}>
                      <option value="">-</option>
                      {ESCOLARIDADE_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Nome do Pai</label>
                    <input className="input-field" value={editForm.nome_pai || ''} onChange={e => setEditForm(f => ({...f, nome_pai: e.target.value || null}))} />
                  </div>
                  <div>
                    <label className="label-field">Nome da Mae</label>
                    <input className="input-field" value={editForm.nome_mae || ''} onChange={e => setEditForm(f => ({...f, nome_mae: e.target.value || null}))} />
                  </div>
                  <div>
                    <label className="label-field">Estado Civil</label>
                    <select className="input-field" value={editForm.estado_civil || ''} onChange={e => setEditForm(f => ({...f, estado_civil: e.target.value || null}))}>
                      <option value="">-</option>
                      {ESTADO_CIVIL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Data de Casamento</label>
                    <input type="date" className="input-field" value={editForm.data_casamento || ''} onChange={e => setEditForm(f => ({...f, data_casamento: e.target.value || null}))} />
                  </div>
                </div>
              </fieldset>

              {/* Documentos */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Documentos</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    ['rg_numero', 'RG Numero'],
                    ['rg_orgao', 'RG Orgao Expedidor'],
                    ['cpf', 'CPF'],
                    ['pis_numero', 'PIS Numero'],
                    ['pis_orgao', 'PIS Orgao'],
                    ['nit_numero', 'NIT Numero'],
                    ['titulo_eleitor', 'Título Eleitor'],
                    ['ctps_serie_uf', 'CTPS Serie/UF'],
                    ['cnh', 'CNH'],
                    ['passaporte', 'Passaporte'],
                    ['reservista', 'Reservista'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="label-field">{label}</label>
                      <input className="input-field" value={editForm[key] || ''} onChange={e => setEditForm(f => ({...f, [key]: e.target.value || null}))} />
                    </div>
                  ))}
                </div>
              </fieldset>

              {/* Contato */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Contato e Endereço</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="label-field">Endereço</label>
                    <input className="input-field" value={editForm.endereco || ''} onChange={e => setEditForm(f => ({...f, endereco: e.target.value || null}))} />
                  </div>
                  {[
                    ['endereco_bairro', 'Bairro'],
                    ['endereco_cidade', 'Cidade'],
                    ['endereco_cep', 'CEP'],
                    ['telefone', 'Telefone'],
                    ['celular', 'Celular'],
                    ['email_pessoal', 'Email Pessoal'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="label-field">{label}</label>
                      <input className="input-field" value={editForm[key] || ''} onChange={e => setEditForm(f => ({...f, [key]: e.target.value || null}))} />
                    </div>
                  ))}
                  <div>
                    <label className="label-field">UF</label>
                    <select className="input-field" value={editForm.endereco_uf || ''} onChange={e => setEditForm(f => ({...f, endereco_uf: e.target.value || null}))}>
                      <option value="">-</option>
                      {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
              </fieldset>

              {/* Dependentes */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Dependentes</legend>
                <p className="text-xs text-gray-500 mb-3 font-semibold uppercase">Cônjuge</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    ['conjuge_nome', 'Nome do(a) Cônjuge'],
                    ['conjuge_cidade', 'Cidade'],
                    ['conjuge_nacionalidade', 'Nacionalidade'],
                    ['conjuge_escolaridade', 'Escolaridade'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="label-field">{label}</label>
                      <input className="input-field" value={editForm[key] || ''} onChange={e => setEditForm(f => ({...f, [key]: e.target.value || null}))} />
                    </div>
                  ))}
                  <div>
                    <label className="label-field">Data de Nascimento</label>
                    <input type="date" className="input-field" value={editForm.conjuge_nascimento || ''} onChange={e => setEditForm(f => ({...f, conjuge_nascimento: e.target.value || null}))} />
                  </div>
                  <div>
                    <label className="label-field">UF</label>
                    <select className="input-field" value={editForm.conjuge_uf || ''} onChange={e => setEditForm(f => ({...f, conjuge_uf: e.target.value || null}))}>
                      <option value="">-</option>
                      {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Filhos</p>
                {(editForm.filhos || []).map((f: any, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input className="input-field flex-1" placeholder="Nome" value={f.nome || ''} onChange={e => {
                      const arr = [...(editForm.filhos || [])]
                      arr[i] = { ...arr[i], nome: e.target.value }
                      setEditForm(prev => ({...prev, filhos: arr}))
                    }} />
                    <input type="date" className="input-field w-40" value={f.nascimento || ''} onChange={e => {
                      const arr = [...(editForm.filhos || [])]
                      arr[i] = { ...arr[i], nascimento: e.target.value || undefined }
                      setEditForm(prev => ({...prev, filhos: arr}))
                    }} />
                    <button className="text-red-500 hover:text-red-700 px-2" onClick={() => {
                      const arr = (editForm.filhos || []).filter((_: any, idx: number) => idx !== i)
                      setEditForm(prev => ({...prev, filhos: arr}))
                    }}><FiTrash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1 mt-1" onClick={() => {
                  setEditForm(prev => ({...prev, filhos: [...(prev.filhos || []), { nome: '', nascimento: '' }]}))
                }}><FiPlus className="w-4 h-4" /> Adicionar Filho</button>
              </fieldset>

              {/* Ordenações */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Ordenações e Marcos</legend>
                <div className="mb-4">
                  <label className="label-field">Religião Anterior</label>
                  <input className="input-field" value={editForm.religiao_anterior || ''} onChange={e => setEditForm(f => ({...f, religiao_anterior: e.target.value || null}))} />
                </div>
                {ORDENACAO_MARCOS.map(marco => (
                  <div key={marco.key} className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-2">{marco.label}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="label-field">Data</label>
                        <input type="date" className="input-field" value={editForm[`data_${marco.key}`] || ''} onChange={e => setEditForm(f => ({...f, [`data_${marco.key}`]: e.target.value || null}))} />
                      </div>
                      <div>
                        <label className="label-field">Oficiante</label>
                        <input className="input-field" value={editForm[`${marco.key}_oficiante`] || ''} onChange={e => setEditForm(f => ({...f, [`${marco.key}_oficiante`]: e.target.value || null}))} />
                      </div>
                      <div>
                        <label className="label-field">Local</label>
                        <input className="input-field" value={editForm[`${marco.key}_local`] || ''} onChange={e => setEditForm(f => ({...f, [`${marco.key}_local`]: e.target.value || null}))} />
                      </div>
                      <div>
                        <label className="label-field">UF</label>
                        <select className="input-field" value={editForm[`${marco.key}_uf`] || ''} onChange={e => setEditForm(f => ({...f, [`${marco.key}_uf`]: e.target.value || null}))}>
                          <option value="">-</option>
                          {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </fieldset>

              {/* Histórico */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Histórico Biográfico</legend>
                {editHistorico.map((h, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-2 items-end">
                    <div>
                      <label className="label-field">Data</label>
                      <input type="date" className="input-field" value={h.data || ''} onChange={e => {
                        const arr = [...editHistorico]
                        arr[i] = { ...arr[i], data: e.target.value || null }
                        setEditHistorico(arr)
                      }} />
                    </div>
                    <div>
                      <label className="label-field">Cidade/UF</label>
                      <input className="input-field" value={h.cidade_uf || ''} onChange={e => {
                        const arr = [...editHistorico]
                        arr[i] = { ...arr[i], cidade_uf: e.target.value || null }
                        setEditHistorico(arr)
                      }} />
                    </div>
                    <div>
                      <label className="label-field">Função</label>
                      <input className="input-field" value={h.funcao || ''} onChange={e => {
                        const arr = [...editHistorico]
                        arr[i] = { ...arr[i], funcao: e.target.value || null }
                        setEditHistorico(arr)
                      }} />
                    </div>
                    <div>
                      <label className="label-field">Decisão</label>
                      <input className="input-field" value={h.decisao || ''} onChange={e => {
                        const arr = [...editHistorico]
                        arr[i] = { ...arr[i], decisao: e.target.value || null }
                        setEditHistorico(arr)
                      }} />
                    </div>
                    <button className="text-red-500 hover:text-red-700 h-10 flex items-center" onClick={() => {
                      setEditHistorico(prev => prev.filter((_, idx) => idx !== i))
                    }}><FiTrash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1 mt-2" onClick={() => {
                  setEditHistorico(prev => [...prev, { id: '', missionario_id: id!, data: null, cidade_uf: null, funcao: null, decisao: null, observacoes: null, created_at: '' }])
                }}><FiPlus className="w-4 h-4" /> Adicionar Registro</button>
              </fieldset>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar Parâmetros (Bancário + Reembolso) ── */}
      {showParamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Dados Bancários e Parâmetros</h3>
              <button onClick={() => setShowParamModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            {/* Dados Bancários */}
            <fieldset className="border rounded-lg p-4 mb-4">
              <legend className="text-sm font-semibold text-gray-600 px-1">Dados Bancários</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field text-xs">Banco</label>
                  <input className="input-field" value={editParamForm.banco || ''} onChange={e => setEditParamForm(p => ({ ...p, banco: e.target.value }))} placeholder="Ex: Bradesco" />
                </div>
                <div>
                  <label className="label-field text-xs">Agência</label>
                  <input className="input-field" value={editParamForm.agencia || ''} onChange={e => setEditParamForm(p => ({ ...p, agencia: e.target.value }))} />
                </div>
                <div>
                  <label className="label-field text-xs">Conta</label>
                  <input className="input-field" value={editParamForm.conta || ''} onChange={e => setEditParamForm(p => ({ ...p, conta: e.target.value }))} />
                </div>
                <div>
                  <label className="label-field text-xs">Tipo Conta</label>
                  <select className="input-field" value={editParamForm.tipo_conta || 'Corrente'} onChange={e => setEditParamForm(p => ({ ...p, tipo_conta: e.target.value }))}>
                    <option value="Corrente">Conta Corrente</option>
                    <option value="Poupanca">Poupanca</option>
                    <option value="Pagamento">Conta Pagamento</option>
                  </select>
                </div>
                <div>
                  <label className="label-field text-xs">Chave PIX</label>
                  <input className="input-field" value={editParamForm.pix_chave || ''} onChange={e => setEditParamForm(p => ({ ...p, pix_chave: e.target.value }))} />
                </div>
                <div>
                  <label className="label-field text-xs">Tipo PIX</label>
                  <select className="input-field" value={editParamForm.pix_tipo || ''} onChange={e => setEditParamForm(p => ({ ...p, pix_tipo: e.target.value }))}>
                    <option value="">-- Selecione --</option>
                    <option value="cpf">CPF</option>
                    <option value="email">E-mail</option>
                    <option value="telefone">Telefone</option>
                    <option value="aleatoria">Chave Aleatória</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Parâmetros de Reembolso */}
            <fieldset className="border rounded-lg p-4 mb-4">
              <legend className="text-sm font-semibold text-gray-600 px-1">Parâmetros de Reembolso</legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'valor_gasolina', label: 'Valor Gasolina (R$/L)', step: '0.01' },
                  { key: 'km_carro_rate', label: 'Rate Km Carro (R$/km)', step: '0.01' },
                  { key: 'km_moto_rate', label: 'Rate Km Moto (R$/km)', step: '0.01' },
                  { key: 'limite_passagens', label: 'Limite Passagens (R$)', step: '0.01' },
                  { key: 'limite_alimentacao', label: 'Limite Alimentação (R$)', step: '0.01' },
                  { key: 'limite_hotel', label: 'Limite Hotel (R$)', step: '0.01' },
                  { key: 'limite_comunicacao', label: 'Limite Comunicação (R$)', step: '0.01' },
                  { key: 'diaria_valor', label: 'Diária (R$)', step: '0.01' },
                  { key: 'ajuda_custo', label: 'Ajuda de Custo (R$)', step: '0.01' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="label-field text-xs">{f.label}</label>
                    <input
                      type="number"
                      step={f.step}
                      min="0"
                      className="input-field"
                      value={editParamForm[f.key] ?? ''}
                      onChange={e => setEditParamForm(p => ({ ...p, [f.key]: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                ))}
              </div>
            </fieldset>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowParamModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveParamForm} disabled={savingParam} className="btn-primary">
                {savingParam ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar Igrejas (Multi-select) ── */}
      {showIgrejasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar Igrejas do Campo</h3>
              <button onClick={() => setShowIgrejasModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            {/* Search */}
            <div className="mb-3 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                className="input-field pl-10"
                placeholder="Buscar igreja..."
                value={igrejasSearch}
                onChange={e => setIgrejasSearch(e.target.value)}
              />
            </div>

            {/* Selected churches with funcao */}
            {selectedIgrejasIds.length > 0 && (
              <div className="mb-3 border rounded-lg p-3 bg-green-50">
                <p className="text-xs font-semibold text-green-800 mb-2">{selectedIgrejasIds.length} igreja(s) selecionada(s)</p>
                <div className="space-y-2">
                  {selectedIgrejasIds.map(igId => {
                    const ig = allIgrejas.find(i => i.id === igId)
                    if (!ig) return null
                    return (
                      <div key={igId} className="flex items-center gap-2 bg-white rounded-lg p-2 border">
                        <button
                          onClick={() => {
                            setSelectedIgrejasIds(prev => prev.filter(id => id !== igId))
                            setSelectedIgrejasFuncao(prev => { const n = { ...prev }; delete n[igId]; return n })
                          }}
                          className="text-red-400 hover:text-red-600 shrink-0"
                          title="Remover"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm text-gray-800 flex-1 truncate">{ig.nome}</span>
                        <input
                          className="input-field text-xs w-36"
                          placeholder="Função (ex: Pastor)"
                          value={selectedIgrejasFuncao[igId] || ''}
                          onChange={e => setSelectedIgrejasFuncao(prev => ({ ...prev, [igId]: e.target.value }))}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Create new church inline */}
            <div className="mb-3 border rounded-lg p-3 bg-blue-50">
              <p className="text-xs font-semibold text-blue-800 mb-2">Criar Nova Igreja</p>
              <div className="flex gap-2">
                <input
                  className="input-field text-sm flex-1"
                  placeholder="Nome da nova igreja..."
                  id="nova-igreja-nome"
                />
                <button
                  className="btn-primary text-sm px-3 whitespace-nowrap"
                  onClick={async () => {
                    const input = document.getElementById('nova-igreja-nome') as HTMLInputElement
                    const nome = input?.value?.trim()
                    if (!nome) return
                    const { data: newIg, error } = await supabase
                      .from('igrejas')
                      .insert({
                        nome,
                        associacao_id: missionario?.associacao_id,
                        ativo: true,
                      })
                      .select('id, nome')
                      .single()
                    if (error) { alert('Erro ao criar: ' + error.message); return }
                    if (newIg) {
                      setAllIgrejas(prev => [...prev, { ...newIg, endereco_cidade: null, endereco_estado: null, telefone: null, membros_ativos: 0, interessados: 0, tipo: null }])
                      setSelectedIgrejasIds(prev => [...prev, newIg.id])
                      setSelectedIgrejasFuncao(prev => ({ ...prev, [newIg.id]: 'Pastor' }))
                      input.value = ''
                    }
                  }}
                >
                  + Criar
                </button>
              </div>
            </div>

            {/* Checkboxes - unselected churches */}
            <div className="max-h-[40vh] overflow-y-auto space-y-1 border rounded-lg p-2">
              {allIgrejas
                .filter(ig => !igrejasSearch || ig.nome.toLowerCase().includes(igrejasSearch.toLowerCase()))
                .map(ig => {
                  const checked = selectedIgrejasIds.includes(ig.id)
                  return (
                    <label key={ig.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${checked ? 'bg-green-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setSelectedIgrejasIds(prev => prev.filter(id => id !== ig.id))
                            setSelectedIgrejasFuncao(prev => { const n = { ...prev }; delete n[ig.id]; return n })
                          } else {
                            setSelectedIgrejasIds(prev => [...prev, ig.id])
                            setSelectedIgrejasFuncao(prev => ({ ...prev, [ig.id]: 'Pastor' }))
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-800">{ig.nome}</span>
                    </label>
                  )
                })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowIgrejasModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveIgrejas} disabled={savingIgrejas} className="btn-primary">
                {savingIgrejas ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar Contagens (Membros/Interessados por Igreja) ── */}
      {showContagensModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Editar Membros e Interessados</h3>
              <button onClick={() => setShowContagensModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              {igrejas.map(ig => (
                <fieldset key={ig.id} className="border rounded-lg p-3">
                  <legend className="text-sm font-semibold text-gray-600 px-1">{ig.nome}</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-field text-xs">Membros Ativos</label>
                      <input
                        type="number"
                        min="0"
                        className="input-field"
                        value={editIgrejaContagens[ig.id]?.membros_ativos ?? 0}
                        onChange={e => setEditIgrejaContagens(prev => ({
                          ...prev,
                          [ig.id]: { ...prev[ig.id], membros_ativos: Number(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                    <div>
                      <label className="label-field text-xs">Interessados</label>
                      <input
                        type="number"
                        min="0"
                        className="input-field"
                        value={editIgrejaContagens[ig.id]?.interessados ?? 0}
                        onChange={e => setEditIgrejaContagens(prev => ({
                          ...prev,
                          [ig.id]: { ...prev[ig.id], interessados: Number(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                  </div>
                </fieldset>
              ))}
            </div>

            {igrejas.length === 0 && (
              <p className="text-center text-gray-400 py-4">Nenhuma igreja vinculada. Adicione igrejas primeiro.</p>
            )}

            {/* Totals */}
            {igrejas.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between text-sm font-medium text-gray-700">
                <span>Total: {Object.values(editIgrejaContagens).reduce((s, v) => s + v.membros_ativos, 0)} membros</span>
                <span>{Object.values(editIgrejaContagens).reduce((s, v) => s + v.interessados, 0)} interessados</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowContagensModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveContagens} disabled={savingContagens} className="btn-primary">
                {savingContagens ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Editar Dados Financeiros (Completo) ── */}
      {showFinanceiroModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">Editar Dados Financeiros</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowFinanceiroModal(false)} className="btn-secondary">Cancelar</button>
                  <button onClick={saveFinanceiro} disabled={savingFinanceiro} className="btn-primary">
                    {savingFinanceiro ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
              {/* Month/Year Selector */}
              <div className="flex items-center gap-3">
                <select
                  className="input-field w-auto"
                  value={financeiroMes}
                  onChange={async (e) => {
                    const m = Number(e.target.value)
                    setFinanceiroMes(m)
                    await loadFinanceiroData(m, financeiroAno)
                  }}
                >
                  {MESES_NOMES.map((nome, idx) => (
                    <option key={idx} value={idx + 1}>{nome}</option>
                  ))}
                </select>
                <select
                  className="input-field w-auto"
                  value={financeiroAno}
                  onChange={async (e) => {
                    const a = Number(e.target.value)
                    setFinanceiroAno(a)
                    await loadFinanceiroData(financeiroMes, a)
                  }}
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">Selecione o período</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {editFinanceiroData.map((row, idx) => {
                const updateField = (field: string, val: number) => {
                  const updated = [...editFinanceiroData]
                  updated[idx] = { ...updated[idx], [field]: val }
                  setEditFinanceiroData(updated)
                }
                const fin = (key: string) => (row as any)[key] || 0
                const totalRow = row.receita_dizimos + row.receita_oferta_regular + row.receita_oferta_especial
                  + row.dizimo + row.primicias + row.assist_social + row.esc_sabatina
                  + row.evangelismo + row.radio_curso_biblico + row.construcao + row.musica
                  + row.gratidao_6pct + row.diverso_assoc + row.missoes_mensais + row.missoes_anuais
                  + row.of_cultos_construcao + row.of_missionaria + row.of_juvenil
                  + row.of_gratidao_pobres + row.diversos_local + row.flores

                return (
                  <fieldset key={row.igreja_id} className="border border-gray-200 rounded-lg p-4">
                    <legend className="text-sm font-bold text-green-700 px-2">{row.igreja_nome}</legend>

                    {/* Seção: Dízimos e Primícias */}
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-1">Dízimos e Primícias</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                      {[
                        { key: 'dizimo', label: 'Dízimo' },
                        { key: 'primicias', label: 'Primícias' },
                        { key: 'receita_dizimos', label: 'Dízimo (legado)' },
                      ].map(f => (
                        <MoneyInput key={f.key} label={f.label} value={fin(f.key)} onChange={v => updateField(f.key, v)} />
                      ))}
                    </div>

                    {/* Seção: Ofertas para Associação */}
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ofertas para Associação</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                      {[
                        { key: 'assist_social', label: 'Assist. Social' },
                        { key: 'esc_sabatina', label: 'Escola Sabatina' },
                        { key: 'evangelismo', label: 'Evangelismo' },
                        { key: 'radio_curso_biblico', label: 'Rádio/Curso Bíblico' },
                        { key: 'construcao', label: 'Construção' },
                        { key: 'musica', label: 'Música' },
                        { key: 'gratidao_6pct', label: 'Gratidão 6%' },
                        { key: 'diverso_assoc', label: 'Diverso Associação' },
                        { key: 'missoes_mensais', label: 'Missões Mensais' },
                        { key: 'missoes_anuais', label: 'Missões Anuais' },
                      ].map(f => (
                        <MoneyInput key={f.key} label={f.label} value={fin(f.key)} onChange={v => updateField(f.key, v)} />
                      ))}
                    </div>

                    {/* Seção: Ofertas Locais */}
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ofertas Locais</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                      {[
                        { key: 'receita_oferta_regular', label: 'Oferta Regular' },
                        { key: 'receita_oferta_especial', label: 'Oferta Especial' },
                        { key: 'of_cultos_construcao', label: 'Of. Cultos/Construção' },
                        { key: 'of_missionaria', label: 'Of. Missionária' },
                        { key: 'of_juvenil', label: 'Of. Juvenil' },
                        { key: 'of_gratidao_pobres', label: 'Of. Gratidão/Pobres' },
                        { key: 'diversos_local', label: 'Diversos Local' },
                        { key: 'flores', label: 'Flores' },
                      ].map(f => (
                        <MoneyInput key={f.key} label={f.label} value={fin(f.key)} onChange={v => updateField(f.key, v)} />
                      ))}
                    </div>

                    <div className="pt-2 border-t border-gray-100 text-right">
                      <span className="text-sm font-bold text-green-700">
                        Total: R$ {totalRow.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </fieldset>
                )
              })}

              {editFinanceiroData.length === 0 && (
                <p className="text-center text-gray-400 py-4">Nenhuma igreja vinculada.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden PDF content (captured by html2canvas) ── */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={pdfRef} style={{ width: '794px', padding: '40px', backgroundColor: '#fff', fontFamily: 'Arial, sans-serif' }}>
          {/* Header UNINORTE com logo oficial */}
          <div data-pdf-section="header" style={{ borderBottom: '3px solid #006D43', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img
                src="/img/logo-nne.png"
                alt="Logo NNE"
                crossOrigin="anonymous"
                style={{ height: '50px', width: 'auto', objectFit: 'contain' }}
                onError={(e) => {
                  // Fallback to NNE circle if image fails
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  if (target.nextElementSibling) (target.nextElementSibling as HTMLElement).style.display = 'flex'
                }}
              />
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#006D43', display: 'none', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                NNE
              </div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#006D43', margin: 0 }}>UNIÃO NORTE NORDESTE BRASILEIRA</p>
                <p style={{ fontSize: '12px', color: '#555', margin: '2px 0 0 0' }}>IGREJA ADVENTISTA DO SÉTIMO DIA — MOVIMENTO DE REFORMA</p>
              </div>
            </div>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', marginTop: '12px', textAlign: 'center' }}>RELATÓRIO DO CAMPO MISSIONÁRIO</p>
          </div>

          {/* Missionary Data com foto */}
          {missionario && (
            <div data-pdf-section="missionary-data" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Foto do missionário */}
                <div style={{ flexShrink: 0 }}>
                  {missionario.foto_url ? (
                    <img
                      src={missionario.foto_url}
                      alt={(missionario as any).usuario?.nome || missionario.nome || ''}
                      crossOrigin="anonymous"
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '2px solid #e0f2e9',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      backgroundColor: '#006D43',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #e0f2e9',
                    }}>
                      <span style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                        {((missionario as any).usuario?.nome || missionario.nome || '??')
                          .split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('')}
                      </span>
                    </div>
                  )}
                </div>
                {/* Dados do missionário */}
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px 8px', fontWeight: 'bold', color: '#555', width: '120px' }}>Missionário:</td>
                      <td style={{ padding: '4px 8px', color: '#333' }}>{(missionario as any).usuario?.nome || missionario.nome || '-'}</td>
                      <td style={{ padding: '4px 8px', fontWeight: 'bold', color: '#555', width: '80px' }}>Cargo:</td>
                      <td style={{ padding: '4px 8px', color: '#333' }}>{CARGO_LABELS[missionario.cargo_ministerial] || missionario.cargo_ministerial || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px', fontWeight: 'bold', color: '#555' }}>Associação:</td>
                      <td style={{ padding: '4px 8px', color: '#333' }}>{(missionario.associacao as any)?.nome || '-'}</td>
                      <td style={{ padding: '4px 8px', fontWeight: 'bold', color: '#555' }}>Data:</td>
                      <td style={{ padding: '4px 8px', color: '#333' }}>{new Date().toLocaleDateString('pt-BR')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Churches Table */}
          <div data-pdf-section="churches" style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#006D43', marginBottom: '8px' }}>IGREJAS DO CAMPO</p>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Igreja</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Cidade/UF</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Tipo</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Membros</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Interessados</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>Receita</th>
                </tr>
              </thead>
              <tbody>
                {igrejas.map(ig => {
                  const igFin = financeiroByIgreja[ig.id]
                  return (
                    <tr key={ig.id}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #eee' }}>{ig.nome}</td>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid #eee' }}>{[ig.endereco_cidade, ig.endereco_estado].filter(Boolean).join(' - ') || '-'}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{ig.tipo || '-'}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>{ig.membros_ativos || 0}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{ig.interessados || 0}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{igFin ? `R$ ${igFin.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                    </tr>
                  )
                })}
                <tr style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                  <td style={{ padding: '6px 8px' }} colSpan={3}>TOTAL</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>{totalMembros}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>{totalInteressados}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>R$ {Object.values(financeiroByIgreja).reduce((s, f) => s + f.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Summary - Detailed by month */}
          {financeiro.length > 0 && financeiro.map(f => {
            const fmtPdf = (v: number) => v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'
            return (
              <div key={`pdf-fin-${f.ano}-${f.mes}`} data-pdf-section={`finance-${f.ano}-${f.mes}`} style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#006D43', marginBottom: '6px' }}>CAIXA DA ASSOCIAÇÃO — {MESES[f.mes - 1].toUpperCase()} {f.ano}</p>
                <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#006D43', color: '#fff' }}>
                      <th style={{ padding: '4px 4px', textAlign: 'left', fontSize: '8px' }}>Igreja</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Díz.</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Prim.</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>A.Soci</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>E.Sab</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Evang</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Rd/CB</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Const.</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Mús.</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Grt6%</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Div.</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px', backgroundColor: '#005533' }}>SOMA</th>
                      <th style={{ padding: '4px 3px', textAlign: 'right', fontSize: '8px' }}>Miss.Est</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.churches.map((ch, ci) => (
                      <tr key={ch.igreja_id} style={{ backgroundColor: ci % 2 === 0 ? '#fff' : '#f7f7f7' }}>
                        <td style={{ padding: '3px 4px', borderBottom: '1px solid #eee', fontSize: '8px', fontWeight: 500 }}>{ch.igreja_nome.replace('Igreja ', '').replace(' - ', ' ')}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.dizimo)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.primicias)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.assist_social)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.esc_sabatina)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.evangelismo)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.radio_curso_biblico)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.construcao)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.musica)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.gratidao_6pct)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmtPdf(ch.diverso_assoc)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 'bold', backgroundColor: ci % 2 === 0 ? '#f0faf5' : '#e8f5ee' }}>{fmtPdf(ch.soma_assoc)}</td>
                        <td style={{ padding: '3px 3px', textAlign: 'right', borderBottom: '1px solid #eee', color: '#1d4ed8' }}>{fmtPdf(ch.missoes_estrang)}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#e8f5ee', fontWeight: 'bold', borderTop: '2px solid #006D43' }}>
                      <td style={{ padding: '4px 4px', fontSize: '9px' }}>TOTAL</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.dizimo)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.primicias)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.assist_social)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.esc_sabatina)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.evangelismo)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.radio_curso_biblico)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.construcao)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.musica)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.gratidao_6pct)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right' }}>{fmtPdf(f.diverso_assoc)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right', backgroundColor: '#d1fae5' }}>{fmtPdf(f.dizimo + f.primicias + f.assist_social + f.esc_sabatina + f.evangelismo + f.radio_curso_biblico + f.construcao + f.musica + f.gratidao_6pct + f.diverso_assoc)}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right', color: '#1d4ed8' }}>{fmtPdf(f.missoes_estrang)}</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ textAlign: 'right', fontSize: '10px', fontWeight: 'bold', color: '#006D43', marginTop: '4px' }}>Total Geral: R$ {fmtPdf(f.total)}</p>
              </div>
            )
          })}

          {/* ── TERMO DE COMPROMISSO MISSIONÁRIO (dinâmico do banco) ── */}
          <div data-pdf-section="termo">
            <TermoCompromissoDisplay
              missionarioNome={(missionario as any)?.usuario?.nome || missionario?.nome || '_______________'}
              forPdf={true}
            />
          </div>

          {/* Local e Data + Signatures */}
          <div data-pdf-section="signatures">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '40px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap' }}>Local e Data:</span>
            <span style={{ flex: 1, borderBottom: '1px solid #333', minHeight: '18px' }}>&nbsp;</span>
            <span style={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap' }}>,&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
          </div>

          {/* ── Signatures (4 campos) ── */}
          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
            {/* Assinatura do Missionário */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '8px', marginTop: '60px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', margin: 0 }}>{(missionario as any)?.usuario?.nome || missionario?.nome || 'Missionário'}</p>
                <p style={{ fontSize: '10px', color: '#666', margin: '2px 0 0 0' }}>{missionario ? (CARGO_LABELS[missionario.cargo_ministerial] || 'Missionário') : 'Missionário'}</p>
                <p style={{ fontSize: '9px', color: '#999', margin: '2px 0 0 0' }}>{(missionario?.associacao as any)?.nome || ''}</p>
              </div>
            </div>
            {/* Assinatura do Representante da União */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '8px', marginTop: '60px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', margin: 0 }}>Representante da União</p>
                <p style={{ fontSize: '10px', color: '#666', margin: '2px 0 0 0' }}>União Norte Nordeste Brasileira</p>
                <p style={{ fontSize: '9px', color: '#999', margin: '2px 0 0 0' }}>IASD — Movimento de Reforma</p>
              </div>
            </div>
          </div>

          {/* Segunda linha de assinaturas */}
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
            {/* Assinatura do Presidente da Associação */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '8px', marginTop: '40px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', margin: 0 }}>Presidente da {(missionario?.associacao as any)?.sigla || 'Associação'}</p>
                <p style={{ fontSize: '10px', color: '#666', margin: '2px 0 0 0' }}>{(missionario?.associacao as any)?.nome || ''}</p>
              </div>
            </div>
            {/* Assinatura do Secretário da Associação */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #333', paddingTop: '8px', marginTop: '40px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', margin: 0 }}>Secretário da {(missionario?.associacao as any)?.sigla || 'Associação'}</p>
                <p style={{ fontSize: '10px', color: '#666', margin: '2px 0 0 0' }}>{(missionario?.associacao as any)?.nome || ''}</p>
              </div>
            </div>
          </div>

          </div>

          {/* Rodapé institucional */}
          <div data-pdf-section="footer" style={{ marginTop: '30px', paddingTop: '10px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#666', margin: 0 }}>Igreja Adventista do Sétimo Dia — Movimento de Reforma</p>
              <p style={{ fontSize: '9px', color: '#999', margin: '2px 0 0 0' }}>União Norte Nordeste Brasileira · NNE Sistema</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '9px', color: '#999', margin: 0 }}>Documento emitido em {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style={{ fontSize: '9px', color: '#999', margin: '2px 0 0 0' }}>Quadriênio {new Date().getFullYear()} — {new Date().getFullYear() + 3}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

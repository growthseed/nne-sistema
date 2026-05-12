import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type CensoRow as MetricsCensoRow,
  computeIndices, computeAreaScores, importanciaXDesempenho,
  aggregateByScope, classColors, classifyScore,
  SATISFACAO_ITENS,
} from '@/lib/censo-metrics'
import TerritorioTab from '@/components/cadastro/TerritorioTab'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Doughnut, Radar } from 'react-chartjs-2'
import {
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineUserGroup,
  HiOutlineClipboardCopy,
  HiOutlineExternalLink,
  HiOutlineEye,
  HiOutlineFilter,
  HiOutlineSearch,
  HiOutlineDownload,
  HiOutlineUsers,
  HiOutlineIdentification,
  HiOutlineSparkles,
  HiOutlineLightningBolt,
  HiOutlineHeart,
  HiOutlineChartBar,
} from 'react-icons/hi'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  RadialLinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
)

interface CadastroRow {
  id: string
  lgpd_aceite: boolean
  nome: string | null
  sexo: string | null
  estado_civil: string | null
  escolaridade: string | null
  profissao: string | null
  data_nascimento: string | null
  cidade: string | null
  estado: string | null
  igreja_id: string | null
  satisfacao: Record<string, number> | null
  prioridades: string[] | null
  participacao: Record<string, number> | null
  pontos_fortes: string[] | null
  pontos_fracos: string[] | null
  cargos_ocupa: string[] | null
  como_conheceu: string | null
  tempo_membro: string | null
  distancia_igreja: string | null
  meio_transporte: string | null
  opiniao_departamentos: string | null
  email: string | null
  telefone: string | null
  etapa_atual: number
  completo: boolean
  created_at: string
  associacao_id: string | null
  uniao_id: string | null
  igreja_frequenta: string | null
  draft_token: string | null
  whatsapp_parente: string | null
  whatsapp_parente_nome: string | null
}

// Etapas do formulário público (CadastroPublicoPage). Mantém em sincronia com
// os <StepHeader> de cada step (1..11). E1 = welcome/LGPD; E2 = identificação; etc.
const ETAPAS_LABELS: Record<number, string> = {
  1: 'LGPD / Boas-vindas',
  2: 'Identificação e Contato',
  3: 'Nascimento e Sexo',
  4: 'Estado Civil / Escolaridade',
  5: 'Tempo de Membro',
  6: 'Igreja e Localização',
  7: 'Pontos Fortes/Fracos + Cargos',
  8: 'Satisfação',
  9: 'Prioridades / Ênfases',
  10: 'Frequência / Contribuição',
  11: 'Sugestões e Envio Final',
}

function buildResumeUrl(r: { id: string; draft_token: string | null }): string | null {
  if (!r.draft_token) return null
  return `${window.location.origin}/formulario?resume=${r.id}&token=${r.draft_token}`
}

function digitsOnly(s: string | null): string {
  return (s || '').replace(/\D/g, '')
}

function calcAge(birth: string): number {
  const d = new Date(birth)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

function getAgeGroup(age: number): string {
  if (age < 18) return '< 18'
  if (age < 26) return '18-25'
  if (age < 36) return '26-35'
  if (age < 46) return '36-45'
  if (age < 56) return '46-55'
  if (age < 66) return '56-65'
  return '65+'
}

function fmtDateBR(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-')
      return `${day}/${m}/${y}`
    }
    return new Date(d).toLocaleDateString('pt-BR')
  } catch { return d }
}

function calcAgeFromBirth(birth: string | null): number | null {
  if (!birth) return null
  try {
    const dt = new Date(birth + 'T00:00:00')
    const now = new Date()
    let age = now.getFullYear() - dt.getFullYear()
    const m = now.getMonth() - dt.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) age--
    return age
  } catch { return null }
}

type TabFilter = 'todos' | 'completos' | 'parciais' | 'parou_final'
type PageTab = 'dashboard' | 'gestao' | 'territorio'

interface AssociacaoInfo {
  id: string
  nome: string
  sigla: string
}

export default function CadastroDashboardPage() {
  const { profile } = useAuth()
  const [respostas, setRespostas] = useState<CadastroRow[]>([])
  const [associacoes, setAssociacoes] = useState<AssociacaoInfo[]>([])
  const [igrejasMembros, setIgrejasMembros] = useState<{ id: string; nome: string; endereco_cidade: string | null; endereco_estado: string | null; associacao_id: string | null; membros_ativos: number | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tabFilter, setTabFilter] = useState<TabFilter>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetail, setShowDetail] = useState<CadastroRow | null>(null)
  const [showEtapaModal, setShowEtapaModal] = useState<number | null>(null)
  const [showAssocList, setShowAssocList] = useState<{
    sigla: string
    nome: string
    status: 'todos' | 'completos' | 'parciais' | 'parou_final' | 'sem_igreja' | 'com_igreja'
    respostas: CadastroRow[]
  } | null>(null)
  const [pageTab, setPageTab] = useState<PageTab>('dashboard')
  const [filtroAssociacao, setFiltroAssociacao] = useState<string>('todas')
  const [gestaoExpanded, setGestaoExpanded] = useState<string | null>(null)
  const [gestaoStatus, setGestaoStatus] = useState<'todos' | 'completos' | 'parciais' | 'parou_final'>('todos')
  // Meta de cobertura: total de cadastros que se quer atingir. Default = total de membros (100% cobertura).
  const [metaCustom, setMetaCustom] = useState<number | null>(() => {
    const v = localStorage.getItem('cadastro_meta_custom')
    return v ? Number(v) : null
  })
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [metaInput, setMetaInput] = useState('')

  const publicUrl = `${window.location.origin}/formulario`

  useEffect(() => {
    if (profile) {
      fetchRespostas()
      fetchAssociacoes()
      fetchIgrejasMembros()
    }
  }, [profile])

  // Pré-seleciona o filtro de associação para admin_associacao — a tela
  // funciona como o "dashboard da minha associação" automaticamente. Admin de
  // União e admin master começam em "Todas". Só roda uma vez ao montar.
  const filtroPreSelecionadoRef = useRef(false)
  useEffect(() => {
    if (filtroPreSelecionadoRef.current) return
    if (!profile) return
    if (profile.papel === 'admin_associacao' && profile.associacao_id) {
      setFiltroAssociacao(profile.associacao_id)
      filtroPreSelecionadoRef.current = true
    }
  }, [profile])

  async function fetchAssociacoes() {
    const { data } = await supabase
      .from('associacoes')
      .select('id, nome, sigla')
      .order('sigla')
    setAssociacoes(data || [])
  }

  async function fetchIgrejasMembros() {
    let query = supabase
      .from('igrejas')
      .select('id, nome, endereco_cidade, endereco_estado, associacao_id, membros_ativos')
      .eq('ativo', true)
      .order('nome')

    if (profile!.papel === 'admin_uniao') {
      query = query.eq('uniao_id', profile!.uniao_id!)
    } else if (profile!.papel === 'admin_associacao') {
      query = query.eq('associacao_id', profile!.associacao_id!)
    } else if (profile!.papel !== 'admin') {
      query = query.eq('id', profile!.igreja_id!)
    }

    const { data } = await query
    setIgrejasMembros(data || [])
  }

  async function fetchRespostas() {
    setLoading(true)
    try {
      // IMPORTANTE: Supabase tem limit padrão de 1000 rows por query.
      // Sem paginação, o total mostrado no dashboard fica capado em 1000,
      // criando divergência com o painel da associação (que faz query
      // separada por escopo e bate 100%). Paginamos em lotes de 1000.
      const PAGE_SIZE = 1000
      const all: CadastroRow[] = []
      let from = 0

      while (true) {
        let query = supabase
          .from('cadastro_respostas')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1)

        if (profile!.papel === 'admin_uniao') {
          query = query.eq('uniao_id', profile!.uniao_id!)
        } else if (profile!.papel === 'admin_associacao') {
          query = query.eq('associacao_id', profile!.associacao_id!)
        } else if (profile!.papel !== 'admin') {
          query = query.eq('igreja_id', profile!.igreja_id!)
        }

        const { data, error } = await query
        if (error) throw error
        const batch = (data || []) as CadastroRow[]
        all.push(...batch)
        if (batch.length < PAGE_SIZE) break  // último lote
        from += PAGE_SIZE
        if (from > 50_000) break  // safety cap (50k respostas é absurdo)
      }

      setRespostas(all)
    } catch (err) {
      console.error('Erro ao buscar respostas:', err)
    } finally {
      setLoading(false)
    }
  }

  // Respostas filtradas por associação (usado em ambas as abas)
  const respostasByAssoc = filtroAssociacao === 'todas'
    ? respostas
    : filtroAssociacao === 'sem_associacao'
      ? respostas.filter(r => !r.associacao_id)
      : respostas.filter(r => r.associacao_id === filtroAssociacao)

  function getAssocSigla(assocId: string | null) {
    if (!assocId) return 'N/D'
    return associacoes.find(a => a.id === assocId)?.sigla || 'N/D'
  }

  function getAssocNome(assocId: string | null) {
    if (!assocId) return 'Sem associação'
    return associacoes.find(a => a.id === assocId)?.nome || 'Desconhecida'
  }

  // Lookup: id da igreja → { nome, cidade } e contagem de membros do inventário
  // Substitui o uso de cadastro_respostas.igreja_frequenta (texto), que nunca
  // foi populado pelo formulário. O form grava cadastro_respostas.igreja_id (uuid).
  const igrejaInfoById = new Map<string, { nome: string; cidade: string | null; membros: number }>()
  igrejasMembros.forEach(ig => {
    igrejaInfoById.set(ig.id, {
      nome: ig.nome,
      cidade: ig.endereco_cidade,
      membros: ig.membros_ativos || 0,
    })
  })

  function igrejaLabelFromResposta(r: CadastroRow): string {
    if (r.igreja_id) {
      const info = igrejaInfoById.get(r.igreja_id)
      if (info) return info.nome
    }
    if (r.completo) return '—'
    return `Não selecionou (parou em E${r.etapa_atual})`
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ========== EXPORT CSV ==========
  function exportCSV(rows: CadastroRow[], filename: string) {
    const headers = [
      'Nome', 'Email', 'Telefone', 'Data Nascimento', 'Sexo', 'Estado Civil',
      'Escolaridade', 'Profissão', 'Cidade', 'Estado', 'CEP',
      'Como Conheceu', 'Tempo Membro', 'Distância Igreja', 'Meio Transporte',
      'Cargos', 'Pontos Fortes', 'Pontos Fracos', 'Prioridades',
      'Satisfação', 'Participação', 'Opinião Departamentos',
      'Etapa Atual', 'Completo', 'Data Resposta'
    ]
    const csvRows = [headers.join(';')]
    for (const r of rows) {
      const vals = [
        r.nome || '', r.email || '', r.telefone || '', r.data_nascimento || '',
        r.sexo || '', r.estado_civil || '', r.escolaridade || '', r.profissao || '',
        r.cidade || '', r.estado || '', '',
        r.como_conheceu || '', r.tempo_membro || '', r.distancia_igreja || '',
        r.meio_transporte || '',
        (r.cargos_ocupa || []).join(', '),
        (r.pontos_fortes || []).join(', '),
        (r.pontos_fracos || []).join(', '),
        (r.prioridades || []).join(', '),
        r.satisfacao ? JSON.stringify(r.satisfacao) : '',
        r.participacao ? JSON.stringify(r.participacao) : '',
        r.opiniao_departamentos || '',
        String(r.etapa_atual),
        r.completo ? 'Sim' : 'Não',
        new Date(r.created_at).toLocaleDateString('pt-BR')
      ]
      csvRows.push(vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    }
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // ========== FILTERED DATA ==========

  const filteredRespostas = respostasByAssoc.filter(r => {
    // Tab filter
    if (tabFilter === 'completos' && !r.completo) return false
    if (tabFilter === 'parciais' && r.completo) return false
    if (tabFilter === 'parou_final' && (r.completo || r.etapa_atual !== 11)) return false
    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        (r.nome || '').toLowerCase().includes(term) ||
        (r.cidade || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term) ||
        (r.telefone || '').toLowerCase().includes(term)
      )
    }
    return true
  })

  // ========== COMPUTED STATS ==========

  const total = respostasByAssoc.length
  const completos = respostasByAssoc.filter(r => r.completo).length
  const parciais = total - completos
  // Total de membros vindos do inventário (igrejas.membros_ativos), respeitando filtro de associação
  const igrejasNoEscopo = filtroAssociacao === 'todas'
    ? igrejasMembros
    : filtroAssociacao === 'sem_associacao'
      ? igrejasMembros.filter(ig => !ig.associacao_id)
      : igrejasMembros.filter(ig => ig.associacao_id === filtroAssociacao)
  const totalMembrosInventario = igrejasNoEscopo.reduce((sum, ig) => sum + (ig.membros_ativos || 0), 0)

  // Meta de cobertura: usa custom se definida, senão = total de membros do inventário
  const meta = metaCustom && metaCustom > 0 ? metaCustom : totalMembrosInventario
  const pctCobertura = meta > 0 ? Math.min(100, Math.round((completos / meta) * 100)) : 0
  const pctCoberturaParcial = meta > 0 ? Math.min(100, Math.round(((completos + parciais) / meta) * 100)) : 0
  const faltamMeta = Math.max(0, meta - completos)
  const pctMembrosCompletos = totalMembrosInventario > 0 ? Math.round((completos / totalMembrosInventario) * 100) : 0

  function salvarMeta() {
    const n = Number(metaInput)
    if (!Number.isFinite(n) || n <= 0) {
      localStorage.removeItem('cadastro_meta_custom')
      setMetaCustom(null)
    } else {
      localStorage.setItem('cadastro_meta_custom', String(n))
      setMetaCustom(n)
    }
    setEditandoMeta(false)
    setMetaInput('')
  }
  // "Parou na final": chegou até a última etapa (11) mas não submeteu (não clicou "Enviar").
  // Candidatos a recuperação via WhatsApp/email — o formulário já está 99% preenchido.
  const parouFinal = respostasByAssoc.filter(r => !r.completo && r.etapa_atual === 11).length
  const taxaComplecao = total > 0 ? Math.round((completos / total) * 100) : 0

  // Gender
  const generoCount: Record<string, number> = {}
  respostasByAssoc.forEach(r => {
    const g = r.sexo || 'Não informado'
    generoCount[g] = (generoCount[g] || 0) + 1
  })

  // Age groups
  const faixaEtariaCount: Record<string, number> = {}
  respostasByAssoc.forEach(r => {
    if (r.data_nascimento) {
      const age = calcAge(r.data_nascimento)
      const group = getAgeGroup(age)
      faixaEtariaCount[group] = (faixaEtariaCount[group] || 0) + 1
    }
  })
  const ageOrder = ['< 18', '18-25', '26-35', '36-45', '46-55', '56-65', '65+']
  const sortedAgeGroups = ageOrder.filter(g => faixaEtariaCount[g])

  // Estado civil
  const estadoCivilCount: Record<string, number> = {}
  respostasByAssoc.forEach(r => {
    if (r.estado_civil) {
      estadoCivilCount[r.estado_civil] = (estadoCivilCount[r.estado_civil] || 0) + 1
    }
  })

  // Satisfacao averages
  const satisfacaoSums: Record<string, { total: number; count: number }> = {}
  respostasByAssoc.forEach(r => {
    if (r.satisfacao) {
      for (const [key, val] of Object.entries(r.satisfacao)) {
        if (!satisfacaoSums[key]) satisfacaoSums[key] = { total: 0, count: 0 }
        satisfacaoSums[key].total += val
        satisfacaoSums[key].count += 1
      }
    }
  })
  const satisfacaoKeys = Object.keys(satisfacaoSums)
  const satisfacaoAvgs = satisfacaoKeys.map(k => +(satisfacaoSums[k].total / satisfacaoSums[k].count).toFixed(1))

  // Prioridades
  const prioridadeCount: Record<string, number> = {}
  respostasByAssoc.forEach(r => {
    if (r.prioridades) {
      r.prioridades.forEach(p => {
        prioridadeCount[p] = (prioridadeCount[p] || 0) + 1
      })
    }
  })
  const sortedPrioridades = Object.entries(prioridadeCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Participação por departamento/atividade. O legado contava quem respondeu a chave,
  // mas como o formulário pede resposta para TODOS os 6 itens, isso deixava todos
  // empatados. Aqui contamos: (a) quantos marcaram frequência >= 1 ("ativos") e
  // (b) a média de frequência entre quem respondeu (0..4).
  const depStats: Record<string, { ativos: number; respondentes: number; somaFreq: number }> = {}
  respostasByAssoc.forEach(r => {
    if (r.participacao) {
      for (const [key, val] of Object.entries(r.participacao)) {
        const v = Number(val)
        if (!Number.isFinite(v)) continue
        if (!depStats[key]) depStats[key] = { ativos: 0, respondentes: 0, somaFreq: 0 }
        depStats[key].respondentes += 1
        depStats[key].somaFreq += v
        if (v >= 1) depStats[key].ativos += 1
      }
    }
  })
  const sortedDeps = Object.entries(depStats)
    .map(([k, s]) => ({
      label: k,
      ativos: s.ativos,
      mediaFreq: s.respondentes > 0 ? +(s.somaFreq / s.respondentes).toFixed(2) : 0,
      taxaAdesao: s.respondentes > 0 ? Math.round((s.ativos / s.respondentes) * 100) : 0,
    }))
    .sort((a, b) => b.ativos - a.ativos)

  // Dons/Talentos (pontos_fortes) — texto livre, normalizar antes de agregar
  // para não duplicar "Doutrina", "doutrina ", "DOUTRINA".
  function normalizePontoForte(raw: string): string {
    return raw
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
  }
  function titleCase(raw: string): string {
    return raw.trim().replace(/\s+/g, ' ').toLowerCase()
      .replace(/(^|\s)\S/g, c => c.toUpperCase())
  }
  // Mantém a forma de exibição mais frequente do grupo normalizado
  const donsBuckets: Record<string, { count: number; displayCount: Record<string, number> }> = {}
  respostasByAssoc.forEach(r => {
    if (r.pontos_fortes) {
      r.pontos_fortes.forEach(raw => {
        if (!raw || typeof raw !== 'string') return
        const norm = normalizePontoForte(raw)
        if (!norm) return
        if (!donsBuckets[norm]) donsBuckets[norm] = { count: 0, displayCount: {} }
        donsBuckets[norm].count += 1
        const display = titleCase(raw)
        donsBuckets[norm].displayCount[display] = (donsBuckets[norm].displayCount[display] || 0) + 1
      })
    }
  })
  const sortedDons = Object.entries(donsBuckets)
    .map(([norm, b]) => {
      const bestDisplay = Object.entries(b.displayCount).sort((a, c) => c[1] - a[1])[0]?.[0] || norm
      return [bestDisplay, b.count] as [string, number]
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Cidades
  const cidadeCount: Record<string, number> = {}
  respostasByAssoc.forEach(r => {
    if (r.cidade) {
      cidadeCount[r.cidade] = (cidadeCount[r.cidade] || 0) + 1
    }
  })
  const sortedCidades = Object.entries(cidadeCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Monthly submissions
  const monthlyCount: Record<string, number> = {}
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  respostasByAssoc.forEach(r => {
    const d = new Date(r.created_at)
    const key = `${mesesNomes[d.getMonth()]}/${d.getFullYear()}`
    monthlyCount[key] = (monthlyCount[key] || 0) + 1
  })
  const sortedMonths = Object.entries(monthlyCount).slice(-6)

  // Etapa distribution (for partial responses)
  const etapaCount: Record<number, number> = {}
  respostasByAssoc.filter(r => !r.completo).forEach(r => {
    etapaCount[r.etapa_atual] = (etapaCount[r.etapa_atual] || 0) + 1
  })

  // ========== VISÃO EXECUTIVA (estratégica) ==========
  // Reutiliza o engine de censo-metrics: KPIs compostos, ranking por
  // associação, heatmap associações × áreas, matriz importância × desempenho.
  const metricsRows = respostasByAssoc as unknown as MetricsCensoRow[]
  const indicesUniao = computeIndices(metricsRows)
  const areaScoresUniao = computeAreaScores(metricsRows)
  const matrizIxD = importanciaXDesempenho(metricsRows)

  const assocMeta = new Map(
    associacoes.map(a => {
      const membros = igrejasMembros
        .filter(ig => ig.associacao_id === a.id)
        .reduce((s, ig) => s + (ig.membros_ativos || 0), 0)
      return [a.id, { nome: a.nome, sigla: a.sigla, membros }] as const
    }),
  )
  const rankingAssoc = aggregateByScope(metricsRows, 'associacao_id', assocMeta)

  // Heatmap: linhas = associações com respostas, colunas = SATISFACAO_ITENS
  const heatmapData = useMemo(() => {
    const byAssoc = new Map<string, MetricsCensoRow[]>()
    metricsRows.forEach(r => {
      if (!r.associacao_id) return
      if (!byAssoc.has(r.associacao_id)) byAssoc.set(r.associacao_id, [])
      byAssoc.get(r.associacao_id)!.push(r)
    })
    return associacoes
      .map(a => {
        const list = byAssoc.get(a.id) || []
        return { assoc: a, n: list.length, scores: computeAreaScores(list) }
      })
      .filter(h => h.n > 0)
  }, [metricsRows, associacoes])

  // ========== CHART DATA ==========

  const genderData = {
    labels: Object.keys(generoCount).map(g => g === 'masculino' ? 'Masculino' : g === 'feminino' ? 'Feminino' : g),
    datasets: [{
      data: Object.values(generoCount),
      backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(244, 114, 182, 0.8)', 'rgba(156, 163, 175, 0.6)'],
      borderWidth: 0,
    }],
  }

  const ageData = {
    labels: sortedAgeGroups,
    datasets: [{
      label: 'Cadastros',
      data: sortedAgeGroups.map(g => faixaEtariaCount[g] || 0),
      backgroundColor: 'rgba(99, 102, 241, 0.7)',
      borderRadius: 6,
    }],
  }

  const satisfacaoData = {
    labels: satisfacaoKeys,
    datasets: [{
      label: 'Média',
      data: satisfacaoAvgs,
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      borderColor: 'rgba(16, 185, 129, 0.8)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(16, 185, 129, 1)',
    }],
  }

  const prioridadeData = {
    labels: sortedPrioridades.map(([k]) => k),
    datasets: [{
      label: 'Votos',
      data: sortedPrioridades.map(([, v]) => v),
      backgroundColor: 'rgba(245, 158, 11, 0.7)',
      borderRadius: 6,
    }],
  }

  const depData = {
    labels: sortedDeps.map(d => d.label),
    datasets: [{
      label: 'Ativos (freq ≥ 1)',
      data: sortedDeps.map(d => d.ativos),
      backgroundColor: 'rgba(139, 92, 246, 0.7)',
      borderRadius: 6,
    }],
  }

  const monthlyData = {
    labels: sortedMonths.map(([k]) => k),
    datasets: [{
      label: 'Cadastros',
      data: sortedMonths.map(([, v]) => v),
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderRadius: 6,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  }

  const horizontalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Carregando dados...</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Censo / Pesquisa</h1>
          <p className="text-gray-500 mt-1">{respostas.length} resposta{respostas.length !== 1 ? 's' : ''} total • {total} filtrada{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/formulario"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
            title="Abre o formulário público do Censo (mesmo que vai no WhatsApp/email para o membro responder)"
          >
            <HiOutlineDocumentText className="w-4 h-4" />
            Preencher Censo
          </Link>
          <Link
            to="/cadastro"
            className="btn-secondary inline-flex items-center gap-2"
            title="Nova ficha de membro em pessoas (uso administrativo da secretaria)"
          >
            <HiOutlineIdentification className="w-4 h-4" />
            Nova Ficha de Membro
          </Link>
        </div>
      </div>

      {/* Page Tabs: Dashboard / Gestão / Território */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          ['dashboard', 'Dashboard'],
          ['gestao', 'Gestão por Associação'],
          ['territorio', 'Território (IBGE)'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setPageTab(key)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              pageTab === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filtro por Associação */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Associação:</label>
        <select value={filtroAssociacao} onChange={e => setFiltroAssociacao(e.target.value)}
          className="input-field max-w-md text-sm">
          <option value="todas">Todas as Associações</option>
          <option value="sem_associacao">Sem Associação ({respostas.filter(r => !r.associacao_id).length} resp)</option>
          {associacoes.map(a => {
            const count = respostas.filter(r => r.associacao_id === a.id).length
            const membros = igrejasMembros
              .filter(ig => ig.associacao_id === a.id)
              .reduce((sum, ig) => sum + (ig.membros_ativos || 0), 0)
            return <option key={a.id} value={a.id}>{a.sigla} — {a.nome} ({count} resp / {membros} membros)</option>
          })}
        </select>
        {filtroAssociacao !== 'todas' && (
          <button onClick={() => setFiltroAssociacao('todas')} className="text-xs text-primary-600 hover:underline">Limpar filtro</button>
        )}
      </div>

      {/* ========== TAB: GESTÃO POR ASSOCIAÇÃO ========== */}
      {pageTab === 'gestao' && (() => {
        function getAssocRespostas(assocId: string | null) {
          const base = assocId === null
            ? respostas.filter(r => !r.associacao_id)
            : respostas.filter(r => r.associacao_id === assocId)
          if (gestaoStatus === 'completos') return base.filter(r => r.completo)
          if (gestaoStatus === 'parciais') return base.filter(r => !r.completo)
          if (gestaoStatus === 'parou_final') return base.filter(r => !r.completo && r.etapa_atual === 11)
          return base
        }

        const allAssocs = [
          ...associacoes.map(a => ({ id: a.id, sigla: a.sigla, nome: a.nome })),
          ...(respostas.some(r => !r.associacao_id) ? [{ id: 'sem' as string, sigla: 'N/D', nome: 'Sem Associação' }] : []),
        ]

        return (
        <div className="space-y-4">
          {/* Export geral + filtro status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {([['todos', 'Todos'], ['completos', 'Completos'], ['parciais', 'Parciais'], ['parou_final', 'Parou na Final']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setGestaoStatus(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${gestaoStatus === key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(respostas, `censo_completo_${new Date().toISOString().slice(0,10)}.csv`)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                <HiOutlineDownload className="w-4 h-4" /> Exportar Tudo ({respostas.length})
              </button>
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="input-field pl-10 text-sm" placeholder="Buscar por nome, email, telefone..." />
          </div>

          {/* Cards por associação (expandíveis) */}
          <div className="space-y-3">
            {allAssocs.map(a => {
              const assocId = a.id === 'sem' ? null : a.id
              const allAssocRespostas = respostas.filter(r => a.id === 'sem' ? !r.associacao_id : r.associacao_id === a.id)
              const filtered = getAssocRespostas(assocId)
              const searched = searchTerm ? filtered.filter(r => {
                const t = searchTerm.toLowerCase()
                return (r.nome || '').toLowerCase().includes(t) || (r.email || '').toLowerCase().includes(t) || (r.telefone || '').includes(t)
              }) : filtered
              const completos = allAssocRespostas.filter(r => r.completo).length
              const parciais = allAssocRespostas.length - completos
              const parciaisComIgreja = allAssocRespostas.filter(r => !r.completo && r.igreja_id).length
              const parciaisSemIgreja = parciais - parciaisComIgreja
              const parouNaFinal = allAssocRespostas.filter(r => !r.completo && r.etapa_atual === 11).length
              const pct = allAssocRespostas.length > 0 ? Math.round((completos / allAssocRespostas.length) * 100) : 0
              function openStatusList(status: 'completos' | 'parciais' | 'parou_final' | 'sem_igreja' | 'com_igreja' | 'todos', e: React.MouseEvent) {
                e.stopPropagation()
                let rows: CadastroRow[]
                switch (status) {
                  case 'completos':   rows = allAssocRespostas.filter(r => r.completo); break
                  case 'parciais':    rows = allAssocRespostas.filter(r => !r.completo); break
                  case 'parou_final': rows = allAssocRespostas.filter(r => !r.completo && r.etapa_atual === 11); break
                  case 'sem_igreja':  rows = allAssocRespostas.filter(r => !r.completo && !r.igreja_id); break
                  case 'com_igreja':  rows = allAssocRespostas.filter(r => !r.completo && !!r.igreja_id); break
                  default:            rows = allAssocRespostas
                }
                setShowAssocList({ sigla: a.sigla, nome: a.nome, status, respostas: rows })
              }
              const igrejasAssoc = a.id === 'sem'
                ? igrejasMembros.filter(ig => !ig.associacao_id)
                : igrejasMembros.filter(ig => ig.associacao_id === a.id)
              const totalIgrejas = igrejasAssoc.length
              const membrosAssoc = igrejasAssoc.reduce((sum, ig) => sum + (ig.membros_ativos || 0), 0)
              const cobertura = membrosAssoc > 0 ? Math.round((completos / membrosAssoc) * 100) : 0
              const isExpanded = gestaoExpanded === a.id

              return (
                <div key={a.id} className="card overflow-hidden">
                  {/* Header — div clicável (não <button>) para permitir botões filhos */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setGestaoExpanded(isExpanded ? null : a.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGestaoExpanded(isExpanded ? null : a.id) } }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                  >
                    {a.id === 'sem' ? (
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg shrink-0">{a.sigla}</span>
                    ) : (
                      <Link
                        to={`/cadastro/associacao/${a.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                        title="Abrir painel da associação (tático)"
                      >
                        {a.sigla} ↗
                      </Link>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{a.nome}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-teal-600" title="Total de membros (Inventário)">
                          {membrosAssoc.toLocaleString('pt-BR')} membros
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{totalIgrejas} igrejas</span>
                        <span className="text-xs text-gray-400">·</span>
                        <button
                          type="button"
                          onClick={(e) => openStatusList('todos', e)}
                          disabled={allAssocRespostas.length === 0}
                          className="text-xs text-gray-500 hover:text-primary-700 hover:underline disabled:hover:no-underline disabled:hover:text-gray-400 disabled:cursor-default"
                          title="Ver todas as respostas desta associação"
                        >
                          {allAssocRespostas.length} respostas
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openStatusList('completos', e)}
                          disabled={completos === 0}
                          className="text-xs text-green-600 hover:text-green-800 hover:underline disabled:hover:no-underline disabled:cursor-default"
                          title="Ver os respondentes que concluíram"
                        >
                          {completos} completos
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openStatusList('parciais', e)}
                          disabled={parciais === 0}
                          className="text-xs text-amber-600 hover:text-amber-800 hover:underline disabled:hover:no-underline disabled:cursor-default"
                          title={parciaisSemIgreja > 0 ? `${parciaisComIgreja} com igreja, ${parciaisSemIgreja} sem igreja (parou antes da etapa 6) — clique para ver` : 'Ver os parciais desta associação'}
                        >
                          {parciais} parciais
                        </button>
                        {parciaisSemIgreja > 0 && (
                          <button
                            type="button"
                            onClick={(e) => openStatusList('sem_igreja', e)}
                            className="text-xs text-amber-500 hover:text-amber-700 hover:underline italic"
                            title="Parciais que abandonaram antes de selecionar a igreja"
                          >
                            ({parciaisSemIgreja} s/ igreja)
                          </button>
                        )}
                        {parouNaFinal > 0 && (
                          <button
                            type="button"
                            onClick={(e) => openStatusList('parou_final', e)}
                            className="text-xs text-orange-600 hover:text-orange-800 hover:underline"
                            title="Chegaram até a etapa 11 mas não clicaram em Enviar"
                          >
                            {parouNaFinal} parou na final
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24" title="Taxa de conclusão dentro das respostas recebidas">
                        <p className="text-[10px] text-gray-400 text-right">conclusão</p>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-500 text-right mt-0.5">{pct}%</p>
                      </div>
                      {membrosAssoc > 0 && (
                        <div className="w-24" title="Cobertura = completos / membros do Inventário">
                          <p className="text-[10px] text-gray-400 text-right">cobertura</p>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${cobertura >= 75 ? 'bg-green-500' : cobertura >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, cobertura)}%` }} />
                          </div>
                          <p className={`text-[10px] text-right mt-0.5 ${cobertura >= 75 ? 'text-green-600' : cobertura >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{cobertura}%</p>
                        </div>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); exportCSV(allAssocRespostas, `censo_${a.sigla}_${new Date().toISOString().slice(0,10)}.csv`) }}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg" title="Exportar CSV">
                        <HiOutlineDownload className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded: lista de igrejas + lista de respostas */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {/* Breakdown por igreja (membros e respostas por igreja) */}
                      {igrejasAssoc.length > 0 && (
                        <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Igrejas da associação
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 text-[10px] uppercase">
                                  <th className="text-left py-1 pr-3 font-medium">Igreja</th>
                                  <th className="text-left py-1 pr-3 font-medium">Cidade</th>
                                  <th className="text-right py-1 pr-3 font-medium">Membros</th>
                                  <th className="text-right py-1 pr-3 font-medium">Respostas</th>
                                  <th className="text-right py-1 pr-3 font-medium">Completos</th>
                                  <th className="text-right py-1 font-medium">Cobertura</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {igrejasAssoc.map(ig => {
                                  const respIg = allAssocRespostas.filter(r => r.igreja_id === ig.id)
                                  const compIg = respIg.filter(r => r.completo).length
                                  const membrosIg = ig.membros_ativos || 0
                                  const cobIg = membrosIg > 0 ? Math.round((compIg / membrosIg) * 100) : 0
                                  return (
                                    <tr key={ig.id} className="hover:bg-gray-50">
                                      <td className="py-1.5 pr-3">
                                        <Link to={`/cadastro/igreja/${ig.id}`} className="text-primary-700 hover:underline" title="Abrir perfil da igreja (operacional)">
                                          {ig.nome} ↗
                                        </Link>
                                      </td>
                                      <td className="py-1.5 pr-3 text-gray-500">{ig.endereco_cidade || '-'}</td>
                                      <td className="py-1.5 pr-3 text-right text-teal-700 font-medium tabular-nums">{membrosIg}</td>
                                      <td className="py-1.5 pr-3 text-right text-gray-600 tabular-nums">{respIg.length}</td>
                                      <td className="py-1.5 pr-3 text-right text-green-700 font-medium tabular-nums">{compIg}</td>
                                      <td className={`py-1.5 text-right font-medium tabular-nums ${
                                        membrosIg === 0 ? 'text-gray-400' : cobIg >= 75 ? 'text-green-600' : cobIg >= 40 ? 'text-amber-600' : 'text-red-600'
                                      }`}>
                                        {membrosIg === 0 ? '-' : `${cobIg}%`}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-gray-200 font-semibold text-gray-700">
                                  <td className="py-1.5 pr-3" colSpan={2}>Total</td>
                                  <td className="py-1.5 pr-3 text-right text-teal-700 tabular-nums">{membrosAssoc}</td>
                                  <td className="py-1.5 pr-3 text-right tabular-nums">{allAssocRespostas.length}</td>
                                  <td className="py-1.5 pr-3 text-right text-green-700 tabular-nums">{completos}</td>
                                  <td className={`py-1.5 text-right tabular-nums ${
                                    membrosAssoc === 0 ? 'text-gray-400' : cobertura >= 75 ? 'text-green-600' : cobertura >= 40 ? 'text-amber-600' : 'text-red-600'
                                  }`}>
                                    {membrosAssoc === 0 ? '-' : `${cobertura}%`}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1.5">
                            Membros vêm do Inventário Missionário (atualização ao vivo).
                            Respostas casadas pelo nome da igreja informado no formulário.
                          </p>
                        </div>
                      )}

                      {searched.length === 0 ? (
                        <p className="p-4 text-sm text-gray-400 text-center">Nenhuma resposta {gestaoStatus !== 'todos' ? `(${gestaoStatus})` : ''}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-left text-gray-500 text-[10px] uppercase tracking-wider">
                                <th className="px-4 py-2">Nome</th>
                                <th className="px-4 py-2">Igreja</th>
                                <th className="px-4 py-2">Contato</th>
                                <th className="px-4 py-2 text-center">Status</th>
                                <th className="px-4 py-2 text-center">Secretaria</th>
                                <th className="px-4 py-2 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {searched.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{r.nome || '-'}</td>
                                  <td className="px-4 py-2.5 text-gray-500 text-xs">
                                    {r.igreja_id && igrejaInfoById.get(r.igreja_id)?.nome ? (
                                      <span className="text-gray-700">{igrejaInfoById.get(r.igreja_id)!.nome}</span>
                                    ) : r.completo ? (
                                      <span className="text-gray-400">—</span>
                                    ) : (
                                      <span className="text-amber-600 italic" title={`Abandonou antes de selecionar a igreja (etapa ${r.etapa_atual} de 11)`}>
                                        Não selecionou (E{r.etapa_atual})
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-xs">
                                    {r.telefone && <span className="block text-gray-600">{r.telefone}</span>}
                                    {r.email && <span className="block text-gray-400">{r.email}</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    {r.completo ? (
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                        Completo
                                      </span>
                                    ) : r.etapa_atual === 11 ? (
                                      <span
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700"
                                        title="Chegou até a última etapa mas não clicou em Enviar"
                                      >
                                        Parou na final
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                        Parcial ({r.etapa_atual}/11)
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    {r.nome && (
                                      <a href={`/membros?q=${encodeURIComponent(r.nome)}`} target="_blank" rel="noopener noreferrer"
                                        className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline">
                                        Ver ficha
                                      </a>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <button onClick={() => setShowDetail(r)} className="text-primary-600 hover:text-primary-800 p-1 rounded-lg hover:bg-primary-50">
                                      <HiOutlineEye className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        )
      })()}

      {/* ========== TAB: DASHBOARD ========== */}
      {pageTab === 'dashboard' && <>

      {/* Public Link Banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-primary-800">Link Público do Formulário</p>
          <p className="text-xs text-primary-600 mt-0.5">Compartilhe este link para receber cadastros sem necessidade de login</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-white border border-primary-200 rounded-lg px-3 py-2 text-primary-700 truncate max-w-xs">
            {publicUrl}
          </code>
          <button onClick={copyLink} className="btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap" title="Copiar link">
            <HiOutlineClipboardCopy className="w-4 h-4" />
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap" title="Abrir link">
            <HiOutlineExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => { fetchRespostas(); fetchAssociacoes(); fetchIgrejasMembros() }}
            disabled={loading}
            className="btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            title="Recarregar dados do banco"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {loading ? 'Atualizando' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Stat Cards — números operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-5">
        <div
          className="card flex items-start gap-4"
          title="Total de membros conforme atualizado em Missões > Inventário (igrejas.membros_ativos)"
        >
          <div className="bg-teal-500 p-3 rounded-xl text-white">
            <HiOutlineUsers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Membros</p>
            <p className="text-2xl font-bold text-gray-800">{totalMembrosInventario.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">via Inventário</p>
          </div>
        </div>
        <div className="card flex items-start gap-4 cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all" onClick={() => { setGestaoStatus('todos'); setPageTab('gestao') }}>
          <div className="bg-blue-500 p-3 rounded-xl text-white">
            <HiOutlineDocumentText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Cadastros</p>
            <p className="text-2xl font-bold text-gray-800">{total}</p>
          </div>
        </div>
        <div className="card flex items-start gap-4 cursor-pointer hover:ring-2 hover:ring-green-200 transition-all" onClick={() => { setGestaoStatus('completos'); setPageTab('gestao') }}>
          <div className="bg-green-500 p-3 rounded-xl text-white">
            <HiOutlineCheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Completos</p>
            <p className="text-2xl font-bold text-gray-800">{completos}</p>
          </div>
        </div>
        <div className="card flex items-start gap-4 cursor-pointer hover:ring-2 hover:ring-amber-200 transition-all" onClick={() => { setGestaoStatus('parciais'); setPageTab('gestao') }}>
          <div className="bg-amber-500 p-3 rounded-xl text-white">
            <HiOutlineClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Parciais</p>
            <p className="text-2xl font-bold text-gray-800">{parciais}</p>
          </div>
        </div>
        <div
          className="card flex items-start gap-4 cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all"
          onClick={() => { setGestaoStatus('parou_final'); setPageTab('gestao') }}
          title="Chegaram até a última etapa mas não clicaram 'Enviar'. Candidatos a recuperação."
        >
          <div className="bg-orange-500 p-3 rounded-xl text-white">
            <HiOutlineExternalLink className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Parou na Final</p>
            <p className="text-2xl font-bold text-gray-800">{parouFinal}</p>
          </div>
        </div>
        <div className="card flex items-start gap-4">
          <div className="bg-indigo-500 p-3 rounded-xl text-white">
            <HiOutlineFilter className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Taxa Conclusão</p>
            <p className="text-2xl font-bold text-gray-800">{taxaComplecao}%</p>
          </div>
        </div>
        <div className="card flex items-start gap-4">
          <div className="bg-purple-500 p-3 rounded-xl text-white">
            <HiOutlineUserGroup className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Este Mês</p>
            <p className="text-2xl font-bold text-gray-800">
              {respostas.filter(r => {
                const d = new Date(r.created_at)
                const now = new Date()
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* Índices compostos (KPIs analíticos derivados das respostas) */}
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
              Índices compostos · 0–100
            </p>
            <p className="text-[10px] text-gray-400">
              Calculados a partir das notas de satisfação e frequência respondidas
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            <KpiIndice label="Vida Espiritual" value={indicesUniao.vidaEspiritual} icon={HiOutlineSparkles} iconBg="bg-amber-500" />
            <KpiIndice label="Mobilização" value={indicesUniao.mobilizacao} icon={HiOutlineLightningBolt} iconBg="bg-rose-500" />
            <KpiIndice label="Saúde Relacional" value={indicesUniao.saudeRelacional} icon={HiOutlineHeart} iconBg="bg-pink-500" />
            <KpiIndice label="Geral" value={indicesUniao.geral} icon={HiOutlineChartBar} iconBg="bg-emerald-500" />
          </div>
        </div>
      )}

      {/* Meta de Cobertura (cadastros vs membros) */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Meta de Cobertura</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Quantos membros já preencheram o formulário em relação à meta
              {metaCustom == null ? ' (100% dos membros do inventário)' : ' (meta personalizada)'}.
            </p>
          </div>
          {!editandoMeta ? (
            <button
              onClick={() => { setEditandoMeta(true); setMetaInput(metaCustom ? String(metaCustom) : '') }}
              className="text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline whitespace-nowrap"
            >
              {metaCustom != null ? 'Editar meta' : 'Definir meta personalizada'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={metaInput}
                onChange={e => setMetaInput(e.target.value)}
                placeholder="Ex: 500"
                className="input-field text-xs w-28"
                autoFocus
              />
              <button onClick={salvarMeta}
                className="text-xs font-medium px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700">
                Salvar
              </button>
              <button onClick={() => { setEditandoMeta(false); setMetaInput('') }}
                className="text-xs font-medium px-2 py-1 rounded text-gray-500 hover:bg-gray-100">
                Cancelar
              </button>
            </div>
          )}
        </div>

        {meta === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Defina o número de membros no Inventário ou uma meta personalizada para acompanhar o progresso.
          </p>
        ) : (
          <>
            {/* Big numbers row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div>
                <p className="text-xs text-gray-500">Cadastros completos</p>
                <p className="text-2xl font-bold text-green-600">{completos.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Meta</p>
                <p className="text-2xl font-bold text-gray-800">{meta.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">% atingido</p>
                <p className={`text-2xl font-bold ${pctCobertura >= 75 ? 'text-green-600' : pctCobertura >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {pctCobertura}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Faltam</p>
                <p className="text-2xl font-bold text-orange-600">{faltamMeta.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Progress bar (stacked: completos + parciais) */}
            <div className="space-y-2">
              <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-amber-300 transition-all"
                  style={{ width: `${pctCoberturaParcial}%` }}
                  title={`${pctCoberturaParcial}% incluindo parciais`}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-green-500 flex items-center justify-end pr-2 transition-all"
                  style={{ width: `${pctCobertura}%` }}
                >
                  {pctCobertura >= 10 && (
                    <span className="text-[11px] font-semibold text-white">{pctCobertura}%</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                    Completos ({completos})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-300" />
                    + Parciais ({parciais})
                  </span>
                </div>
                <span>
                  {completos.toLocaleString('pt-BR')} / {meta.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Insight */}
            {totalMembrosInventario > 0 && (
              <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
                <span className="font-medium text-gray-700">{pctMembrosCompletos}%</span> dos{' '}
                <span className="font-medium">{totalMembrosInventario.toLocaleString('pt-BR')}</span> membros registrados no Inventário já preencheram o formulário completo.
                {faltamMeta > 0 && (
                  <> Faltam <span className="font-medium text-orange-600">{faltamMeta.toLocaleString('pt-BR')}</span> para atingir a meta.</>
                )}
              </p>
            )}
          </>
        )}
      </div>
      {/* Análises estratégicas: Ranking + Heatmap + Matriz IxD + Termômetro */}
      {total > 0 && (
        <section className="space-y-5">
          {/* Ranking de associações */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">Ranking de associações por índice geral</h3>
              <span className="text-xs text-gray-400">Clique na sigla para abrir o painel tático</span>
            </div>
            {rankingAssoc.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sem dados suficientes.</p>
            ) : (
              <div className="space-y-2">
                {rankingAssoc.map(r => {
                  const c = classifyScore(r.indiceGeral / 25)
                  const cor = classColors(c)
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <Link
                        to={`/cadastro/associacao/${r.id}`}
                        className="text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg shrink-0 w-16 text-center"
                      >
                        {r.sigla}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="text-gray-700 truncate" title={r.nome}>{r.nome}</span>
                          <span className="text-gray-500 tabular-nums shrink-0 ml-2">
                            {r.completos} compl · {r.cobertura}% cob.
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${r.indiceGeral}%`, backgroundColor: cor.solid }} />
                        </div>
                      </div>
                      <span className={`text-sm font-bold tabular-nums w-10 text-right ${cor.text}`}>{r.indiceGeral}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Heatmap associações × áreas */}
          {heatmapData.length > 0 && (
            <div className="card overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">Heatmap associações × áreas avaliadas</h3>
                <p className="text-xs text-gray-400">Verde ≥3,2 · Amarelo ≥2,4 · Vermelho &lt;2,4 · Cinza sem dados</p>
              </div>
              <div className="min-w-[800px]">
                <div className="grid" style={{ gridTemplateColumns: `100px repeat(${SATISFACAO_ITENS.length}, minmax(46px, 1fr)) 50px` }}>
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 px-2 py-1.5">Assoc.</div>
                  {SATISFACAO_ITENS.map(a => (
                    <div key={a} className="text-[9px] text-gray-500 px-1 py-1.5 text-center" title={a}>
                      {a.length > 11 ? a.slice(0, 11) + '…' : a}
                    </div>
                  ))}
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 px-1 py-1.5 text-right">N</div>

                  {heatmapData.map(({ assoc, scores, n }) => {
                    const byArea = new Map(scores.map(s => [s.area, s]))
                    return (
                      <Link key={assoc.id} to={`/cadastro/associacao/${assoc.id}`} className="contents group">
                        <span className="px-2 py-1.5 text-xs font-semibold text-primary-700 group-hover:underline truncate" title={assoc.nome}>
                          {assoc.sigla}
                        </span>
                        {SATISFACAO_ITENS.map(a => {
                          const s = byArea.get(a)
                          if (!s || s.respondentes === 0) {
                            return <div key={a} className="m-0.5 rounded-sm bg-gray-50 h-7" />
                          }
                          const cor = classColors(s.classificacao)
                          return (
                            <div
                              key={a}
                              className={`m-0.5 rounded-sm h-7 flex items-center justify-center text-[10px] font-bold tabular-nums ${cor.text} group-hover:ring-1 group-hover:ring-primary-300`}
                              style={{ backgroundColor: cor.soft }}
                              title={`${assoc.sigla} · ${a}: ${s.media.toFixed(2)}/4 (${s.respondentes} resp.)`}
                            >
                              {s.media.toFixed(1)}
                            </div>
                          )
                        })}
                        <span className="px-1 py-1.5 text-xs text-gray-500 tabular-nums text-right">{n}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Matriz Importância × Desempenho */}
          {matrizIxD.length > 0 && (
            <div className="card">
              <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">Matriz Importância × Desempenho</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                    Cruza <strong>prioridades demandadas</strong> (etapa 9 do formulário) com a <strong>satisfação atual</strong>
                    da área avaliada correspondente (etapa 8). Uma área pode ter nota baixa <em>e</em> não estar em "Agir Agora"
                    se os membros ainda não a destacaram como prioridade — nesse caso vale comunicação proativa.
                  </p>
                </div>
              </div>
              <ExecMatriz items={matrizIxD} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                <p>• <strong>Importância</strong>: % de membros que marcaram a prioridade.</p>
                <p>• <strong>Desempenho</strong>: 0–100 (nota média 1–4 normalizada).</p>
              </div>
            </div>
          )}

          {/* Termômetro de áreas: críticas + saudáveis em cards grandes coloridos */}
          {areaScoresUniao.filter(a => a.respondentes > 0).length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-1">Termômetro de áreas</h3>
              <p className="text-xs text-gray-500 mb-4">
                Cada card mostra a nota média (1–4), o equivalente em índice 0–100 e a classificação automática.
              </p>

              {/* Áreas em atenção / críticas */}
              {areaScoresUniao.filter(a => a.respondentes > 0 && a.classificacao !== 'saudavel').length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
                      Pedem ação ({areaScoresUniao.filter(a => a.respondentes > 0 && a.classificacao !== 'saudavel').length})
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {areaScoresUniao
                      .filter(a => a.respondentes > 0 && a.classificacao !== 'saudavel')
                      .sort((a, b) => a.media - b.media)
                      .map(s => <AreaScoreCard key={s.area} score={s} />)}
                  </div>
                </div>
              )}

              {/* Áreas saudáveis */}
              {areaScoresUniao.filter(a => a.respondentes > 0 && a.classificacao === 'saudavel').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Saudáveis ({areaScoresUniao.filter(a => a.respondentes > 0 && a.classificacao === 'saudavel').length})
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {areaScoresUniao
                      .filter(a => a.respondentes > 0 && a.classificacao === 'saudavel')
                      .sort((a, b) => b.media - a.media)
                      .map(s => <AreaScoreCard key={s.area} score={s} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Partial Responses Breakdown */}
      {parciais > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Respostas Parciais - Etapa de Abandono</h3>
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
            {Array.from({ length: 11 }, (_, i) => i + 1).map(etapa => {
              const qtd = etapaCount[etapa] || 0
              const disabled = qtd === 0
              return (
                <button
                  key={etapa}
                  type="button"
                  disabled={disabled}
                  onClick={() => setShowEtapaModal(etapa)}
                  title={disabled ? `Nenhum abandono na etapa ${etapa}` : `Ver os ${qtd} parciais que pararam em E${etapa} — ${ETAPAS_LABELS[etapa]}`}
                  className={`text-center group transition-transform ${disabled ? 'cursor-default' : 'cursor-pointer hover:-translate-y-0.5'}`}
                >
                  <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-bold ${
                    disabled ? 'bg-gray-50 text-gray-300' : 'bg-amber-100 text-amber-700 group-hover:bg-amber-200 group-hover:ring-2 group-hover:ring-amber-300'
                  }`}>
                    {qtd}
                  </div>
                  <p className={`text-xs mt-1 ${disabled ? 'text-gray-400' : 'text-amber-700 group-hover:text-amber-900 font-medium'}`}>E{etapa}</p>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">Clique em uma etapa para ver os parciais e reenviar o link de retomada</p>
        </div>
      )}

      {/* Charts Row 1: Monthly + Gender + Age */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Cadastros por Mês</h3>
          <div className="h-52">
            {sortedMonths.length > 0 ? (
              <Bar data={monthlyData} options={chartOptions} />
            ) : (
              <p className="text-gray-400 text-sm text-center mt-16">Sem dados</p>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Gênero</h3>
          <div className="h-52 flex items-center justify-center">
            {Object.keys(generoCount).length > 0 ? (
              <Doughnut data={genderData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            ) : (
              <p className="text-gray-400 text-sm">Sem dados</p>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Faixa Etária</h3>
          <div className="h-52">
            {sortedAgeGroups.length > 0 ? (
              <Bar data={ageData} options={chartOptions} />
            ) : (
              <p className="text-gray-400 text-sm text-center mt-16">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Satisfaction Radar + Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Satisfação Média (1-4)</h3>
          <div className="h-72 flex items-center justify-center">
            {satisfacaoKeys.length > 0 ? (
              <Radar data={satisfacaoData} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: { min: 0, max: 4, ticks: { stepSize: 1 } },
                },
                plugins: { legend: { display: false } },
              }} />
            ) : (
              <p className="text-gray-400 text-sm">Sem dados de satisfação</p>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Prioridades Mais Votadas</h3>
          <div className="h-72">
            {sortedPrioridades.length > 0 ? (
              <Bar data={prioridadeData} options={horizontalOptions} />
            ) : (
              <p className="text-gray-400 text-sm text-center mt-24">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 3: Departments + Talents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Departamentos de Interesse</h3>
          <div className="h-72">
            {sortedDeps.length > 0 ? (
              <Bar data={depData} options={horizontalOptions} />
            ) : (
              <p className="text-gray-400 text-sm text-center mt-24">Sem dados</p>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Pontos Fortes</h3>
          {sortedDons.length > 0 ? (
            <div className="space-y-2">
              {sortedDons.map(([don, count]) => (
                <div key={don} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 min-w-[160px]">{don}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5">
                    <div
                      className="bg-indigo-500 h-5 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(20, (count / (sortedDons[0]?.[1] || 1)) * 100)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center mt-24">Sem dados</p>
          )}
        </div>
      </div>

      {/* Demographics Row: Estado civil + Cidades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Estado Civil</h3>
          {Object.keys(estadoCivilCount).length > 0 ? (
            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="h-52 flex items-center justify-center">
                <Doughnut
                  data={{
                    labels: Object.entries(estadoCivilCount).sort((a, b) => b[1] - a[1]).map(([k]) =>
                      k.replace(/_/g, ' ').replace(/(^|\s)\S/g, c => c.toUpperCase()),
                    ),
                    datasets: [{
                      data: Object.entries(estadoCivilCount).sort((a, b) => b[1] - a[1]).map(([, v]) => v),
                      backgroundColor: [
                        'rgba(99, 102, 241, 0.85)',
                        'rgba(244, 114, 182, 0.85)',
                        'rgba(139, 92, 246, 0.85)',
                        'rgba(245, 158, 11, 0.85)',
                        'rgba(16, 185, 129, 0.85)',
                        'rgba(239, 68, 68, 0.85)',
                      ],
                      borderWidth: 0,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
              <div className="space-y-1.5">
                {Object.entries(estadoCivilCount).sort((a, b) => b[1] - a[1]).map(([ec, count], idx) => {
                  const colors = ['bg-indigo-500', 'bg-pink-400', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-red-500']
                  const totalEC = Object.values(estadoCivilCount).reduce((a, b) => a + b, 0)
                  const pct = totalEC > 0 ? Math.round((count / totalEC) * 100) : 0
                  return (
                    <div key={ec} className="flex items-center gap-2 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${colors[idx % colors.length]}`} />
                      <span className="text-gray-700 capitalize flex-1">{ec.replace(/_/g, ' ')}</span>
                      <span className="text-gray-500 tabular-nums">{count}</span>
                      <span className="text-gray-400 tabular-nums w-9 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center mt-12">Sem dados</p>
          )}
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Cidades (Top 8)</h3>
          <p className="text-[10px] text-gray-400 -mt-3 mb-3">Respostas / membros do inventário naquela cidade</p>
          {sortedCidades.length > 0 ? (
            <div className="space-y-2.5">
              {(() => {
                // membros por cidade (cross com igrejas.endereco_cidade), normalizando
                const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
                const membrosPorCidade: Record<string, number> = {}
                igrejasNoEscopo.forEach(ig => {
                  if (!ig.endereco_cidade) return
                  const k = norm(ig.endereco_cidade)
                  membrosPorCidade[k] = (membrosPorCidade[k] || 0) + (ig.membros_ativos || 0)
                })
                const maxResp = sortedCidades[0]?.[1] || 1
                return sortedCidades.map(([cidade, count]) => {
                  const membros = membrosPorCidade[norm(cidade)] || 0
                  const cobertura = membros > 0 ? Math.min(100, Math.round((count / membros) * 100)) : null
                  const widthPct = Math.max(8, (count / maxResp) * 100)
                  return (
                    <div key={cidade}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-gray-700 truncate">{cidade}</span>
                        <span className="text-gray-500 tabular-nums shrink-0 ml-2">
                          {count}
                          {membros > 0 && <span className="text-gray-400"> / {membros.toLocaleString('pt-BR')}</span>}
                          {cobertura !== null && (
                            <span className={`ml-1.5 ${cobertura >= 75 ? 'text-green-600' : cobertura >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                              ({cobertura}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center mt-12">Sem dados</p>
          )}
        </div>
      </div>

      {/* Exportar CSV (sem tabela individual) */}
      <div className="flex justify-end">
        <button
          onClick={() => exportCSV(filteredRespostas, `censo_dashboard_${new Date().toISOString().slice(0,10)}.csv`)}
          disabled={filteredRespostas.length === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <HiOutlineDownload className="w-4 h-4" />
          Exportar CSV ({filteredRespostas.length})
        </button>
      </div>

      </>}

      {/* ========== TAB: TERRITÓRIO (IBGE) ========== */}
      {pageTab === 'territorio' && (
        <TerritorioTab
          rows={respostasByAssoc as unknown as MetricsCensoRow[]}
          igrejas={igrejasNoEscopo}
        />
      )}

      {/* Detail Modal */}
      {showDetail && (
        <DetailModal resposta={showDetail} onClose={() => setShowDetail(null)} />
      )}

      {/* Etapa de Abandono Modal */}
      {showEtapaModal !== null && (
        <EtapaAbandonoModal
          etapa={showEtapaModal}
          respostas={respostasByAssoc.filter(r => !r.completo && r.etapa_atual === showEtapaModal)}
          igrejaInfoById={igrejaInfoById}
          getAssocSigla={getAssocSigla}
          onClose={() => setShowEtapaModal(null)}
          onShowDetail={(r) => { setShowEtapaModal(null); setShowDetail(r) }}
          exportCSV={exportCSV}
        />
      )}

      {/* Status filtrado por associação Modal */}
      {showAssocList && (
        <AssocStatusListModal
          assocSigla={showAssocList.sigla}
          assocNome={showAssocList.nome}
          status={showAssocList.status}
          respostas={showAssocList.respostas}
          igrejaInfoById={igrejaInfoById}
          onClose={() => setShowAssocList(null)}
          onShowDetail={(r) => { setShowAssocList(null); setShowDetail(r) }}
          exportCSV={exportCSV}
        />
      )}
    </div>
  )
}

// ========== ETAPA DE ABANDONO MODAL ==========
// Modal acionado ao clicar em uma das caixas E1..E11 do dashboard.
// Lista todos os parciais que pararam exatamente naquela etapa, com ações:
// reenviar link de retomada (WhatsApp, email, copiar), ver ficha, exportar CSV.
interface EtapaAbandonoModalProps {
  etapa: number
  respostas: CadastroRow[]
  igrejaInfoById: Map<string, { nome: string; cidade: string | null; membros: number }>
  getAssocSigla: (id: string | null) => string
  onClose: () => void
  onShowDetail: (r: CadastroRow) => void
  exportCSV: (rows: CadastroRow[], filename: string) => void
}

function EtapaAbandonoModal({ etapa, respostas, igrejaInfoById, getAssocSigla, onClose, onShowDetail, exportCSV }: EtapaAbandonoModalProps) {
  const label = ETAPAS_LABELS[etapa] || `Etapa ${etapa}`
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function copyResume(r: CadastroRow) {
    const url = buildResumeUrl(r)
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedId(r.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  function whatsappLink(r: CadastroRow): string | null {
    const url = buildResumeUrl(r)
    if (!url) return null
    // prioriza telefone do próprio; se faltar, usa whatsapp_parente
    const phone = digitsOnly(r.telefone) || digitsOnly(r.whatsapp_parente)
    if (!phone) return null
    const phoneE164 = phone.startsWith('55') ? phone : `55${phone}`
    const nome = (r.nome || 'irmão(a)').split(' ')[0]
    const msg = `Olá ${nome}! 🙏 Aqui é da União Norte Nordeste. Você começou o cadastro do nosso Censo mas não concluiu. Pode finalizar de onde parou neste link (suas respostas estão salvas):\n\n${url}\n\nLeva poucos minutos. Obrigado por participar!`
    return `https://wa.me/${phoneE164}?text=${encodeURIComponent(msg)}`
  }

  function mailtoLink(r: CadastroRow): string | null {
    const url = buildResumeUrl(r)
    if (!url || !r.email) return null
    const nome = (r.nome || 'irmão(a)').split(' ')[0]
    const subject = `Finalize seu cadastro do Censo NNE — etapa ${r.etapa_atual} de 11`
    const body = `Olá ${nome},\n\nVocê começou o cadastro do Censo da União Norte Nordeste mas não concluiu. Suas respostas até a etapa ${r.etapa_atual} estão salvas — basta abrir o link abaixo para continuar de onde parou:\n\n${url}\n\nLeva poucos minutos. Obrigado por participar!\n\n— Secretaria da União Norte Nordeste`
    return `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  function igrejaLabel(r: CadastroRow): string {
    if (r.igreja_id) {
      const info = igrejaInfoById.get(r.igreja_id)
      if (info) return info.nome
    }
    return '— ainda não selecionou'
  }

  function handleExport() {
    exportCSV(respostas, `parciais_etapa_${etapa}_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Etapa {etapa} — {label}
            </h2>
            <p className="text-sm text-gray-500">
              {respostas.length} parciais pararam exatamente nesta etapa do formulário
            </p>
          </div>
          <div className="flex items-center gap-2">
            {respostas.length > 0 && (
              <button onClick={handleExport} className="btn-secondary text-xs flex items-center gap-1.5">
                <HiOutlineDownload className="w-4 h-4" />
                Exportar CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto">
          {respostas.length === 0 ? (
            <p className="p-8 text-sm text-gray-400 text-center">Nenhum abandono nesta etapa.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Associação / Igreja</th>
                  <th className="px-4 py-2">Contato</th>
                  <th className="px-4 py-2">Último save</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {respostas.map(r => {
                  const wpp = whatsappLink(r)
                  const mail = mailtoLink(r)
                  const url = buildResumeUrl(r)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 text-sm">{r.nome || <span className="text-gray-400 italic">Sem nome</span>}</p>
                        {(r.cidade || r.estado) && (
                          <p className="text-xs text-gray-500 mt-0.5">{[r.cidade, r.estado].filter(Boolean).join(' / ')}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium text-primary-700">{getAssocSigla(r.associacao_id)}</p>
                        <p className={`mt-0.5 ${r.igreja_id ? 'text-gray-600' : 'text-amber-600 italic'}`}>{igrejaLabel(r)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.telefone && <p className="text-gray-700">{r.telefone}</p>}
                        {r.email && <p className="text-gray-500">{r.email}</p>}
                        {r.whatsapp_parente && (
                          <p className="text-gray-400 text-[10px]" title={`Responsável: ${r.whatsapp_parente_nome || ''}`}>
                            via parente: {r.whatsapp_parente}
                          </p>
                        )}
                        {!r.telefone && !r.email && !r.whatsapp_parente && (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                          {wpp && (
                            <a href={wpp} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] font-medium px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                              WhatsApp
                            </a>
                          )}
                          {mail && (
                            <a href={mail}
                              className="text-[10px] font-medium px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                              E-mail
                            </a>
                          )}
                          {url && (
                            <button onClick={() => copyResume(r)}
                              className={`text-[10px] font-medium px-2 py-1 rounded ${copiedId === r.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                              {copiedId === r.id ? 'Copiado!' : 'Copiar link'}
                            </button>
                          )}
                          {!url && (
                            <span className="text-[10px] text-gray-400 italic" title="Rascunho sem token de retomada — não foi salvo via auto-save.">
                              sem token
                            </span>
                          )}
                          <button onClick={() => onShowDetail(r)}
                            className="text-[10px] font-medium px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100">
                            Ficha
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            Mensagens são abertas no app do usuário (WhatsApp Web/Email). Nada é enviado automaticamente.
          </p>
          <button onClick={onClose} className="btn-secondary text-xs">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ========== ASSOC STATUS LIST MODAL ==========
// Aberto ao clicar em "X completos" / "Y parciais" / "Z parou na final" /
// "(N s/ igreja)" dentro do card de uma associação. Mostra a tabela completa
// daqueles registros com ações de retomada (WhatsApp/email/copiar) e ficha.
const STATUS_LABELS: Record<string, string> = {
  todos: 'Todas as respostas',
  completos: 'Completos',
  parciais: 'Parciais',
  parou_final: 'Parou na final (etapa 11)',
  sem_igreja: 'Parciais sem igreja selecionada',
  com_igreja: 'Parciais com igreja',
}

interface AssocStatusListModalProps {
  assocSigla: string
  assocNome: string
  status: 'todos' | 'completos' | 'parciais' | 'parou_final' | 'sem_igreja' | 'com_igreja'
  respostas: CadastroRow[]
  igrejaInfoById: Map<string, { nome: string; cidade: string | null; membros: number }>
  onClose: () => void
  onShowDetail: (r: CadastroRow) => void
  exportCSV: (rows: CadastroRow[], filename: string) => void
}

function AssocStatusListModal({ assocSigla, assocNome, status, respostas, igrejaInfoById, onClose, onShowDetail, exportCSV }: AssocStatusListModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const filtradas = busca.trim()
    ? respostas.filter(r => {
        const t = busca.toLowerCase()
        return (
          (r.nome || '').toLowerCase().includes(t) ||
          (r.email || '').toLowerCase().includes(t) ||
          (r.telefone || '').includes(t) ||
          (r.cidade || '').toLowerCase().includes(t)
        )
      })
    : respostas

  function copyResume(r: CadastroRow) {
    const url = buildResumeUrl(r)
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedId(r.id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  function whatsappLink(r: CadastroRow): string | null {
    const url = buildResumeUrl(r)
    if (!url) return null
    const phone = digitsOnly(r.telefone) || digitsOnly(r.whatsapp_parente)
    if (!phone) return null
    const phoneE164 = phone.startsWith('55') ? phone : `55${phone}`
    const nome = (r.nome || 'irmão(a)').split(' ')[0]
    const msg = `Olá ${nome}! 🙏 Aqui é da União Norte Nordeste. Você começou o cadastro do nosso Censo mas não concluiu. Pode finalizar de onde parou neste link (suas respostas estão salvas):\n\n${url}\n\nLeva poucos minutos. Obrigado por participar!`
    return `https://wa.me/${phoneE164}?text=${encodeURIComponent(msg)}`
  }

  function mailtoLink(r: CadastroRow): string | null {
    const url = buildResumeUrl(r)
    if (!url || !r.email) return null
    const nome = (r.nome || 'irmão(a)').split(' ')[0]
    const subject = `Finalize seu cadastro do Censo NNE — etapa ${r.etapa_atual} de 11`
    const body = `Olá ${nome},\n\nVocê começou o cadastro do Censo da União Norte Nordeste mas não concluiu. Suas respostas até a etapa ${r.etapa_atual} estão salvas — basta abrir o link abaixo para continuar de onde parou:\n\n${url}\n\nLeva poucos minutos. Obrigado por participar!\n\n— Secretaria da União Norte Nordeste`
    return `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  function igrejaLabel(r: CadastroRow): string {
    if (r.igreja_id) {
      const info = igrejaInfoById.get(r.igreja_id)
      if (info) return info.nome
    }
    return r.completo ? '—' : 'Não selecionou'
  }

  function handleExport() {
    exportCSV(filtradas, `${assocSigla}_${status}_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const isResumable = status !== 'completos' && status !== 'todos'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">{assocSigla}</span>
              <h2 className="text-lg font-bold text-gray-800">{STATUS_LABELS[status]}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {assocNome} · {filtradas.length} de {respostas.length} {respostas.length === 1 ? 'resposta' : 'respostas'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filtradas.length > 0 && (
              <button onClick={handleExport} className="btn-secondary text-xs flex items-center gap-1.5">
                <HiOutlineDownload className="w-4 h-4" />
                Exportar CSV
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input-field pl-10 text-sm"
              placeholder="Filtrar por nome, email, telefone, cidade..."
            />
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto">
          {filtradas.length === 0 ? (
            <p className="p-8 text-sm text-gray-400 text-center">Nenhuma resposta {busca ? 'casa com a busca' : 'nesta categoria'}.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Igreja</th>
                  <th className="px-4 py-2">Cidade / UF</th>
                  <th className="px-4 py-2">Contato</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtradas.map(r => {
                  const wpp = isResumable ? whatsappLink(r) : null
                  const mail = isResumable ? mailtoLink(r) : null
                  const url = isResumable ? buildResumeUrl(r) : null
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800 text-xs">{r.nome || <span className="text-gray-400 italic">Sem nome</span>}</p>
                      </td>
                      <td className={`px-4 py-2.5 text-xs ${r.igreja_id ? 'text-gray-600' : 'text-amber-600 italic'}`}>
                        {igrejaLabel(r)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {[r.cidade, r.estado].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {r.telefone && <p className="text-gray-700">{r.telefone}</p>}
                        {r.email && <p className="text-gray-500">{r.email}</p>}
                        {!r.telefone && !r.email && <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {r.completo ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completo</span>
                        ) : r.etapa_atual === 11 ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Parou final</span>
                        ) : (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">E{r.etapa_atual}/11</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                          {wpp && (
                            <a href={wpp} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] font-medium px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                              WhatsApp
                            </a>
                          )}
                          {mail && (
                            <a href={mail}
                              className="text-[10px] font-medium px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                              E-mail
                            </a>
                          )}
                          {url && (
                            <button onClick={() => copyResume(r)}
                              className={`text-[10px] font-medium px-2 py-1 rounded ${copiedId === r.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                              {copiedId === r.id ? 'Copiado!' : 'Link'}
                            </button>
                          )}
                          <button onClick={() => onShowDetail(r)}
                            className="text-[10px] font-medium px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100">
                            Ficha
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">
            {isResumable
              ? 'Mensagens são abertas no app do usuário (WhatsApp Web/Email). Nada é enviado automaticamente.'
              : 'Clique em "Ficha" para ver os dados completos da resposta.'}
          </p>
          <button onClick={onClose} className="btn-secondary text-xs">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ====== Componentes da matriz I×D (estratégico) ======

// Card branco no padrão dos Stat Cards para os 4 KPIs compostos (0–100).
function KpiIndice({ label, value, icon: Icon, iconBg }: { label: string; value: number; icon: any; iconBg: string }) {
  const c = classifyScore(value / 25)
  const cor = classColors(c)
  const labelCls = c === 'saudavel' ? 'Saudável'
    : c === 'atencao' ? 'Atenção'
    : c === 'critico' ? 'Crítico'
    : '—'
  return (
    <div className="card flex items-start gap-4">
      <div className={`${iconBg} p-3 rounded-xl text-white`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${cor.text}`}>
          {value}<span className="text-sm font-normal text-gray-400">/100</span>
        </p>
        <div className="h-1 mt-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: cor.solid }} />
        </div>
        <p className={`text-[10px] mt-0.5 ${cor.text} font-medium`}>{labelCls}</p>
      </div>
    </div>
  )
}

function AreaScoreCard({ score }: { score: ReturnType<typeof computeAreaScores>[number] }) {
  const cor = classColors(score.classificacao)
  const labelClass = score.classificacao === 'saudavel' ? 'Saudável'
    : score.classificacao === 'atencao' ? 'Atenção'
    : score.classificacao === 'critico' ? 'Crítico'
    : 'Sem dados'
  return (
    <div className={`rounded-xl border-2 ${cor.border} bg-white p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-gray-800 leading-tight">{score.area}</h4>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cor.bg} ${cor.text} shrink-0`}>
          {labelClass}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold tabular-nums ${cor.text}`}>{score.media.toFixed(2)}</span>
            <span className="text-xs text-gray-400">/ 4</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">{score.respondentes} {score.respondentes === 1 ? 'resposta' : 'respostas'}</p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold tabular-nums ${cor.text}`}>{score.pct}</span>
          <p className="text-[10px] text-gray-400">índice / 100</p>
        </div>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score.pct}%`, backgroundColor: cor.solid }} />
      </div>
    </div>
  )
}

function ExecMatriz({ items }: { items: ReturnType<typeof importanciaXDesempenho> }) {
  const buckets = {
    agir_agora: items.filter(i => i.quadrante === 'agir_agora').slice(0, 10),
    manter:     items.filter(i => i.quadrante === 'manter').slice(0, 10),
    over_invest: items.filter(i => i.quadrante === 'over_invest').slice(0, 10),
    baixa_relevancia: items.filter(i => i.quadrante === 'baixa_relevancia').slice(0, 10),
  }
  const Q = ({ titulo, subtitulo, cor, items: it }: { titulo: string; subtitulo: string; cor: 'red'|'green'|'gray'|'blue'; items: any[] }) => {
    const pal = {
      red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
      green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
      gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
    }[cor]
    return (
      <div className={`rounded-xl border ${pal.border} ${pal.bg} p-4`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${pal.text}`}>{titulo}</p>
        <p className="text-[10px] text-gray-500 mb-3">{subtitulo}</p>
        {it.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Nenhum tema.</p>
        ) : (
          <ul className="space-y-1.5">
            {it.map((x: any) => (
              <li key={x.prioridade} className="flex items-start gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${pal.dot}`} />
                <span className="flex-1 text-gray-700">{x.prioridade}</span>
                <span className="text-gray-400 tabular-nums shrink-0">{x.importancia}% · {x.desempenho ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl">
      <Q titulo="Agir agora" subtitulo="Alta demanda · Baixo desempenho" cor="red" items={buckets.agir_agora} />
      <Q titulo="Manter" subtitulo="Alta demanda · Bom desempenho" cor="green" items={buckets.manter} />
      <Q titulo="Baixa relevância" subtitulo="Baixa demanda · Baixo desempenho" cor="gray" items={buckets.baixa_relevancia} />
      <Q titulo="Já investido" subtitulo="Baixa demanda · Bom desempenho" cor="blue" items={buckets.over_invest} />
    </div>
  )
}

// Geração de PDF da ficha individual usando jsPDF + autoTable.
// Não usa html2canvas para garantir texto pesquisável e arquivo leve.
async function generateFichaPDF(r: CadastroRow, igrejaNome: string | null, assocSigla: string | null) {
  const { default: jsPDF } = await import('jspdf')
  const autoTableMod = await import('jspdf-autotable')
  const autoTable = (autoTableMod as any).default || (autoTableMod as any)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 36
  let y = margin

  // Header
  doc.setFillColor(0, 109, 67) // primary green NNE
  doc.rect(0, 0, pageWidth, 70, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('Ficha de Cadastro — Censo NNE', margin, 28)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text('União Norte Nordeste Brasileira (IASD-MR)', margin, 46)
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}`, margin, 60)
  doc.setTextColor(0, 0, 0)
  y = 90

  // Status pill
  const status = r.completo ? 'Completo' : (r.etapa_atual === 11 ? `Parou na final (E${r.etapa_atual}/11)` : `Parcial (E${r.etapa_atual}/11)`)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold')
  doc.text(`${r.nome || 'Sem nome'}`, margin, y); y += 16
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`Status: ${status}  ·  ${assocSigla || 'sem associação'}${igrejaNome ? '  ·  ' + igrejaNome : ''}  ·  Respondido em ${fmtDateBR(r.created_at?.slice(0, 10))}`, margin, y)
  doc.setTextColor(0, 0, 0); y += 18

  function section(title: string, rows: [string, string | null | undefined][]) {
    const filtered = rows.filter(([_, v]) => v && String(v).trim() !== '')
    if (filtered.length === 0) return
    autoTable(doc, {
      startY: y,
      head: [[title]],
      body: filtered.map(([k, v]) => [`${k}`, String(v)]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [0, 109, 67], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 140, fontStyle: 'bold', fillColor: [245, 245, 245] } },
      margin: { left: margin, right: margin },
      didDrawPage: (data: any) => { y = data.cursor.y + 10 }
    })
    y = (doc as any).lastAutoTable.finalY + 12
  }

  const idade = calcAgeFromBirth(r.data_nascimento)
  section('Dados Pessoais', [
    ['Nome', r.nome],
    ['E-mail', r.email],
    ['Telefone', r.telefone],
    ['Sexo', r.sexo === 'masculino' ? 'Masculino' : r.sexo === 'feminino' ? 'Feminino' : null],
    ['Nascimento', r.data_nascimento ? `${fmtDateBR(r.data_nascimento)}${idade ? ` (${idade} anos)` : ''}` : null],
    ['Estado Civil', r.estado_civil ? r.estado_civil.replace(/_/g, ' ') : null],
    ['Escolaridade', r.escolaridade],
    ['Profissão', r.profissao],
  ])

  section('Endereço', [
    ['Cidade / UF', [r.cidade, r.estado].filter(Boolean).join(' / ') || null],
  ])

  section('Jornada na Igreja', [
    ['Tempo de Membro', r.tempo_membro],
    ['Como Conheceu', r.como_conheceu],
    ['Distância da Igreja', r.distancia_igreja],
    ['Meio de Transporte', r.meio_transporte],
  ])

  if (r.cargos_ocupa && r.cargos_ocupa.length > 0) {
    section('Cargos/Departamentos', [['Atuação no último ano', r.cargos_ocupa.join(', ')]])
  }

  if ((r.pontos_fortes && r.pontos_fortes.length > 0) || (r.pontos_fracos && r.pontos_fracos.length > 0)) {
    section('Avaliação da Igreja', [
      ['Pontos Fortes', (r.pontos_fortes || []).join(' · ')],
      ['Pontos Fracos', (r.pontos_fracos || []).join(' · ')],
    ])
  }

  if (r.satisfacao && Object.keys(r.satisfacao).length > 0) {
    const satRows: [string, string][] = Object.entries(r.satisfacao).map(([k, v]) => {
      const labels = ['', 'Muito insatisfeito', 'Insatisfeito', 'Satisfeito', 'Muito satisfeito']
      return [k, labels[v] || String(v)]
    })
    section('Satisfação (1=mín · 4=máx)', satRows)
  }

  if (r.prioridades && r.prioridades.length > 0) {
    section('Prioridades / Ênfases', [['Selecionadas', r.prioridades.join(' · ')]])
  }

  if (r.participacao && Object.keys(r.participacao).length > 0) {
    const parRows: [string, string][] = Object.entries(r.participacao).map(([k, v]) => [k, `${v}x/mês`])
    section('Frequência Mensal', parRows)
  }

  if (r.opiniao_departamentos) {
    section('Observações', [['Comentário', r.opiniao_departamentos]])
  }

  // Rodapé com aviso de privacidade
  const pageCount = (doc as any).internal.getNumberOfPages?.() || 1
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFontSize(7); doc.setTextColor(150, 150, 150)
    doc.text(
      `LGPD: dados confidenciais. Uso restrito à hierarquia eclesiástica conforme escopo do solicitante. Página ${p}/${pageCount}`,
      pageWidth / 2, doc.internal.pageSize.getHeight() - 18, { align: 'center' },
    )
  }

  const safeName = (r.nome || 'sem-nome').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  doc.save(`ficha-${safeName}-${r.id.slice(0, 8)}.pdf`)
}

// ========== DETAIL MODAL ==========
function DetailModal({ resposta, onClose }: { resposta: CadastroRow; onClose: () => void }) {
  const COMO_CONHECEU_LABELS: Record<string, string> = {
    amigo_parente: 'Um amigo ou parente convidou',
    conjuge_membro: 'Cônjuge já era membro',
    veio_pais: 'Veio com os pais',
    nasci_igreja: 'Nasceu na igreja',
    visita_membro: 'Recebeu uma visita',
    campanha: 'Campanha evangelística',
    colportagem: 'Colportagem',
    internet: 'Internet',
    sem_convite: 'Veio sem convite',
    outro: 'Outro',
  }

  const TEMPO_MEMBRO_LABELS: Record<string, string> = {
    menos1: 'Menos de 1 ano',
    '1a5': '1 a 5 anos',
    '6a10': '6 a 10 anos',
    '11a20': '11 a 20 anos',
    '21a30': '21 a 30 anos',
    mais30: 'Mais de 30 anos',
  }

  const TRANSPORTE_LABELS: Record<string, string> = {
    onibus: 'Ônibus',
    carro: 'Carro',
    pe: 'A pé',
    outro: 'Outro',
  }

  const r = resposta
  const [copiedLink, setCopiedLink] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareError, setShareError] = useState('')
  const resumeUrl = !r.completo ? buildResumeUrl(r) : null

  async function handlePdf() {
    setGeneratingPdf(true)
    try {
      // Lookup igreja/assoc para o cabeçalho do PDF (read direto via RLS)
      let igrejaNome: string | null = null
      let assocSigla: string | null = null
      if (r.igreja_id) {
        const { data } = await supabase.from('igrejas').select('nome').eq('id', r.igreja_id).maybeSingle()
        igrejaNome = data?.nome ?? null
      }
      if (r.associacao_id) {
        const { data } = await supabase.from('associacoes').select('sigla').eq('id', r.associacao_id).maybeSingle()
        assocSigla = data?.sigla ?? null
      }
      await generateFichaPDF(r, igrejaNome, assocSigla)
    } catch (err) {
      console.error('PDF erro', err)
      alert('Falha ao gerar PDF.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  async function handleShare(rotate = false) {
    setShareLoading(true)
    setShareError('')
    try {
      const { data, error } = await supabase.functions.invoke('generate-share-token', {
        body: { responseId: r.id, rotate },
      })
      if (error || !data?.success) throw new Error(data?.message || 'Falha.')
      const url = `${window.location.origin}/ficha/${r.id}?token=${data.shareToken}`
      setShareLink(url)
    } catch (err: any) {
      setShareError(err?.message || 'Erro ao gerar link.')
    } finally {
      setShareLoading(false)
    }
  }

  function handleCopyShare() {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 1800)
  }
  const phoneE164 = (() => {
    const phone = digitsOnly(r.telefone) || digitsOnly(r.whatsapp_parente)
    if (!phone) return null
    return phone.startsWith('55') ? phone : `55${phone}`
  })()
  const wppMsg = (() => {
    if (!resumeUrl) return null
    const nome = (r.nome || 'irmão(a)').split(' ')[0]
    return `Olá ${nome}! 🙏 Aqui é da União Norte Nordeste. Você começou o cadastro do nosso Censo mas não concluiu. Pode finalizar de onde parou neste link (suas respostas estão salvas):\n\n${resumeUrl}\n\nLeva poucos minutos. Obrigado por participar!`
  })()
  const wppLink = phoneE164 && wppMsg ? `https://wa.me/${phoneE164}?text=${encodeURIComponent(wppMsg)}` : null
  const mailLink = (() => {
    if (!resumeUrl || !r.email) return null
    const nome = (r.nome || 'irmão(a)').split(' ')[0]
    const subject = `Finalize seu cadastro do Censo NNE — etapa ${r.etapa_atual} de 11`
    const body = `Olá ${nome},\n\nVocê começou o cadastro do Censo da União Norte Nordeste mas não concluiu. Suas respostas até a etapa ${r.etapa_atual} estão salvas — basta abrir o link abaixo para continuar de onde parou:\n\n${resumeUrl}\n\nLeva poucos minutos. Obrigado por participar!\n\n— Secretaria da União Norte Nordeste`
    return `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  })()

  function copyResume() {
    if (!resumeUrl) return
    navigator.clipboard.writeText(resumeUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1800)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{r.nome || 'Sem nome'}</h2>
            <p className="text-sm text-gray-500">
              Respondido em {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              {' '}
              {r.completo ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  Completo
                </span>
              ) : r.etapa_atual === 11 ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Parou na final
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Parcial (etapa {r.etapa_atual}/11)
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Reenviar link de retomada + Continuar pelo admin (só p/ parciais) */}
        {resumeUrl && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-amber-800">
              <span className="font-semibold">Continuar preenchimento</span> · Etapa {r.etapa_atual} de 11
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <a
                href={resumeUrl + '&adminMode=1'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-primary-600 text-white hover:bg-primary-700"
                title="Eu mesmo (admin/missionário) vou continuar preenchendo. Suas ações ficam registradas na auditoria."
              >
                Eu continuo (admin)
              </a>
              {wppLink && (
                <a href={wppLink} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] font-medium px-2.5 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                  WhatsApp p/ membro
                </a>
              )}
              {mailLink && (
                <a href={mailLink}
                  className="text-[11px] font-medium px-2.5 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
                  E-mail
                </a>
              )}
              <button onClick={copyResume}
                className={`text-[11px] font-medium px-2.5 py-1 rounded ${copiedLink ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-100'}`}>
                {copiedLink ? 'Copiado!' : 'Copiar link'}
              </button>
            </div>
          </div>
        )}

        {/* Ações: PDF, Compartilhar, Editar (todas as fichas) */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-600">
            <span className="font-semibold">Ficha:</span> imprimir, compartilhar com terceiros ou {r.completo ? 'corrigir' : 'continuar'} pelo admin
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handlePdf}
              disabled={generatingPdf}
              className="text-[11px] font-medium px-2.5 py-1 rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {generatingPdf ? 'Gerando...' : 'Imprimir / PDF'}
            </button>
            {r.completo && (
              <a
                href={buildResumeUrl(r) ? buildResumeUrl(r) + '&adminMode=1' : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-medium px-2.5 py-1 rounded bg-white border border-primary-200 text-primary-700 hover:bg-primary-50"
                title="Editar/corrigir esta ficha (sua ação fica registrada)"
              >
                Corrigir (admin)
              </a>
            )}
            {!shareLink && (
              <button
                onClick={() => handleShare(false)}
                disabled={shareLoading}
                className="text-[11px] font-medium px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {shareLoading ? 'Gerando...' : 'Compartilhar (link público)'}
              </button>
            )}
            {shareLink && (
              <>
                <button onClick={handleCopyShare}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded ${shareCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                  {shareCopied ? 'Copiado!' : 'Copiar link público'}
                </button>
                <button onClick={() => handleShare(true)}
                  title="Gerar novo token (invalida o link anterior)"
                  className="text-[11px] font-medium px-2.5 py-1 rounded bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  Rotacionar
                </button>
              </>
            )}
          </div>
        </div>
        {shareError && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">{shareError}</div>
        )}

        {/* Content */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Dados Pessoais */}
          <Section title="Dados Pessoais">
            <Grid>
              <Item label="Nome" value={r.nome} />
              <Item label="E-mail" value={r.email} />
              <Item label="Telefone" value={r.telefone} />
              <Item label="Sexo" value={r.sexo === 'masculino' ? 'Masculino' : r.sexo === 'feminino' ? 'Feminino' : null} />
              <Item label="Nascimento" value={r.data_nascimento ? new Date(r.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : null} />
              <Item label="Estado Civil" value={r.estado_civil} capitalize />
              <Item label="Escolaridade" value={r.escolaridade} />
              <Item label="Profissão" value={r.profissao} />
            </Grid>
          </Section>

          {/* Endereço */}
          {(r.cidade || r.estado) && (
            <Section title="Endereço">
              <p className="text-sm text-gray-700">
                {r.cidade}{r.estado ? ` - ${r.estado}` : ''}
              </p>
            </Section>
          )}

          {/* Jornada na Igreja */}
          {(r.tempo_membro || r.como_conheceu || r.distancia_igreja) && (
            <Section title="Jornada na Igreja">
              <Grid>
                <Item label="Tempo de membro" value={r.tempo_membro ? TEMPO_MEMBRO_LABELS[r.tempo_membro] || r.tempo_membro : null} />
                <Item label="Como conheceu" value={r.como_conheceu ? COMO_CONHECEU_LABELS[r.como_conheceu] || r.como_conheceu : null} />
                <Item label="Distância" value={r.distancia_igreja} />
                <Item label="Transporte" value={r.meio_transporte ? TRANSPORTE_LABELS[r.meio_transporte] || r.meio_transporte : null} />
              </Grid>
            </Section>
          )}

          {/* Cargos */}
          {r.cargos_ocupa && r.cargos_ocupa.length > 0 && (
            <Section title="Cargos/Departamentos">
              <div className="flex flex-wrap gap-2">
                {r.cargos_ocupa.map(c => (
                  <span key={c} className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{c}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Pontos Fortes e Fracos */}
          {((r.pontos_fortes && r.pontos_fortes.length > 0) || (r.pontos_fracos && r.pontos_fracos.length > 0)) && (
            <Section title="Pontos Fortes e Fracos">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {r.pontos_fortes && r.pontos_fortes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-1">Pontos Fortes</p>
                    <ul className="space-y-1">
                      {r.pontos_fortes.map((pf, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                          {pf}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.pontos_fracos && r.pontos_fracos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-1">Pontos Fracos</p>
                    <ul className="space-y-1">
                      {r.pontos_fracos.map((pf, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                          {pf}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Satisfação */}
          {r.satisfacao && Object.keys(r.satisfacao).length > 0 && (
            <Section title="Satisfação">
              <div className="space-y-2">
                {Object.entries(r.satisfacao).map(([key, val]) => {
                  const labels = ['', 'Muito insatisfeito', 'Insatisfeito', 'Satisfeito', 'Muito satisfeito']
                  return (
                    <div key={key} className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-sm text-gray-700">{key}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        val >= 3 ? 'bg-green-100 text-green-700' : val >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {labels[val] || val}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Prioridades */}
          {r.prioridades && r.prioridades.length > 0 && (
            <Section title="Prioridades">
              <div className="flex flex-wrap gap-2">
                {r.prioridades.map(p => (
                  <span key={p} className="bg-amber-50 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">{p}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Participação */}
          {r.participacao && Object.keys(r.participacao).length > 0 && (
            <Section title="Participação Mensal">
              <div className="space-y-2">
                {Object.entries(r.participacao).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-gray-50">
                    <span className="text-sm text-gray-700">{key}</span>
                    <span className="text-sm font-medium text-gray-800">{val}x/mês</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Observações */}
          {r.opiniao_departamentos && (
            <Section title="Observações">
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{r.opiniao_departamentos}</p>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ========== DETAIL HELPERS ==========
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gray-800 mb-2 pb-1 border-b border-gray-100">{title}</h4>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
}

function Item({ label, value, capitalize }: { label: string; value: string | null | undefined; capitalize?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  )
}

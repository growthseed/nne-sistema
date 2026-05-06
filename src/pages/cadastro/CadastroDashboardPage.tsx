import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

type TabFilter = 'todos' | 'completos' | 'parciais' | 'parou_final'
type PageTab = 'dashboard' | 'gestao'

interface AssociacaoInfo {
  id: string
  nome: string
  sigla: string
}

export default function CadastroDashboardPage() {
  const { profile } = useAuth()
  const [respostas, setRespostas] = useState<CadastroRow[]>([])
  const [associacoes, setAssociacoes] = useState<AssociacaoInfo[]>([])
  const [igrejasMembros, setIgrejasMembros] = useState<{ id: string; nome: string; endereco_cidade: string | null; associacao_id: string | null; membros_ativos: number | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tabFilter, setTabFilter] = useState<TabFilter>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetail, setShowDetail] = useState<CadastroRow | null>(null)
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
      .select('id, nome, endereco_cidade, associacao_id, membros_ativos')
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
      let query = supabase
        .from('cadastro_respostas')
        .select('*')
        .order('created_at', { ascending: false })

      // Scope filtering by RBAC hierarchy
      if (profile!.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile!.uniao_id!)
      } else if (profile!.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile!.associacao_id!)
      } else if (profile!.papel !== 'admin') {
        query = query.eq('igreja_id', profile!.igreja_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setRespostas((data || []) as CadastroRow[])
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

  // Departamentos (participacao)
  const depCount: Record<string, number> = {}
  respostasByAssoc.forEach(r => {
    if (r.participacao) {
      for (const key of Object.keys(r.participacao)) {
        depCount[key] = (depCount[key] || 0) + 1
      }
    }
  })
  const sortedDeps = Object.entries(depCount).sort((a, b) => b[1] - a[1])

  // Dons/Talentos (pontos_fortes)
  const donsCount: Record<string, number> = {}
  respostasByAssoc.forEach(r => {
    if (r.pontos_fortes) {
      r.pontos_fortes.forEach(d => {
        donsCount[d] = (donsCount[d] || 0) + 1
      })
    }
  })
  const sortedDons = Object.entries(donsCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

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
    labels: sortedDeps.map(([k]) => k),
    datasets: [{
      label: 'Interessados',
      data: sortedDeps.map(([, v]) => v),
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
        <div className="flex items-center gap-2">
          <Link to="/cadastro" className="btn-primary inline-flex items-center gap-2">
            <HiOutlineDocumentText className="w-4 h-4" />
            Novo Cadastro
          </Link>
        </div>
      </div>

      {/* Page Tabs: Dashboard / Gestão */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([['dashboard', 'Dashboard'], ['gestao', 'Gestão por Associação']] as const).map(([key, label]) => (
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
              const pct = allAssocRespostas.length > 0 ? Math.round((completos / allAssocRespostas.length) * 100) : 0
              const igrejasAssoc = a.id === 'sem'
                ? igrejasMembros.filter(ig => !ig.associacao_id)
                : igrejasMembros.filter(ig => ig.associacao_id === a.id)
              const totalIgrejas = igrejasAssoc.length
              const membrosAssoc = igrejasAssoc.reduce((sum, ig) => sum + (ig.membros_ativos || 0), 0)
              const cobertura = membrosAssoc > 0 ? Math.round((completos / membrosAssoc) * 100) : 0
              const isExpanded = gestaoExpanded === a.id

              return (
                <div key={a.id} className="card overflow-hidden">
                  {/* Header */}
                  <button onClick={() => setGestaoExpanded(isExpanded ? null : a.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left">
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg shrink-0">{a.sigla}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{a.nome}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-teal-600" title="Total de membros (Inventário)">
                          {membrosAssoc.toLocaleString('pt-BR')} membros
                        </span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{totalIgrejas} igrejas</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{allAssocRespostas.length} respostas</span>
                        <span className="text-xs text-green-600">{completos} completos</span>
                        <span className="text-xs text-amber-600">{parciais} parciais</span>
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
                  </button>

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
                                  const respIg = allAssocRespostas.filter(r => r.igreja_frequenta && (r.igreja_frequenta === ig.nome))
                                  const compIg = respIg.filter(r => r.completo).length
                                  const membrosIg = ig.membros_ativos || 0
                                  const cobIg = membrosIg > 0 ? Math.round((compIg / membrosIg) * 100) : 0
                                  return (
                                    <tr key={ig.id}>
                                      <td className="py-1.5 pr-3 text-gray-700">{ig.nome}</td>
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
                                  <td className="px-4 py-2.5 text-gray-500 text-xs">{r.igreja_frequenta || '-'}</td>
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
        </div>
      </div>

      {/* Stat Cards */}
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

      {/* Partial Responses Breakdown */}
      {parciais > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Respostas Parciais - Etapa de Abandono</h3>
          <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
            {Array.from({ length: 11 }, (_, i) => i + 1).map(etapa => (
              <div key={etapa} className="text-center">
                <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-bold ${
                  (etapaCount[etapa] || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-300'
                }`}>
                  {etapaCount[etapa] || 0}
                </div>
                <p className="text-xs text-gray-400 mt-1">E{etapa}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Distribuição das respostas incompletas por etapa do formulário</p>
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
            <div className="space-y-2">
              {Object.entries(estadoCivilCount).sort((a, b) => b[1] - a[1]).map(([ec, count]) => (
                <div key={ec} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-700 capitalize">{ec.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-800">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center mt-12">Sem dados</p>
          )}
        </div>
        <div className="card">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Cidades (Top 8)</h3>
          {sortedCidades.length > 0 ? (
            <div className="space-y-2">
              {sortedCidades.map(([cidade, count]) => (
                <div key={cidade} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-sm text-gray-700">{cidade}</span>
                  <span className="text-sm font-medium text-gray-800">{count}</span>
                </div>
              ))}
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

      {/* Detail Modal */}
      {showDetail && (
        <DetailModal resposta={showDetail} onClose={() => setShowDetail(null)} />
      )}
    </div>
  )
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

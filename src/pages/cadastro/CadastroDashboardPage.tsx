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

type TabFilter = 'todos' | 'completos' | 'parciais'

export default function CadastroDashboardPage() {
  const { profile } = useAuth()
  const [respostas, setRespostas] = useState<CadastroRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tabFilter, setTabFilter] = useState<TabFilter>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetail, setShowDetail] = useState<CadastroRow | null>(null)

  const publicUrl = `${window.location.origin}/formulario`

  useEffect(() => {
    if (profile) fetchRespostas()
  }, [profile])

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

  function copyLink() {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ========== FILTERED DATA ==========

  const filteredRespostas = respostas.filter(r => {
    // Tab filter
    if (tabFilter === 'completos' && !r.completo) return false
    if (tabFilter === 'parciais' && r.completo) return false
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

  const total = respostas.length
  const completos = respostas.filter(r => r.completo).length
  const parciais = total - completos
  const taxaComplecao = total > 0 ? Math.round((completos / total) * 100) : 0

  // Gender
  const generoCount: Record<string, number> = {}
  respostas.forEach(r => {
    const g = r.sexo || 'Não informado'
    generoCount[g] = (generoCount[g] || 0) + 1
  })

  // Age groups
  const faixaEtariaCount: Record<string, number> = {}
  respostas.forEach(r => {
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
  respostas.forEach(r => {
    if (r.estado_civil) {
      estadoCivilCount[r.estado_civil] = (estadoCivilCount[r.estado_civil] || 0) + 1
    }
  })

  // Satisfacao averages
  const satisfacaoSums: Record<string, { total: number; count: number }> = {}
  respostas.forEach(r => {
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
  respostas.forEach(r => {
    if (r.prioridades) {
      r.prioridades.forEach(p => {
        prioridadeCount[p] = (prioridadeCount[p] || 0) + 1
      })
    }
  })
  const sortedPrioridades = Object.entries(prioridadeCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Departamentos (participacao)
  const depCount: Record<string, number> = {}
  respostas.forEach(r => {
    if (r.participacao) {
      for (const key of Object.keys(r.participacao)) {
        depCount[key] = (depCount[key] || 0) + 1
      }
    }
  })
  const sortedDeps = Object.entries(depCount).sort((a, b) => b[1] - a[1])

  // Dons/Talentos (pontos_fortes)
  const donsCount: Record<string, number> = {}
  respostas.forEach(r => {
    if (r.pontos_fortes) {
      r.pontos_fortes.forEach(d => {
        donsCount[d] = (donsCount[d] || 0) + 1
      })
    }
  })
  const sortedDons = Object.entries(donsCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Cidades
  const cidadeCount: Record<string, number> = {}
  respostas.forEach(r => {
    if (r.cidade) {
      cidadeCount[r.cidade] = (cidadeCount[r.cidade] || 0) + 1
    }
  })
  const sortedCidades = Object.entries(cidadeCount).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Monthly submissions
  const monthlyCount: Record<string, number> = {}
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  respostas.forEach(r => {
    const d = new Date(r.created_at)
    const key = `${mesesNomes[d.getMonth()]}/${d.getFullYear()}`
    monthlyCount[key] = (monthlyCount[key] || 0) + 1
  })
  const sortedMonths = Object.entries(monthlyCount).slice(-6)

  // Etapa distribution (for partial responses)
  const etapaCount: Record<number, number> = {}
  respostas.filter(r => !r.completo).forEach(r => {
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
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/cadastro" className="hover:text-blue-600">Cadastro</Link>
            <span>/</span>
            <span>Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard de Cadastros</h1>
          <p className="text-gray-500 mt-1">{total} resposta{total !== 1 ? 's' : ''} registrada{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/cadastro" className="btn-primary inline-flex items-center gap-2">
            <HiOutlineDocumentText className="w-4 h-4" />
            Novo Cadastro
          </Link>
        </div>
      </div>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="card flex items-start gap-4 cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all" onClick={() => setTabFilter('todos')}>
          <div className="bg-blue-500 p-3 rounded-xl text-white">
            <HiOutlineDocumentText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-800">{total}</p>
          </div>
        </div>
        <div className="card flex items-start gap-4 cursor-pointer hover:ring-2 hover:ring-green-200 transition-all" onClick={() => setTabFilter('completos')}>
          <div className="bg-green-500 p-3 rounded-xl text-white">
            <HiOutlineCheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Completos</p>
            <p className="text-2xl font-bold text-gray-800">{completos}</p>
          </div>
        </div>
        <div className="card flex items-start gap-4 cursor-pointer hover:ring-2 hover:ring-amber-200 transition-all" onClick={() => setTabFilter('parciais')}>
          <div className="bg-amber-500 p-3 rounded-xl text-white">
            <HiOutlineClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Parciais</p>
            <p className="text-2xl font-bold text-gray-800">{parciais}</p>
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

      {/* Responses Table with Filters */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base font-semibold text-gray-800">Respostas ({filteredRespostas.length})</h3>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, cidade..."
                  className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-60"
                />
              </div>
              {/* Tab filters */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                {([['todos', 'Todos'], ['completos', 'Completos'], ['parciais', 'Parciais']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTabFilter(key)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      tabFilter === key
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {filteredRespostas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {searchTerm ? 'Nenhuma resposta encontrada para esta busca' : 'Nenhuma resposta registrada'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3 text-center">Etapa</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Data</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRespostas.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.nome || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.cidade ? `${r.cidade}${r.estado ? `/${r.estado}` : ''}` : '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="text-xs">
                        {r.telefone && <span className="block">{r.telefone}</span>}
                        {r.email && <span className="block text-gray-400">{r.email}</span>}
                        {!r.telefone && !r.email && '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-medium text-gray-600">{r.etapa_atual}/11</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        r.completo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.completo ? 'Completo' : 'Parcial'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setShowDetail(r)}
                        className="text-primary-600 hover:text-primary-800 p-1 rounded-lg hover:bg-primary-50 transition-colors"
                        title="Ver detalhes"
                      >
                        <HiOutlineEye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.completo ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {r.completo ? 'Completo' : `Parcial (etapa ${r.etapa_atual}/11)`}
              </span>
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

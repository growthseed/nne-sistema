import { useEffect, useState } from 'react'
import { useParams, Link, NavLink } from 'react-router-dom'
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

import { MISSOES_TABS, CARGO_LABELS, STATUS_LABELS, STATUS_COLORS, TIPO_ATIVIDADE_ICONS, TIPO_ATIVIDADE_LABELS, MESES_NOMES, MONTH_LABELS, ORDENACAO_MARCOS, ESCOLARIDADE_OPTIONS, ESTADO_CIVIL_OPTIONS, UF_OPTIONS, SEXO_OPTIONS } from '@/lib/missoes-constants'

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
  { key: 'ficha_biografica', label: 'Ficha Biografica', icon: FiUser },
  { key: 'visao_geral', label: 'Visao Geral', icon: FiActivity },
  { key: 'campo', label: 'Campo', icon: FiMapPin },
  { key: 'atividades', label: 'Atividades', icon: FiCalendar },
  { key: 'relatorios', label: 'Relatorios', icon: FiFileText },
  { key: 'avaliacoes', label: 'Avaliacoes', icon: FiStar },
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

interface FinancialSummary {
  mes: number
  ano: number
  dizimos: number
  ofertas: number
  total: number
}

export default function DetalheMissionarioPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('ficha_biografica')

  // Data
  const [missionario, setMissionario] = useState<Missionario | null>(null)
  const [igrejas, setIgrejas] = useState<{ id: string; nome: string }[]>([])
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
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [editHistorico, setEditHistorico] = useState<HistoricoMissionario[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    if (profile && id) fetchMissionario()
  }, [profile, id])

  async function fetchMissionario() {
    setLoading(true)
    try {
      // 1. Main missionary data
      const { data: mData, error: mErr } = await supabase
        .from('missionarios')
        .select('*, usuario:usuarios(nome, email)')
        .eq('id', id!)
        .single()
      if (mErr) throw mErr
      setMissionario(mData)

      // 2. Igrejas
      const igrejasIds: string[] = mData.igrejas_responsavel || []
      if (igrejasIds.length > 0) {
        const { data: igData } = await supabase
          .from('igrejas')
          .select('id, nome')
          .in('id', igrejasIds)
        setIgrejas(igData || [])
      }

      // Load all tab data in parallel
      await Promise.all([
        fetchReports(igrejasIds),
        fetchActivities(),
        fetchGoals(),
        fetchEvaluations(),
        fetchMemberCount(igrejasIds),
        fetchFinancial(igrejasIds),
        fetchBaptismalClasses(igrejasIds),
        fetchHistorico(),
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

  async function fetchMemberCount(igrejasIds: string[]) {
    if (igrejasIds.length === 0) return
    const { count: membros } = await supabase
      .from('pessoas')
      .select('id', { count: 'exact', head: true })
      .in('igreja_id', igrejasIds)
      .eq('situacao', 'ativo')
      .eq('tipo', 'membro')
    setTotalMembros(membros || 0)

    const { count: interessados } = await supabase
      .from('pessoas')
      .select('id', { count: 'exact', head: true })
      .in('igreja_id', igrejasIds)
      .eq('situacao', 'ativo')
      .eq('tipo', 'interessado')
    setTotalInteressados(interessados || 0)
  }

  async function fetchFinancial(igrejasIds: string[]) {
    if (igrejasIds.length === 0) return
    const now = new Date()
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2)

    const { data } = await supabase
      .from('dados_financeiros')
      .select('mes, ano, receita_dizimos, receita_oferta_regular, receita_oferta_especial')
      .in('igreja_id', igrejasIds)
      .eq('ano', now.getFullYear())
      .order('mes', { ascending: false })
      .limit(20)

    // Aggregate by month
    const monthMap: Record<string, FinancialSummary> = {}
    for (const f of data || []) {
      const key = `${f.ano}-${f.mes}`
      if (!monthMap[key]) {
        monthMap[key] = { mes: f.mes, ano: f.ano, dizimos: 0, ofertas: 0, total: 0 }
      }
      monthMap[key].dizimos += f.receita_dizimos || 0
      monthMap[key].ofertas += (f.receita_oferta_regular || 0) + (f.receita_oferta_especial || 0)
      monthMap[key].total += (f.receita_dizimos || 0) + (f.receita_oferta_regular || 0) + (f.receita_oferta_especial || 0)
    }
    const sorted = Object.values(monthMap).sort((a, b) =>
      a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
    )
    setFinanceiro(sorted.slice(-3))
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
        <div className="card text-center py-12">
          <p className="text-gray-500">Missionario nao encontrado</p>
          <Link to="/missoes/inventario" className="text-green-600 hover:underline text-sm mt-2 inline-block">
            Voltar ao inventario
          </Link>
        </div>
      </div>
    )
  }

  const usuario = missionario.usuario as { nome: string; email: string } | null

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

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/missoes/inventario" className="hover:text-green-600 flex items-center gap-1">
          <FiArrowLeft className="w-4 h-4" />
          Inventario
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{usuario?.nome || 'Missionario'}</span>
      </div>

      {/* Profile Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {missionario.foto_url ? (
              <img
                src={missionario.foto_url}
                alt={usuario?.nome || ''}
                className="w-24 h-24 rounded-full object-cover border-4 border-green-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center border-4 border-green-50">
                <span className="text-2xl font-bold text-green-700">
                  {getInitials(usuario?.nome || 'M')}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{usuario?.nome || 'Sem nome'}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[missionario.status] || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[missionario.status] || missionario.status}
              </span>
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
                  Inicio: {new Date(missionario.data_inicio_ministerio).toLocaleDateString('pt-BR')}
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

      {/* TAB: Ficha Biografica */}
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
                ['Nome', usuario?.nome],
                ['Sexo', missionario.sexo === 'masculino' ? 'Masculino' : missionario.sexo === 'feminino' ? 'Feminino' : null],
                ['Data de Nascimento', missionario.data_nascimento ? new Date(missionario.data_nascimento).toLocaleDateString('pt-BR') : null],
                ['Naturalidade', missionario.cidade_nascimento && missionario.uf_nascimento ? `${missionario.cidade_nascimento} - ${missionario.uf_nascimento}` : missionario.cidade_nascimento],
                ['Nacionalidade', missionario.nacionalidade],
                ['Profissao', missionario.profissao],
                ['Escolaridade', missionario.escolaridade],
                ['Nome do Pai', missionario.nome_pai],
                ['Nome da Mae', missionario.nome_mae],
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
                ['Titulo Eleitor', missionario.titulo_eleitor],
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
              Contato e Endereco
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['Endereco', missionario.endereco],
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
            {/* Conjuge */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Conjuge</h3>
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
              Ordenacoes e Marcos
            </h2>
            <div className="mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Religiao Anterior</p>
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
                        <p className="text-xs text-gray-400 mt-0.5">Nao registrado</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Secao F - Historico Biografico */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Historico Biografico</h2>
            </div>
            {historico.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhum historico registrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Cidade/UF</th>
                      <th className="px-4 py-3">Funcao</th>
                      <th className="px-4 py-3">Decisao</th>
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
        </div>
      )}

      {/* TAB: Visao Geral */}
      {activeTab === 'visao_geral' && (
        <div className="space-y-6">
          {/* KPI Progress Bars */}
          {currentGoal ? (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Progresso das Metas - {MESES[mesAtual - 1]} {anoAtual}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Estudos Biblicos', actual: currentMonthReport?.estudos_biblicos || 0, goal: currentGoal.meta_estudos_biblicos },
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
          ) : (
            <div className="card text-center py-8">
              <FiTarget className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Nenhuma meta definida para o periodo atual</p>
            </div>
          )}

          {/* Monthly Trend Chart */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Tendencia Mensal</h2>
            {monthlyReports.length > 0 ? (
              <div className="h-72">
                <Line data={lineChartData} options={chartOptions()} />
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">Sem dados de relatorios para exibir</p>
            )}
          </div>

          {/* Current Month Summary */}
          {currentMonthReport && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Estudos', value: currentMonthReport.estudos_biblicos, color: 'text-blue-600' },
                { label: 'Visitas', value: currentMonthReport.visitas_missionarias, color: 'text-green-600' },
                { label: 'Trazidas', value: currentMonthReport.pessoas_trazidas, color: 'text-amber-600' },
                { label: 'Horas', value: currentMonthReport.horas_trabalho, color: 'text-purple-600' },
                { label: 'Literatura', value: currentMonthReport.literatura_distribuida, color: 'text-pink-600' },
                { label: 'Contatos', value: currentMonthReport.pessoas_contatadas, color: 'text-gray-600' },
              ].map(item => (
                <div key={item.label} className="card text-center">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Campo */}
      {activeTab === 'campo' && (
        <div className="space-y-6">
          {/* Member Count Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <FiUsers className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{totalMembros}</p>
                  <p className="text-xs text-gray-500">Membros Ativos</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <FiUsers className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{totalInteressados}</p>
                  <p className="text-xs text-gray-500">Interessados</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100">
                  <FiMapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{igrejas.length}</p>
                  <p className="text-xs text-gray-500">Igrejas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                <FiDollarSign className="inline w-5 h-5 mr-1" />
                Resumo Financeiro
              </h2>
            </div>
            {financeiro.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Sem dados financeiros disponiveis</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Periodo</th>
                    <th className="px-4 py-3 text-right">Dizimos</th>
                    <th className="px-4 py-3 text-right">Ofertas</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {financeiro.map(f => (
                    <tr key={`${f.ano}-${f.mes}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{MESES[f.mes - 1]} {f.ano}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        R$ {f.dizimos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        R$ {f.ofertas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        R$ {f.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Baptismal Classes */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                <FiCheckCircle className="inline w-5 h-5 mr-1 text-green-500" />
                Classes Batismais
              </h2>
            </div>
            {classesBatismais.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhuma classe batismal registrada</div>
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
                          {c.status === 'ativa' ? 'Ativa' : c.status === 'concluida' ? 'Concluida' : 'Cancelada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

      {/* TAB: Relatorios */}
      {activeTab === 'relatorios' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">
              Relatorios Mensais ({relatorios.length})
            </h2>
          </div>
          {relatorios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum relatorio encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Periodo</th>
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
              <p className="text-gray-500">Nenhuma avaliacao registrada</p>
            </div>
          ) : (
            avaliacoes.map(av => (
              <div key={av.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Avaliacao {av.tipo_periodo === 'mensal' ? `${MESES[(av.mes || 1) - 1]}` : av.tipo_periodo === 'trimestral' ? `${av.trimestre}o Trimestre` : av.tipo_periodo} {av.ano}
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
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Plano de Acao</p>
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
                      {m.status === 'ativa' ? 'Ativa' : m.status === 'concluida' ? 'Concluida' : 'Cancelada'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Estudos Biblicos', value: m.meta_estudos_biblicos },
                    { label: 'Visitas', value: m.meta_visitas },
                    { label: 'Literatura', value: m.meta_literatura },
                    { label: 'Pessoas Contatadas', value: m.meta_pessoas_contatadas },
                    { label: 'Convites', value: m.meta_convites },
                    { label: 'Pessoas Trazidas', value: m.meta_pessoas_trazidas },
                    { label: 'Horas Trabalho', value: m.meta_horas_trabalho },
                    { label: 'Batismos', value: m.meta_batismos },
                    { label: 'Classes Batismais', value: m.meta_classes_batismais },
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
              <h2 className="text-lg font-bold text-gray-800">Editar Ficha Biografica</h2>
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
                    <label className="label-field">Formacao Teologica</label>
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
                    <label className="label-field">Profissao</label>
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
                    ['titulo_eleitor', 'Titulo Eleitor'],
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
                <legend className="text-sm font-semibold text-gray-700 px-2">Contato e Endereco</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="label-field">Endereco</label>
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
                <p className="text-xs text-gray-500 mb-3 font-semibold uppercase">Conjuge</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {[
                    ['conjuge_nome', 'Nome do Conjuge'],
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

              {/* Ordenacoes */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Ordenacoes e Marcos</legend>
                <div className="mb-4">
                  <label className="label-field">Religiao Anterior</label>
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

              {/* Historico */}
              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-sm font-semibold text-gray-700 px-2">Historico Biografico</legend>
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
                      <label className="label-field">Funcao</label>
                      <input className="input-field" value={h.funcao || ''} onChange={e => {
                        const arr = [...editHistorico]
                        arr[i] = { ...arr[i], funcao: e.target.value || null }
                        setEditHistorico(arr)
                      }} />
                    </div>
                    <div>
                      <label className="label-field">Decisao</label>
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
    </div>
  )
}

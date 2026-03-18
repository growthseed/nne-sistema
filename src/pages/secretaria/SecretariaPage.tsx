import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { useSecretariaStats } from '@/hooks/useSecretariaStats'
import {
  SITUACAO_CHART_COLORS, SITUACAO_LABELS, CHART_COLORS,
  MESES_CURTOS, calcularIdade, formatDateBR,
} from '@/lib/secretaria-constants'
import {
  HiOutlineUserGroup, HiOutlineUsers, HiOutlineHeart,
  HiOutlineSwitchHorizontal, HiOutlineClipboardCheck,
  HiOutlineIdentification, HiOutlineCalendar,
  HiOutlineTrendingUp, HiOutlineTrendingDown,
} from 'react-icons/hi'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
)

function KPICard({ label, value, icon: Icon, color, trend }: {
  label: string; value: number; icon: any; color: string; trend?: number
}) {
  return (
    <div className="card flex items-center gap-4 py-5 px-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-800">{value.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-gray-500 truncate">{label}</p>
      </div>
      {trend !== undefined && trend !== 0 && (
        <div className={`flex items-center gap-0.5 text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend > 0 ? <HiOutlineTrendingUp className="w-3.5 h-3.5" /> : <HiOutlineTrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return <div className="card py-5 px-4"><div className="h-12 bg-gray-200 rounded animate-pulse" /></div>
}

function SkeletonChart() {
  return <div className="card p-4"><div className="h-64 bg-gray-100 rounded animate-pulse" /></div>
}

export default function SecretariaPage() {
  const { stats, loading } = useSecretariaStats()
  const anoAtual = new Date().getFullYear()

  // Chart: Membros por status (Doughnut)
  const statusChartData = useMemo(() => {
    if (!stats) return null
    const entries = [
      { key: 'ativo', count: stats.membrosAtivos },
      { key: 'inativo', count: stats.membrosInativos },
      { key: 'falecido', count: stats.membrosFalecidos },
      { key: 'transferido', count: stats.membrosTransferidos },
      { key: 'excluido', count: stats.membrosExcluidos },
    ].filter(e => e.count > 0)
    return {
      labels: entries.map(e => SITUACAO_LABELS[e.key] || e.key),
      datasets: [{
        data: entries.map(e => e.count),
        backgroundColor: entries.map(e => SITUACAO_CHART_COLORS[e.key]),
        borderWidth: 0,
      }],
    }
  }, [stats])

  // Chart: Membros por associação (Bar)
  const assocChartData = useMemo(() => {
    if (!stats?.membrosPorAssociacao.length) return null
    return {
      labels: stats.membrosPorAssociacao.map(a => a.sigla),
      datasets: [{
        label: 'Membros Ativos',
        data: stats.membrosPorAssociacao.map(a => a.count),
        backgroundColor: CHART_COLORS.slice(0, stats.membrosPorAssociacao.length),
        borderRadius: 6,
      }],
    }
  }, [stats])

  // Chart: Distribuição por sexo (Doughnut)
  const sexoChartData = useMemo(() => {
    if (!stats?.membrosPorSexo.length) return null
    const colors: Record<string, string> = { masculino: '#3b82f6', feminino: '#ec4899', nao_informado: '#9ca3af' }
    const labels: Record<string, string> = { masculino: 'Masculino', feminino: 'Feminino', nao_informado: 'Não informado' }
    return {
      labels: stats.membrosPorSexo.map(s => labels[s.sexo] || s.sexo),
      datasets: [{
        data: stats.membrosPorSexo.map(s => s.count),
        backgroundColor: stats.membrosPorSexo.map(s => colors[s.sexo] || '#9ca3af'),
        borderWidth: 0,
      }],
    }
  }, [stats])

  // Chart: Distribuição etária (Bar)
  const idadeChartData = useMemo(() => {
    if (!stats?.distribuicaoEtaria.length) return null
    return {
      labels: stats.distribuicaoEtaria.map(d => d.faixa),
      datasets: [{
        label: 'Membros',
        data: stats.distribuicaoEtaria.map(d => d.count),
        backgroundColor: '#6366f1',
        borderRadius: 6,
      }],
    }
  }, [stats])

  // Chart: Crescimento mensal (Line)
  const crescimentoChartData = useMemo(() => {
    if (!stats?.crescimentoMensal.length) return null
    return {
      labels: stats.crescimentoMensal.map(c => MESES_CURTOS[c.mes - 1]),
      datasets: [
        {
          label: 'Batismos',
          data: stats.crescimentoMensal.map(c => c.batismos),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34,197,94,0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Exclusões',
          data: stats.crescimentoMensal.map(c => c.exclusoes),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Óbitos',
          data: stats.crescimentoMensal.map(c => c.obitos),
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168,85,247,0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    }
  }, [stats])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 16 } } },
  }

  const barOptions = {
    ...chartOptions,
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 12 } } },
  }

  const quickLinks = [
    { to: '/membros', label: 'Membros', desc: 'Buscar e gerenciar membros', icon: HiOutlineUserGroup, color: 'bg-blue-100 text-blue-600' },
    { to: '/membros/familias', label: 'Famílias', desc: 'Gestão de famílias e endereços', icon: HiOutlineUsers, color: 'bg-indigo-100 text-indigo-600' },
    { to: '/secretaria/contagem', label: 'Contagem', desc: 'Registrar contagem mensal', icon: HiOutlineClipboardCheck, color: 'bg-green-100 text-green-600' },
    { to: '/secretaria/transferencias', label: 'Transferências', desc: 'Cartas e transferências', icon: HiOutlineSwitchHorizontal, color: 'bg-amber-100 text-amber-600' },
    { to: '/secretaria/aniversariantes', label: 'Aniversariantes', desc: 'Felicitações e WhatsApp', icon: HiOutlineCalendar, color: 'bg-pink-100 text-pink-600' },
    { to: '/membros/cartao', label: 'Cartão', desc: 'Gerar cartão de membro', icon: HiOutlineIdentification, color: 'bg-purple-100 text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Secretaria</h1>
        <p className="text-gray-500 mt-1">Visão geral da membresia e movimentações</p>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <KPICard label="Membros Ativos" value={stats.membrosAtivos} icon={HiOutlineUserGroup} color="bg-green-100 text-green-600" />
          <KPICard label="Interessados" value={stats.interessados} icon={HiOutlineUsers} color="bg-blue-100 text-blue-600" />
          <KPICard label={`Batismos (${anoAtual})`} value={stats.batismosAno} icon={HiOutlineHeart} color="bg-emerald-100 text-emerald-600" />
          <KPICard label="Transf. Pendentes" value={stats.transferenciasPendentes} icon={HiOutlineSwitchHorizontal} color="bg-amber-100 text-amber-600" />
          <KPICard label={`Exclusões (${anoAtual})`} value={stats.exclusoesAno} icon={HiOutlineTrendingDown} color="bg-red-100 text-red-600" />
          <KPICard label={`Óbitos (${anoAtual})`} value={stats.obitosAno} icon={HiOutlineTrendingDown} color="bg-purple-100 text-purple-600" />
        </div>
      )}

      {/* Row 1: Status + Associações */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart /><SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Membros por Status</h3>
            <div className="h-64">
              {statusChartData ? <Doughnut data={statusChartData} options={doughnutOptions} /> : (
                <p className="text-center text-gray-400 pt-20">Sem dados</p>
              )}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Membros Ativos por Associação</h3>
            <div className="h-64">
              {assocChartData ? <Bar data={assocChartData} options={barOptions} /> : (
                <p className="text-center text-gray-400 pt-20">Sem dados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Row 2: Crescimento + Idade */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart /><SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Movimentação Mensal ({anoAtual})</h3>
            <div className="h-64">
              {crescimentoChartData ? <Line data={crescimentoChartData} options={chartOptions} /> : (
                <p className="text-center text-gray-400 pt-20">Sem dados de contagem mensal</p>
              )}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição Etária</h3>
            <div className="h-64">
              {idadeChartData ? <Bar data={idadeChartData} options={barOptions} /> : (
                <p className="text-center text-gray-400 pt-20">Sem dados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Sexo + Aniversariantes */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart /><SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Sexo</h3>
            <div className="h-64">
              {sexoChartData ? <Doughnut data={sexoChartData} options={doughnutOptions} /> : (
                <p className="text-center text-gray-400 pt-20">Sem dados</p>
              )}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Aniversariantes (7 dias)</h3>
              <Link to="/secretaria/aniversariantes" className="text-xs text-primary-600 hover:underline">Ver todos</Link>
            </div>
            {stats?.aniversariantes7dias.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum aniversariante nos próximos 7 dias</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats?.aniversariantes7dias.map(p => {
                  const idade = calcularIdade(p.data_nascimento) + 1
                  const nasc = new Date(p.data_nascimento + 'T00:00:00')
                  const diaMes = `${nasc.getDate().toString().padStart(2, '0')}/${(nasc.getMonth() + 1).toString().padStart(2, '0')}`
                  return (
                    <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50">
                      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-medium text-sm shrink-0">
                        {p.nome.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p>
                        <p className="text-xs text-gray-500">{p.igreja_nome || '—'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-pink-600">{diaMes}</p>
                        <p className="text-xs text-gray-400">{idade} anos</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickLinks.map(link => (
            <Link key={link.to} to={link.to} className="card hover:shadow-md transition-all py-4 px-3 text-center group">
              <div className={`w-10 h-10 rounded-lg mx-auto flex items-center justify-center ${link.color} mb-2`}>
                <link.icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-gray-800 group-hover:text-primary-600">{link.label}</p>
              <p className="text-xs text-gray-400 mt-0.5 hidden md:block">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

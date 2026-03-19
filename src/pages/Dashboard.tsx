import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  HiOutlineUserGroup,
  HiOutlineOfficeBuilding,
  HiOutlineCurrencyDollar,
  HiOutlineAcademicCap,
} from 'react-icons/hi'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

interface Stats {
  totalMembros: number
  totalInteressados: number
  totalIgrejas: number
  batismosMes: number
  transferenciasPendentes: number
  receitaMes: number
  despesaMes: number
}

const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats>({ totalMembros: 0, totalInteressados: 0, totalIgrejas: 0, batismosMes: 0, transferenciasPendentes: 0, receitaMes: 0, despesaMes: 0 })
  const [loading, setLoading] = useState(true)
  const [financeiro6m, setFinanceiro6m] = useState<{ mes: string; receita: number; despesa: number }[]>([])
  const [membrosPorSexo, setMembrosPorSexo] = useState<{ masculino: number; feminino: number }>({ masculino: 0, feminino: 0 })

  const papel = profile?.papel || 'membro'
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  useEffect(() => {
    if (profile) fetchAll()
  }, [profile])

  async function fetchAll() {
    setLoading(true)
    try {
      await Promise.all([fetchStats(), fetchFinanceiro6m(), fetchMembrosSexo()])
    } finally {
      setLoading(false)
    }
  }

  function scopeFilter(query: any) {
    if (papel === 'admin') return query
    if (papel === 'admin_uniao') return query.eq('uniao_id', profile!.uniao_id!)
    if (papel === 'admin_associacao') return query.eq('associacao_id', profile!.associacao_id!)
    return query.eq('igreja_id', profile!.igreja_id!)
  }

  async function fetchStats() {
    const [membros, interessados, igrejas, batismos, transferencias, fin] = await Promise.all([
      scopeFilter(supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativo').eq('tipo', 'membro')),
      scopeFilter(supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativo').eq('tipo', 'interessado')),
      papel === 'admin'
        ? supabase.from('igrejas').select('id', { count: 'exact', head: true }).eq('ativo', true)
        : papel === 'admin_uniao'
          ? supabase.from('igrejas').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('uniao_id', profile!.uniao_id!)
          : papel === 'admin_associacao'
            ? supabase.from('igrejas').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('associacao_id', profile!.associacao_id!)
            : { count: 1 },
      scopeFilter(supabase.from('contagem_mensal').select('batismos').eq('mes', mesAtual).eq('ano', anoAtual)),
      supabase.from('transferencias').select('id', { count: 'exact', head: true }).eq('status', 'solicitada'),
      scopeFilter(supabase.from('dados_financeiros').select('receita_dizimos, receita_oferta_regular, receita_oferta_especial, receita_oferta_missoes, receita_oferta_agradecimento, receita_oferta_es, receita_doacoes, receita_fundo_assistencial, receita_proventos_imoveis, receita_outras, despesa_salarios, despesa_manutencao, despesa_agua, despesa_energia, despesa_internet, despesa_material_es, despesa_outras, dizimo, primicias').eq('mes', mesAtual).eq('ano', anoAtual)),
    ])

    const totalBatismos = (batismos.data || []).reduce((sum: number, r: any) => sum + (r.batismos || 0), 0)

    let receitaTotal = 0, despesaTotal = 0
    for (const r of (fin.data || []) as any[]) {
      receitaTotal += (r.receita_dizimos || 0) + (r.dizimo || 0) + (r.receita_oferta_regular || 0) + (r.primicias || 0) + (r.receita_oferta_especial || 0) + (r.receita_oferta_missoes || 0) + (r.receita_oferta_agradecimento || 0) + (r.receita_oferta_es || 0) + (r.receita_doacoes || 0) + (r.receita_fundo_assistencial || 0) + (r.receita_proventos_imoveis || 0) + (r.receita_outras || 0)
      despesaTotal += (r.despesa_salarios || 0) + (r.despesa_manutencao || 0) + (r.despesa_agua || 0) + (r.despesa_energia || 0) + (r.despesa_internet || 0) + (r.despesa_material_es || 0) + (r.despesa_outras || 0)
    }

    setStats({
      totalMembros: membros.count || 0,
      totalInteressados: interessados.count || 0,
      totalIgrejas: (igrejas as any).count || 0,
      batismosMes: totalBatismos,
      transferenciasPendentes: transferencias.count || 0,
      receitaMes: receitaTotal,
      despesaMes: despesaTotal,
    })
  }

  async function fetchFinanceiro6m() {
    const meses: { mes: string; receita: number; despesa: number }[] = []
    const nomesMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    for (let i = 5; i >= 0; i--) {
      let m = mesAtual - i
      let a = anoAtual
      if (m <= 0) { m += 12; a -= 1 }

      const { data } = await scopeFilter(
        supabase.from('dados_financeiros')
          .select('receita_dizimos, receita_oferta_regular, receita_oferta_especial, receita_oferta_missoes, receita_oferta_agradecimento, receita_oferta_es, receita_doacoes, receita_fundo_assistencial, receita_proventos_imoveis, receita_outras, despesa_salarios, despesa_manutencao, despesa_agua, despesa_energia, despesa_internet, despesa_material_es, despesa_outras, dizimo, primicias')
          .eq('mes', m).eq('ano', a)
      )

      let rec = 0, des = 0
      for (const r of (data || []) as any[]) {
        rec += (r.receita_dizimos || 0) + (r.dizimo || 0) + (r.receita_oferta_regular || 0) + (r.primicias || 0) + (r.receita_oferta_especial || 0) + (r.receita_oferta_missoes || 0) + (r.receita_oferta_agradecimento || 0) + (r.receita_oferta_es || 0) + (r.receita_doacoes || 0) + (r.receita_fundo_assistencial || 0) + (r.receita_proventos_imoveis || 0) + (r.receita_outras || 0)
        des += (r.despesa_salarios || 0) + (r.despesa_manutencao || 0) + (r.despesa_agua || 0) + (r.despesa_energia || 0) + (r.despesa_internet || 0) + (r.despesa_material_es || 0) + (r.despesa_outras || 0)
      }
      meses.push({ mes: `${nomesMes[m - 1]}/${a}`, receita: rec, despesa: des })
    }
    setFinanceiro6m(meses)
  }

  async function fetchMembrosSexo() {
    const [masc, fem] = await Promise.all([
      scopeFilter(supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativo').eq('sexo', 'masculino')),
      scopeFilter(supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativo').eq('sexo', 'feminino')),
    ])
    setMembrosPorSexo({ masculino: masc.count || 0, feminino: fem.count || 0 })
  }

  const statCards = [
    { title: 'Membros Ativos', value: stats.totalMembros.toLocaleString('pt-BR'), icon: HiOutlineUserGroup, color: 'bg-blue-500' },
    { title: 'Interessados', value: stats.totalInteressados.toLocaleString('pt-BR'), icon: HiOutlineUserGroup, color: 'bg-green-500' },
    ...(papel === 'admin' || papel === 'admin_uniao' || papel === 'admin_associacao'
      ? [{ title: 'Igrejas Ativas', value: stats.totalIgrejas.toLocaleString('pt-BR'), icon: HiOutlineOfficeBuilding, color: 'bg-purple-500' }]
      : []),
    { title: 'Batismos (Mês)', value: stats.batismosMes.toString(), icon: HiOutlineAcademicCap, color: 'bg-amber-500' },
    { title: 'Receita (Mês)', value: BRL(stats.receitaMes), icon: HiOutlineCurrencyDollar, color: 'bg-emerald-500' },
  ]

  const barData = {
    labels: financeiro6m.map(f => f.mes),
    datasets: [
      { label: 'Receitas', data: financeiro6m.map(f => f.receita), backgroundColor: 'rgba(16, 185, 129, 0.7)', borderRadius: 4 },
      { label: 'Despesas', data: financeiro6m.map(f => f.despesa), backgroundColor: 'rgba(239, 68, 68, 0.7)', borderRadius: 4 },
    ],
  }

  const doughnutData = {
    labels: ['Masculino', 'Feminino'],
    datasets: [{
      data: [membrosPorSexo.masculino, membrosPorSexo.feminino],
      backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(244, 114, 182, 0.8)'],
      borderWidth: 0,
    }],
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Carregando painel...</p></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Bem-vindo, {profile?.nome?.split(' ')[0] || 'Usuário'}
        </h1>
        <p className="text-gray-500 mt-1">Resumo geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {statCards.map((card) => (
          <div key={card.title} className="card flex items-start gap-4">
            <div className={`${card.color} p-3 rounded-xl text-white`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {(papel === 'admin' || papel === 'admin_uniao' || papel === 'admin_associacao' || papel === 'tesoureiro') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Receitas x Despesas (6 meses)</h3>
            <div className="h-64">
              <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Membros por Sexo</h3>
            <div className="h-64 flex items-center justify-center">
              {(membrosPorSexo.masculino + membrosPorSexo.feminino) > 0 ? (
                <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
              ) : (
                <p className="text-gray-400 text-sm">Sem dados</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumo Financeiro do Mês</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Receitas</span>
              <span className="text-sm font-semibold text-green-600">{BRL(stats.receitaMes)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Total Despesas</span>
              <span className="text-sm font-semibold text-red-600">{BRL(stats.despesaMes)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-800">Saldo</span>
              <span className={`text-sm font-bold ${stats.receitaMes - stats.despesaMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {BRL(stats.receitaMes - stats.despesaMes)}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Pendências</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <p className="text-sm text-gray-700">{stats.transferenciasPendentes} transferência(s) pendente(s)</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stats.transferenciasPendentes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {stats.transferenciasPendentes > 0 ? 'pendente' : 'ok'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <p className="text-sm text-gray-700">{stats.batismosMes} batismo(s) este mês</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {stats.batismosMes > 0 ? 'ativo' : 'nenhum'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-gray-700">{stats.totalInteressados} interessado(s) ativo(s)</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                acompanhar
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

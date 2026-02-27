import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface Stats {
  membrosAtivos: number
  batismos: number
  transferenciasPendentes: number
  exclusoes: number
}

interface AtividadeRecente {
  text: string
  date: string
  type: 'contagem' | 'transferencia' | 'batismo'
}

export default function SecretariaPage() {
  const [stats, setStats] = useState<Stats>({ membrosAtivos: 0, batismos: 0, transferenciasPendentes: 0, exclusoes: 0 })
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      setLoading(true)
      const anoAtual = new Date().getFullYear()

      const [membrosRes, batismosRes, transferenciasRes, exclusoesRes, recentTransf, recentContagem] = await Promise.all([
        // Membros ativos
        supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('situacao', 'ativo'),
        // Batismos no ano
        supabase.from('contagem_mensal').select('batismos').eq('ano', anoAtual),
        // Transferências pendentes
        supabase.from('transferencias').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
        // Exclusões no ano
        supabase.from('contagem_mensal').select('exclusoes').eq('ano', anoAtual),
        // Últimas transferências
        supabase.from('transferencias')
          .select('id, status, data_solicitacao, pessoas!transferencias_pessoa_id_fkey(nome)')
          .order('created_at', { ascending: false })
          .limit(3),
        // Últimas contagens
        supabase.from('contagem_mensal')
          .select('id, ano, mes, batismos, created_at')
          .order('created_at', { ascending: false })
          .limit(2),
      ])

      const totalBatismos = (batismosRes.data || []).reduce((sum, r) => sum + (r.batismos || 0), 0)
      const totalExclusoes = (exclusoesRes.data || []).reduce((sum, r) => sum + (r.exclusoes || 0), 0)

      setStats({
        membrosAtivos: membrosRes.count || 0,
        batismos: totalBatismos,
        transferenciasPendentes: transferenciasRes.count || 0,
        exclusoes: totalExclusoes,
      })

      // Montar atividades recentes
      const atv: AtividadeRecente[] = []

      if (recentContagem.data) {
        for (const c of recentContagem.data) {
          const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
          atv.push({
            text: `Contagem de ${meses[c.mes - 1]}/${c.ano} registrada`,
            date: new Date(c.created_at).toLocaleDateString('pt-BR'),
            type: c.batismos > 0 ? 'batismo' : 'contagem',
          })
        }
      }

      if (recentTransf.data) {
        for (const t of recentTransf.data) {
          const pessoa = (t as any).pessoas
          const nome = pessoa?.nome || 'Membro'
          const statusLabel = t.status === 'aprovada' ? 'aprovada' : t.status === 'rejeitada' ? 'rejeitada' : 'solicitada'
          atv.push({
            text: `Transferência de ${nome} ${statusLabel}`,
            date: new Date(t.data_solicitacao).toLocaleDateString('pt-BR'),
            type: 'transferencia',
          })
        }
      }

      // Ordenar por data desc
      atv.sort((a, b) => {
        const da = a.date.split('/').reverse().join('-')
        const db = b.date.split('/').reverse().join('-')
        return db.localeCompare(da)
      })

      setAtividades(atv.slice(0, 5))
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const statsDisplay = [
    { label: 'Membros Ativos', value: stats.membrosAtivos, color: 'text-blue-600' },
    { label: `Batismos (${new Date().getFullYear()})`, value: stats.batismos, color: 'text-green-600' },
    { label: 'Transferências Pendentes', value: stats.transferenciasPendentes, color: 'text-amber-600' },
    { label: `Exclusões (${new Date().getFullYear()})`, value: stats.exclusoes, color: 'text-red-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Secretaria</h1>
        <p className="text-gray-500 mt-1">Gestão de membros, contagens e transferências</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((s) => (
          <div key={s.label} className="card flex flex-col items-center py-6">
            {loading ? (
              <div className="w-10 h-8 bg-gray-200 rounded animate-pulse" />
            ) : (
              <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
            )}
            <span className="text-sm text-gray-500 mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/secretaria/contagem"
          className="card hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
              #
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                Contagem Mensal
              </h3>
              <p className="text-sm text-gray-500">
                Registrar contagem de membros, batismos e movimentações
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/secretaria/transferencias"
          className="card hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold">
              ↔
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-amber-600 transition-colors">
                Transferências
              </h3>
              <p className="text-sm text-gray-500">
                Gerenciar cartas de transferência e movimentações
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Atividade Recente</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-16 h-3 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : atividades.length === 0 ? (
          <p className="text-center text-gray-400 py-4">Nenhuma atividade recente</p>
        ) : (
          <div className="space-y-3">
            {atividades.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.type === 'contagem'
                        ? 'bg-blue-500'
                        : item.type === 'transferencia'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                  />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
                <span className="text-xs text-gray-400">{item.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DadosFinanceiros } from '@/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pendente: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700' },
  aprovado: { label: 'Aprovado', bg: 'bg-green-100', text: 'text-green-700' },
  rejeitado: { label: 'Rejeitado', bg: 'bg-red-100', text: 'text-red-700' },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function calcTotalReceitas(d: DadosFinanceiros): number {
  return (
    (d.receita_dizimos || 0) +
    ((d as any).dizimo || 0) +
    (d.receita_primicias || 0) +
    ((d as any).primicias || 0) +
    (d.receita_oferta_regular || 0) +
    (d.receita_oferta_especial || 0) +
    (d.receita_oferta_missoes || 0) +
    (d.receita_oferta_agradecimento || 0) +
    (d.receita_oferta_es || 0) +
    (d.receita_doacoes || 0) +
    (d.receita_fundo_assistencial || 0) +
    (d.receita_evangelismo || 0) +
    (d.receita_radio_colportagem || 0) +
    (d.receita_construcao || 0) +
    (d.receita_proventos_imoveis || 0) +
    (d.receita_gratificacao_6 || 0) +
    (d.receita_missoes_mundial || 0) +
    (d.receita_missoes_autonomas || 0) +
    (d.receita_outras || 0)
  )
}

function calcTotalDespesas(d: DadosFinanceiros): number {
  return (
    (d.despesa_salarios || 0) +
    (d.despesa_aluguel || 0) +
    (d.despesa_manutencao || 0) +
    (d.despesa_agua || 0) +
    (d.despesa_energia || 0) +
    (d.despesa_telefone || 0) +
    (d.despesa_internet || 0) +
    (d.despesa_transporte || 0) +
    (d.despesa_material_es || 0) +
    (d.despesa_eventos || 0) +
    (d.despesa_outras || 0)
  )
}

interface EntryWithIgreja extends DadosFinanceiros {
  igreja?: { nome: string } | null
}

export default function FinanceiroPage() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<EntryWithIgreja[]>([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  useEffect(() => {
    if (profile) fetchData()
  }, [profile, mes, ano])

  async function fetchData() {
    if (!profile) return
    setLoading(true)
    try {
      let query = supabase
        .from('dados_financeiros')
        .select('*, igreja:igrejas(nome)')
        .eq('mes', mes)
        .eq('ano', ano)
        .order('created_at', { ascending: false })

      // Hierarchical filter based on user role
      if (profile.papel === 'admin') {
        // admin sees all
      } else if (profile.papel === 'admin_uniao') {
        // get associacao_ids that belong to this uniao
        const { data: assocs } = await supabase
          .from('associacoes')
          .select('id')
          .eq('uniao_id', profile.uniao_id!)
        const assocIds = assocs?.map((a) => a.id) || []
        if (assocIds.length > 0) {
          query = query.in('associacao_id', assocIds)
        } else {
          query = query.eq('associacao_id', 'none')
        }
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else if (profile.papel === 'tesoureiro') {
        query = query.eq('igreja_id', profile.igreja_id!)
      } else {
        // Other roles: filter by own igreja
        if (profile.igreja_id) {
          query = query.eq('igreja_id', profile.igreja_id)
        }
      }

      const { data, error } = await query
      if (error) throw error
      setEntries((data as EntryWithIgreja[]) || [])
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    let totalReceitas = 0
    let totalDespesas = 0
    let totalDizimos = 0

    entries.forEach((d) => {
      totalReceitas += calcTotalReceitas(d)
      totalDespesas += calcTotalDespesas(d)
      totalDizimos += (d.receita_dizimos || 0) + ((d as any).dizimo || 0)
    })

    return {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      totalDizimos,
    }
  }, [entries])

  const statCards = [
    { label: 'Total Receitas', value: formatCurrency(stats.totalReceitas), color: 'text-green-600', bgIcon: 'bg-green-100' },
    { label: 'Total Despesas', value: formatCurrency(stats.totalDespesas), color: 'text-red-600', bgIcon: 'bg-red-100' },
    { label: 'Saldo', value: formatCurrency(stats.saldo), color: stats.saldo >= 0 ? 'text-blue-600' : 'text-red-600', bgIcon: 'bg-blue-100' },
    { label: 'Dízimos', value: formatCurrency(stats.totalDizimos), color: 'text-purple-600', bgIcon: 'bg-purple-100' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
          <p className="text-gray-500 mt-1">Gestão de receitas, despesas e movimentação financeira</p>
        </div>
        <Link to="/financeiro/lancamentos" className="btn-primary inline-flex items-center gap-2 w-fit">
          + Novo Lançamento
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Mês:</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="input-field w-auto"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Ano:</label>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="input-field w-auto"
            >
              {[2024, 2025, 2026, 2027].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-400 ml-auto">
            {entries.length} registro{entries.length !== 1 ? 's' : ''} em {MESES[mes - 1]}/{ano}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card flex flex-col items-center py-6">
            <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            <span className="text-sm text-gray-500 mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/financeiro/lancamentos"
          className="card hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600 text-xl font-bold">
              $
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                Lançamentos
              </h3>
              <p className="text-sm text-gray-500">
                Registrar receitas, despesas e movimentações financeiras
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/financeiro/receita-campo"
          className="card hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-xl font-bold">
              #
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
                Receita do Campo
              </h3>
              <p className="text-sm text-gray-500">
                Resumo por associação, comparativos e totais
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Entries Table */}
      <div className="card overflow-x-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Lançamentos do Período</h2>

        {loading ? (
          <p className="text-center text-gray-400 py-8">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Nenhum lançamento encontrado para este período</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-600">Igreja</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-600">Período</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-600">Receitas</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-600">Despesas</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-600">Saldo</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-600">Dízimos</th>
                <th className="text-center py-3 px-2 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const receitas = calcTotalReceitas(entry)
                const despesas = calcTotalDespesas(entry)
                const saldo = receitas - despesas
                const st = statusConfig[entry.status] || statusConfig.pendente
                return (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-800">
                      {entry.igreja?.nome || '---'}
                    </td>
                    <td className="py-3 px-2 text-gray-500">
                      {MESES[entry.mes - 1]} / {entry.ano}
                    </td>
                    <td className="py-3 px-2 text-right text-green-600 font-medium">
                      {formatCurrency(receitas)}
                    </td>
                    <td className="py-3 px-2 text-right text-red-600 font-medium">
                      {formatCurrency(despesas)}
                    </td>
                    <td className={`py-3 px-2 text-right font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(saldo)}
                    </td>
                    <td className="py-3 px-2 text-right text-purple-600 font-medium">
                      {formatCurrency((entry.receita_dizimos || 0) + ((entry as any).dizimo || 0))}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

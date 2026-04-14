import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FinanceiroStatsSkeleton, FinanceiroTableSkeleton } from '@/components/financeiro/FinanceiroSkeletons'
import { useFinanceiroLancamentos } from '@/hooks/useFinanceiroLancamentos'
import type { DadosFinanceiros } from '@/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
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

export default function FinanceiroPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const { entries, loading, error, refetch } = useFinanceiroLancamentos({
    mes,
    ano,
    status: 'todos',
  })

  const stats = useMemo(() => {
    let totalReceitas = 0
    let totalDespesas = 0
    let totalDizimos = 0

    entries.forEach((entry) => {
      totalReceitas += calcTotalReceitas(entry)
      totalDespesas += calcTotalDespesas(entry)
      totalDizimos += (entry.receita_dizimos || 0) + ((entry as any).dizimo || 0)
    })

    return {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      totalDizimos,
    }
  }, [entries])

  const statCards = [
    { label: 'Total Receitas', value: formatCurrency(stats.totalReceitas), color: 'text-green-600' },
    { label: 'Total Despesas', value: formatCurrency(stats.totalDespesas), color: 'text-red-600' },
    { label: 'Saldo', value: formatCurrency(stats.saldo), color: stats.saldo >= 0 ? 'text-blue-600' : 'text-red-600' },
    { label: 'Dizimos', value: formatCurrency(stats.totalDizimos), color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
          <p className="mt-1 text-gray-500">Gestao de receitas, despesas e movimentacao financeira</p>
        </div>
        <Link to="/financeiro/lancamentos" className="btn-primary inline-flex w-fit items-center gap-2">
          + Novo Lancamento
        </Link>
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Mes:</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="input-field w-auto"
            >
              {MESES.map((mesAtual, index) => (
                <option key={index} value={index + 1}>{mesAtual}</option>
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
              {[2024, 2025, 2026, 2027].map((anoAtual) => (
                <option key={anoAtual} value={anoAtual}>{anoAtual}</option>
              ))}
            </select>
          </div>
          <span className="ml-auto text-sm text-gray-400">
            {entries.length} registro{entries.length !== 1 ? 's' : ''} em {MESES[mes - 1]}/{ano}
          </span>
        </div>
      </div>

      {error && (
        <div className="card flex flex-col gap-3 border border-red-200 bg-red-50 text-sm text-red-700">
          <div>
            <p className="font-medium">Nao foi possivel carregar o resumo financeiro do periodo.</p>
            <p className="mt-1 text-red-600/90">{error}</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <FinanceiroStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="card flex flex-col items-center py-6">
              <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
              <span className="mt-1 text-sm text-gray-500">{card.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          to="/financeiro/lancamentos"
          className="card group transition-shadow hover:shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-xl font-bold text-green-600">
              $
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 transition-colors group-hover:text-green-600">
                Lancamentos
              </h3>
              <p className="text-sm text-gray-500">
                Registrar receitas, despesas e movimentacoes financeiras
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/financeiro/receita-campo"
          className="card group transition-shadow hover:shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-xl font-bold text-purple-600">
              #
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 transition-colors group-hover:text-purple-600">
                Receita do Campo
              </h3>
              <p className="text-sm text-gray-500">
                Resumo por associacao, comparativos e totais
              </p>
            </div>
          </div>
        </Link>
      </div>

      {loading ? (
        <FinanceiroTableSkeleton titleWidth="w-48" rows={4} />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-gray-100 px-4 py-4">
            <h2 className="text-lg font-semibold text-gray-800">Lancamentos do Periodo</h2>
          </div>

          {entries.length === 0 ? (
            <p className="py-8 text-center text-gray-400">Nenhum lancamento encontrado para este periodo</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-2 py-3 text-left font-semibold text-gray-600">Igreja</th>
                    <th className="px-2 py-3 text-left font-semibold text-gray-600">Periodo</th>
                    <th className="px-2 py-3 text-right font-semibold text-gray-600">Receitas</th>
                    <th className="px-2 py-3 text-right font-semibold text-gray-600">Despesas</th>
                    <th className="px-2 py-3 text-right font-semibold text-gray-600">Saldo</th>
                    <th className="px-2 py-3 text-right font-semibold text-gray-600">Dizimos</th>
                    <th className="px-2 py-3 text-center font-semibold text-gray-600">Status</th>
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
                        <td className="px-2 py-3 font-medium text-gray-800">
                          {entry.igreja?.nome || '---'}
                        </td>
                        <td className="px-2 py-3 text-gray-500">
                          {MESES[entry.mes - 1]} / {entry.ano}
                        </td>
                        <td className="px-2 py-3 text-right font-medium text-green-600">
                          {formatCurrency(receitas)}
                        </td>
                        <td className="px-2 py-3 text-right font-medium text-red-600">
                          {formatCurrency(despesas)}
                        </td>
                        <td className={`px-2 py-3 text-right font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(saldo)}
                        </td>
                        <td className="px-2 py-3 text-right font-medium text-purple-600">
                          {formatCurrency((entry.receita_dizimos || 0) + ((entry as any).dizimo || 0))}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

              <div className="divide-y divide-gray-100 lg:hidden">
              {entries.map((entry) => {
                const receitas = calcTotalReceitas(entry)
                const despesas = calcTotalDespesas(entry)
                const saldo = receitas - despesas
                const st = statusConfig[entry.status] || statusConfig.pendente

                return (
                  <div key={entry.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-800">{entry.igreja?.nome || '---'}</p>
                        <p className="text-xs text-gray-400">{MESES[entry.mes - 1]} / {entry.ano}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Receitas</p>
                        <p className="mt-1 font-medium text-green-600">{formatCurrency(receitas)}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Despesas</p>
                        <p className="mt-1 font-medium text-red-600">{formatCurrency(despesas)}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Saldo</p>
                        <p className={`mt-1 font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(saldo)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Dizimos</p>
                        <p className="mt-1 font-medium text-purple-600">
                          {formatCurrency((entry.receita_dizimos || 0) + ((entry as any).dizimo || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

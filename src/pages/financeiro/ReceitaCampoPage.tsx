import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiDollarSign } from 'react-icons/fi'
import { FinanceiroStatsSkeleton, FinanceiroTableSkeleton } from '@/components/financeiro/FinanceiroSkeletons'
import { useFinanceiroLancamentos } from '@/hooks/useFinanceiroLancamentos'
import type { DadosFinanceiros } from '@/types'

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface ResumoIgreja {
  igrejaId: string
  igrejaNome: string
  dizimos: number
  ofertas: number
  total: number
  missoes: number
}

function calcDizimos(entry: DadosFinanceiros) {
  return (entry.receita_dizimos || 0) + ((entry as any).dizimo || 0)
}

function calcOfertas(entry: DadosFinanceiros) {
  return (
    (entry.receita_oferta_regular || 0) +
    ((entry as any).primicias || 0) +
    (entry.receita_oferta_especial || 0) +
    (entry.receita_oferta_missoes || 0) +
    (entry.receita_oferta_agradecimento || 0) +
    (entry.receita_oferta_es || 0) +
    (entry.receita_doacoes || 0) +
    (entry.receita_fundo_assistencial || 0) +
    (entry.receita_proventos_imoveis || 0) +
    (entry.receita_outras || 0)
  )
}

export default function ReceitaCampoPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const { entries, loading, error, refetch } = useFinanceiroLancamentos({
    mes,
    ano,
    status: 'todos',
  })

  const resumoPorIgreja = useMemo<ResumoIgreja[]>(() => {
    const map = new Map<string, ResumoIgreja>()

    entries.forEach((entry) => {
      const key = entry.igreja_id
      const existing = map.get(key)
      const dizimos = calcDizimos(entry)
      const ofertas = calcOfertas(entry)
      const total = dizimos + ofertas
      const missoes = entry.receita_oferta_missoes || 0

      if (existing) {
        existing.dizimos += dizimos
        existing.ofertas += ofertas
        existing.total += total
        existing.missoes += missoes
        return
      }

      map.set(key, {
        igrejaId: key,
        igrejaNome: entry.igreja?.nome || 'Igreja desconhecida',
        dizimos,
        ofertas,
        total,
        missoes,
      })
    })

    return Array.from(map.values()).sort((a, b) => a.igrejaNome.localeCompare(b.igrejaNome))
  }, [entries])

  const totais = useMemo(() => {
    let dizimos = 0
    let ofertas = 0
    let total = 0
    let missoes = 0

    resumoPorIgreja.forEach((resumo) => {
      dizimos += resumo.dizimos
      ofertas += resumo.ofertas
      total += resumo.total
      missoes += resumo.missoes
    })

    return {
      dizimos,
      ofertas,
      total,
      missoes,
      associacao: total - missoes,
    }
  }, [resumoPorIgreja])

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        <Link to="/financeiro" className="transition-colors hover:text-primary-600">Financeiro</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">Receita do Campo</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <FiDollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Receita do Campo</h1>
            <p className="mt-0.5 text-sm text-gray-500">Resumo financeiro por igreja da associacao</p>
          </div>
        </div>
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
            {resumoPorIgreja.length} igreja{resumoPorIgreja.length !== 1 ? 's' : ''} em {MESES[mes - 1]}/{ano}
          </span>
        </div>
      </div>

      {error && (
        <div className="card flex flex-col gap-3 border border-red-200 bg-red-50 text-sm text-red-700">
          <div>
            <p className="font-medium">Nao foi possivel carregar a receita do campo deste periodo.</p>
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
          <div className="card flex flex-col items-center py-6">
            <span className="text-2xl font-bold text-green-600">{formatCurrency(totais.total)}</span>
            <span className="mt-1 text-sm text-gray-500">Total Geral</span>
          </div>
          <div className="card flex flex-col items-center py-6">
            <span className="text-2xl font-bold text-purple-600">{formatCurrency(totais.dizimos)}</span>
            <span className="mt-1 text-sm text-gray-500">Total Dizimos</span>
          </div>
          <div className="card flex flex-col items-center py-6">
            <span className="text-2xl font-bold text-blue-600">{formatCurrency(totais.associacao)}</span>
            <span className="mt-1 text-sm text-gray-500">Associacao</span>
          </div>
          <div className="card flex flex-col items-center py-6">
            <span className="text-2xl font-bold text-amber-600">{formatCurrency(totais.missoes)}</span>
            <span className="mt-1 text-sm text-gray-500">Missoes</span>
          </div>
        </div>
      )}

      {loading ? (
        <FinanceiroTableSkeleton titleWidth="w-64" rows={4} />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-gray-100 px-4 py-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Detalhamento por Igreja - {MESES[mes - 1]} / {ano}
            </h2>
          </div>

          {resumoPorIgreja.length === 0 ? (
            <p className="py-8 text-center text-gray-400">Nenhum lancamento encontrado para este periodo</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-2 py-3 text-left font-semibold text-gray-600">Igreja</th>
                    <th className="px-2 py-3 text-right font-semibold text-gray-600">Dizimos</th>
                    <th className="px-2 py-3 text-right font-semibold text-gray-600">Ofertas</th>
                    <th className="px-2 py-3 text-right font-semibold text-gray-600">Total</th>
                    <th className="px-2 py-3 text-right font-semibold text-gray-600">Missoes</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoPorIgreja.map((resumo) => (
                    <tr key={resumo.igrejaId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-3 font-medium text-gray-800">{resumo.igrejaNome}</td>
                      <td className="px-2 py-3 text-right font-medium text-purple-600">{formatCurrency(resumo.dizimos)}</td>
                      <td className="px-2 py-3 text-right font-medium text-blue-600">{formatCurrency(resumo.ofertas)}</td>
                      <td className="px-2 py-3 text-right font-bold text-green-600">{formatCurrency(resumo.total)}</td>
                      <td className="px-2 py-3 text-right font-medium text-amber-600">{formatCurrency(resumo.missoes)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="px-2 py-3 text-gray-800">TOTAL</td>
                    <td className="px-2 py-3 text-right text-purple-700">{formatCurrency(totais.dizimos)}</td>
                    <td className="px-2 py-3 text-right text-blue-700">{formatCurrency(totais.ofertas)}</td>
                    <td className="px-2 py-3 text-right text-green-700">{formatCurrency(totais.total)}</td>
                    <td className="px-2 py-3 text-right text-amber-700">{formatCurrency(totais.missoes)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

              <div className="space-y-3 p-4 md:hidden">
              {resumoPorIgreja.map((resumo) => (
                <div key={resumo.igrejaId} className="rounded-lg border border-gray-100 p-4">
                  <p className="mb-3 font-semibold text-gray-800">{resumo.igrejaNome}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Dizimos</span>
                      <p className="font-medium text-purple-600">{formatCurrency(resumo.dizimos)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ofertas</span>
                      <p className="font-medium text-blue-600">{formatCurrency(resumo.ofertas)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total</span>
                      <p className="font-bold text-green-600">{formatCurrency(resumo.total)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Missoes</span>
                      <p className="font-medium text-amber-600">{formatCurrency(resumo.missoes)}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                <p className="mb-3 font-bold text-gray-800">TOTAL GERAL</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Dizimos</span>
                    <p className="font-bold text-purple-700">{formatCurrency(totais.dizimos)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Ofertas</span>
                    <p className="font-bold text-blue-700">{formatCurrency(totais.ofertas)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total</span>
                    <p className="font-bold text-green-700">{formatCurrency(totais.total)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Missoes</span>
                    <p className="font-bold text-amber-700">{formatCurrency(totais.missoes)}</p>
                  </div>
                </div>
              </div>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && resumoPorIgreja.length > 0 && (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Distribuicao</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <FiDollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">Associacao</p>
                <p className="text-xl font-bold text-blue-800">{formatCurrency(totais.associacao)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border border-amber-100 bg-amber-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <FiDollarSign className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-600">Missoes</p>
                <p className="text-xl font-bold text-amber-800">{formatCurrency(totais.missoes)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

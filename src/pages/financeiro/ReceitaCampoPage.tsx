import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DadosFinanceiros } from '@/types'
import { FiDollarSign } from 'react-icons/fi'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

interface EntryWithIgreja extends DadosFinanceiros {
  igreja?: { nome: string } | null
}

interface ResumoIgreja {
  igrejaId: string
  igrejaNome: string
  dizimos: number
  ofertas: number
  total: number
  missoes: number
}

export default function ReceitaCampoPage() {
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

      // Filtro por papel do usuario
      if (profile.papel === 'admin') {
        // admin ve tudo
      } else if (profile.papel === 'admin_uniao') {
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
      } else {
        // Outros papeis: ver apenas sua igreja
        if (profile.igreja_id) {
          query = query.eq('igreja_id', profile.igreja_id)
        }
      }

      const { data, error } = await query
      if (error) throw error
      setEntries((data as EntryWithIgreja[]) || [])
    } catch (err) {
      console.error('Erro ao buscar receita do campo:', err)
    } finally {
      setLoading(false)
    }
  }

  // Aggregate by church
  const resumoPorIgreja = useMemo<ResumoIgreja[]>(() => {
    const map = new Map<string, ResumoIgreja>()

    entries.forEach((entry) => {
      const key = entry.igreja_id
      const existing = map.get(key)

      const dizimos = (entry.receita_dizimos || 0) + ((entry as any).dizimo || 0)
      const ofertas =
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
      const total = dizimos + ofertas
      const missoes = entry.receita_oferta_missoes || 0

      if (existing) {
        existing.dizimos += dizimos
        existing.ofertas += ofertas
        existing.total += total
        existing.missoes += missoes
      } else {
        map.set(key, {
          igrejaId: key,
          igrejaNome: entry.igreja?.nome || 'Igreja desconhecida',
          dizimos,
          ofertas,
          total,
          missoes,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => a.igrejaNome.localeCompare(b.igrejaNome))
  }, [entries])

  const totais = useMemo(() => {
    let dizimos = 0
    let ofertas = 0
    let total = 0
    let missoes = 0

    resumoPorIgreja.forEach((r) => {
      dizimos += r.dizimos
      ofertas += r.ofertas
      total += r.total
      missoes += r.missoes
    })

    // Associacao total = total - missoes
    const associacao = total - missoes

    return { dizimos, ofertas, total, missoes, associacao }
  }, [resumoPorIgreja])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500">
        <Link to="/financeiro" className="hover:text-primary-600 transition-colors">Financeiro</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800 font-medium">Receita do Campo</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <FiDollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Receita do Campo</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Resumo financeiro por igreja da associação</p>
          </div>
        </div>
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
            {resumoPorIgreja.length} igreja{resumoPorIgreja.length !== 1 ? 's' : ''} em {MESES[mes - 1]}/{ano}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex flex-col items-center py-6">
          <span className="text-2xl font-bold text-green-600">{formatCurrency(totais.total)}</span>
          <span className="text-sm text-gray-500 mt-1">Total Geral</span>
        </div>
        <div className="card flex flex-col items-center py-6">
          <span className="text-2xl font-bold text-purple-600">{formatCurrency(totais.dizimos)}</span>
          <span className="text-sm text-gray-500 mt-1">Total Dízimos</span>
        </div>
        <div className="card flex flex-col items-center py-6">
          <span className="text-2xl font-bold text-blue-600">{formatCurrency(totais.associacao)}</span>
          <span className="text-sm text-gray-500 mt-1">Associação</span>
        </div>
        <div className="card flex flex-col items-center py-6">
          <span className="text-2xl font-bold text-amber-600">{formatCurrency(totais.missoes)}</span>
          <span className="text-sm text-gray-500 mt-1">Missões</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Detalhamento por Igreja - {MESES[mes - 1]} / {ano}
        </h2>

        {loading ? (
          <p className="text-center text-gray-400 py-8">Carregando...</p>
        ) : resumoPorIgreja.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Nenhum lançamento encontrado para este período</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Igreja</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Dízimos</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Ofertas</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Total</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Missões</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoPorIgreja.map((r) => (
                    <tr key={r.igrejaId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-800">{r.igrejaNome}</td>
                      <td className="py-3 px-2 text-right text-purple-600 font-medium">{formatCurrency(r.dizimos)}</td>
                      <td className="py-3 px-2 text-right text-blue-600 font-medium">{formatCurrency(r.ofertas)}</td>
                      <td className="py-3 px-2 text-right text-green-600 font-bold">{formatCurrency(r.total)}</td>
                      <td className="py-3 px-2 text-right text-amber-600 font-medium">{formatCurrency(r.missoes)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                    <td className="py-3 px-2 text-gray-800">TOTAL</td>
                    <td className="py-3 px-2 text-right text-purple-700">{formatCurrency(totais.dizimos)}</td>
                    <td className="py-3 px-2 text-right text-blue-700">{formatCurrency(totais.ofertas)}</td>
                    <td className="py-3 px-2 text-right text-green-700">{formatCurrency(totais.total)}</td>
                    <td className="py-3 px-2 text-right text-amber-700">{formatCurrency(totais.missoes)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {resumoPorIgreja.map((r) => (
                <div key={r.igrejaId} className="border border-gray-100 rounded-lg p-4">
                  <p className="font-semibold text-gray-800 mb-3">{r.igrejaNome}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Dízimos</span>
                      <p className="font-medium text-purple-600">{formatCurrency(r.dizimos)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ofertas</span>
                      <p className="font-medium text-blue-600">{formatCurrency(r.ofertas)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total</span>
                      <p className="font-bold text-green-600">{formatCurrency(r.total)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Missões</span>
                      <p className="font-medium text-amber-600">{formatCurrency(r.missoes)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Mobile totals */}
              <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                <p className="font-bold text-gray-800 mb-3">TOTAL GERAL</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Dízimos</span>
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
                    <span className="text-gray-500">Missões</span>
                    <p className="font-bold text-amber-700">{formatCurrency(totais.missoes)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Association vs Missions breakdown */}
      {!loading && resumoPorIgreja.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Distribuição</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Associação</p>
                <p className="text-xl font-bold text-blue-800">{formatCurrency(totais.associacao)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <FiDollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-600 font-medium">Missões</p>
                <p className="text-xl font-bold text-amber-800">{formatCurrency(totais.missoes)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

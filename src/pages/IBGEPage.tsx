import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { analyzeAgeDistribution } from '@/lib/projections'
import { Pessoa } from '@/types'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const COLORS = ['#006D43', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

const chartOptions = (title: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
    title: { display: true, text: title },
  },
})

const numberFmt = new Intl.NumberFormat('pt-BR')

// ---------- IBGE API types ----------

interface EstadoIBGE {
  id: number
  sigla: string
  nome: string
  regiao: { id: number; sigla: string; nome: string }
}

interface MunicipioIBGE {
  id: number
  nome: string
}

// ---------- Summary row ----------

interface CidadeResumo {
  cidade: string
  membros: number
  populacao: number | null
  alcance: number | null
}

// ---------- Component ----------

export default function IBGEPage() {
  const { profile } = useAuth()

  // IBGE state
  const [estados, setEstados] = useState<EstadoIBGE[]>([])
  const [municipios, setMunicipios] = useState<MunicipioIBGE[]>([])
  const [selectedEstado, setSelectedEstado] = useState('')
  const [selectedMunicipio, setSelectedMunicipio] = useState('')
  const [selectedMunicipioId, setSelectedMunicipioId] = useState<number | null>(null)

  // Data state
  const [populacao, setPopulacao] = useState<number | null>(null)
  const [membrosCidade, setMembrosCidade] = useState<Pessoa[]>([])
  const [membrosEstado, setMembrosEstado] = useState<Pessoa[]>([])
  const [cidadesResumo, setCidadesResumo] = useState<CidadeResumo[]>([])

  // UI state
  const [loadingEstados, setLoadingEstados] = useState(false)
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  const [loadingPopulacao, setLoadingPopulacao] = useState(false)
  const [loadingMembros, setLoadingMembros] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------- Scope filter helper ----------

  const applyScope = useCallback(
    (query: any) => {
      if (!profile) return query
      if (profile.papel === 'admin') return query
      if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id)
      if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id)
      if (['secretario_igreja', 'membro'].includes(profile.papel)) return query.eq('igreja_id', profile.igreja_id)
      return query
    },
    [profile]
  )

  // ---------- Fetch estados on mount ----------

  useEffect(() => {
    async function fetchEstados() {
      setLoadingEstados(true)
      try {
        const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
        if (!res.ok) throw new Error('Erro ao buscar estados do IBGE')
        const data: EstadoIBGE[] = await res.json()
        data.sort((a, b) => a.nome.localeCompare(b.nome))
        setEstados(data)
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar estados')
      } finally {
        setLoadingEstados(false)
      }
    }
    fetchEstados()
  }, [])

  // ---------- Fetch municipios when estado changes ----------

  useEffect(() => {
    if (!selectedEstado) {
      setMunicipios([])
      setSelectedMunicipio('')
      setSelectedMunicipioId(null)
      setPopulacao(null)
      setMembrosCidade([])
      setMembrosEstado([])
      setCidadesResumo([])
      return
    }

    async function fetchMunicipios() {
      setLoadingMunicipios(true)
      setSelectedMunicipio('')
      setSelectedMunicipioId(null)
      setPopulacao(null)
      setMembrosCidade([])
      setError(null)
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedEstado}/municipios`
        )
        if (!res.ok) throw new Error('Erro ao buscar municipios do IBGE')
        const data: MunicipioIBGE[] = await res.json()
        data.sort((a, b) => a.nome.localeCompare(b.nome))
        setMunicipios(data)
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar municipios')
      } finally {
        setLoadingMunicipios(false)
      }
    }

    async function fetchMembrosEstado() {
      setLoadingMembros(true)
      try {
        let query = supabase
          .from('pessoas')
          .select('*')
          .eq('ativo', true)
          .eq('endereco_estado', selectedEstado)

        query = applyScope(query)
        const { data, error: dbError } = await query
        if (dbError) throw dbError
        setMembrosEstado(data || [])
        buildCidadesResumo(data || [])
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar membros')
      } finally {
        setLoadingMembros(false)
      }
    }

    fetchMunicipios()
    fetchMembrosEstado()
  }, [selectedEstado, applyScope])

  // ---------- Fetch population + city members when municipio changes ----------

  useEffect(() => {
    if (!selectedMunicipio || !selectedMunicipioId) {
      setPopulacao(null)
      setMembrosCidade([])
      return
    }

    async function fetchPopulacao() {
      setLoadingPopulacao(true)
      setError(null)
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2021/variaveis/9324?localidades=N6[${selectedMunicipioId}]`
        )
        if (!res.ok) throw new Error('Erro ao buscar populacao do IBGE')
        const data = await res.json()
        const valor = data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.['2021']
        setPopulacao(valor ? parseInt(valor, 10) : null)
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar populacao')
        setPopulacao(null)
      } finally {
        setLoadingPopulacao(false)
      }
    }

    async function fetchMembrosCidade() {
      setLoadingMembros(true)
      try {
        let query = supabase
          .from('pessoas')
          .select('*')
          .eq('ativo', true)
          .eq('endereco_estado', selectedEstado)
          .eq('endereco_cidade', selectedMunicipio)

        query = applyScope(query)
        const { data, error: dbError } = await query
        if (dbError) throw dbError
        setMembrosCidade(data || [])
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar membros da cidade')
      } finally {
        setLoadingMembros(false)
      }
    }

    fetchPopulacao()
    fetchMembrosCidade()
  }, [selectedMunicipio, selectedMunicipioId, selectedEstado, applyScope])

  // ---------- Build summary table from state members ----------

  function buildCidadesResumo(pessoas: Pessoa[]) {
    const map = new Map<string, number>()
    for (const p of pessoas) {
      const cidade = p.endereco_cidade?.trim()
      if (!cidade) continue
      map.set(cidade, (map.get(cidade) || 0) + 1)
    }
    const resumo: CidadeResumo[] = Array.from(map.entries())
      .map(([cidade, membros]) => ({
        cidade,
        membros,
        populacao: null,
        alcance: null,
      }))
      .sort((a, b) => b.membros - a.membros)

    setCidadesResumo(resumo)
  }

  // ---------- Computed KPIs ----------

  const totalMembros = membrosCidade.length
  const densidade = populacao && populacao > 0 ? (totalMembros / populacao) * 1000 : null
  const alcance = populacao && populacao > 0 ? (totalMembros / populacao) * 100 : null

  // ---------- Age chart data ----------

  const ageDistribution = analyzeAgeDistribution(membrosCidade)
  const ageChartData = {
    labels: ageDistribution.map((d) => d.faixa),
    datasets: [
      {
        label: 'Membros da Igreja',
        data: ageDistribution.map((d) => d.count),
        backgroundColor: COLORS.slice(0, ageDistribution.length),
        borderRadius: 4,
      },
    ],
  }

  // ---------- Alcance badge ----------

  function alcanceBadge(pct: number | null) {
    if (pct === null) {
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          N/A
        </span>
      )
    }
    if (pct >= 0.1) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          {pct.toFixed(4)}%
        </span>
      )
    }
    if (pct >= 0.01) {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
          {pct.toFixed(4)}%
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        {pct.toFixed(4)}%
      </span>
    )
  }

  // ---------- Handle municipio selection ----------

  function handleMunicipioChange(nome: string) {
    setSelectedMunicipio(nome)
    const mun = municipios.find((m) => m.nome === nome)
    setSelectedMunicipioId(mun?.id ?? null)
  }

  // ---------- Loading indicator ----------

  const isLoading = loadingEstados || loadingMunicipios || loadingPopulacao || loadingMembros

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dados Territoriais</h1>
        <p className="mt-1 text-sm text-gray-500">
          Análise demográfica cruzando dados territoriais e do censo com dados de membresia da igreja.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-xs font-medium underline hover:text-red-900"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cascade Selectors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Estado */}
        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            id="estado"
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={loadingEstados}
          >
            <option value="">Selecione um estado</option>
            {estados.map((uf) => (
              <option key={uf.sigla} value={uf.sigla}>
                {uf.nome} ({uf.sigla})
              </option>
            ))}
          </select>
        </div>

        {/* Municipio */}
        <div>
          <label htmlFor="municipio" className="block text-sm font-medium text-gray-700 mb-1">
            Município
          </label>
          <select
            id="municipio"
            value={selectedMunicipio}
            onChange={(e) => handleMunicipioChange(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={!selectedEstado || loadingMunicipios}
          >
            <option value="">Selecione um municipio</option>
            {municipios.map((m) => (
              <option key={m.id} value={m.nome}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading spinner */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <svg
            className="h-8 w-8 animate-spin text-green-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="ml-2 text-sm text-gray-500">Carregando dados...</span>
        </div>
      )}

      {/* KPI Cards - show only when a municipio is selected */}
      {selectedMunicipio && !isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Populacao */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              População do Município
            </p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {populacao !== null ? numberFmt.format(populacao) : '--'}
            </p>
            <p className="mt-1 text-xs text-gray-400">Censo IBGE 2021</p>
          </div>

          {/* Membros */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Membros na Cidade
            </p>
            <p className="mt-2 text-2xl font-bold text-green-700">
              {numberFmt.format(totalMembros)}
            </p>
            <p className="mt-1 text-xs text-gray-400">Membros ativos cadastrados</p>
          </div>

          {/* Densidade */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Densidade
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              {densidade !== null ? densidade.toFixed(2) : '--'}
            </p>
            <p className="mt-1 text-xs text-gray-400">Membros por 1.000 habitantes</p>
          </div>

          {/* Alcance */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Alcance
            </p>
            <p className="mt-2 text-2xl font-bold text-purple-700">
              {alcance !== null ? `${alcance.toFixed(4)}%` : '--'}
            </p>
            <p className="mt-1 text-xs text-gray-400">% membros / populacao</p>
          </div>
        </div>
      )}

      {/* Age Distribution Chart - show when municipio has members */}
      {selectedMunicipio && !isLoading && totalMembros > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="h-72">
            <Bar
              data={ageChartData}
              options={chartOptions('Distribuição Etária dos Membros')}
            />
          </div>
        </div>
      )}

      {/* No members message */}
      {selectedMunicipio && !isLoading && totalMembros === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            Nenhum membro encontrado em{' '}
            <span className="font-medium text-gray-700">{selectedMunicipio}</span> -{' '}
            <span className="font-medium text-gray-700">{selectedEstado}</span>.
          </p>
        </div>
      )}

      {/* Summary Table - show when estado is selected and has members */}
      {selectedEstado && !isLoading && cidadesResumo.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Cidades com Membros em {selectedEstado}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {cidadesResumo.length} cidade{cidadesResumo.length !== 1 ? 's' : ''} com presenca
              de membros ({numberFmt.format(membrosEstado.length)} membros no estado)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Cidade
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Membros
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Populacao (IBGE)
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Alcance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {cidadesResumo.map((row) => {
                  const pen =
                    row.populacao && row.populacao > 0
                      ? (row.membros / row.populacao) * 100
                      : null
                  return (
                    <tr key={row.cidade} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-900">
                        {row.cidade}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-gray-700">
                        {numberFmt.format(row.membros)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-sm text-gray-500">
                        {row.populacao !== null ? numberFmt.format(row.populacao) : '--'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-center">
                        {alcanceBadge(pen)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state when no estado selected */}
      {!selectedEstado && !isLoading && (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-gray-900">Selecione um estado</h3>
          <p className="mt-1 text-xs text-gray-500">
            Escolha um estado para visualizar dados demograficos do IBGE cruzados com a membresia.
          </p>
        </div>
      )}
    </div>
  )
}

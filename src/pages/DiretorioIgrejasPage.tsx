import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { FiMapPin, FiPhone, FiSearch, FiUser, FiHome } from 'react-icons/fi'
import { VirtualTable, type VColumn } from '@/components/ui/VirtualTable'

// ========== TYPES ==========
interface Associacao {
  nome: string
  sigla: string
}

interface Igreja {
  id: string
  nome: string
  endereco_rua: string | null
  endereco_numero: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  endereco_cep: string | null
  telefone: string | null
  pastor: string | null
  associacao: Associacao | null
}

// ========== CONSTANTS ==========
const ESTADOS_BR = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]

// ========== COMPONENT ==========
export default function DiretorioIgrejasPage() {
  const [igrejas, setIgrejas] = useState<Igreja[]>([])
  const [loading, setLoading] = useState(true)
  const [estadoSelecionado, setEstadoSelecionado] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    fetchIgrejas()
  }, [])

  async function fetchIgrejas() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('igrejas')
        .select('*, associacao:associacoes(nome, sigla)')
        .eq('ativo', true)
        .order('endereco_estado')
        .order('nome')

      if (error) throw error
      setIgrejas(data || [])
    } catch (err) {
      console.error('Erro ao buscar igrejas:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter igrejas by state and search query
  const igrejasFiltradas = useMemo(() => {
    let resultado = igrejas

    if (estadoSelecionado) {
      resultado = resultado.filter(ig => ig.endereco_estado === estadoSelecionado)
    }

    if (busca.trim()) {
      const termo = busca.toLowerCase().trim()
      resultado = resultado.filter(ig =>
        ig.nome.toLowerCase().includes(termo) ||
        (ig.endereco_cidade || '').toLowerCase().includes(termo) ||
        (ig.pastor || '').toLowerCase().includes(termo)
      )
    }

    return resultado
  }, [igrejas, estadoSelecionado, busca])

  // Build full address string
  function formatEndereco(ig: Igreja): string {
    const partes: string[] = []
    if (ig.endereco_rua) {
      let rua = ig.endereco_rua
      if (ig.endereco_numero) rua += `, ${ig.endereco_numero}`
      partes.push(rua)
    }
    if (ig.endereco_bairro) partes.push(ig.endereco_bairro)
    if (ig.endereco_cidade) {
      let cidade = ig.endereco_cidade
      if (ig.endereco_estado) cidade += ` - ${ig.endereco_estado}`
      partes.push(cidade)
    }
    if (ig.endereco_cep) partes.push(`CEP: ${ig.endereco_cep}`)
    return partes.join(', ') || 'Endere\u00e7o n\u00e3o informado'
  }

  // Count churches per state (for badge display)
  const contagemPorEstado = useMemo(() => {
    const map: Record<string, number> = {}
    igrejas.forEach(ig => {
      const uf = ig.endereco_estado
      if (uf) {
        map[uf] = (map[uf] || 0) + 1
      }
    })
    return map
  }, [igrejas])

  // Only show states that have churches
  const estadosComIgrejas = useMemo(() => {
    return ESTADOS_BR.filter(uf => contagemPorEstado[uf])
  }, [contagemPorEstado])

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#006D43] to-[#005535] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center gap-3 mb-2">
            <FiHome className="w-7 h-7 opacity-80" />
            <h1 className="text-2xl sm:text-3xl font-bold">Diret\u00f3rio de Igrejas - IASDMR</h1>
          </div>
          <p className="text-green-200 text-sm sm:text-base">
            Endere\u00e7os e contatos das igrejas
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome da igreja, cidade ou pastor..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006D43] focus:border-[#006D43] outline-none transition-colors text-sm"
            />
          </div>
        </div>

        {/* State filter chips */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Filtrar por estado</p>
          <div className="flex flex-wrap gap-2">
            {/* "Todas" button */}
            <button
              onClick={() => setEstadoSelecionado(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                estadoSelecionado === null
                  ? 'bg-[#006D43] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas ({igrejas.length})
            </button>

            {estadosComIgrejas.map(uf => (
              <button
                key={uf}
                onClick={() => setEstadoSelecionado(estadoSelecionado === uf ? null : uf)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  estadoSelecionado === uf
                    ? 'bg-[#006D43] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {uf} ({contagemPorEstado[uf]})
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {loading ? 'Carregando...' : (
              <>
                <span className="font-semibold text-gray-700">{igrejasFiltradas.length}</span>
                {' '}igreja{igrejasFiltradas.length !== 1 ? 's' : ''} encontrada{igrejasFiltradas.length !== 1 ? 's' : ''}
                {estadoSelecionado && <span className="text-[#006D43] font-medium"> em {estadoSelecionado}</span>}
              </>
            )}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#006D43] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-500">Carregando igrejas...</p>
          </div>
        ) : igrejasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FiMapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma igreja encontrada</p>
            <p className="text-gray-400 text-sm mt-1">
              {busca.trim()
                ? 'Tente outro termo de busca ou limpe os filtros'
                : 'N\u00e3o h\u00e1 igrejas cadastradas para o estado selecionado'}
            </p>
            {(busca.trim() || estadoSelecionado) && (
              <button
                onClick={() => { setBusca(''); setEstadoSelecionado(null) }}
                className="mt-4 text-[#006D43] font-medium text-sm hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table — virtualized */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <VirtualTable<Igreja>
                items={igrejasFiltradas}
                getKey={(ig) => ig.id}
                rowHeight={56}
                maxHeight={560}
                emptyMessage="Nenhuma igreja encontrada"
                columns={[
                  {
                    key: 'nome',
                    header: 'Igreja',
                    width: '2fr',
                    render: (ig) => (
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{ig.nome}</p>
                        {ig.endereco_estado && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#006D43]/10 text-[#006D43]">
                            {ig.endereco_estado}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'endereco',
                    header: 'Endere\u00e7o',
                    width: '3fr',
                    render: (ig) => (
                      <span className="flex items-start gap-1.5 text-gray-500 min-w-0">
                        <FiMapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                        <span className="truncate" title={formatEndereco(ig)}>{formatEndereco(ig)}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'telefone',
                    header: 'Telefone',
                    width: '1fr',
                    render: (ig) => ig.telefone ? (
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <FiPhone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{ig.telefone}</span>
                      </span>
                    ) : <span className="text-gray-300">-</span>,
                  },
                  {
                    key: 'pastor',
                    header: 'Pastor',
                    width: '1fr',
                    render: (ig) => ig.pastor ? (
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <FiUser className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{ig.pastor}</span>
                      </span>
                    ) : <span className="text-gray-300">-</span>,
                  },
                  {
                    key: 'associacao',
                    header: 'Associa\u00e7\u00e3o',
                    width: '100px',
                    render: (ig) => ig.associacao ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 truncate">
                        {ig.associacao.sigla || ig.associacao.nome}
                      </span>
                    ) : <span className="text-gray-300">-</span>,
                  },
                ] satisfies VColumn<Igreja>[]}
              />
            </div>

            {/* Mobile/Tablet cards */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
              {igrejasFiltradas.map(ig => (
                <div
                  key={ig.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Church name + state badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">{ig.nome}</h3>
                    {ig.endereco_estado && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-[#006D43]/10 text-[#006D43]">
                        {ig.endereco_estado}
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2 text-xs text-gray-500 mb-2">
                    <FiMapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#006D43]" />
                    <span>{formatEndereco(ig)}</span>
                  </div>

                  {/* Phone */}
                  {ig.telefone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <FiPhone className="w-3.5 h-3.5 shrink-0 text-[#006D43]" />
                      <a href={`tel:${ig.telefone}`} className="hover:text-[#006D43] hover:underline">
                        {ig.telefone}
                      </a>
                    </div>
                  )}

                  {/* Pastor */}
                  {ig.pastor && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <FiUser className="w-3.5 h-3.5 shrink-0 text-[#006D43]" />
                      <span>{ig.pastor}</span>
                    </div>
                  )}

                  {/* Association */}
                  {ig.associacao && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                        {ig.associacao.sigla || ig.associacao.nome}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 mt-8 pb-6">
          IASDMR - Igreja Adventista do S\u00e9timo Dia Movimento de Reforma
          <br />
          Uni\u00e3o Norte-Nordeste
        </footer>
      </div>
    </div>
  )
}

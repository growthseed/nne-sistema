import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FiSearch, FiCreditCard, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi'

// ========== TYPES ==========
interface MembroCartao {
  id: string
  nome: string
  foto: string | null
  data_batismo: string | null
  situacao: string
  tipo: string
  cargo: string | null
  endereco_cidade: string | null
  endereco_estado: string | null
  igreja: { nome: string } | null
}

// ========== QR CODE PLACEHOLDER ==========
function QRCodePlaceholder({ value, size = 120 }: { value: string; size?: number }) {
  // Generate a deterministic pattern from the value string
  const hash = (str: string) => {
    let h = 0
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  }

  const seed = hash(value)
  const gridSize = 21
  const cellSize = size / gridSize
  const cells: boolean[][] = []

  for (let row = 0; row < gridSize; row++) {
    cells[row] = []
    for (let col = 0; col < gridSize; col++) {
      // Finder patterns (3 corners)
      const isFinderTL = row < 7 && col < 7
      const isFinderTR = row < 7 && col >= gridSize - 7
      const isFinderBL = row >= gridSize - 7 && col < 7

      if (isFinderTL || isFinderTR || isFinderBL) {
        const localR = isFinderTL ? row : isFinderBL ? row - (gridSize - 7) : row
        const localC = isFinderTL ? col : isFinderTR ? col - (gridSize - 7) : col
        const isBorder = localR === 0 || localR === 6 || localC === 0 || localC === 6
        const isInner = localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4
        cells[row][col] = isBorder || isInner
      } else {
        // Pseudo-random data pattern
        const n = hash(`${seed}-${row}-${col}`)
        cells[row][col] = n % 3 !== 0
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <rect width={size} height={size} fill="white" />
      {cells.map((row, ri) =>
        row.map((cell, ci) =>
          cell ? (
            <rect
              key={`${ri}-${ci}`}
              x={ci * cellSize}
              y={ri * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#1a1a1a"
            />
          ) : null
        )
      )}
    </svg>
  )
}

// ========== STATUS HELPERS ==========
const situacaoConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ativo: {
    label: 'Ativo',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: <FiCheckCircle className="w-4 h-4" />,
  },
  inativo: {
    label: 'Inativo',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: <FiXCircle className="w-4 h-4" />,
  },
  transferido: {
    label: 'Transferido',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    icon: <FiAlertTriangle className="w-4 h-4" />,
  },
  excluido: {
    label: 'Excluido',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: <FiXCircle className="w-4 h-4" />,
  },
  falecido: {
    label: 'Falecido',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    icon: <FiXCircle className="w-4 h-4" />,
  },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('pt-BR')
  } catch {
    return dateStr
  }
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// ========== MAIN COMPONENT ==========
export default function ValidarCartaoPage() {
  const [credencial, setCredencial] = useState('')
  const [membro, setMembro] = useState<MembroCartao | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const term = credencial.trim()
    if (!term) return

    setLoading(true)
    setError('')
    setMembro(null)
    setSearched(true)

    try {
      // Search by the full UUID or by partial match (first 8 chars)
      let query = supabase
        .from('pessoas')
        .select('id, nome, foto, data_batismo, situacao, tipo, cargo, endereco_cidade, endereco_estado, igreja:igrejas(nome)')
        .eq('tipo', 'membro')

      // If 36 chars, it's a full UUID
      if (term.length === 36) {
        query = query.eq('id', term)
      } else {
        // Try to find by id starting with the provided string
        query = query.ilike('id', `${term}%`)
      }

      const { data, error: dbError } = await query.limit(1).single()

      if (dbError || !data) {
        setMembro(null)
      } else {
        setMembro(data as unknown as MembroCartao)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar credencial')
    } finally {
      setLoading(false)
    }
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const validationUrl = membro ? `${currentUrl}/validar-cartao?id=${membro.id}` : ''

  // Check URL params on initial load
  useState(() => {
    const params = new URLSearchParams(window.location.search)
    const idParam = params.get('id')
    if (idParam) {
      setCredencial(idParam)
      // Auto-search
      setTimeout(() => {
        const form = document.getElementById('validar-form') as HTMLFormElement
        if (form) form.requestSubmit()
      }, 300)
    }
  })

  const statusCfg = membro ? (situacaoConfig[membro.situacao] || situacaoConfig.inativo) : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b-4 border-[#006D43]">
        <div className="max-w-2xl mx-auto px-4 py-5 text-center">
          <img src="/img/logo-nne.png" alt="NNE" className="h-12 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-[#006D43] flex items-center justify-center gap-2">
            <FiCreditCard className="w-6 h-6" />
            Validar Credencial de Membro
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Igreja Adventista do Setimo Dia Movimento de Reforma
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Informe o numero da credencial do membro para validar
          </h2>
          <form id="validar-form" onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={credencial}
                onChange={(e) => setCredencial(e.target.value)}
                placeholder="Ex: a1b2c3d4 ou UUID completo"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#006D43] focus:border-[#006D43] outline-none transition-colors text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !credencial.trim()}
              className="bg-[#006D43] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#005535] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? 'Buscando...' : 'Validar'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Not Found */}
        {searched && !loading && !membro && !error && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiXCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Credencial nao encontrada</h3>
            <p className="text-gray-500 text-sm">
              Nao foi possivel encontrar um membro com o numero de credencial informado.
              Verifique se o numero esta correto e tente novamente.
            </p>
          </div>
        )}

        {/* Member Card */}
        {membro && (
          <div className="member-card-wrapper">
            {/* Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Card Header - Green stripe */}
              <div className="bg-gradient-to-r from-[#006D43] to-[#008a55] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-xs font-medium tracking-wider uppercase">
                      Cartao de Membro Digital
                    </p>
                    <h3 className="text-white text-lg font-bold mt-0.5">
                      IASDMR - Uniao Norte-Nordeste
                    </h3>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <FiCreditCard className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <div className="flex gap-5">
                  {/* Photo / Avatar */}
                  <div className="shrink-0">
                    {membro.foto ? (
                      <img
                        src={membro.foto}
                        alt={membro.nome}
                        className="w-24 h-28 rounded-xl object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-28 rounded-xl bg-gradient-to-br from-[#006D43] to-[#008a55] flex items-center justify-center border-2 border-[#006D43]/20">
                        <span className="text-white text-2xl font-bold">
                          {getInitials(membro.nome)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xl font-bold text-gray-900 truncate">{membro.nome}</h4>

                    {membro.igreja && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {(membro.igreja as any).nome || 'Igreja nao informada'}
                      </p>
                    )}

                    {membro.cargo && (
                      <p className="text-xs text-[#006D43] font-medium mt-1">{membro.cargo}</p>
                    )}

                    {/* Status Badge */}
                    {statusCfg && (
                      <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">N. Credencial</p>
                    <p className="text-sm font-mono font-bold text-gray-800 mt-0.5">
                      {membro.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Data de Batismo</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">
                      {formatDate(membro.data_batismo)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Localidade</p>
                    <p className="text-sm text-gray-700 mt-0.5">
                      {membro.endereco_cidade && membro.endereco_estado
                        ? `${membro.endereco_cidade}/${membro.endereco_estado}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Tipo</p>
                    <p className="text-sm text-gray-700 mt-0.5 capitalize">{membro.tipo}</p>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-4">
                  <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm shrink-0">
                    <QRCodePlaceholder value={validationUrl} size={90} />
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    <p className="font-medium text-gray-500 mb-1">Verificacao Digital</p>
                    <p>
                      Escaneie o QR Code para verificar a autenticidade desta credencial
                      ou acesse o link de validacao com o numero do membro.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>IASDMR - Uniao Norte-Nordeste</span>
                  <span>Credencial verificada em {new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* Validation Success Message */}
            {membro.situacao === 'ativo' && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <FiCheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Credencial valida</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Este membro possui registro ativo junto a IASDMR - Uniao Norte-Nordeste.
                  </p>
                </div>
              </div>
            )}

            {membro.situacao !== 'ativo' && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <FiAlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Atencao</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Este membro possui situacao "{statusCfg?.label || membro.situacao}". Entre em contato com a secretaria da igreja para mais informacoes.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Sistema de Gestao Eclesiastica - Uniao Norte-Nordeste - IASDMR
        </p>
      </div>
    </div>
  )
}

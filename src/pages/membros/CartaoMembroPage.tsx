import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { FiSearch, FiPrinter, FiCreditCard, FiCheckCircle, FiXCircle, FiAlertTriangle, FiUser } from 'react-icons/fi'

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
        const n = hash(`${seed}-${row}-${col}`)
        cells[row][col] = n % 3 !== 0
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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

// ========== HELPERS ==========
const situacaoConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  ativo: { label: 'Ativo', color: 'text-green-700', bg: 'bg-green-100', icon: <FiCheckCircle className="w-4 h-4" /> },
  inativo: { label: 'Inativo', color: 'text-gray-600', bg: 'bg-gray-100', icon: <FiXCircle className="w-4 h-4" /> },
  transferido: { label: 'Transferido', color: 'text-blue-700', bg: 'bg-blue-100', icon: <FiAlertTriangle className="w-4 h-4" /> },
  excluido: { label: 'Excluido', color: 'text-red-700', bg: 'bg-red-100', icon: <FiXCircle className="w-4 h-4" /> },
  falecido: { label: 'Falecido', color: 'text-purple-700', bg: 'bg-purple-100', icon: <FiXCircle className="w-4 h-4" /> },
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
export default function CartaoMembroPage() {
  const { profile } = useAuth()
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<MembroCartao[]>([])
  const [membroSelecionado, setMembroSelecionado] = useState<MembroCartao | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!busca.trim() || !profile) return

    setLoading(true)
    setSearched(true)
    setMembroSelecionado(null)

    try {
      let query = supabase
        .from('pessoas')
        .select('id, nome, foto, data_batismo, situacao, tipo, cargo, endereco_cidade, endereco_estado, igreja:igrejas(nome)')
        .eq('tipo', 'membro')
        .ilike('nome', `%${busca.trim()}%`)
        .order('nome')
        .limit(20)

      // Scope by user hierarchy
      if (profile.papel === 'admin_uniao') {
        query = query.eq('uniao_id', profile.uniao_id!)
      } else if (profile.papel === 'admin_associacao') {
        query = query.eq('associacao_id', profile.associacao_id!)
      } else if (profile.papel !== 'admin') {
        query = query.eq('igreja_id', profile.igreja_id!)
      }

      const { data, error } = await query
      if (error) throw error
      setResultados((data || []) as unknown as MembroCartao[])
    } catch (err) {
      console.error('Erro ao buscar membros:', err)
      setResultados([])
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const validationUrl = membroSelecionado ? `${currentUrl}/validar-cartao?id=${membroSelecionado.id}` : ''
  const statusCfg = membroSelecionado ? (situacaoConfig[membroSelecionado.situacao] || situacaoConfig.inativo) : null

  return (
    <>
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-card, .print-card * { visibility: visible !important; }
          .print-card {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 400px !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FiCreditCard className="w-6 h-6 text-[#006D43]" />
              Cartao de Membro Digital
            </h1>
            <p className="text-gray-500 mt-1">Gere e imprima credenciais de membros</p>
          </div>
        </div>

        {/* Search */}
        <div className="card no-print">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Buscar membro por nome</h3>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="input-field pl-10"
                placeholder="Digite o nome do membro..."
              />
            </div>
            <button
              type="submit"
              disabled={loading || !busca.trim()}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              <FiSearch className="w-4 h-4" />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Results */}
          <div className="lg:col-span-1 no-print">
            {searched && (
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">
                    Resultados ({resultados.length})
                  </p>
                </div>
                {loading ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Carregando...</div>
                ) : resultados.length === 0 ? (
                  <div className="p-6 text-center">
                    <FiUser className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nenhum membro encontrado</p>
                    <p className="text-gray-400 text-xs mt-1">Tente buscar com outro nome</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {resultados.map((m) => {
                      const isSelected = membroSelecionado?.id === m.id
                      const sCfg = situacaoConfig[m.situacao] || situacaoConfig.inativo
                      return (
                        <button
                          key={m.id}
                          onClick={() => setMembroSelecionado(m)}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-green-50 border-l-4 border-[#006D43]' : ''
                          }`}
                        >
                          {m.foto ? (
                            <img src={m.foto} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#006D43]/10 text-[#006D43] flex items-center justify-center text-sm font-bold shrink-0">
                              {getInitials(m.nome)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{m.nome}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {(m.igreja as any)?.nome || 'Sem igreja'}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sCfg.bg} ${sCfg.color}`}>
                            {sCfg.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card Preview */}
          <div className="lg:col-span-2">
            {!membroSelecionado ? (
              <div className="card no-print flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <FiCreditCard className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-1">Nenhum membro selecionado</h3>
                <p className="text-gray-400 text-sm max-w-sm">
                  Busque um membro pelo nome e selecione-o na lista para visualizar e imprimir o cartao de membro digital.
                </p>
              </div>
            ) : (
              <div>
                {/* Action bar */}
                <div className="no-print flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Pre-visualizacao do Cartao</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const url = `${currentUrl}/validar-cartao?id=${membroSelecionado.id}`
                        navigator.clipboard.writeText(url)
                      }}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <FiCreditCard className="w-3.5 h-3.5" />
                      Copiar Link
                    </button>
                    <button
                      onClick={handlePrint}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      <FiPrinter className="w-3.5 h-3.5" />
                      Imprimir Cartao
                    </button>
                  </div>
                </div>

                {/* Printable Card */}
                <div ref={cardRef} className="print-card bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  {/* Card Header */}
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
                      {/* Photo */}
                      <div className="shrink-0">
                        {membroSelecionado.foto ? (
                          <img
                            src={membroSelecionado.foto}
                            alt={membroSelecionado.nome}
                            className="w-24 h-28 rounded-xl object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-24 h-28 rounded-xl bg-gradient-to-br from-[#006D43] to-[#008a55] flex items-center justify-center border-2 border-[#006D43]/20">
                            <span className="text-white text-2xl font-bold">
                              {getInitials(membroSelecionado.nome)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-bold text-gray-900 truncate">
                          {membroSelecionado.nome}
                        </h4>
                        {membroSelecionado.igreja && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {(membroSelecionado.igreja as any)?.nome || 'Igreja nao informada'}
                          </p>
                        )}
                        {membroSelecionado.cargo && (
                          <p className="text-xs text-[#006D43] font-medium mt-1">
                            {membroSelecionado.cargo}
                          </p>
                        )}
                        {statusCfg && (
                          <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">N. Credencial</p>
                        <p className="text-sm font-mono font-bold text-gray-800 mt-0.5">
                          {membroSelecionado.id.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Data de Batismo</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">
                          {formatDate(membroSelecionado.data_batismo)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Localidade</p>
                        <p className="text-sm text-gray-700 mt-0.5">
                          {membroSelecionado.endereco_cidade && membroSelecionado.endereco_estado
                            ? `${membroSelecionado.endereco_cidade}/${membroSelecionado.endereco_estado}`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Tipo</p>
                        <p className="text-sm text-gray-700 mt-0.5 capitalize">{membroSelecionado.tipo}</p>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm shrink-0">
                        <QRCodePlaceholder value={validationUrl} size={90} />
                      </div>
                      <div className="text-xs text-gray-400 leading-relaxed">
                        <p className="font-medium text-gray-500 mb-1">Verificacao Digital</p>
                        <p>
                          Escaneie o QR Code para verificar a autenticidade desta credencial
                          ou acesse o link de validacao.
                        </p>
                        <p className="font-mono text-[10px] text-gray-300 mt-1 break-all">
                          {validationUrl}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>IASDMR - Uniao Norte-Nordeste</span>
                      <span>Emitido em {new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                {/* Card info below */}
                <div className="no-print mt-4 bg-gray-50 rounded-xl p-4 text-xs text-gray-500">
                  <p className="font-medium text-gray-600 mb-1">Informacoes do Cartao</p>
                  <div className="grid grid-cols-2 gap-2">
                    <p><strong>ID Completo:</strong> <span className="font-mono text-[10px]">{membroSelecionado.id}</span></p>
                    <p><strong>Link de Validacao:</strong>{' '}
                      <a
                        href={`/validar-cartao?id=${membroSelecionado.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#006D43] underline"
                      >
                        Abrir pagina de validacao
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

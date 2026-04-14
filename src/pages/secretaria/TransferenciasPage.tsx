import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toastSuccess, toastError } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { TransferenciaStatus } from '@/types'
import { VirtualTable, type VColumn } from '@/components/ui/VirtualTable'
import {
  type TransferenciaView,
  useCreateTransferencia,
  useIgrejasAtivas,
  useTransferencias,
  useUpdateTransferenciaStatus,
} from '@/hooks/useTransferencias'
import {
  HiOutlineExternalLink,
  HiOutlineOfficeBuilding,
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineX,
} from 'react-icons/hi'

interface PessoaSearchResult {
  id: string
  nome: string
  foto: string | null
  data_nascimento: string | null
  igreja_id: string | null
  igreja: { nome: string } | null
  associacao: { sigla: string | null } | null
}

const statusConfig: Record<TransferenciaStatus, { label: string; bg: string; text: string }> = {
  solicitada: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700' },
  aprovada: { label: 'Aprovada', bg: 'bg-green-100', text: 'text-green-700' },
  concluida: { label: 'Concluida', bg: 'bg-blue-100', text: 'text-blue-700' },
  rejeitada: { label: 'Rejeitada', bg: 'bg-red-100', text: 'text-red-700' },
}

const tipoConfig = {
  transferencia: { label: 'Transferencia', bg: 'bg-blue-100', text: 'text-blue-700' },
  carta: { label: 'Carta', bg: 'bg-gray-100', text: 'text-gray-700' },
}

export default function TransferenciasPage() {
  const { profile, user } = useAuth()
  const { transferencias, loading, error, refetch } = useTransferencias()
  const { igrejas } = useIgrejasAtivas()
  const createTransferencia = useCreateTransferencia()
  const updateTransferenciaStatus = useUpdateTransferenciaStatus()

  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [showForm, setShowForm] = useState(false)
  const [busyTransferenciaId, setBusyTransferenciaId] = useState<string | null>(null)
  const [busyTransferenciaAction, setBusyTransferenciaAction] = useState<'aprovar' | 'rejeitar' | 'concluir' | null>(null)

  const [selectedPessoa, setSelectedPessoa] = useState<PessoaSearchResult | null>(null)
  const [igrejaOrigemId, setIgrejaOrigemId] = useState('')
  const [igrejaDestinoId, setIgrejaDestinoId] = useState('')
  const [tipo, setTipo] = useState<'transferencia' | 'carta'>('carta')
  const [motivo, setMotivo] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<PessoaSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const saving = createTransferencia.isPending

  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const timeoutId = setTimeout(async () => {
      const { data, error: searchError } = await supabase
        .from('pessoas')
        .select(`
          id, nome, foto, data_nascimento, igreja_id,
          igreja:igrejas(nome),
          associacao:associacoes(sigla)
        `)
        .ilike('nome', `%${searchTerm.trim()}%`)
        .eq('tipo', 'membro')
        .order('nome')
        .limit(20)

      if (!searchError && data) {
        setSearchResults(data as PessoaSearchResult[])
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  function handleSelectPessoa(pessoa: PessoaSearchResult) {
    setSelectedPessoa(pessoa)
    setIgrejaOrigemId(pessoa.igreja_id || '')
    setSearchTerm('')
    setSearchResults([])
  }

  function resetForm() {
    setSelectedPessoa(null)
    setIgrejaOrigemId('')
    setIgrejaDestinoId('')
    setTipo('carta')
    setMotivo('')
    setSearchTerm('')
    setSearchResults([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !user || !selectedPessoa) return

    if (!igrejaOrigemId || !igrejaDestinoId) {
      toastError('Selecione as igrejas de origem e destino.')
      return
    }

    if (igrejaOrigemId === igrejaDestinoId) {
      toastError('A igreja de origem e destino nao podem ser a mesma.')
      return
    }

    try {
      await createTransferencia.mutateAsync({
        pessoa_id: selectedPessoa.id,
        igreja_origem_id: igrejaOrigemId,
        igreja_destino_id: igrejaDestinoId,
        tipo,
        motivo: motivo || null,
        solicitado_por: user.id,
      })

      setShowForm(false)
      resetForm()
      toastSuccess('Transferencia registrada com sucesso.')
    } catch (mutationError: any) {
      console.error('Erro ao solicitar transferencia:', mutationError)
      toastError(mutationError?.message || 'Nao foi possivel registrar a transferencia.')
    }
  }

  async function handleStatusUpdate(
    id: string,
    action: 'aprovar' | 'rejeitar' | 'concluir',
    status: 'aprovada' | 'rejeitada' | 'concluida',
    successMessage: string,
    errorMessage: string,
  ) {
    if (!user) return

    setBusyTransferenciaId(id)
    setBusyTransferenciaAction(action)

    try {
      await updateTransferenciaStatus.mutateAsync({
        id,
        status,
        userId: user.id,
      })
      toastSuccess(successMessage)
    } catch (mutationError) {
      console.error(errorMessage, mutationError)
      toastError(errorMessage)
    } finally {
      setBusyTransferenciaId(null)
      setBusyTransferenciaAction(null)
    }
  }

  async function handleAprovar(id: string) {
    await handleStatusUpdate(
      id,
      'aprovar',
      'aprovada',
      'Transferencia aprovada.',
      'Nao foi possivel aprovar a transferencia.',
    )
  }

  async function handleRejeitar(id: string) {
    await handleStatusUpdate(
      id,
      'rejeitar',
      'rejeitada',
      'Transferencia rejeitada.',
      'Nao foi possivel rejeitar a transferencia.',
    )
  }

  async function handleConcluir(id: string) {
    await handleStatusUpdate(
      id,
      'concluir',
      'concluida',
      'Transferencia concluida.',
      'Nao foi possivel concluir a transferencia.',
    )
  }

  function isTransferenciaBusy(id: string, action?: 'aprovar' | 'rejeitar' | 'concluir') {
    if (busyTransferenciaId !== id) return false
    if (!action) return true
    return busyTransferenciaAction === action
  }

  const filtered = filtroStatus === 'todos'
    ? transferencias
    : transferencias.filter((transferencia) => transferencia.status === filtroStatus)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
            <Link to="/secretaria" className="hover:text-primary-700">Secretaria</Link>
            <span>/</span>
            <span>Transferencias</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Transferencias</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Registre transferencias e cartas de membros entre igrejas
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            if (showForm) {
              resetForm()
              setShowForm(false)
              return
            }

            setShowForm(true)
          }}
        >
          {showForm ? 'Cancelar' : '+ Nova Transferencia'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Registrar Transferencia
          </h2>

          {!selectedPessoa ? (
            <div>
              <label className="label-field">Buscar membro *</label>
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Digite ao menos 3 letras do nome..."
                  autoFocus
                />
              </div>

              {searchTerm.trim().length >= 3 && (
                <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
                  {searching ? (
                    <p className="p-4 text-center text-sm text-gray-400">Buscando...</p>
                  ) : searchResults.length === 0 ? (
                    <p className="p-4 text-center text-sm text-gray-400">Nenhum membro encontrado</p>
                  ) : (
                    searchResults.map((pessoa) => (
                      <button
                        key={pessoa.id}
                        type="button"
                        onClick={() => handleSelectPessoa(pessoa)}
                        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
                      >
                        {pessoa.foto ? (
                          <img src={pessoa.foto} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                            {pessoa.nome.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{pessoa.nome}</p>
                          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                            {pessoa.igreja?.nome || 'Sem igreja'}
                            {pessoa.associacao?.sigla ? ` · ${pessoa.associacao.sigla}` : ''}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {searchTerm.trim().length > 0 && searchTerm.trim().length < 3 && (
                <p className="mt-1 text-xs text-gray-400">Digite pelo menos 3 letras</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
              <div className="flex items-start gap-4">
                {selectedPessoa.foto ? (
                  <img src={selectedPessoa.foto} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-primary-200 bg-white text-lg font-bold text-primary-700 dark:border-primary-700 dark:bg-gray-800 dark:text-primary-300">
                    {selectedPessoa.nome.charAt(0)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                      {selectedPessoa.nome}
                    </h3>
                    <Link
                      to={`/membros/${selectedPessoa.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs text-primary-700 hover:underline dark:text-primary-400"
                      title="Abrir ficha do membro"
                    >
                      <HiOutlineExternalLink className="h-3.5 w-3.5" />
                      Ver ficha
                    </Link>
                  </div>

                  <div className="mt-1 space-y-0.5">
                    <p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <HiOutlineOfficeBuilding className="h-3.5 w-3.5" />
                      {selectedPessoa.igreja?.nome || 'Sem igreja vinculada'}
                      {selectedPessoa.associacao?.sigla && (
                        <span className="ml-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium dark:bg-gray-800">
                          {selectedPessoa.associacao.sigla}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded p-1.5 text-gray-400 hover:text-red-600"
                  title="Trocar membro"
                >
                  <HiOutlineX className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {selectedPessoa && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-field">Igreja de origem *</label>
                  <select
                    value={igrejaOrigemId}
                    onChange={(e) => setIgrejaOrigemId(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">-- Selecione --</option>
                    {igrejas.map((igreja) => (
                      <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Pre-preenchido com a igreja atual do membro
                  </p>
                </div>

                <div>
                  <label className="label-field">Igreja de destino *</label>
                  <select
                    value={igrejaDestinoId}
                    onChange={(e) => setIgrejaDestinoId(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">-- Selecione --</option>
                    {igrejas.filter((igreja) => igreja.id !== igrejaOrigemId).map((igreja) => (
                      <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-field">Tipo *</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'transferencia' | 'carta')}
                    className="input-field"
                  >
                    <option value="carta">Carta de Transferencia</option>
                    <option value="transferencia">Transferencia Direta</option>
                  </select>
                </div>

                <div>
                  <label className="label-field">Motivo (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Mudanca de cidade"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    resetForm()
                    setShowForm(false)
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Registrar Transferencia'}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {error && (
        <div className="card flex flex-col gap-3 border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          <div>
            <p className="font-medium">Nao foi possivel carregar as transferencias.</p>
            <p className="mt-1 text-red-600/90 dark:text-red-200/80">{error}</p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 dark:bg-red-900/30 dark:text-red-100 dark:hover:bg-red-900/50"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['todos', 'solicitada', 'aprovada', 'concluida', 'rejeitada'].map((status) => (
          <button
            key={status}
            onClick={() => setFiltroStatus(status)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filtroStatus === status
                ? 'bg-primary-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {status === 'todos' ? 'Todos' : statusConfig[status as TransferenciaStatus]?.label || status}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="py-8 text-center text-gray-400">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-gray-400">Nenhuma transferencia encontrada</p>
        ) : (
          <>
            <div className="hidden lg:block">
              <VirtualTable<TransferenciaView>
                items={filtered}
                getKey={(t) => t.id}
                rowHeight={52}
                maxHeight={520}
                emptyMessage="Nenhuma transferencia encontrada"
                columns={[
                  {
                    key: 'membro',
                    header: 'Membro',
                    width: '2fr',
                    render: (t) => (
                      <Link to={`/membros/${t.pessoa_id}`}
                        className="inline-flex items-center gap-1 font-medium text-gray-800 dark:text-gray-100 hover:text-primary-700 dark:hover:text-primary-400">
                        <HiOutlineUser className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t.pessoa?.nome || '-'}</span>
                      </Link>
                    ),
                  },
                  {
                    key: 'origem',
                    header: 'Origem',
                    width: '2fr',
                    render: (t) => <span className="text-gray-600 dark:text-gray-400 truncate">{t.igreja_origem?.nome || '-'}</span>,
                  },
                  {
                    key: 'destino',
                    header: 'Destino',
                    width: '2fr',
                    render: (t) => <span className="text-gray-600 dark:text-gray-400 truncate">{t.igreja_destino?.nome || '-'}</span>,
                  },
                  {
                    key: 'tipo',
                    header: 'Tipo',
                    width: '110px',
                    headerClass: 'text-center',
                    cellClass: 'justify-center',
                    render: (t) => {
                      const tp = tipoConfig[t.tipo]
                      return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tp.bg} ${tp.text}`}>{tp.label}</span>
                    },
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    width: '110px',
                    headerClass: 'text-center',
                    cellClass: 'justify-center',
                    render: (t) => {
                      const st = statusConfig[t.status]
                      return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                    },
                  },
                  {
                    key: 'data',
                    header: 'Data',
                    width: '100px',
                    headerClass: 'text-right',
                    cellClass: 'justify-end',
                    render: (t) => (
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    ),
                  },
                  {
                    key: 'acoes',
                    header: 'Acoes',
                    width: '160px',
                    headerClass: 'text-center',
                    cellClass: 'justify-center gap-1',
                    render: (t) => (
                      <div className="flex justify-center gap-1">
                        {t.status === 'solicitada' && (
                          <>
                            <button onClick={() => void handleAprovar(t.id)} disabled={isTransferenciaBusy(t.id)}
                              className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60">
                              {isTransferenciaBusy(t.id, 'aprovar') ? 'Aprovando...' : 'Aprovar'}
                            </button>
                            <button onClick={() => void handleRejeitar(t.id)} disabled={isTransferenciaBusy(t.id)}
                              className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60">
                              {isTransferenciaBusy(t.id, 'rejeitar') ? 'Rejeitando...' : 'Rejeitar'}
                            </button>
                          </>
                        )}
                        {t.status === 'aprovada' && (
                          <button onClick={() => void handleConcluir(t.id)} disabled={isTransferenciaBusy(t.id)}
                            className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60">
                            {isTransferenciaBusy(t.id, 'concluir') ? 'Concluindo...' : 'Concluir'}
                          </button>
                        )}
                      </div>
                    ),
                  },
                ] satisfies VColumn<TransferenciaView>[]}
              />
            </div>

            <div className="divide-y divide-gray-100 lg:hidden">
              {filtered.map((transferencia) => {
                const st = statusConfig[transferencia.status]
                const tp = tipoConfig[transferencia.tipo]

                return (
                  <div key={transferencia.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/membros/${transferencia.pessoa_id}`}
                          className="inline-flex items-center gap-2 font-medium text-gray-800 hover:text-primary-700 dark:text-gray-100 dark:hover:text-primary-400"
                        >
                          <HiOutlineUser className="h-4 w-4 shrink-0" />
                          <span className="truncate">{transferencia.pessoa?.nome || '-'}</span>
                        </Link>
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(transferencia.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tp.bg} ${tp.text}`}>
                          {tp.label}
                        </span>
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Origem</p>
                        <p className="mt-1 inline-flex items-center gap-2">
                          <HiOutlineOfficeBuilding className="h-4 w-4" />
                          {transferencia.igreja_origem?.nome || '-'}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Destino</p>
                        <p className="mt-1 inline-flex items-center gap-2">
                          <HiOutlineExternalLink className="h-4 w-4" />
                          {transferencia.igreja_destino?.nome || '-'}
                        </p>
                      </div>

                      {transferencia.motivo && (
                        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400">Motivo</p>
                          <p className="mt-1">{transferencia.motivo}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {transferencia.status === 'solicitada' && (
                        <>
                          <button
                            onClick={() => void handleAprovar(transferencia.id)}
                            disabled={isTransferenciaBusy(transferencia.id)}
                            className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isTransferenciaBusy(transferencia.id, 'aprovar') ? 'Aprovando...' : 'Aprovar'}
                          </button>
                          <button
                            onClick={() => void handleRejeitar(transferencia.id)}
                            disabled={isTransferenciaBusy(transferencia.id)}
                            className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isTransferenciaBusy(transferencia.id, 'rejeitar') ? 'Rejeitando...' : 'Rejeitar'}
                          </button>
                        </>
                      )}

                      {transferencia.status === 'aprovada' && (
                        <button
                          onClick={() => void handleConcluir(transferencia.id)}
                          disabled={isTransferenciaBusy(transferencia.id)}
                          className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isTransferenciaBusy(transferencia.id, 'concluir') ? 'Concluindo...' : 'Concluir'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

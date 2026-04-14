import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  HiOutlineChat,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineClipboardCheck,
  HiOutlineDocumentText,
  HiOutlineSearch,
} from 'react-icons/hi'
import { useClasseBiblicaRespostas, useReviewClasseBiblicaResposta } from '@/hooks/useClasseBiblicaRespostas'
import { useClassesBiblicas } from '@/hooks/useClassesBiblicas'

function formatDateValue(date: string | null) {
  if (!date) return ''

  try {
    return new Date(date).toLocaleDateString('pt-BR')
  } catch {
    return date
  }
}

export default function EscolaBiblicaRespostasTab() {
  const { classes } = useClassesBiblicas()
  const [selectedTurmaId, setSelectedTurmaId] = useState('')
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [responseSearch, setResponseSearch] = useState('')
  const [expandedRespostaId, setExpandedRespostaId] = useState<string | null>(null)
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({})
  const [reviewingRespostaId, setReviewingRespostaId] = useState<string | null>(null)

  const turmas = useMemo(
    () => classes
      .filter((turma) => turma.status === 'ativa')
      .map((turma) => ({ id: turma.id, nome: turma.nome })),
    [classes],
  )

  const { respostas, loading, error, refetch } = useClasseBiblicaRespostas(selectedTurmaId)
  const reviewMutation = useReviewClasseBiblicaResposta(selectedTurmaId)
  const reviewedCount = respostas.filter((resposta) => resposta.revisado_por_professor).length
  const pendingCount = respostas.length - reviewedCount

  const filteredRespostas = useMemo(() => {
    if (reviewFilter === 'pending') {
      return respostas.filter((resposta) => !resposta.revisado_por_professor)
    }

    if (reviewFilter === 'reviewed') {
      return respostas.filter((resposta) => resposta.revisado_por_professor)
    }

    return respostas
  }, [respostas, reviewFilter])

  const searchedRespostas = useMemo(() => {
    const normalizedSearch = responseSearch.trim().toLowerCase()

    if (!normalizedSearch) {
      return filteredRespostas
    }

    return filteredRespostas.filter((resposta) => {
      const aluno = (resposta.aluno_nome || '').toLowerCase()
      const pontoTitulo = (resposta.ponto_titulo || '').toLowerCase()
      const pontoNumero = String(resposta.ponto_numero)
      return aluno.includes(normalizedSearch)
        || pontoTitulo.includes(normalizedSearch)
        || pontoNumero.includes(normalizedSearch)
    })
  }, [filteredRespostas, responseSearch])

  useEffect(() => {
    if (selectedTurmaId && !turmas.some((turma) => turma.id === selectedTurmaId)) {
      setSelectedTurmaId('')
    }
  }, [selectedTurmaId, turmas])

  useEffect(() => {
    setExpandedRespostaId(null)
    setReviewDrafts({})
    setResponseSearch('')
    setReviewFilter('all')
  }, [selectedTurmaId])

  useEffect(() => {
    setReviewDrafts((current) => {
      const next: Record<string, string> = {}

      for (const resposta of respostas) {
        next[resposta.id] = current[resposta.id] ?? resposta.professor_comentario ?? ''
      }

      return next
    })
  }, [respostas])

  async function revisar(id: string) {
    const comentario = reviewDrafts[id] ?? ''

    try {
      setReviewingRespostaId(id)
      await reviewMutation.mutateAsync({ id, comentario })
      toast.success('Resposta revisada com sucesso.')
    } catch (reviewError) {
      console.error('Erro ao revisar resposta:', reviewError)
      toast.error('Nao foi possivel revisar a resposta agora.')
    } finally {
      setReviewingRespostaId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Respostas dos Alunos</h2>
        <p className="text-xs text-gray-500">Acompanhe o desempenho e revise as respostas</p>
      </div>

      <select value={selectedTurmaId} onChange={e => setSelectedTurmaId(e.target.value)} className="input-field">
        <option value="">Selecione uma turma...</option>
        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      {selectedTurmaId && !loading && respostas.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="card py-3 text-center">
              <p className="text-2xl font-bold text-primary-600">{respostas.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="card py-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              <p className="text-xs text-gray-500">Pendentes</p>
            </div>
            <div className="card py-3 text-center">
              <p className="text-2xl font-bold text-green-600">{reviewedCount}</p>
              <p className="text-xs text-gray-500">Revisadas</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all' as const, label: `Todas (${respostas.length})` },
              { id: 'pending' as const, label: `Pendentes (${pendingCount})` },
              { id: 'reviewed' as const, label: `Revisadas (${reviewedCount})` },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setReviewFilter(option.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  reviewFilter === option.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              value={responseSearch}
              onChange={(event) => setResponseSearch(event.target.value)}
              className="input-field pl-10 text-sm"
              placeholder="Buscar por aluno, ponto ou numero..."
            />
          </div>
        </>
      )}

      {error && selectedTurmaId && (
        <div className="card border border-red-200 bg-red-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Nao foi possivel carregar as respostas.</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={() => refetch()} className="btn-secondary text-sm w-fit">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : !selectedTurmaId ? (
        <div className="card py-12 text-center">
          <HiOutlineClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Selecione uma turma para ver as respostas</p>
        </div>
      ) : respostas.length === 0 ? (
        <div className="card py-12 text-center">
          <HiOutlineDocumentText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma resposta enviada nesta turma</p>
        </div>
      ) : searchedRespostas.length === 0 ? (
        <div className="card py-12 text-center">
          <HiOutlineClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {responseSearch.trim() ? 'Nenhuma resposta encontrada para esta busca' : 'Nenhuma resposta encontrada para este filtro'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {searchedRespostas.map((resposta) => {
            const pct = resposta.percentual_acerto
            const color = pct >= 70 ? 'text-green-600 bg-green-50' : pct >= 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
            const isExpanded = expandedRespostaId === resposta.id
            const isReviewing = reviewingRespostaId === resposta.id
            const draft = reviewDrafts[resposta.id] ?? ''

            return (
              <div key={resposta.id} className="card px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {(resposta.aluno_nome || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{resposta.aluno_nome}</p>
                    <p className="text-xs text-gray-400">Ponto {resposta.ponto_numero}: {resposta.ponto_titulo}</p>
                  </div>
                  <div className={`text-center px-3 py-1 rounded-lg ${color}`}>
                    <p className="text-lg font-bold">{resposta.pontuacao}/{resposta.total_perguntas}</p>
                    <p className="text-[10px]">{Math.round(pct)}%</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-400">{formatDateValue(resposta.submetido_em)}</span>
                    {resposta.revisado_por_professor ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">Revisado</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Pendente</span>
                    )}
                    {resposta.professor_comentario && (
                      <span className="text-gray-500 flex items-center gap-1">
                        <HiOutlineChat className="w-3 h-3" /> Comentario salvo
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedRespostaId(isExpanded ? null : resposta.id)}
                    className="w-fit px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 flex items-center gap-1"
                  >
                    {isExpanded ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'Ocultar revisao' : 'Abrir revisao'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Pontuacao</p>
                        <p className="text-sm font-semibold text-gray-800">{resposta.pontuacao} de {resposta.total_perguntas}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Acerto</p>
                        <p className="text-sm font-semibold text-gray-800">{Math.round(pct)}%</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400">Status</p>
                        <p className="text-sm font-semibold text-gray-800">{resposta.revisado_por_professor ? 'Revisado' : 'Aguardando revisao'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1.5">Comentario do professor</label>
                      <textarea
                        value={draft}
                        onChange={(event) => setReviewDrafts((current) => ({ ...current, [resposta.id]: event.target.value }))}
                        className="input-field text-sm min-h-[88px]"
                        placeholder="Escreva uma devolutiva curta para orientar o aluno."
                      />
                    </div>

                    {resposta.professor_comentario && (
                      <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wide text-green-600">Ultimo comentario salvo</p>
                        <p className="text-sm text-green-900 mt-1 whitespace-pre-wrap">{resposta.professor_comentario}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-500">
                        {resposta.revisado_por_professor
                          ? 'Voce pode atualizar o comentario sempre que precisar.'
                          : 'Ao salvar, esta resposta sera marcada como revisada.'}
                      </p>
                      <button
                        onClick={() => revisar(resposta.id)}
                        className="btn-primary text-xs disabled:opacity-60"
                        disabled={reviewMutation.isPending}
                      >
                        {isReviewing ? 'Salvando...' : resposta.revisado_por_professor ? 'Atualizar revisao' : 'Salvar revisao'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

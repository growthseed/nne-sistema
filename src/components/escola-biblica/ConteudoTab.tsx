import { useEffect, useMemo, useState } from 'react'
import { toastSuccess, toastError } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { trackError } from '@/lib/observability'
import {
  useEbModulos,
  useEbPonto,
  useEbPontos,
  useCreatePonto,
  useDeletePonto,
  useUpdateModulo,
  useUpdatePonto,
  type CompromissoFe,
  type ConteudoBloco,
  type ModuloEB,
  type OpcaoEB,
  type PerguntaEB,
  type PontoEB,
  type ReferenciaEB,
  type Secao,
  type SubSecao,
} from '@/hooks/useEscolaBiblicaConteudo'
import {
  HiOutlineBookOpen,
  HiOutlinePlus,
  HiOutlineX,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineSearch,
  HiOutlinePhotograph,
  HiOutlinePlay,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineStar,
  HiOutlineRefresh,
  HiOutlineChevronLeft,
} from 'react-icons/hi'

function genId() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2)
}

// =============================================
// RENDER SEÃ‡Ã•ES (conteÃºdo estruturado)
// =============================================


function RenderSecoes({ secoes }: { secoes: Secao[] }) {
  if (!secoes || secoes.length === 0) return null
  return (
    <div className="space-y-6">
      {secoes.map((secao, i) => (
        <div key={secao.id || i}>
          {secao.titulo && (
            <h3 className="text-base font-bold text-primary-800 mb-3 border-b border-primary-200 pb-2">
              {secao.titulo}
            </h3>
          )}
          <RenderConteudo blocos={secao.conteudo} />
          {secao.subSecoes && secao.subSecoes.length > 0 && (
            <div className="ml-4 mt-4 space-y-4">
              {secao.subSecoes.map((sub, j) => (
                <div key={sub.id || j} className="border-l-2 border-primary-300 pl-4">
                  <h4 className="text-sm font-bold text-primary-700 mb-2">{sub.titulo}</h4>
                  <RenderConteudo blocos={sub.conteudo} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RenderConteudo({ blocos }: { blocos: ConteudoBloco[] }) {
  if (!blocos) return null
  return (
    <div className="space-y-3">
      {blocos.map((bloco, i) => {
        switch (bloco.tipo) {
          case 'paragrafo':
            return <p key={i} className="text-sm text-gray-700 leading-relaxed">{bloco.texto}</p>
          case 'destaque':
            return (
              <div key={i} className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                <p className="text-sm text-amber-900 italic leading-relaxed">{bloco.texto}</p>
              </div>
            )
          case 'subtitulo_lista':
            return <p key={i} className="text-sm font-semibold text-gray-800 mt-2">{bloco.texto}</p>
          case 'lista_bullets':
            return (
              <ul key={i} className="list-disc list-inside space-y-1 ml-2">
                {(bloco.itens || []).map((item, j) => (
                  <li key={j} className="text-sm text-gray-700">{item}</li>
                ))}
              </ul>
            )
          case 'lista_numerada':
            return (
              <ol key={i} className="list-decimal list-inside space-y-1 ml-2">
                {(bloco.itens || []).map((item, j) => (
                  <li key={j} className="text-sm text-gray-700">{item}</li>
                ))}
              </ol>
            )
          default:
            return <p key={i} className="text-sm text-gray-600">{bloco.texto}</p>
        }
      })}
    </div>
  )
}


function TabConteudo({ canEdit }: { canEdit: boolean }) {
  const [selectedModulo, setSelectedModulo] = useState<string>('principios_fe')
  const [selectedPontoId, setSelectedPontoId] = useState<string | null>(null)
  const [selectedPonto, setSelectedPonto] = useState<PontoEB | null>(null)
  const [editing, setEditing] = useState(false)
  const [editingModulo, setEditingModulo] = useState<ModuloEB | null>(null)
  const [search, setSearch] = useState('')
  const [showNovoPonto, setShowNovoPonto] = useState(false)
  const [novoPonto, setNovoPonto] = useState({ titulo: '', subtitulo: '' })
  const { modulos, loading: loadingModulos, refetch: refetchModulos } = useEbModulos()
  const { pontos, loading: loadingPontos, error: pontosError, refetch: refetchPontos } = useEbPontos(selectedModulo)
  const { ponto: pontoDetalhe, loading: loadingPonto, error: pontoError, refetch: refetchPonto } = useEbPonto(selectedPontoId)
  const updatePontoMutation = useUpdatePonto()
  const updateModuloMutation = useUpdateModulo()
  const createPontoMutation = useCreatePonto()
  const deletePontoMutation = useDeletePonto()
  const loading = loadingModulos || loadingPontos

  useEffect(() => {
    setSelectedPonto(null)
    setSelectedPontoId(null)
    setEditing(false)
  }, [selectedModulo])

  useEffect(() => {
    if (pontoDetalhe) {
      setSelectedPonto(pontoDetalhe)
    }
  }, [pontoDetalhe])

  async function savePonto() {
    if (!selectedPonto) return
    const { id, created_at, updated_at, ...rest } = selectedPonto as any
    try {
      await updatePontoMutation.mutateAsync({ id, data: rest })
      setEditing(false)
    } catch (error) {
      trackError(error, { context: 'eb_salvar_ponto', ponto_id: selectedPonto?.id })
      toastError('Nao foi possivel salvar o ponto agora.')
    }
  }

  async function saveModulo() {
    if (!editingModulo) return
    const { created_at, updated_at, ...rest } = editingModulo as any
    try {
      await updateModuloMutation.mutateAsync({ id: editingModulo.id, data: rest })
      setEditingModulo(null)
    } catch (error) {
      trackError(error, { context: 'eb_salvar_modulo', modulo_id: editingModulo?.id })
      toastError('Nao foi possivel salvar o modulo agora.')
    }
  }

  async function criarPonto() {
    if (!novoPonto.titulo.trim()) return
    const nextNum = pontos.length > 0 ? Math.max(...pontos.map(p => p.ponto_numero)) + 1 : 1
    try {
      await createPontoMutation.mutateAsync({
        data: {
          modulo_id: selectedModulo,
          ponto_numero: nextNum,
          titulo: novoPonto.titulo,
          subtitulo: novoPonto.subtitulo || null,
          secoes: [],
          perguntas: [],
          compromissos_fe: [],
        },
      })
      setShowNovoPonto(false)
      setNovoPonto({ titulo: '', subtitulo: '' })
    } catch (error) {
      trackError(error, { context: 'eb_criar_ponto' })
      toastError('Nao foi possivel criar o ponto agora.')
    }
  }

  async function deletePonto(id: string) {
    if (!confirm('Excluir este ponto? Esta aÃ§Ã£o nÃ£o pode ser desfeita.')) return
    try {
      await deletePontoMutation.mutateAsync({ id, moduloId: selectedModulo })
      setSelectedPonto(null)
    } catch (error) {
      trackError(error, { context: 'eb_excluir_ponto', ponto_id: id })
      toastError('Nao foi possivel excluir o ponto agora.')
    }
  }

  // Editar pergunta
  function addPergunta() {
    if (!selectedPonto) return
    const num = (selectedPonto.perguntas?.length || 0) + 1
    setSelectedPonto({
      ...selectedPonto,
      perguntas: [...(selectedPonto.perguntas || []), {
        id: genId(), numero: num, texto: '', opcoes: [
          { id: 'a', texto: '' }, { id: 'b', texto: '' },
          { id: 'c', texto: '' }, { id: 'd', texto: '' },
        ],
        resposta_correta: 'a', explicacao: '', referencias: [],
      }],
    })
  }

  function updatePergunta(idx: number, field: string, value: any) {
    if (!selectedPonto) return
    const perguntas = [...selectedPonto.perguntas]
    ;(perguntas[idx] as any)[field] = value
    setSelectedPonto({ ...selectedPonto, perguntas })
  }

  function updateOpcao(pIdx: number, oIdx: number, texto: string) {
    if (!selectedPonto) return
    const perguntas = [...selectedPonto.perguntas]
    perguntas[pIdx].opcoes[oIdx].texto = texto
    setSelectedPonto({ ...selectedPonto, perguntas })
  }

  function removePergunta(idx: number) {
    if (!selectedPonto) return
    const perguntas = selectedPonto.perguntas.filter((_, i) => i !== idx)
    setSelectedPonto({ ...selectedPonto, perguntas })
  }

  function addCompromisso() {
    if (!selectedPonto) return
    setSelectedPonto({
      ...selectedPonto,
      compromissos_fe: [...(selectedPonto.compromissos_fe || []), { id: genId(), texto: '' }],
    })
  }

  const filteredPontos = pontos.filter(p =>
    !search || p.titulo.toLowerCase().includes(search.toLowerCase()) ||
    String(p.ponto_numero).includes(search)
  )

  const currentModulo = modulos.find(m => m.id === selectedModulo)

  // ---- DETAIL VIEW ----
  if (selectedPonto) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedPonto(null); setSelectedPontoId(null); setEditing(false) }}
          className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1">
          <HiOutlineChevronLeft className="w-4 h-4" /> Voltar aos pontos
        </button>

        {/* Header do ponto (imagem como background) */}
        <div className="relative overflow-hidden rounded-2xl min-h-[180px] text-white"
          style={selectedPonto.imagem_url ? { backgroundImage: `url(${selectedPonto.imagem_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          <div className={`absolute inset-0 ${selectedPonto.imagem_url ? 'bg-gradient-to-r from-black/70 via-black/50 to-black/30' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`} />
          <div className="relative p-6">
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-4xl font-black">
            {selectedPonto.ponto_numero}
          </div>
          <div className="pr-24">
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">
              {currentModulo?.titulo} â€¢ Ponto {selectedPonto.ponto_numero}
            </p>
            {editing ? (
              <input value={selectedPonto.titulo}
                onChange={e => setSelectedPonto({ ...selectedPonto, titulo: e.target.value })}
                className="bg-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 w-full text-lg font-bold" />
            ) : (
              <h2 className="text-xl font-bold">{selectedPonto.titulo}</h2>
            )}
            {selectedPonto.subtitulo && !editing && (
              <p className="text-blue-200 mt-1">{selectedPonto.subtitulo}</p>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2 mt-4">
              {editing ? (
                <>
                  <button onClick={savePonto} className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-blue-50">
                    <HiOutlineCheck className="w-4 h-4" /> Salvar
                  </button>
                  <button onClick={() => {
                    setEditing(false)
                    if (pontoDetalhe) {
                      setSelectedPonto(pontoDetalhe)
                    } else {
                      void refetchPonto()
                    }
                  }}
                    className="bg-white/20 px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 hover:bg-white/30">
                    <HiOutlineX className="w-4 h-4" /> Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)}
                    className="bg-white/20 px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 hover:bg-white/30">
                    <HiOutlinePencil className="w-4 h-4" /> Editar
                  </button>
                  <button onClick={() => deletePonto(selectedPonto.id)}
                    className="bg-red-500/30 px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 hover:bg-red-500/50">
                    <HiOutlineTrash className="w-4 h-4" /> Excluir
                  </button>
                </>
              )}
            </div>
          )}
          </div>{/* close relative p-6 */}
        </div>

        {/* Imagem separada removida â€” agora Ã© background do header */}
        {selectedPonto.imagem_url && !editing && false && (
          <div className="rounded-xl overflow-hidden">
            <img src={selectedPonto.imagem_url} alt={selectedPonto.titulo} className="w-full h-48 object-cover" />
          </div>
        )}

        {/* VÃ­deo embed (sempre visÃ­vel) */}
        {selectedPonto.video_url && !editing && (
          <div className="rounded-xl overflow-hidden shadow-sm">
            {(() => {
              const url = selectedPonto.video_url || ''
              let embedId = ''
              if (url.includes('youtu.be/')) embedId = url.split('youtu.be/')[1]?.split('?')[0] || ''
              else if (url.includes('youtube.com/watch')) embedId = new URL(url).searchParams.get('v') || ''
              else if (url.includes('youtube.com/embed/')) embedId = url.split('embed/')[1]?.split('?')[0] || ''
              if (embedId) {
                return (
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${embedId}?rel=0&modestbranding=1`}
                      title="VÃ­deo da aula"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full rounded-xl"
                    />
                  </div>
                )
              }
              return (
                <div className="card p-4">
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-800">
                    <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <HiOutlinePlay className="w-5 h-5" />
                    </div>
                    Assistir vÃ­deo da aula
                  </a>
                </div>
              )
            })()}
          </div>
        )}

        {/* MÃ­dia (modo ediÃ§Ã£o) */}
        {editing && (
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <HiOutlinePhotograph className="w-4 h-4" /> MÃ­dia
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">URL da Imagem</label>
                <input value={selectedPonto.imagem_url || ''} onChange={e => setSelectedPonto({ ...selectedPonto, imagem_url: e.target.value })}
                  className="input-field text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-gray-500">URL do VÃ­deo (YouTube)</label>
                <input value={selectedPonto.video_url || ''} onChange={e => setSelectedPonto({ ...selectedPonto, video_url: e.target.value })}
                  className="input-field text-sm" placeholder="https://youtube.com/..." />
              </div>
            </div>
            {selectedPonto.imagem_url && (
              <img src={selectedPonto.imagem_url} alt="" className="h-32 rounded-lg object-cover" />
            )}
          </div>
        )}

        {/* ConteÃºdo / IntroduÃ§Ã£o */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <HiOutlineDocumentText className="w-4 h-4" /> ConteÃºdo
          </h3>
          {selectedPonto.secoes && selectedPonto.secoes.length > 0 ? (
            <RenderSecoes secoes={selectedPonto.secoes} />
          ) : editing ? (
            <textarea value={selectedPonto.introducao || ''}
              onChange={e => setSelectedPonto({ ...selectedPonto, introducao: e.target.value })}
              className="input-field text-sm min-h-[120px]" placeholder="Texto introdutÃ³rio do ponto..." />
          ) : selectedPonto.introducao ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedPonto.introducao}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Nenhum conteÃºdo adicionado</p>
          )}
        </div>

        {/* QuestionÃ¡rio */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <HiOutlineClipboardCheck className="w-4 h-4" /> QuestionÃ¡rio
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {selectedPonto.perguntas?.length || 0} perguntas
              </span>
            </h3>
            {editing && (
              <button onClick={addPergunta} className="btn-primary text-xs flex items-center gap-1">
                <HiOutlinePlus className="w-3.5 h-3.5" /> Pergunta
              </button>
            )}
          </div>

          {(!selectedPonto.perguntas || selectedPonto.perguntas.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma pergunta cadastrada</p>
          ) : (
            <div className="space-y-4">
              {selectedPonto.perguntas.map((p, idx) => (
                <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:border-primary-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editing ? (
                        <div className="space-y-2">
                          <textarea value={p.texto} onChange={e => updatePergunta(idx, 'texto', e.target.value)}
                            className="input-field text-sm" placeholder="Texto da pergunta..." rows={2} />
                          <div className="grid grid-cols-2 gap-2">
                            {p.opcoes.map((o, oi) => (
                              <div key={o.id} className="flex items-center gap-2">
                                <button onClick={() => updatePergunta(idx, 'resposta_correta', o.id)}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                                    p.resposta_correta === o.id
                                      ? 'bg-green-500 text-white'
                                      : 'bg-gray-100 text-gray-500 hover:bg-green-100'
                                  }`}>
                                  {o.id.toUpperCase()}
                                </button>
                                <input value={o.texto} onChange={e => updateOpcao(idx, oi, e.target.value)}
                                  className="input-field text-xs flex-1" placeholder={`OpÃ§Ã£o ${o.id.toUpperCase()}`} />
                              </div>
                            ))}
                          </div>
                          <textarea value={p.explicacao} onChange={e => updatePergunta(idx, 'explicacao', e.target.value)}
                            className="input-field text-xs" placeholder="ExplicaÃ§Ã£o da resposta..." rows={2} />
                          <button onClick={() => removePergunta(idx)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                            <HiOutlineTrash className="w-3 h-3" /> Remover pergunta
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-800">{p.texto}</p>
                          <div className="grid grid-cols-2 gap-1.5 mt-2">
                            {p.opcoes.map(o => (
                              <div key={o.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                                p.resposta_correta === o.id
                                  ? 'bg-green-50 text-green-700 font-medium border border-green-200'
                                  : 'bg-gray-50 text-gray-600'
                              }`}>
                                <span className={`w-5 h-5 rounded text-center text-[10px] font-bold leading-5 ${
                                  p.resposta_correta === o.id ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                }`}>
                                  {o.id.toUpperCase()}
                                </span>
                                {o.texto || 'â€”'}
                              </div>
                            ))}
                          </div>
                          {p.explicacao && (
                            <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                              <p className="text-xs text-blue-700">{p.explicacao}</p>
                            </div>
                          )}
                          {p.referencias && p.referencias.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {p.referencias.map((r, ri) => (
                                <p key={ri} className="text-[10px] text-gray-500 italic">
                                  ðŸ“– {r.texto}: "{r.conteudo}"
                                </p>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compromissos de FÃ© */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <HiOutlineStar className="w-4 h-4" /> Compromissos de FÃ©
            </h3>
            {editing && (
              <button onClick={addCompromisso} className="btn-primary text-xs flex items-center gap-1">
                <HiOutlinePlus className="w-3.5 h-3.5" /> Adicionar
              </button>
            )}
          </div>
          {(!selectedPonto.compromissos_fe || selectedPonto.compromissos_fe.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum compromisso cadastrado</p>
          ) : (
            <div className="space-y-2">
              {selectedPonto.compromissos_fe.map((c, i) => (
                <div key={c.id} className="flex items-start gap-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 mt-0.5">
                    <HiOutlineCheck className="w-3.5 h-3.5" />
                  </div>
                  {editing ? (
                    <input value={c.texto}
                      onChange={e => {
                        const arr = [...selectedPonto.compromissos_fe]
                        arr[i] = { ...arr[i], texto: e.target.value }
                        setSelectedPonto({ ...selectedPonto, compromissos_fe: arr })
                      }}
                      className="input-field text-sm flex-1" placeholder="Texto do compromisso..." />
                  ) : (
                    <p className="text-sm text-gray-700">{c.texto}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- LIST VIEW ----
  return (
    <div className="space-y-4">
      {/* MÃ³dulos selector */}
      <div className="grid grid-cols-2 gap-3">
        {modulos.map(m => (
          <button key={m.id} onClick={() => setSelectedModulo(m.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedModulo === m.id
                ? 'border-primary-500 bg-primary-50 shadow-sm'
                : 'border-gray-200 hover:border-primary-300 bg-white'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800 text-sm">{m.titulo}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.subtitulo}</p>
              </div>
              <div className={`text-xl font-black ${selectedModulo === m.id ? 'text-primary-600' : 'text-gray-300'}`}>
                {m.total_pontos}
              </div>
            </div>
            {canEdit && selectedModulo === m.id && (
              <button onClick={(e) => { e.stopPropagation(); setEditingModulo(m) }}
                className="mt-2 text-[10px] text-primary-600 hover:underline flex items-center gap-1">
                <HiOutlinePencil className="w-3 h-3" /> Editar mÃ³dulo
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Editar mÃ³dulo inline */}
      {editingModulo && (
        <div className="card p-4 space-y-3 border-primary-200">
          <h4 className="text-sm font-semibold text-gray-700">Editar MÃ³dulo</h4>
          <input value={editingModulo.titulo} onChange={e => setEditingModulo({ ...editingModulo, titulo: e.target.value })}
            className="input-field text-sm" placeholder="TÃ­tulo" />
          <input value={editingModulo.subtitulo || ''} onChange={e => setEditingModulo({ ...editingModulo, subtitulo: e.target.value })}
            className="input-field text-sm" placeholder="SubtÃ­tulo" />
          <textarea value={editingModulo.descricao || ''} onChange={e => setEditingModulo({ ...editingModulo, descricao: e.target.value })}
            className="input-field text-sm" placeholder="DescriÃ§Ã£o" rows={2} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingModulo(null)} className="btn-secondary text-xs">Cancelar</button>
            <button onClick={saveModulo} className="btn-primary text-xs">Salvar</button>
          </div>
        </div>
      )}

      {/* Search + Actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 text-sm" placeholder="Buscar ponto..." />
        </div>
        {canEdit && (
          <button onClick={() => setShowNovoPonto(!showNovoPonto)}
            className="btn-primary text-sm flex items-center gap-1.5 whitespace-nowrap">
            <HiOutlinePlus className="w-4 h-4" /> Novo Ponto
          </button>
        )}
      </div>

      {/* Criar ponto */}
      {showNovoPonto && (
        <div className="card p-4 space-y-3 border-blue-200">
          <input value={novoPonto.titulo} onChange={e => setNovoPonto({ ...novoPonto, titulo: e.target.value })}
            className="input-field text-sm" placeholder="TÃ­tulo do ponto (ex: A BÃ­blia Sagrada)" autoFocus />
          <input value={novoPonto.subtitulo} onChange={e => setNovoPonto({ ...novoPonto, subtitulo: e.target.value })}
            className="input-field text-sm" placeholder="SubtÃ­tulo (opcional)" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNovoPonto(false)} className="btn-secondary text-xs">Cancelar</button>
            <button onClick={criarPonto} className="btn-primary text-xs" disabled={!novoPonto.titulo.trim()}>Criar Ponto</button>
          </div>
        </div>
      )}

      {pontosError && (
        <div className="card border border-red-200 bg-red-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Nao foi possivel carregar os pontos.</p>
              <p className="text-xs text-red-600 mt-1">{pontosError}</p>
            </div>
            <button onClick={() => refetchPontos()} className="btn-secondary text-sm w-fit">
              Tentar novamente
            </button>
          </div>
        </div>
      )}
      {pontoError && selectedPontoId && (
        <div className="card border border-red-200 bg-red-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Nao foi possivel carregar o ponto selecionado.</p>
              <p className="text-xs text-red-600 mt-1">{pontoError}</p>
            </div>
            <button onClick={() => refetchPonto()} className="btn-secondary text-sm w-fit">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Lista de pontos */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filteredPontos.length === 0 ? (
        <div className="card py-12 text-center">
          <HiOutlineBookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{search ? 'Nenhum ponto encontrado' : 'Nenhum ponto cadastrado neste mÃ³dulo'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredPontos.map(p => (
            <button key={p.id} onClick={() => setSelectedPontoId(p.id)}
              className="w-full card px-4 py-3 flex items-center gap-4 hover:shadow-md hover:border-primary-200 transition-all text-left">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {p.ponto_numero}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.titulo}</p>
                {p.subtitulo && <p className="text-xs text-gray-400 truncate">{p.subtitulo}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {(p.perguntas?.length || 0) > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">
                    {p.perguntas.length} perguntas
                  </span>
                )}
                {(p.secoes?.length || 0) > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">
                    ConteÃºdo
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// =============================================

export default TabConteudo

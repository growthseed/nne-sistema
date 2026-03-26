import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  HiOutlineBookOpen, HiOutlineUserGroup, HiOutlineAcademicCap,
  HiOutlinePlus, HiOutlineX, HiOutlinePencil, HiOutlineTrash,
  HiOutlineCheck, HiOutlineSearch, HiOutlineChevronDown,
  HiOutlineChevronUp, HiOutlineClipboardCheck, HiOutlineLink,
  HiOutlinePhotograph, HiOutlinePlay, HiOutlineLockOpen,
  HiOutlineLockClosed, HiOutlineDocumentText, HiOutlineEye,
  HiOutlineStar, HiOutlineRefresh, HiOutlineChevronLeft,
  HiOutlineChat,
} from 'react-icons/hi'

// =============================================
// TIPOS
// =============================================

interface ModuloEB {
  id: string; titulo: string; subtitulo: string | null; descricao: string | null
  capa_url: string | null; total_pontos: number; tipo: string; ativo: boolean
}

interface PontoEB {
  id: string; modulo_id: string; ponto_numero: number; titulo: string
  subtitulo: string | null; introducao: string | null; imagem_url: string | null
  video_url: string | null; secoes: any[]; perguntas: PerguntaEB[]
  compromissos_fe: CompromissoFe[]
}

interface PerguntaEB {
  id: string; numero: number; texto: string; opcoes: OpcaoEB[]
  resposta_correta: string; explicacao: string; referencias: ReferenciaEB[]
}

interface OpcaoEB { id: string; texto: string }
interface ReferenciaEB { texto: string; livro: string; capitulo: number; versiculo: string; conteudo: string }
interface CompromissoFe { id: string; texto: string }

interface ConteudoBloco { tipo: string; texto?: string; itens?: string[] }
interface Secao { id: string; titulo: string | null; tipo: string; conteudo: ConteudoBloco[]; subSecoes?: SubSecao[] }
interface SubSecao { id: string; titulo: string; tipo: string; conteudo: ConteudoBloco[] }

interface TurmaEB {
  id: string; nome: string; status: string; total_licoes: number; total_alunos: number
  modulo_id: string | null; modulo_titulo: string | null; instrutor_nome: string | null
  data_inicio: string | null; formato_typeform: boolean
  igreja: { nome: string } | { nome: string }[] | null
  _alunos_count?: number; _aulas_count?: number
}

interface AlunoEB {
  id: string; pessoa_id: string; status: string; licoes_concluidas: number
  decisao_batismo: boolean; data_decisao: string | null
  pessoa: { nome: string; celular: string | null } | { nome: string; celular: string | null }[] | null
}

interface AulaEB {
  id: string; ponto_numero: number; ponto_titulo: string | null
  professor_nome: string | null; data_aula: string; ativada: boolean
  questionario_liberado: boolean; questionario_liberado_em: string | null
}

interface RespostaEB {
  id: string; aluno_nome: string | null; ponto_numero: number; ponto_titulo: string | null
  pontuacao: number; total_perguntas: number; percentual_acerto: number
  submetido_em: string; revisado_por_professor: boolean; professor_comentario: string | null
  respostas: Record<string, string>; compromissos: Record<string, boolean>
}

type TabType = 'conteudo' | 'turmas' | 'respostas'

// =============================================
// HELPERS
// =============================================

function isMaster(papel: string) {
  return ['admin', 'admin_uniao'].includes(papel)
}

function canManage(papel: string) {
  return ['admin', 'admin_uniao', 'admin_associacao', 'secretario_igreja', 'diretor_es', 'professor_es'].includes(papel)
}

function formatDate(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('pt-BR')
  } catch { return d }
}

function genId() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2)
}

// =============================================
// RENDER SEÇÕES (conteúdo estruturado)
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

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

export default function EscolaBiblicaPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('conteudo')
  const userPapel = profile?.papel || 'membro'
  const master = isMaster(userPapel)
  const manager = canManage(userPapel)

  const tabs: { id: TabType; label: string; icon: any; visible: boolean }[] = [
    { id: 'conteudo', label: 'Conteúdo', icon: HiOutlineBookOpen, visible: true },
    { id: 'turmas', label: 'Turmas & Alunos', icon: HiOutlineUserGroup, visible: manager },
    { id: 'respostas', label: 'Respostas', icon: HiOutlineClipboardCheck, visible: manager },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header premium */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-500 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTR2LTJoNHptMC0zMHYyaC00VjRoNHpNNiAzNHYySDJ2LTJoNHptMC0zMHYySDJWNGg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <HiOutlineAcademicCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Escola Bíblica</h1>
              <p className="text-white/80 text-sm">
                {master ? 'Gerencie módulos, conteúdo e turmas' : 'Gerencie turmas e acompanhe alunos'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.filter(t => t.visible).map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'conteudo' && <TabConteudo canEdit={master} />}
      {activeTab === 'turmas' && manager && <TabTurmas />}
      {activeTab === 'respostas' && manager && <TabRespostas />}
    </div>
  )
}

// =============================================
// TAB 1: CONTEÚDO (Módulos + Pontos)
// =============================================

function TabConteudo({ canEdit }: { canEdit: boolean }) {
  const [modulos, setModulos] = useState<ModuloEB[]>([])
  const [selectedModulo, setSelectedModulo] = useState<string>('principios_fe')
  const [pontos, setPontos] = useState<PontoEB[]>([])
  const [selectedPonto, setSelectedPonto] = useState<PontoEB | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPonto, setLoadingPonto] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingModulo, setEditingModulo] = useState<ModuloEB | null>(null)
  const [search, setSearch] = useState('')
  const [showNovoPonto, setShowNovoPonto] = useState(false)
  const [novoPonto, setNovoPonto] = useState({ titulo: '', subtitulo: '' })

  useEffect(() => { loadModulos() }, [])
  useEffect(() => { setSelectedPonto(null); setEditing(false); loadPontos() }, [selectedModulo])

  async function loadModulos() {
    const { data } = await supabase.from('eb_modulos').select('*').eq('ativo', true)
    setModulos(data || [])
  }

  async function loadPontos() {
    setLoading(true)
    const { data } = await supabase
      .from('eb_pontos')
      .select('*')
      .eq('modulo_id', selectedModulo)
      .order('ponto_numero')
    setPontos(data || [])
    setLoading(false)
  }

  async function loadPonto(id: string) {
    setLoadingPonto(true)
    const { data } = await supabase.from('eb_pontos').select('*').eq('id', id).single()
    if (data) setSelectedPonto(data)
    setLoadingPonto(false)
  }

  async function savePonto() {
    if (!selectedPonto) return
    const { id, created_at, updated_at, ...rest } = selectedPonto as any
    await supabase.from('eb_pontos').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
    setEditing(false)
    loadPontos()
  }

  async function saveModulo() {
    if (!editingModulo) return
    const { created_at, updated_at, ...rest } = editingModulo as any
    await supabase.from('eb_modulos').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', editingModulo.id)
    setEditingModulo(null)
    loadModulos()
  }

  async function criarPonto() {
    if (!novoPonto.titulo.trim()) return
    const nextNum = pontos.length > 0 ? Math.max(...pontos.map(p => p.ponto_numero)) + 1 : 1
    await supabase.from('eb_pontos').insert({
      modulo_id: selectedModulo,
      ponto_numero: nextNum,
      titulo: novoPonto.titulo,
      subtitulo: novoPonto.subtitulo || null,
      secoes: [],
      perguntas: [],
      compromissos_fe: [],
    })
    setShowNovoPonto(false)
    setNovoPonto({ titulo: '', subtitulo: '' })
    loadPontos()
  }

  async function deletePonto(id: string) {
    if (!confirm('Excluir este ponto? Esta ação não pode ser desfeita.')) return
    await supabase.from('eb_pontos').delete().eq('id', id)
    setSelectedPonto(null)
    loadPontos()
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
        <button onClick={() => { setSelectedPonto(null); setEditing(false) }}
          className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1">
          <HiOutlineChevronLeft className="w-4 h-4" /> Voltar aos pontos
        </button>

        {/* Header do ponto */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-4xl font-black">
            {selectedPonto.ponto_numero}
          </div>
          <div className="pr-24">
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">
              {currentModulo?.titulo} • Ponto {selectedPonto.ponto_numero}
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
                  <button onClick={() => { setEditing(false); loadPonto(selectedPonto.id) }}
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
        </div>

        {/* Imagem do ponto (sempre visível) */}
        {selectedPonto.imagem_url && !editing && (
          <div className="rounded-xl overflow-hidden">
            <img src={selectedPonto.imagem_url} alt={selectedPonto.titulo} className="w-full h-48 object-cover" />
          </div>
        )}

        {/* Vídeo embed (sempre visível) */}
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
                      title="Vídeo da aula"
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
                    Assistir vídeo da aula
                  </a>
                </div>
              )
            })()}
          </div>
        )}

        {/* Mídia (modo edição) */}
        {editing && (
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <HiOutlinePhotograph className="w-4 h-4" /> Mídia
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">URL da Imagem</label>
                <input value={selectedPonto.imagem_url || ''} onChange={e => setSelectedPonto({ ...selectedPonto, imagem_url: e.target.value })}
                  className="input-field text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-gray-500">URL do Vídeo (YouTube)</label>
                <input value={selectedPonto.video_url || ''} onChange={e => setSelectedPonto({ ...selectedPonto, video_url: e.target.value })}
                  className="input-field text-sm" placeholder="https://youtube.com/..." />
              </div>
            </div>
            {selectedPonto.imagem_url && (
              <img src={selectedPonto.imagem_url} alt="" className="h-32 rounded-lg object-cover" />
            )}
          </div>
        )}

        {/* Conteúdo / Introdução */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <HiOutlineDocumentText className="w-4 h-4" /> Conteúdo
          </h3>
          {selectedPonto.secoes && selectedPonto.secoes.length > 0 ? (
            <RenderSecoes secoes={selectedPonto.secoes} />
          ) : editing ? (
            <textarea value={selectedPonto.introducao || ''}
              onChange={e => setSelectedPonto({ ...selectedPonto, introducao: e.target.value })}
              className="input-field text-sm min-h-[120px]" placeholder="Texto introdutório do ponto..." />
          ) : selectedPonto.introducao ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedPonto.introducao}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Nenhum conteúdo adicionado</p>
          )}
        </div>

        {/* Questionário */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <HiOutlineClipboardCheck className="w-4 h-4" /> Questionário
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
                                  className="input-field text-xs flex-1" placeholder={`Opção ${o.id.toUpperCase()}`} />
                              </div>
                            ))}
                          </div>
                          <textarea value={p.explicacao} onChange={e => updatePergunta(idx, 'explicacao', e.target.value)}
                            className="input-field text-xs" placeholder="Explicação da resposta..." rows={2} />
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
                                {o.texto || '—'}
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
                                  📖 {r.texto}: "{r.conteudo}"
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

        {/* Compromissos de Fé */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <HiOutlineStar className="w-4 h-4" /> Compromissos de Fé
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
      {/* Módulos selector */}
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
                <HiOutlinePencil className="w-3 h-3" /> Editar módulo
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Editar módulo inline */}
      {editingModulo && (
        <div className="card p-4 space-y-3 border-primary-200">
          <h4 className="text-sm font-semibold text-gray-700">Editar Módulo</h4>
          <input value={editingModulo.titulo} onChange={e => setEditingModulo({ ...editingModulo, titulo: e.target.value })}
            className="input-field text-sm" placeholder="Título" />
          <input value={editingModulo.subtitulo || ''} onChange={e => setEditingModulo({ ...editingModulo, subtitulo: e.target.value })}
            className="input-field text-sm" placeholder="Subtítulo" />
          <textarea value={editingModulo.descricao || ''} onChange={e => setEditingModulo({ ...editingModulo, descricao: e.target.value })}
            className="input-field text-sm" placeholder="Descrição" rows={2} />
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
            className="input-field text-sm" placeholder="Título do ponto (ex: A Bíblia Sagrada)" autoFocus />
          <input value={novoPonto.subtitulo} onChange={e => setNovoPonto({ ...novoPonto, subtitulo: e.target.value })}
            className="input-field text-sm" placeholder="Subtítulo (opcional)" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNovoPonto(false)} className="btn-secondary text-xs">Cancelar</button>
            <button onClick={criarPonto} className="btn-primary text-xs" disabled={!novoPonto.titulo.trim()}>Criar Ponto</button>
          </div>
        </div>
      )}

      {/* Lista de pontos */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filteredPontos.length === 0 ? (
        <div className="card py-12 text-center">
          <HiOutlineBookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{search ? 'Nenhum ponto encontrado' : 'Nenhum ponto cadastrado neste módulo'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredPontos.map(p => (
            <button key={p.id} onClick={() => loadPonto(p.id)}
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
                    Conteúdo
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
// TAB 2: TURMAS & ALUNOS
// =============================================

function TabTurmas() {
  const { profile } = useAuth()
  const [turmas, setTurmas] = useState<TurmaEB[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTurma, setSelectedTurma] = useState<TurmaEB | null>(null)
  const [alunos, setAlunos] = useState<AlunoEB[]>([])
  const [aulas, setAulas] = useState<AulaEB[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Create turma
  const [showNova, setShowNova] = useState(false)
  const [novaTurma, setNovaTurma] = useState({ nome: '', modulo_id: 'principios_fe' as string, data_inicio: '' })

  // Add student
  const [showAddAluno, setShowAddAluno] = useState(false)
  const [alunoSearch, setAlunoSearch] = useState('')
  const [alunoResults, setAlunoResults] = useState<{ id: string; nome: string }[]>([])
  const [searchingAluno, setSearchingAluno] = useState(false)

  // Create new student (interessado)
  const [showNovoAluno, setShowNovoAluno] = useState(false)
  const [novoAluno, setNovoAluno] = useState({ nome: '', celular: '', email: '', tipo: 'interessado' })

  // Activate lesson
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [novaAula, setNovaAula] = useState({ ponto_numero: 0, ponto_titulo: '', presentes: [] as string[] })
  const [pontosDisponiveis, setPontosDisponiveis] = useState<{ ponto_numero: number; titulo: string }[]>([])

  const [detailTab, setDetailTab] = useState<'alunos' | 'aulas' | 'interacoes'>('alunos')

  // Professor interactions
  interface Interacao { id: string; aluno_id: string; tipo: string; descricao: string | null; pedido_oracao: boolean; data_interacao: string; professor_nome: string | null }
  const [interacoes, setInteracoes] = useState<Interacao[]>([])
  const [showNovaInteracao, setShowNovaInteracao] = useState<string | null>(null) // aluno_id
  const [interacaoForm, setInteracaoForm] = useState({ tipo: 'visita', descricao: '', pedido_oracao: false })

  useEffect(() => { if (profile) loadTurmas() }, [profile])

  async function loadTurmas() {
    setLoading(true)
    let query = supabase
      .from('classes_biblicas')
      .select('id, nome, status, total_licoes, total_alunos, modulo_id, modulo_titulo, instrutor_nome, data_inicio, formato_typeform, igreja:igrejas(nome)')
      .order('created_at', { ascending: false })

    if (profile!.papel !== 'admin') {
      query = query.eq('igreja_id', profile!.igreja_id!)
    }

    const { data } = await query
    setTurmas(data || [])
    setLoading(false)
  }

  async function criarTurma() {
    if (!novaTurma.nome.trim() || !profile) return
    const moduloTitulos: Record<string, string> = {
      principios_fe: 'Princípios de Fé',
      crencas_fundamentais: 'Crenças Fundamentais',
    }
    const moduloPontos: Record<string, number> = { principios_fe: 37, crencas_fundamentais: 25 }
    await supabase.from('classes_biblicas').insert({
      nome: novaTurma.nome,
      igreja_id: profile.igreja_id,
      instrutor_id: profile.id,
      instrutor_nome: profile.nome || null,
      data_inicio: novaTurma.data_inicio || null,
      total_licoes: moduloPontos[novaTurma.modulo_id] || 37,
      modulo_id: novaTurma.modulo_id,
      modulo_titulo: moduloTitulos[novaTurma.modulo_id] || null,
      formato_typeform: novaTurma.modulo_id === 'crencas_fundamentais',
      associacao_id: profile.associacao_id || null,
      uniao_id: profile.uniao_id || null,
    })
    setShowNova(false)
    setNovaTurma({ nome: '', modulo_id: 'principios_fe', data_inicio: '' })
    loadTurmas()
  }

  async function openTurma(turma: TurmaEB) {
    setSelectedTurma(turma)
    setLoadingDetail(true)
    setDetailTab('alunos')
    const [alunosRes, aulasRes] = await Promise.all([
      supabase.from('classe_biblica_alunos')
        .select('id, pessoa_id, status, licoes_concluidas, decisao_batismo, data_decisao, pessoa:pessoas(nome, celular)')
        .eq('classe_id', turma.id).order('created_at'),
      supabase.from('classe_biblica_aulas')
        .select('*').eq('classe_id', turma.id).order('ponto_numero'),
    ])
    setAlunos(alunosRes.data || [])
    setAulas(aulasRes.data || [])

    // Load interactions
    const { data: interacoesData } = await supabase
      .from('eb_interacoes')
      .select('*')
      .eq('classe_id', turma.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setInteracoes(interacoesData || [])

    // Load available pontos from eb_pontos for this module
    if (turma.modulo_id) {
      const { data: pontos } = await supabase
        .from('eb_pontos')
        .select('ponto_numero, titulo')
        .eq('modulo_id', turma.modulo_id)
        .order('ponto_numero')
      const aulasNums = new Set((aulasRes.data || []).map(a => a.ponto_numero))
      setPontosDisponiveis((pontos || []).filter(p => !aulasNums.has(p.ponto_numero)))
    }

    setLoadingDetail(false)
  }

  async function searchAlunos(q: string) {
    setAlunoSearch(q)
    if (q.length < 2) { setAlunoResults([]); return }
    setSearchingAluno(true)
    let query = supabase.from('pessoas').select('id, nome').ilike('nome', `%${q}%`).limit(10)
    if (profile!.igreja_id) query = query.eq('igreja_id', profile!.igreja_id)
    const { data } = await query
    const enrolled = new Set(alunos.map(a => a.pessoa_id))
    setAlunoResults((data || []).filter(p => !enrolled.has(p.id)))
    setSearchingAluno(false)
  }

  async function addAluno(pessoaId: string) {
    if (!selectedTurma) return
    await supabase.from('classe_biblica_alunos').insert({ classe_id: selectedTurma.id, pessoa_id: pessoaId })
    await supabase.from('pessoas').update({ etapa_funil: 'classe_biblica' }).eq('id', pessoaId)
    setShowAddAluno(false)
    setAlunoSearch('')
    setAlunoResults([])
    openTurma(selectedTurma)
  }

  async function criarNovoAluno() {
    if (!novoAluno.nome.trim() || !selectedTurma || !profile) return
    // Criar pessoa primeiro
    const { data: novaPessoa, error } = await supabase.from('pessoas').insert({
      nome: novoAluno.nome,
      celular: novoAluno.celular || null,
      email: novoAluno.email || null,
      tipo: novoAluno.tipo,
      situacao: 'ativo',
      etapa_funil: 'classe_biblica',
      igreja_id: profile.igreja_id,
      associacao_id: profile.associacao_id,
      uniao_id: profile.uniao_id,
    }).select('id').single()
    if (error || !novaPessoa) { console.error(error); return }
    // Matricular na turma
    await supabase.from('classe_biblica_alunos').insert({ classe_id: selectedTurma.id, pessoa_id: novaPessoa.id })
    setShowNovoAluno(false)
    setNovoAluno({ nome: '', celular: '', email: '', tipo: 'interessado' })
    openTurma(selectedTurma)
  }

  async function removeAluno(alunoId: string) {
    if (!selectedTurma || !confirm('Remover este aluno da turma?')) return
    await supabase.from('classe_biblica_alunos').delete().eq('id', alunoId)
    openTurma(selectedTurma)
  }

  async function toggleDecisao(a: AlunoEB) {
    await supabase.from('classe_biblica_alunos').update({
      decisao_batismo: !a.decisao_batismo,
      data_decisao: !a.decisao_batismo ? new Date().toISOString().slice(0, 10) : null,
    }).eq('id', a.id)
    if (!a.decisao_batismo) await supabase.from('pessoas').update({ etapa_funil: 'decisao' }).eq('id', a.pessoa_id)
    if (selectedTurma) openTurma(selectedTurma)
  }

  async function ativarAula() {
    if (!selectedTurma || !profile) return
    const { data, error } = await supabase.from('classe_biblica_aulas').insert({
      classe_id: selectedTurma.id,
      ponto_numero: novaAula.ponto_numero,
      ponto_titulo: novaAula.ponto_titulo || `Ponto ${novaAula.ponto_numero}`,
      professor_id: profile.id,
      professor_nome: profile.nome || null,
      data_aula: new Date().toISOString(),
      ativada: true,
      ativada_em: new Date().toISOString(),
    }).select().single()
    if (error || !data) return
    // Presença
    if (novaAula.presentes.length > 0) {
      const rows = alunos.map(a => ({
        aula_id: data.id, aluno_id: a.id,
        aluno_nome: getNome(a), presente: novaAula.presentes.includes(a.pessoa_id),
        registrado_por: profile.id,
      }))
      await supabase.from('classe_biblica_aula_presenca').insert(rows)
    }
    setShowNovaAula(false)
    setNovaAula({ ponto_numero: novaAula.ponto_numero + 1, ponto_titulo: '', presentes: [] })
    openTurma(selectedTurma)
  }

  async function liberarQuestionario(aulaId: string) {
    await supabase.from('classe_biblica_aulas').update({
      questionario_liberado: true,
      questionario_liberado_em: new Date().toISOString(),
      questionario_liberado_por: profile?.id,
    }).eq('id', aulaId)
    if (selectedTurma) openTurma(selectedTurma)
  }

  async function registrarInteracao(alunoId: string) {
    if (!selectedTurma || !profile || !interacaoForm.tipo) return
    const { error } = await supabase.from('eb_interacoes').insert({
      classe_id: selectedTurma.id,
      aluno_id: alunoId,
      professor_id: profile.id,
      professor_nome: profile.nome || null,
      tipo: interacaoForm.tipo,
      descricao: interacaoForm.descricao || null,
      pedido_oracao: interacaoForm.pedido_oracao,
    })
    if (error) { alert('Erro ao registrar interação.'); return }
    setShowNovaInteracao(null)
    setInteracaoForm({ tipo: 'visita', descricao: '', pedido_oracao: false })
    openTurma(selectedTurma)
  }

  function openWhatsApp(celular: string | null, nomeAluno: string) {
    if (!celular) { alert('Este aluno não possui celular cadastrado.'); return }
    const num = celular.replace(/\D/g, '')
    const msg = encodeURIComponent(`Olá ${nomeAluno}, tudo bem? Estou entrando em contato sobre a Escola Bíblica.`)
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank')
  }

  function getNome(a: AlunoEB) {
    return Array.isArray(a.pessoa) ? a.pessoa[0]?.nome || '—' : (a.pessoa as any)?.nome || '—'
  }

  function getCelular(a: AlunoEB) {
    return Array.isArray(a.pessoa) ? a.pessoa[0]?.celular : (a.pessoa as any)?.celular
  }

  function copyLink(turmaId: string) {
    const url = `${window.location.origin}/eb/${turmaId}`
    navigator.clipboard.writeText(url)
    alert('Link copiado! Envie para os alunos.')
  }

  const statusColors: Record<string, string> = {
    ativa: 'bg-green-100 text-green-700',
    concluida: 'bg-blue-100 text-blue-700',
    cancelada: 'bg-red-100 text-red-700',
  }

  // ---- DETAIL VIEW ----
  if (selectedTurma) {
    const igrejaNome = Array.isArray(selectedTurma.igreja) ? selectedTurma.igreja[0]?.nome : (selectedTurma.igreja as any)?.nome
    const decisoes = alunos.filter(a => a.decisao_batismo).length

    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedTurma(null)} className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1">
          <HiOutlineChevronLeft className="w-4 h-4" /> Voltar às turmas
        </button>

        {/* Turma Header */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{selectedTurma.nome}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {igrejaNome}{selectedTurma.data_inicio && ` • Início: ${formatDate(selectedTurma.data_inicio)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[selectedTurma.status] || 'bg-gray-100 text-gray-600'}`}>
                {selectedTurma.status}
              </span>
              {selectedTurma.modulo_id && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                  {selectedTurma.modulo_id === 'principios_fe' ? 'PF' : 'CF'}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { v: alunos.length, l: 'Alunos', c: 'text-gray-700' },
              { v: decisoes, l: 'Decisões', c: 'text-green-600' },
              { v: aulas.length, l: 'Aulas', c: 'text-blue-600' },
              { v: aulas.filter(a => a.questionario_liberado).length, l: 'Questionários', c: 'text-purple-600' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                <p className="text-[10px] text-gray-400">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Link para alunos */}
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => copyLink(selectedTurma.id)}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-50 text-primary-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors">
              <HiOutlineLink className="w-4 h-4" />
              Copiar Link para Alunos
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[
            { id: 'alunos' as const, label: 'Alunos', icon: HiOutlineUserGroup },
            { id: 'aulas' as const, label: 'Aulas', icon: HiOutlineAcademicCap },
            { id: 'interacoes' as const, label: `Interações (${interacoes.length})`, icon: HiOutlineClipboardCheck },
          ].map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setDetailTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                  detailTab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500'
                }`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab: Alunos */}
        {detailTab === 'alunos' && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Alunos Matriculados</h3>
              <div className="flex gap-2">
                <button onClick={() => { setShowNovoAluno(!showNovoAluno); setShowAddAluno(false) }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <HiOutlinePlus className="w-3.5 h-3.5" /> Novo Interessado
                </button>
                <button onClick={() => { setShowAddAluno(!showAddAluno); setShowNovoAluno(false) }}
                  className="btn-primary text-xs flex items-center gap-1">
                  <HiOutlinePlus className="w-3.5 h-3.5" /> Existente
                </button>
              </div>
            </div>

            {/* Criar novo interessado */}
            {showNovoAluno && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <p className="text-xs font-semibold text-emerald-700">Cadastrar Novo Interessado</p>
                <input value={novoAluno.nome} onChange={e => setNovoAluno({ ...novoAluno, nome: e.target.value })}
                  className="input-field text-sm" placeholder="Nome completo *" autoFocus />
                <div className="grid grid-cols-2 gap-2">
                  <input value={novoAluno.celular} onChange={e => setNovoAluno({ ...novoAluno, celular: e.target.value })}
                    className="input-field text-sm" placeholder="Celular" />
                  <input value={novoAluno.email} onChange={e => setNovoAluno({ ...novoAluno, email: e.target.value })}
                    className="input-field text-sm" placeholder="E-mail" />
                </div>
                <select value={novoAluno.tipo} onChange={e => setNovoAluno({ ...novoAluno, tipo: e.target.value })}
                  className="input-field text-sm">
                  <option value="interessado">Interessado</option>
                  <option value="membro">Membro</option>
                  <option value="visitante">Visitante</option>
                </select>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNovoAluno(false)} className="btn-secondary text-xs">Cancelar</button>
                  <button onClick={criarNovoAluno} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg"
                    disabled={!novoAluno.nome.trim()}>Cadastrar e Matricular</button>
                </div>
              </div>
            )}

            {/* Buscar existente */}
            {showAddAluno && (
              <div className="p-3 bg-gray-50 rounded-xl space-y-2">
                <div className="relative">
                  <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input value={alunoSearch} onChange={e => searchAlunos(e.target.value)}
                    className="input-field pl-10 text-sm" placeholder="Buscar pessoa por nome..." autoFocus />
                </div>
                {searchingAluno && <p className="text-xs text-gray-400">Buscando...</p>}
                {alunoResults.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {alunoResults.map(p => (
                      <button key={p.id} onClick={() => addAluno(p.id)}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-primary-50 text-gray-700">
                        {p.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lista */}
            {loadingDetail ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : alunos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum aluno matriculado</p>
            ) : (
              <div className="space-y-1">
                {alunos.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {getNome(a).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{getNome(a)}</p>
                      <p className="text-[10px] text-gray-400">
                        {a.licoes_concluidas} lições
                        {getCelular(a) && ` • ${getCelular(a)}`}
                      </p>
                    </div>
                    <button onClick={() => toggleDecisao(a)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        a.decisao_batismo
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-400 hover:border-green-300'
                      }`}>
                      <HiOutlineCheck className="w-3.5 h-3.5 inline mr-0.5" />
                      {a.decisao_batismo ? 'Decisão ✓' : 'Batismo?'}
                    </button>
                    <button onClick={() => removeAluno(a.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Aulas */}
        {detailTab === 'aulas' && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Aulas Ativadas</h3>
              <button onClick={() => { setShowNovaAula(!showNovaAula); setNovaAula(prev => ({ ...prev, presentes: [] })) }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                disabled={alunos.length === 0}>
                <HiOutlinePlus className="w-3.5 h-3.5" /> Ativar Aula
              </button>
            </div>

            {showNovaAula && alunos.length > 0 && (
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Selecione o ponto doutrinário</label>
                  {pontosDisponiveis.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">Todos os pontos já foram ativados nesta turma.</p>
                  ) : (
                    <select
                      value={novaAula.ponto_numero}
                      onChange={e => {
                        const num = parseInt(e.target.value)
                        const ponto = pontosDisponiveis.find(p => p.ponto_numero === num)
                        setNovaAula(prev => ({ ...prev, ponto_numero: num, ponto_titulo: ponto?.titulo || '' }))
                      }}
                      className="input-field text-sm"
                    >
                      <option value={0}>Selecione um ponto...</option>
                      {pontosDisponiveis.map(p => (
                        <option key={p.ponto_numero} value={p.ponto_numero}>
                          Ponto {p.ponto_numero} — {p.titulo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-gray-400">Presença</label>
                    <button onClick={() => setNovaAula(prev => ({
                      ...prev, presentes: prev.presentes.length === alunos.length ? [] : alunos.map(a => a.pessoa_id),
                    }))} className="text-[10px] text-blue-600 hover:underline">
                      {novaAula.presentes.length === alunos.length ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {alunos.map(a => (
                      <label key={a.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white cursor-pointer">
                        <input type="checkbox" checked={novaAula.presentes.includes(a.pessoa_id)}
                          onChange={() => setNovaAula(prev => ({
                            ...prev, presentes: prev.presentes.includes(a.pessoa_id)
                              ? prev.presentes.filter(id => id !== a.pessoa_id)
                              : [...prev.presentes, a.pessoa_id],
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">{getNome(a)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{novaAula.presentes.length} de {alunos.length} presentes</span>
                  <div className="flex gap-2">
                    <button onClick={() => setShowNovaAula(false)} className="btn-secondary text-xs">Cancelar</button>
                    <button onClick={ativarAula} disabled={novaAula.ponto_numero === 0} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">Ativar</button>
                  </div>
                </div>
              </div>
            )}

            {aulas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma aula ativada</p>
            ) : (
              <div className="space-y-1.5">
                {aulas.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {a.ponto_numero}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{a.ponto_titulo || `Ponto ${a.ponto_numero}`}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(a.data_aula)}</p>
                    </div>
                    {a.questionario_liberado ? (
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                        <HiOutlineLockOpen className="w-3 h-3" /> Liberado
                      </span>
                    ) : (
                      <button onClick={() => liberarQuestionario(a.id)}
                        className="text-[10px] px-2.5 py-1 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 flex items-center gap-1">
                        <HiOutlineLockClosed className="w-3 h-3" /> Liberar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Interações do Professor */}
        {detailTab === 'interacoes' && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Registro de Interações</h3>
              <span className="text-xs text-gray-400">{interacoes.length} registros</span>
            </div>

            {/* Ações rápidas por aluno */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Selecione um aluno para registrar uma ação:</p>
              {alunos.map(a => {
                const nome = getNome(a)
                const cel = getCelular(a)
                const alunoInteracoes = interacoes.filter(i => i.aluno_id === a.id)
                const isOpen = showNovaInteracao === a.id

                return (
                  <div key={a.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 py-3 px-4 hover:bg-gray-50">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {nome.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{nome}</p>
                        <p className="text-[10px] text-gray-400">{alunoInteracoes.length} interações</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {cel && (
                          <button onClick={() => openWhatsApp(cel, nome)}
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors" title="WhatsApp">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.612l4.458-1.495A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.347 0-4.516-.803-6.235-2.15l-.436-.345-2.632.882.882-2.632-.345-.436A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                          </button>
                        )}
                        <button onClick={() => setShowNovaInteracao(isOpen ? null : a.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isOpen ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'}`}>
                          {isOpen ? 'Fechar' : 'Registrar'}
                        </button>
                      </div>
                    </div>

                    {/* Formulário de interação */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 space-y-3">
                        <div className="flex gap-2">
                          {[
                            { id: 'visita', label: 'Visita', emoji: '🏠' },
                            { id: 'ligacao', label: 'Ligação', emoji: '📞' },
                            { id: 'mensagem', label: 'Mensagem', emoji: '💬' },
                            { id: 'oracao', label: 'Oração', emoji: '🙏' },
                          ].map(t => (
                            <button key={t.id} onClick={() => setInteracaoForm(prev => ({ ...prev, tipo: t.id }))}
                              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                                interacaoForm.tipo === t.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}>
                              {t.emoji} {t.label}
                            </button>
                          ))}
                        </div>
                        <textarea value={interacaoForm.descricao}
                          onChange={e => setInteracaoForm(prev => ({ ...prev, descricao: e.target.value }))}
                          className="input-field text-sm min-h-[60px]" placeholder="Descreva a interação (opcional)..." />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={interacaoForm.pedido_oracao}
                              onChange={e => setInteracaoForm(prev => ({ ...prev, pedido_oracao: e.target.checked }))}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <span className="text-xs text-gray-600">Pedido de oração</span>
                          </label>
                          <button onClick={() => registrarInteracao(a.id)}
                            className="bg-primary-600 hover:bg-primary-700 text-white text-xs px-4 py-2 rounded-lg transition-colors">
                            Salvar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Histórico rápido do aluno */}
                    {alunoInteracoes.length > 0 && !isOpen && (
                      <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
                        {alunoInteracoes.slice(0, 5).map(i => (
                          <span key={i.id} className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {i.tipo === 'visita' ? '🏠' : i.tipo === 'ligacao' ? '📞' : i.tipo === 'mensagem' ? '💬' : '🙏'}
                            {' '}{formatDate(i.data_interacao)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Histórico geral */}
            {interacoes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2 mt-4">Histórico Completo</h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {interacoes.map(i => {
                    const aluno = alunos.find(a => a.id === i.aluno_id)
                    const nomeAluno = aluno ? getNome(aluno) : '—'
                    return (
                      <div key={i.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 text-xs">
                        <span className="text-lg shrink-0">
                          {i.tipo === 'visita' ? '🏠' : i.tipo === 'ligacao' ? '📞' : i.tipo === 'mensagem' ? '💬' : '🙏'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700">
                            <span className="text-primary-600">{i.professor_nome || 'Professor'}</span>
                            {' → '}
                            <span>{nomeAluno}</span>
                          </p>
                          {i.descricao && <p className="text-gray-500 mt-0.5">{i.descricao}</p>}
                          {i.pedido_oracao && <span className="text-[10px] text-amber-600">Pedido de oração</span>}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{formatDate(i.data_interacao)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ---- LIST VIEW ----
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Turmas</h2>
          <p className="text-xs text-gray-500">Gerencie suas turmas de estudo bíblico</p>
        </div>
        <button onClick={() => setShowNova(!showNova)} className="btn-primary text-sm flex items-center gap-1.5">
          <HiOutlinePlus className="w-4 h-4" /> Nova Turma
        </button>
      </div>

      {showNova && (
        <div className="card p-5 space-y-4 border-primary-200">
          <h3 className="text-sm font-semibold text-gray-700">Criar Nova Turma</h3>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setNovaTurma(p => ({ ...p, modulo_id: 'principios_fe' }))}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                novaTurma.modulo_id === 'principios_fe' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}>
              <p className="text-sm font-semibold text-gray-800">Princípios de Fé</p>
              <p className="text-xs text-gray-500">37 pontos doutrinários</p>
            </button>
            <button type="button" onClick={() => setNovaTurma(p => ({ ...p, modulo_id: 'crencas_fundamentais' }))}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                novaTurma.modulo_id === 'crencas_fundamentais' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}>
              <p className="text-sm font-semibold text-gray-800">Crenças Fundamentais</p>
              <p className="text-xs text-gray-500">25 temas essenciais</p>
            </button>
          </div>
          <input value={novaTurma.nome} onChange={e => setNovaTurma(p => ({ ...p, nome: e.target.value }))}
            className="input-field" placeholder="Nome da turma (ex: Turma Sábado Manhã - Central)" autoFocus />
          <div>
            <label className="text-xs text-gray-500">Data de início</label>
            <input type="date" value={novaTurma.data_inicio}
              onChange={e => setNovaTurma(p => ({ ...p, data_inicio: e.target.value }))}
              className="input-field" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNova(false)} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={criarTurma} className="btn-primary text-sm" disabled={!novaTurma.nome.trim()}>Criar Turma</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-primary-600">{turmas.filter(t => t.status === 'ativa').length}</p>
          <p className="text-xs text-gray-500">Ativas</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-gray-600">{turmas.reduce((s, t) => s + (t.total_alunos || 0), 0)}</p>
          <p className="text-xs text-gray-500">Alunos Total</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{turmas.filter(t => t.status === 'concluida').length}</p>
          <p className="text-xs text-gray-500">Concluídas</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : turmas.length === 0 ? (
        <div className="card py-12 text-center">
          <HiOutlineAcademicCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma turma criada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {turmas.map(t => {
            const igNome = Array.isArray(t.igreja) ? t.igreja[0]?.nome : (t.igreja as any)?.nome
            return (
              <button key={t.id} onClick={() => openTurma(t)}
                className="w-full card px-5 py-4 hover:shadow-md hover:border-primary-200 transition-all text-left">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-800">{t.nome}</h3>
                      {t.modulo_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                          {t.modulo_id === 'principios_fe' ? 'PF' : 'CF'}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[t.status]}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {igNome}{t.instrutor_nome && ` • Prof. ${t.instrutor_nome}`}
                      {t.data_inicio && ` • ${formatDate(t.data_inicio)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-gray-700">{t.total_alunos || 0}</p>
                    <p className="text-[10px] text-gray-400">alunos</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =============================================
// TAB 3: RESPOSTAS
// =============================================

function TabRespostas() {
  const { profile } = useAuth()
  const [turmas, setTurmas] = useState<{ id: string; nome: string }[]>([])
  const [selectedTurmaId, setSelectedTurmaId] = useState('')
  const [respostas, setRespostas] = useState<RespostaEB[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadTurmas() }, [profile])

  async function loadTurmas() {
    let q = supabase.from('classes_biblicas').select('id, nome').eq('status', 'ativa').order('nome')
    if (profile!.papel !== 'admin') q = q.eq('igreja_id', profile!.igreja_id!)
    const { data } = await q
    setTurmas(data || [])
  }

  async function loadRespostas(turmaId: string) {
    setSelectedTurmaId(turmaId)
    if (!turmaId) { setRespostas([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('classe_biblica_respostas')
      .select('*')
      .eq('classe_id', turmaId)
      .order('submetido_em', { ascending: false })
    setRespostas(data || [])
    setLoading(false)
  }

  async function revisar(id: string, comentario: string) {
    await supabase.from('classe_biblica_respostas').update({
      revisado_por_professor: true,
      professor_comentario: comentario,
    }).eq('id', id)
    loadRespostas(selectedTurmaId)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Respostas dos Alunos</h2>
        <p className="text-xs text-gray-500">Acompanhe o desempenho e revise as respostas</p>
      </div>

      <select value={selectedTurmaId} onChange={e => loadRespostas(e.target.value)} className="input-field">
        <option value="">Selecione uma turma...</option>
        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
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
      ) : (
        <div className="space-y-2">
          {respostas.map(r => {
            const pct = r.percentual_acerto
            const color = pct >= 70 ? 'text-green-600 bg-green-50' : pct >= 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
            return (
              <div key={r.id} className="card px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {(r.aluno_nome || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{r.aluno_nome}</p>
                    <p className="text-xs text-gray-400">Ponto {r.ponto_numero}: {r.ponto_titulo}</p>
                  </div>
                  <div className={`text-center px-3 py-1 rounded-lg ${color}`}>
                    <p className="text-lg font-bold">{r.pontuacao}/{r.total_perguntas}</p>
                    <p className="text-[10px]">{Math.round(pct)}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="text-gray-400">{formatDate(r.submetido_em)}</span>
                  {r.revisado_por_professor ? (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Revisado</span>
                  ) : (
                    <button onClick={() => {
                      const c = prompt('Comentário para o aluno (opcional):')
                      if (c !== null) revisar(r.id, c)
                    }} className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200">
                      Revisar
                    </button>
                  )}
                  {r.professor_comentario && (
                    <span className="text-gray-500 flex items-center gap-1">
                      <HiOutlineChat className="w-3 h-3" /> {r.professor_comentario}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineChatAlt2, HiOutlinePlus, HiOutlineChevronLeft,
  HiOutlineReply, HiOutlineClock, HiOutlineUser,
  HiOutlineTag, HiOutlineThumbUp, HiOutlineLockClosed,
  HiOutlineX,
} from 'react-icons/hi'

interface Topico {
  id: string; titulo: string; conteudo: string; autor_id: string; autor_nome: string
  autor_foto: string | null; categoria: string; fixado: boolean; fechado: boolean
  total_respostas: number; ultima_atividade: string; created_at: string
}

interface Resposta {
  id: string; topico_id: string; autor_id: string; autor_nome: string
  autor_foto: string | null; conteudo: string; curtidas: number; created_at: string
}

interface UserInfo {
  id: string; nome: string; email: string; foto: string | null
}

const CATEGORIAS = [
  { id: 'geral', label: 'Geral', color: 'bg-gray-100 text-gray-600' },
  { id: 'principios_fe', label: 'Princípios de Fé', color: 'bg-blue-100 text-blue-700' },
  { id: 'crencas', label: 'Crenças Fundamentais', color: 'bg-purple-100 text-purple-700' },
  { id: 'testemunho', label: 'Testemunho', color: 'bg-green-100 text-green-700' },
  { id: 'duvida', label: 'Dúvida', color: 'bg-amber-100 text-amber-700' },
  { id: 'oracao', label: 'Pedido de Oração', color: 'bg-rose-100 text-rose-700' },
]

export default function PortalForumPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [topicos, setTopicos] = useState<Topico[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('todos')

  // New topic
  const [showNovoTopico, setShowNovoTopico] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novoConteudo, setNovoConteudo] = useState('')
  const [novoCategoria, setNovoCategoria] = useState('geral')
  const [criando, setCriando] = useState(false)

  // Topic detail
  const [selectedTopico, setSelectedTopico] = useState<Topico | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [novaResposta, setNovaResposta] = useState('')
  const [loadingRespostas, setLoadingRespostas] = useState(false)
  const [respondendo, setRespondendo] = useState(false)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/portal/login', { replace: true }); return }
    const u = session.user
    // Get profile photo
    const { data: perfil } = await supabase.from('eb_perfis_aluno').select('foto_url').eq('id', u.id).single()
    setUser({
      id: u.id, nome: u.user_metadata?.nome || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Aluno',
      email: u.email || '', foto: perfil?.foto_url || u.user_metadata?.avatar_url || null,
    })
    loadTopicos()
  }

  async function loadTopicos() {
    setLoading(true)
    const { data } = await supabase
      .from('eb_forum_topicos')
      .select('*')
      .order('fixado', { ascending: false })
      .order('ultima_atividade', { ascending: false })
      .limit(50)
    setTopicos(data || [])
    setLoading(false)
  }

  async function criarTopico() {
    if (!novoTitulo.trim() || !novoConteudo.trim() || !user) return
    setCriando(true)
    await supabase.from('eb_forum_topicos').insert({
      titulo: novoTitulo.trim(),
      conteudo: novoConteudo.trim(),
      autor_id: user.id,
      autor_nome: user.nome,
      autor_foto: user.foto,
      autor_email: user.email,
      categoria: novoCategoria,
    })
    setShowNovoTopico(false)
    setNovoTitulo('')
    setNovoConteudo('')
    setNovoCategoria('geral')
    setCriando(false)
    loadTopicos()
  }

  async function openTopico(t: Topico) {
    setSelectedTopico(t)
    setLoadingRespostas(true)
    const { data } = await supabase
      .from('eb_forum_respostas')
      .select('*')
      .eq('topico_id', t.id)
      .order('created_at')
    setRespostas(data || [])
    setLoadingRespostas(false)
  }

  async function enviarResposta() {
    if (!novaResposta.trim() || !selectedTopico || !user) return
    setRespondendo(true)
    await supabase.from('eb_forum_respostas').insert({
      topico_id: selectedTopico.id,
      autor_id: user.id,
      autor_nome: user.nome,
      autor_foto: user.foto,
      conteudo: novaResposta.trim(),
    })
    // Update topic counts
    await supabase.from('eb_forum_topicos').update({
      total_respostas: (selectedTopico.total_respostas || 0) + 1,
      ultima_atividade: new Date().toISOString(),
    }).eq('id', selectedTopico.id)

    setNovaResposta('')
    setRespondendo(false)
    openTopico({ ...selectedTopico, total_respostas: (selectedTopico.total_respostas || 0) + 1 })
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d`
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const getCatInfo = (id: string) => CATEGORIAS.find(c => c.id === id) || CATEGORIAS[0]

  const filteredTopicos = filtroCategoria === 'todos'
    ? topicos
    : topicos.filter(t => t.categoria === filtroCategoria)

  // ===== TOPIC DETAIL =====
  if (selectedTopico) {
    const cat = getCatInfo(selectedTopico.categoria)
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <button onClick={() => setSelectedTopico(null)} className="text-sm text-gray-500 hover:text-green-600 flex items-center gap-1">
            <HiOutlineChevronLeft className="w-4 h-4" /> Voltar ao fórum
          </button>

          {/* Topic */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-3">
              <Avatar nome={selectedTopico.autor_nome} foto={selectedTopico.autor_foto} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                  {selectedTopico.fixado && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Fixado</span>}
                  {selectedTopico.fechado && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Fechado</span>}
                </div>
                <h1 className="text-lg font-bold text-gray-900">{selectedTopico.titulo}</h1>
                <p className="text-xs text-gray-400 mt-1">
                  por <span className="font-medium text-gray-600">{selectedTopico.autor_nome}</span> · {timeAgo(selectedTopico.created_at)}
                </p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTopico.conteudo}</div>
          </div>

          {/* Replies */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700">{respostas.length} resposta{respostas.length !== 1 ? 's' : ''}</h3>

            {loadingRespostas ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : respostas.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <HiOutlineChatAlt2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma resposta ainda. Seja o primeiro!</p>
              </div>
            ) : (
              respostas.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start gap-3">
                    <Avatar nome={r.autor_nome} foto={r.autor_foto} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{r.autor_nome}</span>
                        <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1.5 leading-relaxed whitespace-pre-wrap">{r.conteudo}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply input */}
          {!selectedTopico.fechado && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <textarea value={novaResposta} onChange={e => setNovaResposta(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none min-h-[80px]"
                placeholder="Escreva sua resposta..." />
              <div className="flex justify-end mt-2">
                <button onClick={enviarResposta} disabled={respondendo || !novaResposta.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40">
                  {respondendo ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineReply className="w-4 h-4" />}
                  Responder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== FORUM LIST =====
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <button onClick={() => navigate('/portal')} className="text-sm text-gray-500 hover:text-green-600 flex items-center gap-1">
          <HiOutlineChevronLeft className="w-4 h-4" /> Voltar ao portal
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Comunidade</h1>
            <p className="text-sm text-gray-500">Compartilhe, pergunte e aprenda com outros alunos</p>
          </div>
          <button onClick={() => setShowNovoTopico(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-green-600/20">
            <HiOutlinePlus className="w-4 h-4" /> Novo Tópico
          </button>
        </div>

        {/* Categories filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setFiltroCategoria('todos')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtroCategoria === 'todos' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>Todos</button>
          {CATEGORIAS.map(c => (
            <button key={c.id} onClick={() => setFiltroCategoria(c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtroCategoria === c.id ? 'bg-green-600 text-white' : `${c.color} hover:opacity-80`
              }`}>{c.label}</button>
          ))}
        </div>

        {/* New topic modal */}
        {showNovoTopico && (
          <div className="bg-white rounded-2xl border border-green-200 shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Novo Tópico</h3>
              <button onClick={() => setShowNovoTopico(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <select value={novoCategoria} onChange={e => setNovoCategoria(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none">
              {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none"
              placeholder="Título do tópico" />
            <textarea value={novoConteudo} onChange={e => setNovoConteudo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none min-h-[100px]"
              placeholder="Compartilhe sua pergunta, reflexão ou testemunho..." />
            <div className="flex justify-end">
              <button onClick={criarTopico} disabled={criando || !novoTitulo.trim() || !novoConteudo.trim()}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40">
                {criando ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        )}

        {/* Topics list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}</div>
        ) : filteredTopicos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <HiOutlineChatAlt2 className="w-14 h-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum tópico{filtroCategoria !== 'todos' ? ' nesta categoria' : ''}</p>
            <p className="text-xs text-gray-400 mt-1">Seja o primeiro a iniciar uma conversa!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTopicos.map(t => {
              const cat = getCatInfo(t.categoria)
              return (
                <button key={t.id} onClick={() => openTopico(t)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition-all text-left">
                  <div className="flex items-start gap-3">
                    <Avatar nome={t.autor_nome} foto={t.autor_foto} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
                        {t.fixado && <span className="text-[10px] text-green-600 font-medium">Fixado</span>}
                        {t.fechado && <HiOutlineLockClosed className="w-3 h-3 text-gray-400" />}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{t.titulo}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.conteudo}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span>{t.autor_nome}</span>
                        <span className="flex items-center gap-0.5"><HiOutlineChatAlt2 className="w-3 h-3" /> {t.total_respostas}</span>
                        <span className="flex items-center gap-0.5"><HiOutlineClock className="w-3 h-3" /> {timeAgo(t.ultima_atividade)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== Avatar Component =====
function Avatar({ nome, foto, size = 'md' }: { nome: string; foto: string | null; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return foto ? (
    <img src={foto} alt="" className={`${s} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${s} rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold shrink-0`}>
      {nome.charAt(0).toUpperCase()}
    </div>
  )
}

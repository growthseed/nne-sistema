import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineAcademicCap, HiOutlineBookOpen, HiOutlineLogout,
  HiOutlineChevronRight, HiOutlineTrendingUp, HiOutlineBell,
  HiOutlineStar, HiOutlineClipboardCheck, HiOutlineChatAlt2,
  HiOutlinePaperAirplane, HiOutlineChevronLeft,
} from 'react-icons/hi'

// =============================================
// TYPES
// =============================================

interface MinhaClasse {
  id: string; classe_id: string; licoes_concluidas: number; decisao_batismo: boolean
  pessoa_id: string
  classe: {
    id: string; nome: string; modulo_id: string | null; modulo_titulo: string | null
    total_licoes: number; instrutor_nome: string | null; status: string
    igreja: { nome: string } | { nome: string }[] | null
  } | null
}

interface UserInfo {
  id: string; email: string; nome: string; avatar: string | null
}

interface Mensagem {
  id: string; autor_nome: string; autor_tipo: string; mensagem: string; created_at: string
}

type PageView = 'dashboard' | 'turma-chat'

// =============================================
// COMPONENT
// =============================================

export default function PortalDashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [classes, setClasses] = useState<MinhaClasse[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalAulas: 0, totalRespostas: 0, mediaAcerto: 0 })

  // Chat
  const [pageView, setPageView] = useState<PageView>('dashboard')
  const [chatTurma, setChatTurma] = useState<MinhaClasse | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novaMensagem, setNovaMensagem] = useState('')
  const [loadingChat, setLoadingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/portal/login', { replace: true }); return }

    const u = session.user
    setUser({
      id: u.id,
      email: u.email || '',
      nome: u.user_metadata?.nome || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Aluno',
      avatar: u.user_metadata?.avatar_url || null,
    })

    // Find pessoa linked to this email
    const { data: pessoa } = await supabase
      .from('pessoas')
      .select('id')
      .eq('email', u.email!)
      .limit(1)
      .single()

    if (pessoa) {
      const { data: matriculas } = await supabase
        .from('classe_biblica_alunos')
        .select(`
          id, classe_id, licoes_concluidas, decisao_batismo, pessoa_id,
          classe:classes_biblicas(id, nome, modulo_id, modulo_titulo, total_licoes, instrutor_nome, status, igreja:igrejas(nome))
        `)
        .eq('pessoa_id', pessoa.id)

      setClasses(matriculas || [])

      const { data: respostas } = await supabase
        .from('classe_biblica_respostas')
        .select('percentual_acerto')
        .eq('aluno_id', pessoa.id)

      if (respostas && respostas.length > 0) {
        const media = respostas.reduce((s, r) => s + Number(r.percentual_acerto), 0) / respostas.length
        setStats({
          totalAulas: (matriculas || []).reduce((s, m) => s + m.licoes_concluidas, 0),
          totalRespostas: respostas.length,
          mediaAcerto: Math.round(media),
        })
      }
    }
    setLoading(false)
  }

  async function openChat(m: MinhaClasse) {
    setChatTurma(m)
    setPageView('turma-chat')
    setLoadingChat(true)
    const { data } = await supabase
      .from('eb_mensagens')
      .select('*')
      .eq('classe_id', m.classe_id)
      .order('created_at', { ascending: true })
      .limit(100)
    setMensagens(data || [])
    setLoadingChat(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function enviarMensagem() {
    if (!novaMensagem.trim() || !chatTurma || !user) return
    const { error } = await supabase.from('eb_mensagens').insert({
      classe_id: chatTurma.classe_id,
      autor_nome: user.nome,
      autor_email: user.email,
      autor_tipo: 'aluno',
      mensagem: novaMensagem.trim(),
    })
    if (!error) {
      setNovaMensagem('')
      openChat(chatTurma)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/portal/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    )
  }

  const initial = user?.nome?.charAt(0).toUpperCase() || 'A'

  // ===== TOP NAV (shared) =====
  const TopNav = () => (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/portal" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-800 hidden sm:block">Escola Bíblica</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <button onClick={() => setPageView('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pageView === 'dashboard' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>Início</button>
            <Link to="/portal/forum"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              Comunidade
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <HiOutlineBell className="w-5 h-5" />
          </button>
          <Link to="/portal/perfil" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border-2 border-green-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                {initial}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.nome?.split(' ')[0]}</span>
          </Link>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sair">
            <HiOutlineLogout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )

  // ===== CHAT VIEW =====
  if (pageView === 'turma-chat' && chatTurma) {
    const c = chatTurma.classe as any
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TopNav />
        <div className="max-w-3xl mx-auto w-full px-4 py-4 flex-1 flex flex-col">
          <button onClick={() => setPageView('dashboard')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 mb-3">
            <HiOutlineChevronLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
            {/* Chat Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-800">{c?.nome || 'Turma'}</h2>
                <p className="text-xs text-gray-400">{c?.instrutor_nome && `Prof. ${c.instrutor_nome}`}</p>
              </div>
              <Link to={`/eb/${chatTurma.classe_id}`}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                Ir para aulas <HiOutlineChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px] max-h-[60vh]">
              {loadingChat ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin" />
                </div>
              ) : mensagens.length === 0 ? (
                <div className="text-center py-12">
                  <HiOutlineChatAlt2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-gray-300">Seja o primeiro a escrever!</p>
                </div>
              ) : (
                mensagens.map(m => {
                  const isMe = m.autor_nome === user?.nome
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                        {!isMe && (
                          <p className="text-[10px] text-gray-400 mb-0.5 ml-1">
                            {m.autor_nome}
                            {m.autor_tipo === 'professor' && <span className="ml-1 text-green-600 font-medium">Professor</span>}
                          </p>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                          isMe
                            ? 'bg-green-600 text-white rounded-br-md'
                            : m.autor_tipo === 'professor'
                              ? 'bg-blue-50 text-gray-800 border border-blue-100 rounded-bl-md'
                              : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}>
                          {m.mensagem}
                        </div>
                        <p className={`text-[9px] text-gray-300 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                          {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input value={novaMensagem}
                  onChange={e => setNovaMensagem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all"
                  placeholder="Digite sua mensagem..." />
                <button onClick={enviarMensagem} disabled={!novaMensagem.trim()}
                  className="w-10 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0">
                  <HiOutlinePaperAirplane className="w-5 h-5 rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ===== DASHBOARD =====
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Profile + Stats + Turmas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-700 via-green-600 to-emerald-500 p-6 text-white">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full bg-white/5" />
              <div className="relative flex items-center gap-4">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="w-16 h-16 rounded-2xl border-3 border-white/30 shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                    {initial}
                  </div>
                )}
                <div>
                  <p className="text-green-100 text-sm">Bem-vindo de volta,</p>
                  <h1 className="text-xl font-bold">{user?.nome}</h1>
                  <p className="text-green-200 text-xs mt-0.5">Continue seus estudos bíblicos</p>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: HiOutlineBookOpen, value: stats.totalAulas, label: 'Aulas concluídas', color: 'text-blue-600 bg-blue-50' },
                { icon: HiOutlineClipboardCheck, value: stats.totalRespostas, label: 'Questionários', color: 'text-green-600 bg-green-50' },
                { icon: HiOutlineTrendingUp, value: `${stats.mediaAcerto}%`, label: 'Aproveitamento', color: 'text-purple-600 bg-purple-50' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-[11px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Minhas Turmas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-800">Minhas Turmas</h2>
                <span className="text-xs text-gray-400">{classes.length} turma{classes.length !== 1 ? 's' : ''}</span>
              </div>

              {classes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
                  <HiOutlineAcademicCap className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Nenhuma turma encontrada</p>
                  <p className="text-xs text-gray-400 mt-1">Peça ao seu professor o link de acesso da turma.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classes.map(m => {
                    const c = m.classe as any
                    if (!c) return null
                    const igNome = Array.isArray(c.igreja) ? c.igreja[0]?.nome : c.igreja?.nome
                    const pct = c.total_licoes > 0 ? Math.round((m.licoes_concluidas / c.total_licoes) * 100) : 0
                    const moduloImg = c.modulo_id === 'principios_fe'
                      ? 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=200&fit=crop'
                      : 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=200&fit=crop'

                    return (
                      <div key={m.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                        {/* Card Image */}
                        <div className="relative h-28 overflow-hidden">
                          <img src={moduloImg} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="text-sm font-bold text-white truncate">{c.nome}</h3>
                            <p className="text-[10px] text-white/70">{c.modulo_titulo}</p>
                          </div>
                          <span className={`absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full font-medium ${
                            c.status === 'ativa' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                          }`}>
                            {c.status}
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className="p-4">
                          <p className="text-xs text-gray-400 mb-3">
                            {igNome}{c.instrutor_nome && ` | Prof. ${c.instrutor_nome}`}
                          </p>

                          {/* Progress */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">{m.licoes_concluidas}/{c.total_licoes} lições</span>
                              <span className="font-semibold text-green-600">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }} />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link to={`/eb/${c.id}`}
                              className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                              Estudar
                            </Link>
                            <button onClick={() => openChat(m)}
                              className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:text-green-600 hover:border-green-300 transition-colors"
                              title="Chat da turma">
                              <HiOutlineChatAlt2 className="w-4 h-4" />
                            </button>
                          </div>

                          {m.decisao_batismo && (
                            <div className="flex items-center gap-1 text-[10px] text-green-600 mt-2">
                              <HiOutlineStar className="w-3 h-3" /> Decisão de batismo
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Atalhos</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: HiOutlineBookOpen, label: 'Meus Estudos', color: 'bg-blue-50 text-blue-600', action: () => {} },
                  { icon: HiOutlineClipboardCheck, label: 'Questionários', color: 'bg-green-50 text-green-600', action: () => {} },
                  { icon: HiOutlineTrendingUp, label: 'Progresso', color: 'bg-purple-50 text-purple-600', action: () => {} },
                  { icon: HiOutlineStar, label: 'Certificados', color: 'bg-amber-50 text-amber-600', action: () => {} },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-gray-600 font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Módulos de Estudo */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Módulos de Estudo</h3>
              <div className="space-y-2">
                {[
                  { title: 'Princípios de Fé', sub: '37 pontos doutrinários', img: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=200&h=100&fit=crop' },
                  { title: 'Crenças Fundamentais', sub: '25 temas essenciais', img: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=200&h=100&fit=crop' },
                ].map((mod, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <img src={mod.img} alt="" className="w-14 h-10 rounded-lg object-cover shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{mod.title}</p>
                      <p className="text-[10px] text-gray-400">{mod.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Convide um amigo */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-5">
              <h3 className="text-sm font-bold text-green-800 mb-2">Convide um amigo</h3>
              <p className="text-xs text-green-700 leading-relaxed mb-3">
                Compartilhe a Palavra de Deus! Envie o link da sua turma para um amigo estudar junto com você.
              </p>
              {classes.length > 0 && (
                <button onClick={() => {
                  const c = classes[0]?.classe as any
                  if (c) {
                    const link = `${window.location.origin}/eb/${c.id}`
                    const text = `Venha estudar a Bíblia comigo! Acesse a Escola Bíblica: ${link}`
                    if (navigator.share) {
                      navigator.share({ title: 'Escola Bíblica NNE', text, url: link })
                    } else {
                      navigator.clipboard.writeText(text)
                      alert('Link copiado! Cole no WhatsApp para enviar ao seu amigo.')
                    }
                  }
                }}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2.5 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartilhar link
                </button>
              )}
            </div>

            {/* Dica */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Dica de Estudo</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Reserve um horário fixo diário para estudar cada ponto doutrinário.
                A constância no estudo da Palavra traz crescimento espiritual.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-4 border-t border-gray-100">
        <p className="text-center text-[11px] text-gray-400">
          Escola Bíblica NNE — União Norte Nordeste Brasileira — IASDMR
        </p>
      </footer>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import {
  HiOutlineAcademicCap, HiOutlineBookOpen, HiOutlineLogout,
  HiOutlineChevronRight, HiOutlineTrendingUp, HiOutlineBell,
  HiOutlineStar, HiOutlineClipboardCheck, HiOutlineChatAlt2,
  HiOutlinePaperAirplane, HiOutlineChevronLeft, HiOutlineDownload,
  HiOutlineFire, HiOutlineLightningBolt,
} from 'react-icons/hi'
import { useStudentGamification } from '@/hooks/useGamification'
import { awardXP, logStreakDay } from '@/lib/gamification'

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
  const chatChannelRef = useRef<any>(null)

  useEffect(() => {
    checkAuth()
    return () => { if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current) }
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/portal/inicio', { replace: true }); return }

    const u = session.user
    // Try to get display name from multiple sources
    let displayName = u.user_metadata?.nome || u.user_metadata?.full_name || ''
    if (!displayName) {
      // Try usuarios table
      const { data: usuario } = await supabase.from('usuarios').select('nome').eq('id', u.id).limit(1)
      if (usuario?.[0]?.nome) displayName = usuario[0].nome
    }
    if (!displayName) {
      // Try eb_perfis_aluno
      const { data: perfil } = await supabase.from('eb_perfis_aluno').select('nome').eq('id', u.id).limit(1)
      if (perfil?.[0]?.nome) displayName = perfil[0].nome
    }
    if (!displayName) displayName = u.email?.split('@')[0] || 'Aluno'

    setUser({
      id: u.id,
      email: u.email || '',
      nome: displayName,
      avatar: u.user_metadata?.avatar_url || null,
    })

    // Find pessoa linked to this email
    const { data: pessoaArr } = await supabase
      .from('pessoas')
      .select('id')
      .eq('email', u.email!)
      .limit(1)
    const pessoa = pessoaArr?.[0] || null

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
    // Clean up previous channel
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current)
      chatChannelRef.current = null
    }
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

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${m.classe_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eb_mensagens', filter: `classe_id=eq.${m.classe_id}` },
        (payload) => {
          setMensagens(prev => [...prev, payload.new as Mensagem])
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      )
      .subscribe()
    chatChannelRef.current = channel
  }

  async function enviarMensagem() {
    if (!novaMensagem.trim() || !chatTurma || !user) return
    await supabase.from('eb_mensagens').insert({
      classe_id: chatTurma.classe_id,
      autor_nome: user.nome,
      autor_email: user.email,
      autor_tipo: 'aluno',
      mensagem: novaMensagem.trim(),
    })
    // Gamification
    awardXP(user.id, 'student', 'chat_message')
    setNovaMensagem('')
  }

  function gerarCertificado(nomeAluno: string, moduloTitulo: string, turmaNome: string) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const w = 297, h = 210

    // Border
    doc.setDrawColor(22, 163, 74)
    doc.setLineWidth(2)
    doc.rect(10, 10, w - 20, h - 20)
    doc.setLineWidth(0.5)
    doc.rect(14, 14, w - 28, h - 28)

    // Header
    doc.setFontSize(14)
    doc.setTextColor(100, 100, 100)
    doc.text('ESCOLA BÍBLICA', w / 2, 35, { align: 'center' })
    doc.setFontSize(10)
    doc.text('União Norte Nordeste — IASD Movimento de Reforma', w / 2, 42, { align: 'center' })

    // Title
    doc.setFontSize(28)
    doc.setTextColor(22, 101, 52)
    doc.text('CERTIFICADO DE CONCLUSÃO', w / 2, 65, { align: 'center' })

    // Line
    doc.setDrawColor(22, 163, 74)
    doc.setLineWidth(0.8)
    doc.line(60, 72, w - 60, 72)

    // Body
    doc.setFontSize(13)
    doc.setTextColor(60, 60, 60)
    doc.text('Certificamos que', w / 2, 88, { align: 'center' })

    doc.setFontSize(24)
    doc.setTextColor(30, 30, 30)
    doc.text(nomeAluno, w / 2, 102, { align: 'center' })

    doc.setFontSize(13)
    doc.setTextColor(60, 60, 60)
    doc.text(`concluiu com êxito o módulo`, w / 2, 118, { align: 'center' })

    doc.setFontSize(18)
    doc.setTextColor(22, 101, 52)
    doc.text(`"${moduloTitulo}"`, w / 2, 130, { align: 'center' })

    doc.setFontSize(11)
    doc.setTextColor(100, 100, 100)
    doc.text(`Turma: ${turmaNome}`, w / 2, 142, { align: 'center' })
    doc.text(`Data de conclusão: ${new Date().toLocaleDateString('pt-BR')}`, w / 2, 150, { align: 'center' })

    // Footer
    doc.setDrawColor(200, 200, 200)
    doc.line(50, 175, 130, 175)
    doc.line(170, 175, 250, 175)
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text('Professor(a)', 90, 181, { align: 'center' })
    doc.text('Coordenação', 210, 181, { align: 'center' })

    doc.save(`certificado_${nomeAluno.replace(/\s+/g, '_')}.pdf`)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/portal/login', { replace: true })
  }

  // Gamification — MUST be before any conditional returns (React hooks rule)
  const gam = useStudentGamification(user?.id || null)

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
          <nav className="flex items-center gap-1">
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
                  const isMe = (m as any).autor_email === user?.email || m.autor_nome === user?.nome
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

            {/* Gamification Widget */}
            {gam.profile && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  {/* Level circle */}
                  <div className="relative shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke={gam.currentLevel.color_hex} strokeWidth="4"
                        strokeDasharray={`${gam.progressToNextLevel * 1.76} 176`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-black" style={{ color: gam.currentLevel.color_hex }}>{gam.currentLevel.level_number}</span>
                    </div>
                  </div>

                  {/* Level info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-800">{gam.currentLevel.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: gam.currentLevel.color_hex + '20', color: gam.currentLevel.color_hex }}>
                        Nível {gam.currentLevel.level_number}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{gam.currentLevel.description}</p>
                    {gam.currentLevel.bible_ref && (
                      <p className="text-[10px] text-gray-300 italic mt-0.5">{gam.currentLevel.bible_ref}</p>
                    )}

                    {/* XP bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span>{gam.profile.xp_total.toLocaleString()} XP</span>
                        {gam.nextLevel && <span>{gam.nextLevel.xp_min.toLocaleString()} XP</span>}
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${gam.progressToNextLevel}%`, backgroundColor: gam.currentLevel.color_hex }} />
                      </div>
                    </div>
                  </div>

                  {/* Streak */}
                  <div className="shrink-0 text-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gam.profile.streak_current > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                      <HiOutlineFire className={`w-6 h-6 ${gam.profile.streak_current > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
                    </div>
                    <p className={`text-lg font-bold mt-1 ${gam.profile.streak_current > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                      {gam.profile.streak_current}
                    </p>
                    <p className="text-[9px] text-gray-400">dias</p>
                    {gam.streakMultiplier > 1 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full mt-0.5">
                        <HiOutlineLightningBolt className="w-2.5 h-2.5" /> {gam.streakMultiplier}x
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges preview */}
                {gam.badges.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-gray-400 font-medium">Conquistas ({gam.badges.length}/{gam.allBadges.length})</p>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto">
                      {gam.badges.slice(0, 8).map(b => (
                        <div key={b.id} className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                          b.rarity === 'legendary' ? 'bg-amber-100 text-amber-700' :
                          b.rarity === 'rare' ? 'bg-purple-100 text-purple-700' :
                          b.rarity === 'uncommon' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`} title={`${b.name}: ${b.description}`}>
                          {b.name.charAt(0)}
                        </div>
                      ))}
                      {gam.badges.length > 8 && (
                        <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center text-[10px] font-medium">
                          +{gam.badges.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  <p className="text-[10px] sm:text-[11px] text-gray-400 leading-tight">{s.label}</p>
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
                              {pct >= 100 ? 'Revisar' : 'Estudar'}
                            </Link>
                            {pct >= 100 && (
                              <button onClick={() => gerarCertificado(user?.nome || 'Aluno', c.modulo_titulo || 'Escola Bíblica', c.nome)}
                                className="w-9 h-9 flex items-center justify-center border border-amber-300 bg-amber-50 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors"
                                title="Baixar certificado">
                                <HiOutlineDownload className="w-4 h-4" />
                              </button>
                            )}
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
                  { icon: HiOutlineBookOpen, label: 'Meus Estudos', color: 'bg-blue-50 text-blue-600', action: () => { if (classes[0]) window.location.href = `/eb/${(classes[0].classe as any)?.id}` } },
                  { icon: HiOutlineClipboardCheck, label: 'Comunidade', color: 'bg-green-50 text-green-600', action: () => navigate('/portal/forum') },
                  { icon: HiOutlineTrendingUp, label: 'Meu Perfil', color: 'bg-purple-50 text-purple-600', action: () => navigate('/portal/perfil') },
                  { icon: HiOutlineStar, label: 'Certificados', color: 'bg-amber-50 text-amber-600', action: () => { const c = classes.find(m => m.licoes_concluidas >= ((m.classe as any)?.total_licoes || 999)); if (c) gerarCertificado(user?.nome || '', (c.classe as any)?.modulo_titulo || '', (c.classe as any)?.nome || ''); else alert('Complete um módulo para gerar seu certificado.') } },
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
              <button onClick={() => {
                const c = classes[0]?.classe as any
                const link = c ? `${window.location.origin}/eb/${c.id}` : `${window.location.origin}/portal/inicio`
                const text = `Venha estudar a Bíblia comigo! Acesse a Escola Bíblica: ${link}`
                if (navigator.share) {
                  navigator.share({ title: 'Escola Bíblica NNE', text, url: link })
                } else {
                  navigator.clipboard.writeText(text)
                  alert('Link copiado! Cole no WhatsApp para enviar ao seu amigo.')
                }
              }}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2.5 rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Compartilhar link
              </button>
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
          Escola Bíblica NNE — União Norte Nordeste Brasileira — IASDMR — {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}

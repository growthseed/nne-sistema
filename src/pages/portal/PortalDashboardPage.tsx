import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineAcademicCap, HiOutlineBookOpen, HiOutlineLogout,
  HiOutlineChevronRight, HiOutlineUser, HiOutlineTrendingUp,
  HiOutlineStar, HiOutlineClipboardCheck,
} from 'react-icons/hi'

interface MinhaClasse {
  id: string
  classe_id: string
  licoes_concluidas: number
  decisao_batismo: boolean
  classe: {
    id: string; nome: string; modulo_id: string | null; modulo_titulo: string | null
    total_licoes: number; instrutor_nome: string | null; status: string
    igreja: { nome: string } | { nome: string }[] | null
  } | null
}

interface UserInfo {
  id: string
  email: string
  nome: string | null
  avatar: string | null
}

export default function PortalDashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [classes, setClasses] = useState<MinhaClasse[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalAulas: 0, totalRespostas: 0, mediaAcerto: 0 })

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
      // Get classes where this pessoa is enrolled
      const { data: matriculas } = await supabase
        .from('classe_biblica_alunos')
        .select(`
          id, classe_id, licoes_concluidas, decisao_batismo,
          classe:classes_biblicas(id, nome, modulo_id, modulo_titulo, total_licoes, instrutor_nome, status, igreja:igrejas(nome))
        `)
        .eq('pessoa_id', pessoa.id)

      setClasses(matriculas || [])

      // Get stats
      const { data: respostas } = await supabase
        .from('classe_biblica_respostas')
        .select('pontuacao, total_perguntas, percentual_acerto')
        .eq('aluno_id', pessoa.id)

      if (respostas && respostas.length > 0) {
        const media = respostas.reduce((s, r) => s + r.percentual_acerto, 0) / respostas.length
        setStats({
          totalAulas: (matriculas || []).reduce((s, m) => s + m.licoes_concluidas, 0),
          totalRespostas: respostas.length,
          mediaAcerto: Math.round(media),
        })
      }
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/portal/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  const initial = user?.nome?.charAt(0).toUpperCase() || 'A'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center">
              <HiOutlineAcademicCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Escola Bíblica</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                  {initial}
                </div>
              )}
              <span className="text-sm text-gray-700 hidden sm:block">{user?.nome}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Sair">
              <HiOutlineLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 p-6 text-white">
          <div className="absolute right-4 top-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute right-10 top-10 w-16 h-16 rounded-full bg-white/5" />
          <div className="relative">
            <p className="text-primary-100 text-sm">Olá,</p>
            <h1 className="text-2xl font-bold mt-0.5">{user?.nome}</h1>
            <p className="text-primary-100 text-sm mt-2">Continue seus estudos bíblicos</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
            <HiOutlineBookOpen className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{stats.totalAulas}</p>
            <p className="text-[10px] text-gray-400">Aulas feitas</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
            <HiOutlineClipboardCheck className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{stats.totalRespostas}</p>
            <p className="text-[10px] text-gray-400">Questionários</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center border border-gray-100 shadow-sm">
            <HiOutlineTrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-800">{stats.mediaAcerto}%</p>
            <p className="text-[10px] text-gray-400">Aproveitamento</p>
          </div>
        </div>

        {/* My Classes */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Minhas Turmas</h2>
          {classes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
              <HiOutlineAcademicCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Você ainda não está matriculado em nenhuma turma.</p>
              <p className="text-xs text-gray-400 mt-1">Peça ao seu professor o link de acesso.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classes.map(m => {
                const c = m.classe as any
                if (!c) return null
                const igNome = Array.isArray(c.igreja) ? c.igreja[0]?.nome : c.igreja?.nome
                const pct = c.total_licoes > 0 ? Math.round((m.licoes_concluidas / c.total_licoes) * 100) : 0
                const moduloBadge = c.modulo_id === 'principios_fe' ? 'PF' : 'CF'

                return (
                  <Link key={m.id} to={`/eb/${c.id}`}
                    className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition-all shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-800">{c.nome}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">{moduloBadge}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.status === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {igNome}{c.instrutor_nome && ` • Prof. ${c.instrutor_nome}`}
                        </p>
                      </div>
                      <HiOutlineChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-500">{m.licoes_concluidas} de {c.total_licoes} lições</span>
                        <span className="font-medium text-primary-600">{pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {m.decisao_batismo && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600">
                        <HiOutlineStar className="w-3.5 h-3.5" />
                        Decisão de batismo registrada
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

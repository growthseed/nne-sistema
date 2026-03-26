import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTeacherGamification } from '@/hooks/useTeacherGamification'
import {
  HiOutlineAcademicCap, HiOutlineUserGroup, HiOutlineTrendingUp,
  HiOutlineOfficeBuilding, HiOutlineClipboardCheck, HiOutlineStar,
  HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineEye,
  HiOutlineExclamation, HiOutlineChartBar, HiOutlineFire,
  HiOutlineChatAlt2, HiOutlineGlobe, HiOutlineLightningBolt,
} from 'react-icons/hi'

interface TurmaResumo {
  id: string; nome: string; status: string; modulo_id: string | null
  modulo_titulo: string | null; instrutor_nome: string | null
  total_licoes: number; total_alunos: number
  igreja_id: string | null; associacao_id: string | null
  igreja: { nome: string } | { nome: string }[] | null
  associacao: { nome: string; sigla: string } | { nome: string; sigla: string }[] | null
  created_at: string
}

interface AlunoResumo {
  id: string; classe_id: string; licoes_concluidas: number
  decisao_batismo: boolean; status: string
  pessoa: { nome: string; celular: string | null } | { nome: string; celular: string | null }[] | null
}

interface NpsResumo {
  classe_id: string; total: number; media: number
}

type ViewMode = 'painel' | 'professores' | 'nps'

function getViewFromPath(pathname: string): ViewMode {
  if (pathname.includes('/professores')) return 'professores'
  if (pathname.includes('/nps')) return 'nps'
  return 'painel'
}

export default function EBDashboardPage() {
  const { profile } = useAuth()
  const location = useLocation()
  const viewMode = getViewFromPath(location.pathname)
  const [turmas, setTurmas] = useState<TurmaResumo[]>([])
  const [alunos, setAlunos] = useState<AlunoResumo[]>([])
  const [npsData, setNpsData] = useState<NpsResumo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAssoc, setFiltroAssoc] = useState('todas')
  const [expandedProf, setExpandedProf] = useState<string | null>(null)
  const [buscaAluno, setBuscaAluno] = useState('')

  // Teacher gamification (for current logged-in user)
  const teacherGam = useTeacherGamification(profile?.id || null)

  // Forum/chat stats
  const [forumStats, setForumStats] = useState({ topicos: 0, respostas: 0, mensagens: 0 })

  useEffect(() => { if (profile) loadData() }, [profile])

  async function loadData() {
    setLoading(true)

    let turmaQuery = supabase
      .from('classes_biblicas')
      .select('id, nome, status, modulo_id, modulo_titulo, instrutor_nome, total_licoes, total_alunos, igreja_id, associacao_id, created_at, igreja:igrejas(nome), associacao:associacoes(nome, sigla)')
      .order('created_at', { ascending: false })

    if (profile!.papel === 'admin_associacao') turmaQuery = turmaQuery.eq('associacao_id', profile!.associacao_id!)
    else if (!['admin', 'admin_uniao'].includes(profile!.papel)) turmaQuery = turmaQuery.eq('igreja_id', profile!.igreja_id!)

    const { data: turmasData } = await turmaQuery
    setTurmas(turmasData || [])

    // Get all alunos for these turmas
    const turmaIds = (turmasData || []).map(t => t.id)
    if (turmaIds.length > 0) {
      const { data: alunosData } = await supabase
        .from('classe_biblica_alunos')
        .select('id, classe_id, licoes_concluidas, decisao_batismo, status, pessoa:pessoas(nome, celular)')
        .in('classe_id', turmaIds)

      setAlunos(alunosData || [])

      // NPS aggregated
      const { data: nps } = await supabase
        .from('eb_nps')
        .select('classe_id, nota')
        .in('classe_id', turmaIds)

      if (nps) {
        const grouped: Record<string, { total: number; sum: number }> = {}
        nps.forEach(n => {
          if (!grouped[n.classe_id]) grouped[n.classe_id] = { total: 0, sum: 0 }
          grouped[n.classe_id].total++
          grouped[n.classe_id].sum += n.nota
        })
        setNpsData(Object.entries(grouped).map(([id, v]) => ({
          classe_id: id, total: v.total, media: Math.round((v.sum / v.total) * 10) / 10,
        })))
      }
    }

    // Forum/chat stats
    const [topicosRes, msgRes] = await Promise.all([
      supabase.from('eb_forum_topicos').select('id', { count: 'exact', head: true }),
      supabase.from('eb_mensagens').select('id', { count: 'exact', head: true }),
    ])
    const respostasCount = await supabase.from('eb_forum_respostas').select('id', { count: 'exact', head: true })
    setForumStats({
      topicos: topicosRes.count || 0,
      respostas: respostasCount.count || 0,
      mensagens: msgRes.count || 0,
    })

    setLoading(false)
  }

  // ===== COMPUTED =====

  const getNome = (obj: any) => Array.isArray(obj) ? obj[0]?.nome || '' : obj?.nome || ''
  const getSigla = (obj: any) => Array.isArray(obj) ? obj[0]?.sigla || '' : obj?.sigla || ''

  const filteredTurmas = filtroAssoc === 'todas'
    ? turmas
    : turmas.filter(t => t.associacao_id === filtroAssoc)

  const totalAlunos = alunos.length
  const totalDecisoes = alunos.filter(a => a.decisao_batismo).length
  const turmasAtivas = filteredTurmas.filter(t => t.status === 'ativa').length
  const mediaLicoes = alunos.length > 0 ? Math.round(alunos.reduce((s, a) => s + a.licoes_concluidas, 0) / alunos.length) : 0

  // Ranking professores
  const professorRanking = useMemo(() => {
    const map: Record<string, { nome: string; turmas: number; alunos: number; decisoes: number; ativas: number }> = {}
    filteredTurmas.forEach(t => {
      const prof = t.instrutor_nome || 'Sem instrutor'
      if (!map[prof]) map[prof] = { nome: prof, turmas: 0, alunos: 0, decisoes: 0, ativas: 0 }
      map[prof].turmas++
      if (t.status === 'ativa') map[prof].ativas++
      const turmaAlunos = alunos.filter(a => a.classe_id === t.id)
      map[prof].alunos += turmaAlunos.length
      map[prof].decisoes += turmaAlunos.filter(a => a.decisao_batismo).length
    })
    return Object.values(map).sort((a, b) => b.alunos - a.alunos)
  }, [filteredTurmas, alunos])

  // Por associação
  const porAssociacao = useMemo(() => {
    const map: Record<string, { id: string; sigla: string; nome: string; turmas: number; alunos: number; decisoes: number }> = {}
    turmas.forEach(t => {
      const id = t.associacao_id || 'sem'
      const sigla = getSigla(t.associacao) || 'N/D'
      const nome = getNome(t.associacao) || 'Sem associação'
      if (!map[id]) map[id] = { id, sigla, nome, turmas: 0, alunos: 0, decisoes: 0 }
      map[id].turmas++
      const ta = alunos.filter(a => a.classe_id === t.id)
      map[id].alunos += ta.length
      map[id].decisoes += ta.filter(a => a.decisao_batismo).length
    })
    return Object.values(map).sort((a, b) => b.alunos - a.alunos)
  }, [turmas, alunos])

  // Alunos que faltaram (0 lições concluídas)
  const alunosInativos = alunos.filter(a => a.licoes_concluidas === 0)

  const assocs = useMemo(() => {
    const set = new Map<string, string>()
    turmas.forEach(t => {
      if (t.associacao_id) set.set(t.associacao_id, getSigla(t.associacao))
    })
    return Array.from(set.entries())
  }, [turmas])

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djJoLTR2LTJoNHptMC0zMHYyaC00VjRoNHpNNiAzNHYySDJ2LTJoNHptMC0zMHYySDJWNGg0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <HiOutlineAcademicCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Escola Bíblica</h1>
            <p className="text-green-100 text-sm">
              {viewMode === 'painel' && 'Painel Administrativo — Acompanhamento geral'}
              {viewMode === 'professores' && 'Ranking e desempenho dos professores'}
              {viewMode === 'nps' && 'NPS & Avaliações das turmas'}
            </p>
          </div>
        </div>
      </div>

      {/* Filtro associação */}
      {assocs.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-gray-500 shrink-0">Filtrar:</span>
          <button onClick={() => setFiltroAssoc('todas')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroAssoc === 'todas' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            Todas
          </button>
          {assocs.map(([id, sigla]) => (
            <button key={id} onClick={() => setFiltroAssoc(id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroAssoc === id ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {sigla}
            </button>
          ))}
        </div>
      )}

      {/* ========== VIEW: PAINEL GERAL ========== */}
      {viewMode === 'painel' && <>
        {/* Busca global de alunos */}
        <div className="relative">
          <HiOutlineUserGroup className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={buscaAluno} onChange={e => setBuscaAluno(e.target.value)}
            className="input-field pl-10 text-sm" placeholder="Buscar aluno por nome..." />
        </div>
        {buscaAluno.length >= 2 && (() => {
          const term = buscaAluno.toLowerCase()
          const found = alunos.filter(a => {
            const nome = Array.isArray(a.pessoa) ? a.pessoa[0]?.nome : (a.pessoa as any)?.nome
            return nome?.toLowerCase().includes(term)
          }).slice(0, 15)
          return found.length > 0 ? (
            <div className="card p-3 space-y-1 -mt-2">
              <p className="text-xs text-gray-400 mb-2">{found.length} aluno(s) encontrado(s)</p>
              {found.map(a => {
                const nome = Array.isArray(a.pessoa) ? a.pessoa[0]?.nome : (a.pessoa as any)?.nome
                const cel = Array.isArray(a.pessoa) ? a.pessoa[0]?.celular : (a.pessoa as any)?.celular
                const turma = turmas.find(t => t.id === a.classe_id)
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 text-xs">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {(nome || '?').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 truncate">{nome || '—'}</p>
                      <p className="text-[10px] text-gray-400">{turma?.nome} • {a.licoes_concluidas} lições</p>
                    </div>
                    {a.decisao_batismo && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Decisão</span>}
                    {cel && <span className="text-gray-400">{cel}</span>}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card p-4 text-center text-xs text-gray-400 -mt-2">Nenhum aluno encontrado para "{buscaAluno}"</div>
          )
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: HiOutlineUserGroup, value: totalAlunos, label: 'Alunos Total', color: 'text-blue-600 bg-blue-50' },
            { icon: HiOutlineAcademicCap, value: turmasAtivas, label: 'Turmas Ativas', color: 'text-green-600 bg-green-50' },
            { icon: HiOutlineStar, value: totalDecisoes, label: 'Decisões Batismo', color: 'text-amber-600 bg-amber-50' },
            { icon: HiOutlineTrendingUp, value: mediaLicoes, label: 'Média Lições/Aluno', color: 'text-purple-600 bg-purple-50' },
          ].map((s, i) => (
            <div key={i} className="card p-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Por Associação */}
        {porAssociacao.length > 1 && (
          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <HiOutlineOfficeBuilding className="w-4 h-4 text-green-600" /> Por Associação
            </h2>
            <div className="space-y-2">
              {porAssociacao.map(a => (
                <div key={a.id} className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2"
                  onClick={() => setFiltroAssoc(a.id)}>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg w-16 text-center shrink-0">{a.sigla}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{a.nome}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-6 shrink-0 text-right">
                    <div><p className="text-sm font-bold text-gray-700">{a.turmas}</p><p className="text-[10px] text-gray-400">turmas</p></div>
                    <div><p className="text-sm font-bold text-blue-600">{a.alunos}</p><p className="text-[10px] text-gray-400">alunos</p></div>
                    <div><p className="text-sm font-bold text-amber-600">{a.decisoes}</p><p className="text-[10px] text-gray-400">decisões</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alunos sem progresso */}
        {alunosInativos.length > 0 && (
          <div className="card p-5 border-amber-200">
            <h2 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
              <HiOutlineExclamation className="w-4 h-4" /> Alunos sem progresso ({alunosInativos.length})
            </h2>
            <p className="text-xs text-gray-500 mb-3">Alunos que ainda não concluíram nenhuma lição. Considere uma visita ou contato.</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {alunosInativos.slice(0, 20).map(a => {
                const nome = Array.isArray(a.pessoa) ? a.pessoa[0]?.nome : (a.pessoa as any)?.nome
                const cel = Array.isArray(a.pessoa) ? a.pessoa[0]?.celular : (a.pessoa as any)?.celular
                const turma = turmas.find(t => t.id === a.classe_id)
                return (
                  <div key={a.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-amber-50 text-xs">
                    <span className="font-medium text-gray-700 flex-1">{nome || '—'}</span>
                    <span className="text-gray-400 truncate max-w-[120px]">{turma?.nome}</span>
                    {cel && <span className="text-gray-400">{cel}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Turmas lista */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Todas as Turmas ({filteredTurmas.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Turma</th>
                  <th className="pb-3 pr-4">Assoc.</th>
                  <th className="pb-3 pr-4">Professor</th>
                  <th className="pb-3 pr-4">Módulo</th>
                  <th className="pb-3 pr-4 text-center">Alunos</th>
                  <th className="pb-3 pr-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTurmas.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{t.nome}</td>
                    <td className="py-2.5 pr-4"><span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{getSigla(t.associacao) || 'N/D'}</span></td>
                    <td className="py-2.5 pr-4 text-gray-600">{t.instrutor_nome || '—'}</td>
                    <td className="py-2.5 pr-4"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t.modulo_id === 'principios_fe' ? 'PF' : 'CF'}</span></td>
                    <td className="py-2.5 pr-4 text-center font-medium">{alunos.filter(a => a.classe_id === t.id).length}</td>
                    <td className="py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status === 'ativa' ? 'bg-green-100 text-green-700' : t.status === 'concluida' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* ========== VIEW: PROFESSORES ========== */}
      {viewMode === 'professores' && <>
        {/* My gamification (teacher) */}
        {teacherGam.profile && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Minha Influência</h3>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke={teacherGam.currentLevel.color_hex} strokeWidth="4"
                    strokeDasharray={`${teacherGam.progressToNextLevel * 1.76} 176`} strokeLinecap="round" className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black" style={{ color: teacherGam.currentLevel.color_hex }}>{teacherGam.currentLevel.level_number}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-gray-800">{teacherGam.currentLevel.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: teacherGam.currentLevel.color_hex + '20', color: teacherGam.currentLevel.color_hex }}>
                    Nível {teacherGam.currentLevel.level_number}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{teacherGam.currentLevel.description}</p>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <div><p className="text-lg font-bold text-gray-800">{teacherGam.profile.xp_total.toLocaleString()}</p><p className="text-[10px] text-gray-400">XP Total</p></div>
                  <div><p className="text-lg font-bold text-blue-600">{teacherGam.profile.xp_current_week}</p><p className="text-[10px] text-gray-400">XP Semana</p></div>
                  <div><p className="text-lg font-bold text-green-600">{teacherGam.profile.xp_current_month}</p><p className="text-[10px] text-gray-400">XP Mês</p></div>
                </div>
              </div>
            </div>
            {/* Teacher badges */}
            {teacherGam.badges.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-1.5 overflow-x-auto">
                {teacherGam.badges.map(b => (
                  <span key={b.id} className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-medium ${
                    b.rarity === 'legendary' ? 'bg-amber-100 text-amber-700' : b.rarity === 'rare' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`} title={b.description}>{b.name}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats do professor */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { value: totalAlunos, label: 'Total Alunos', color: 'text-blue-600 bg-blue-50', icon: HiOutlineUserGroup },
            { value: turmasAtivas, label: 'Turmas Ativas', color: 'text-green-600 bg-green-50', icon: HiOutlineAcademicCap },
            { value: totalDecisoes, label: 'Decisões', color: 'text-amber-600 bg-amber-50', icon: HiOutlineStar },
            { value: forumStats.topicos + forumStats.respostas, label: 'Interações Fórum', color: 'text-purple-600 bg-purple-50', icon: HiOutlineChatAlt2 },
          ].map((s, i) => (
            <div key={i} className="card p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Ranking */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <HiOutlineStar className="w-4 h-4 text-amber-500" /> Ranking de Professores
          </h2>
          {professorRanking.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum professor encontrado</p>
          ) : (
            <div className="space-y-1">
              {professorRanking.map((p, idx) => (
                <div key={p.nome}>
                  <button onClick={() => setExpandedProf(expandedProf === p.nome ? null : p.nome)}
                    className="w-full flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' : idx === 1 ? 'bg-gray-200 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                    }`}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{p.nome}</p>
                      <p className="text-[10px] text-gray-400">{p.ativas} turma{p.ativas !== 1 ? 's' : ''} ativa{p.ativas !== 1 ? 's' : ''} • {p.turmas} total</p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                      <div className="text-right"><p className="text-sm font-bold text-blue-600">{p.alunos}</p><p className="text-[10px] text-gray-400">alunos</p></div>
                      <div className="text-right"><p className="text-sm font-bold text-green-600">{p.decisoes}</p><p className="text-[10px] text-gray-400">decisões</p></div>
                      <div className="text-right hidden sm:block"><p className="text-sm font-bold text-purple-600">{Math.round(p.alunos > 0 ? (p.decisoes / p.alunos) * 100 : 0)}%</p><p className="text-[10px] text-gray-400">conversão</p></div>
                      {expandedProf === p.nome ? <HiOutlineChevronUp className="w-4 h-4 text-gray-400" /> : <HiOutlineChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {expandedProf === p.nome && (
                    <div className="ml-12 mb-3 space-y-1.5">
                      {filteredTurmas.filter(t => t.instrutor_nome === p.nome).map(t => {
                        const tAlunos = alunos.filter(a => a.classe_id === t.id)
                        const nps = npsData.find(n => n.classe_id === t.id)
                        const pctConcluido = t.total_licoes > 0 ? Math.round((tAlunos.reduce((s, a) => s + a.licoes_concluidas, 0) / (tAlunos.length * t.total_licoes || 1)) * 100) : 0
                        return (
                          <div key={t.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.status === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{t.status}</span>
                                <span className="text-xs font-medium text-gray-700">{t.nome}</span>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{t.modulo_id === 'principios_fe' ? 'PF' : 'CF'}</span>
                              </div>
                              {nps && <span className={`text-xs font-bold ${nps.media >= 8 ? 'text-green-600' : nps.media >= 6 ? 'text-amber-600' : 'text-red-600'}`}>NPS {nps.media}</span>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{tAlunos.length} alunos</span>
                              <span>{tAlunos.filter(a => a.decisao_batismo).length} decisões</span>
                              <span>Progresso médio: {pctConcluido}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctConcluido}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comunidade / Fórum monitoring */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <HiOutlineChatAlt2 className="w-4 h-4 text-purple-600" /> Comunidade & Fórum
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-2xl font-bold text-purple-600">{forumStats.topicos}</p>
              <p className="text-[10px] text-gray-500">Tópicos</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">{forumStats.respostas}</p>
              <p className="text-[10px] text-gray-500">Respostas</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-600">{forumStats.mensagens}</p>
              <p className="text-[10px] text-gray-500">Mensagens Chat</p>
            </div>
          </div>
          <a href="/portal/forum" target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 text-xs text-purple-600 hover:text-purple-700 font-medium bg-purple-50 hover:bg-purple-100 py-2.5 rounded-xl transition-colors">
            <HiOutlineGlobe className="w-4 h-4" /> Abrir Fórum da Comunidade
          </a>
        </div>
      </>}

      {/* ========== VIEW: NPS ========== */}
      {viewMode === 'nps' && <>
        {/* NPS Stats */}
        <div className="grid grid-cols-3 gap-3">
          {(() => {
            const allNps = npsData
            const totalAval = allNps.reduce((s, n) => s + n.total, 0)
            const totalPeso = allNps.reduce((s, n) => s + n.total, 0)
            const mediaGeral = totalPeso > 0 ? Math.round(allNps.reduce((s, n) => s + n.media * n.total, 0) / totalPeso * 10) / 10 : 0
            return [
              { value: totalAval, label: 'Avaliações', color: 'text-blue-600' },
              { value: mediaGeral, label: 'Média Geral', color: mediaGeral >= 8 ? 'text-green-600' : mediaGeral >= 6 ? 'text-amber-600' : 'text-red-600' },
              { value: allNps.length, label: 'Turmas avaliadas', color: 'text-purple-600' },
            ].map((s, i) => (
              <div key={i} className="card p-4 text-center">
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))
          })()}
        </div>

        {/* NPS por turma */}
        {npsData.length === 0 ? (
          <div className="card p-10 text-center">
            <HiOutlineChartBar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma avaliação NPS registrada</p>
            <p className="text-xs text-gray-400 mt-1">As avaliações aparecem após os alunos responderem questionários</p>
          </div>
        ) : (
          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <HiOutlineChartBar className="w-4 h-4 text-purple-600" /> NPS por Turma
            </h2>
            <div className="space-y-3">
              {npsData.sort((a, b) => b.media - a.media).map(n => {
                const turma = turmas.find(t => t.id === n.classe_id)
                const color = n.media >= 8 ? 'bg-green-500' : n.media >= 6 ? 'bg-amber-500' : 'bg-red-500'
                const textColor = n.media >= 8 ? 'text-green-600' : n.media >= 6 ? 'text-amber-600' : 'text-red-600'
                const pct = (n.media / 10) * 100
                return (
                  <div key={n.classe_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{turma?.nome || '—'}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${textColor}`}>{n.media}</span>
                        <span className="text-[10px] text-gray-400">{n.total} aval.</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </>}
    </div>
  )
}

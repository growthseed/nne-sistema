import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import TurnstileWidget from '@/components/public/TurnstileWidget'
import {
  HiOutlineAcademicCap, HiOutlineCheck, HiOutlineChevronLeft,
  HiOutlineBookOpen, HiOutlineClipboardCheck,
  HiOutlineLockClosed,
} from 'react-icons/hi'

// =============================================
// TIPOS
// =============================================

interface ClasseInfo {
  id: string; nome: string; modulo_id: string | null; modulo_titulo: string | null
  total_licoes: number; instrutor_nome: string | null; status: string
  igreja: { nome: string } | { nome: string }[] | null
}

interface AlunoInfo {
  id: string; pessoa_id: string; licoes_concluidas: number
}

interface AulaInfo {
  id: string; ponto_numero: number; ponto_titulo: string | null
  questionario_liberado: boolean
}

interface PontoInfo {
  id: string; ponto_numero: number; titulo: string; subtitulo: string | null
  introducao: string | null; secoes: any[]; perguntas: PerguntaEB[]
  compromissos_fe: CompromissoFe[]
}

interface PerguntaEB {
  id: string; numero: number; texto: string; opcoes: OpcaoEB[]
  resposta_correta: string; explicacao: string; referencias: ReferenciaEB[]
}
interface OpcaoEB { id: string; texto: string }
interface ReferenciaEB { texto: string; livro: string; capitulo: number; versiculo: string; conteudo: string }
interface CompromissoFe { id: string; texto: string }

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

export default function EBPublicPage() {
  const { classeId } = useParams<{ classeId: string }>()
  const navigate = useNavigate()

  const [classe, setClasse] = useState<ClasseInfo | null>(null)
  const [aluno, setAluno] = useState<AlunoInfo | null>(null)
  const [userName, setUserName] = useState('')
  const [aulas, setAulas] = useState<AulaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [notEnrolled, setNotEnrolled] = useState(false)

  // Quiz navigation
  const [selectedAula, setSelectedAula] = useState<AulaInfo | null>(null)
  const [ponto, setPonto] = useState<PontoInfo | null>(null)
  const [loadingPonto, setLoadingPonto] = useState(false)

  // Quiz state
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [compromissos, setCompromissos] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState({ corretas: 0, total: 0 })
  const [submitting, setSubmitting] = useState(false)

  // Typeform quiz step
  const [quizStep, setQuizStep] = useState(0)

  // Turnstile CAPTCHA
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  const captchaEnabled = Boolean(turnstileSiteKey)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const handleCaptchaSuccess = useCallback((token: string) => setCaptchaToken(token), [])
  const handleCaptchaExpire = useCallback(() => setCaptchaToken(null), [])
  const handleCaptchaError = useCallback(() => setCaptchaToken(null), [])

  useEffect(() => {
    checkAuthAndLoad()
  }, [classeId])

  async function checkAuthAndLoad() {
    setLoading(true)

    // 1. Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // Redirect to login with return URL
      navigate(`/portal/login?redirect=/eb/${classeId}`, { replace: true })
      return
    }

    setAuthChecked(true)
    const userEmail = session.user.email!
    const displayName = session.user.user_metadata?.full_name
      || session.user.user_metadata?.nome
      || userEmail.split('@')[0]
    setUserName(displayName)

    // 2. Load class info
    const { data: classeData, error: err } = await supabase
      .from('classes_biblicas')
      .select('id, nome, modulo_id, modulo_titulo, total_licoes, instrutor_nome, status, igreja:igrejas(nome)')
      .eq('id', classeId!)
      .single()

    if (err || !classeData) { setError('Classe não encontrada'); setLoading(false); return }
    setClasse(classeData)

    // 3. Find pessoa by email
    const { data: pessoaArr } = await supabase
      .from('pessoas')
      .select('id')
      .eq('email', userEmail)
      .limit(1)

    if (!pessoaArr || pessoaArr.length === 0) {
      setNotEnrolled(true)
      setLoading(false)
      return
    }

    // 4. Check enrollment in this class
    const { data: matricula } = await supabase
      .from('classe_biblica_alunos')
      .select('id, pessoa_id, licoes_concluidas')
      .eq('classe_id', classeId!)
      .eq('pessoa_id', pessoaArr[0].id)
      .limit(1)

    if (!matricula || matricula.length === 0) {
      setNotEnrolled(true)
      setLoading(false)
      return
    }

    setAluno(matricula[0])

    // 5. Load available lessons
    const { data: aulasData } = await supabase
      .from('classe_biblica_aulas')
      .select('id, ponto_numero, ponto_titulo, questionario_liberado')
      .eq('classe_id', classeId!)
      .eq('ativada', true)
      .order('ponto_numero')

    setAulas(aulasData || [])
    setLoading(false)
  }

  async function loadPonto(aula: AulaInfo) {
    if (!classe?.modulo_id) return
    setSelectedAula(aula)
    setLoadingPonto(true)
    const { data: pontoArr, error: pontoErr } = await supabase
      .from('eb_pontos')
      .select('*')
      .eq('modulo_id', classe.modulo_id)
      .eq('ponto_numero', aula.ponto_numero)
      .limit(1)
    if (pontoErr) { setError('Erro ao carregar conteúdo da aula.'); setLoadingPonto(false); return }
    setPonto(pontoArr?.[0] || null)
    setRespostas({})
    setCompromissos({})
    setSubmitted(false)
    setQuizStep(0)
    setLoadingPonto(false)
  }

  async function submitQuiz() {
    if (!ponto || !aluno || !selectedAula || !classe) return
    if (captchaEnabled && !captchaToken) {
      setError('Complete a verificação de segurança antes de enviar.')
      return
    }
    setSubmitting(true)

    // Check if already submitted (prevent duplicate)
    const { data: existing } = await supabase
      .from('classe_biblica_respostas')
      .select('id')
      .eq('classe_id', classe.id)
      .eq('aluno_id', aluno.id)
      .eq('ponto_numero', ponto.ponto_numero)
      .limit(1)

    if (existing && existing.length > 0) {
      setError('Você já respondeu este questionário.')
      setSubmitting(false)
      return
    }

    let corretas = 0
    const total = ponto.perguntas.length
    for (const p of ponto.perguntas) {
      if (respostas[p.id] === p.resposta_correta) corretas++
    }
    const percentual = total > 0 ? Math.round((corretas / total) * 100) : 0

    const { error: insertErr } = await supabase.from('classe_biblica_respostas').insert({
      classe_id: classe.id,
      aluno_id: aluno.id,
      aluno_nome: userName,
      ponto_numero: ponto.ponto_numero,
      ponto_titulo: ponto.titulo,
      pontuacao: corretas,
      total_perguntas: total,
      percentual_acerto: percentual,
      respostas,
      compromissos,
    })

    if (insertErr) {
      setError('Erro ao enviar respostas. Tente novamente.')
      setSubmitting(false)
      return
    }

    // Update licoes_concluidas
    await supabase.from('classe_biblica_alunos').update({
      licoes_concluidas: aluno.licoes_concluidas + 1,
    }).eq('id', aluno.id)

    setScore({ corretas, total })
    setSubmitted(true)
    setSubmitting(false)
    setCaptchaToken(null)
    setCaptchaResetKey(k => k + 1)
  }

  const igrejaNome = classe ? (Array.isArray(classe.igreja) ? classe.igreja[0]?.nome : (classe.igreja as any)?.nome) : ''

  // ---- LOADING ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  // ---- NOT ENROLLED ----
  if (notEnrolled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm">
          <HiOutlineAcademicCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800">Acesso não autorizado</h1>
          <p className="text-sm text-gray-500 mt-2">
            Você não está matriculado nesta turma. Peça ao seu professor para adicionar seu email à turma.
          </p>
          <p className="text-xs text-gray-400 mt-3">Logado como: {userName}</p>
          <button onClick={() => navigate('/portal')}
            className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium">
            Ir para o Portal
          </button>
        </div>
      </div>
    )
  }

  // ---- ERROR ----
  if (error && !ponto) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm">
          <HiOutlineAcademicCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800">Classe não encontrada</h1>
          <p className="text-sm text-gray-500 mt-2">Verifique se o link está correto ou entre em contato com seu professor.</p>
        </div>
      </div>
    )
  }

  if (!classe || !aluno) return null

  // ---- RESULT SCREEN ----
  if (submitted && ponto) {
    const pct = score.total > 0 ? Math.round((score.corretas / score.total) * 100) : 0
    const passed = pct >= 70
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-4 pt-8">
          <div className={`rounded-2xl p-8 text-center text-white ${passed ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-orange-500 to-red-500'}`}>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl font-black">{pct}%</span>
            </div>
            <h2 className="text-xl font-bold">{passed ? 'Parabéns!' : 'Continue estudando!'}</h2>
            <p className="text-white/80 mt-2">
              Você acertou {score.corretas} de {score.total} perguntas do ponto "{ponto.titulo}"
            </p>
          </div>

          {/* Gabarito */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Gabarito</h3>
            {ponto.perguntas.map((p, i) => {
              const acertou = respostas[p.id] === p.resposta_correta
              return (
                <div key={p.id} className={`p-3 rounded-xl border ${acertou ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <p className="text-xs font-medium text-gray-700 mb-1">{i + 1}. {p.texto}</p>
                  <p className="text-xs">
                    Sua resposta: <span className={acertou ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                      {p.opcoes.find(o => o.id === respostas[p.id])?.texto || '—'}
                    </span>
                  </p>
                  {!acertou && (
                    <p className="text-xs text-green-700 mt-0.5">
                      Correta: {p.opcoes.find(o => o.id === p.resposta_correta)?.texto}
                    </p>
                  )}
                  {p.explicacao && (
                    <p className="text-[10px] text-gray-500 mt-1 italic">{p.explicacao}</p>
                  )}
                </div>
              )
            })}
          </div>

          <button onClick={() => { setSelectedAula(null); setPonto(null); setSubmitted(false) }}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-3 rounded-xl transition-colors">
            Voltar às Aulas
          </button>
        </div>
      </div>
    )
  }

  // ---- QUIZ SCREEN (Typeform style) ----
  if (selectedAula && ponto) {
    const totalSteps = (ponto.introducao ? 1 : 0) + ponto.perguntas.length + (ponto.compromissos_fe?.length > 0 ? 1 : 0)
    const introOffset = ponto.introducao ? 1 : 0
    const currentPerguntaIdx = quizStep - introOffset
    const currentPergunta = ponto.perguntas[currentPerguntaIdx]
    const isIntro = ponto.introducao && quizStep === 0
    const isCompromissos = quizStep >= introOffset + ponto.perguntas.length
    const progressPct = Math.round((quizStep / totalSteps) * 100)
    const isLastQuestion = currentPerguntaIdx === ponto.perguntas.length - 1 && !ponto.compromissos_fe?.length

    function nextStep() {
      if (isLastQuestion || isCompromissos) return
      setQuizStep(prev => prev + 1)
    }

    function prevStep() {
      if (quizStep > 0) setQuizStep(prev => prev - 1)
    }

    function selectAnswer(perguntaId: string, opcaoId: string) {
      setRespostas(prev => ({ ...prev, [perguntaId]: opcaoId }))
    }

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Top bar with progress */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => { if (quizStep === 0) { setSelectedAula(null); setPonto(null) } else prevStep() }}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
              <HiOutlineChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <span className="text-xs text-gray-400 shrink-0 w-12 text-right">{quizStep + 1}/{totalSteps}</span>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">

            {/* STEP: Intro */}
            {isIntro && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-xs font-medium text-primary-600 uppercase tracking-wider mb-2">
                    Ponto {ponto.ponto_numero}
                  </p>
                  <h1 className="text-2xl font-bold text-gray-900">{ponto.titulo}</h1>
                  {ponto.subtitulo && <p className="text-gray-500 mt-1">{ponto.subtitulo}</p>}
                </div>
                {ponto.imagem_url && (
                  <img src={ponto.imagem_url} alt="" className="w-full h-48 object-cover rounded-2xl" />
                )}
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ponto.introducao}</p>
                <button onClick={nextStep}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3.5 rounded-xl transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2">
                  Iniciar Questionário
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}

            {/* STEP: Pergunta (one at a time with feedback) */}
            {!isIntro && !isCompromissos && currentPergunta && (() => {
              const answered = !!respostas[currentPergunta.id]
              const isCorrect = respostas[currentPergunta.id] === currentPergunta.resposta_correta
              return (
              <div className="space-y-6 animate-fade-in" key={currentPergunta.id}>
                <div>
                  <p className="text-xs font-medium text-primary-600 uppercase tracking-wider mb-3">
                    Pergunta {currentPerguntaIdx + 1} de {ponto.perguntas.length}
                  </p>
                  <h2 className="text-xl font-bold text-gray-900 leading-snug">{currentPergunta.texto}</h2>
                </div>

                <div className="space-y-2.5">
                  {currentPergunta.opcoes.map((o, oi) => {
                    const isSelected = respostas[currentPergunta.id] === o.id
                    const isCorrectOption = o.id === currentPergunta.resposta_correta
                    const letter = String.fromCharCode(65 + oi)

                    let borderClass = 'border-gray-200 hover:border-primary-300 hover:bg-gray-50 active:scale-[0.98]'
                    let badgeClass = 'bg-gray-100 text-gray-500'
                    let textClass = 'text-gray-700'

                    if (answered) {
                      if (isCorrectOption) {
                        borderClass = 'border-green-500 bg-green-50 scale-[1.02]'
                        badgeClass = 'bg-green-500 text-white'
                        textClass = 'text-green-700 font-medium'
                      } else if (isSelected && !isCorrectOption) {
                        borderClass = 'border-red-400 bg-red-50 opacity-75'
                        badgeClass = 'bg-red-400 text-white'
                        textClass = 'text-red-600 line-through'
                      } else {
                        borderClass = 'border-gray-100 opacity-50'
                      }
                    } else if (isSelected) {
                      borderClass = 'border-primary-500 bg-primary-50 scale-[1.02] shadow-md shadow-primary-500/10'
                      badgeClass = 'bg-primary-500 text-white'
                      textClass = 'text-primary-700 font-medium'
                    }

                    return (
                      <button key={o.id} onClick={() => !answered && selectAnswer(currentPergunta.id, o.id)}
                        disabled={answered}
                        className={`w-full text-left flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-300 ${borderClass}`}>
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${badgeClass}`}>
                          {answered && isCorrectOption ? '\u2713' : answered && isSelected && !isCorrectOption ? '\u2717' : letter}
                        </span>
                        <span className={`text-sm leading-snug ${textClass}`}>{o.texto}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Feedback after answering */}
                {answered && (
                  <div className={`p-4 rounded-2xl animate-fade-in ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                    <p className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                      {isCorrect ? 'Correto!' : 'Resposta incorreta'}
                    </p>
                    {currentPergunta.explicacao && (
                      <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{currentPergunta.explicacao}</p>
                    )}
                    {currentPergunta.referencias?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {currentPergunta.referencias.map((r: any, ri: number) => (
                          <p key={ri} className="text-[10px] text-gray-500 italic">
                            {r.texto}: "{r.conteudo}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <button onClick={prevStep} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Anterior
                  </button>
                  {answered && (
                    <button onClick={nextStep}
                      className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 animate-fade-in">
                      {currentPerguntaIdx === ponto.perguntas.length - 1
                        ? (ponto.compromissos_fe?.length > 0 ? 'Compromissos' : 'Finalizar')
                        : 'Próxima'}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}
                </div>
              </div>
              )
            })()}

            {/* STEP: Compromissos de Fé */}
            {isCompromissos && ponto.compromissos_fe?.length > 0 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-3">
                    Compromissos de Fé
                  </p>
                  <h2 className="text-xl font-bold text-gray-900">Seus compromissos</h2>
                  <p className="text-sm text-gray-500 mt-1">Marque os compromissos que deseja assumir com Deus</p>
                </div>

                <div className="space-y-3">
                  {ponto.compromissos_fe.map(c => (
                    <label key={c.id}
                      className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        compromissos[c.id]
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}>
                      <input type="checkbox" checked={compromissos[c.id] || false}
                        onChange={e => setCompromissos(prev => ({ ...prev, [c.id]: e.target.checked }))}
                        className="mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500 w-5 h-5" />
                      <span className="text-sm text-gray-700 leading-relaxed">{c.texto}</span>
                    </label>
                  ))}
                </div>

                {captchaEnabled && turnstileSiteKey && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Confirme a verificação para enviar</p>
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      action="eb_quiz"
                      resetKey={captchaResetKey}
                      onSuccess={handleCaptchaSuccess}
                      onExpire={handleCaptchaExpire}
                      onError={handleCaptchaError}
                    />
                  </div>
                )}

                <button onClick={submitQuiz}
                  disabled={submitting || Object.keys(respostas).length < ponto.perguntas.length || (captchaEnabled && !captchaToken)}
                  className="w-full bg-gradient-to-r from-primary-600 to-emerald-600 hover:from-primary-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Enviar Respostas</>
                  )}
                </button>

                {error && (
                  <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg p-2">{error}</p>
                )}
              </div>
            )}

            {/* If no compromissos, show submit after last question */}
            {!isIntro && !isCompromissos && currentPerguntaIdx === ponto.perguntas.length - 1 && !ponto.compromissos_fe?.length && respostas[currentPergunta?.id] && (
              <div className="mt-6 space-y-3 animate-fade-in">
                {captchaEnabled && turnstileSiteKey && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Confirme a verificação para enviar</p>
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      action="eb_quiz"
                      resetKey={captchaResetKey}
                      onSuccess={handleCaptchaSuccess}
                      onExpire={handleCaptchaExpire}
                      onError={handleCaptchaError}
                    />
                  </div>
                )}
                <button onClick={submitQuiz}
                  disabled={submitting || Object.keys(respostas).length < ponto.perguntas.length || (captchaEnabled && !captchaToken)}
                  className="w-full bg-gradient-to-r from-primary-600 to-emerald-600 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50">
                  {submitting ? 'Enviando...' : 'Enviar Respostas'}
                </button>
                {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ---- LOADING PONTO ----
  if (loadingPonto) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  // ---- BROWSE AULAS (authenticated, enrolled) ----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-500 p-6 pb-16 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <HiOutlineAcademicCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{classe.nome}</h1>
              <p className="text-white/70 text-sm">
                {igrejaNome}{classe.instrutor_nome && ` \u2022 Prof. ${classe.instrutor_nome}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            {classe.modulo_titulo && (
              <span className="text-xs px-3 py-1 rounded-full bg-white/20 font-medium">{classe.modulo_titulo}</span>
            )}
            <span className="text-xs text-white/60">{classe.total_licoes} pontos</span>
          </div>
          {/* Logged-in user badge */}
          <div className="mt-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-white/70">{userName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-10 space-y-4 pb-8">
        {/* Aulas disponíveis */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <HiOutlineBookOpen className="w-4 h-4" /> Aulas Disponíveis
          </h2>
          {aulas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma aula disponível no momento.</p>
          ) : (
            <div className="space-y-2">
              {aulas.map(a => (
                <button key={a.id}
                  onClick={() => a.questionario_liberado ? loadPonto(a) : null}
                  disabled={!a.questionario_liberado}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    a.questionario_liberado
                      ? 'hover:bg-blue-50 hover:shadow-sm border border-blue-200 bg-white'
                      : 'bg-gray-50 border border-gray-100 opacity-60 cursor-not-allowed'
                  }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                    a.questionario_liberado
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {a.ponto_numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {a.ponto_titulo || `Ponto ${a.ponto_numero}`}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {a.questionario_liberado ? 'Questionário disponível' : 'Aguardando liberação'}
                    </p>
                  </div>
                  {a.questionario_liberado ? (
                    <HiOutlineClipboardCheck className="w-5 h-5 text-blue-500 shrink-0" />
                  ) : (
                    <HiOutlineLockClosed className="w-5 h-5 text-gray-300 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

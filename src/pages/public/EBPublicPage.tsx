import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  HiOutlineAcademicCap, HiOutlineCheck, HiOutlineChevronLeft,
  HiOutlineBookOpen, HiOutlineStar, HiOutlineClipboardCheck,
  HiOutlineLockClosed, HiOutlineUserCircle, HiOutlineThumbUp,
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
  pessoa: { nome: string } | { nome: string }[] | null
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
  const [classe, setClasse] = useState<ClasseInfo | null>(null)
  const [alunos, setAlunos] = useState<AlunoInfo[]>([])
  const [aulas, setAulas] = useState<AulaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Step: identify → browse → quiz
  const [selectedAluno, setSelectedAluno] = useState<AlunoInfo | null>(null)
  const [selectedAula, setSelectedAula] = useState<AulaInfo | null>(null)
  const [ponto, setPonto] = useState<PontoInfo | null>(null)
  const [loadingPonto, setLoadingPonto] = useState(false)

  // Quiz state
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [compromissos, setCompromissos] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState({ corretas: 0, total: 0 })
  const [submitting, setSubmitting] = useState(false)

  // NPS state
  const [npsNota, setNpsNota] = useState<number | null>(null)
  const [npsComentario, setNpsComentario] = useState('')
  const [npsSent, setNpsSent] = useState(false)

  useEffect(() => {
    if (classeId) loadClasse()
  }, [classeId])

  async function loadClasse() {
    setLoading(true)
    try {
      const { data: classeData, error: err } = await supabase
        .from('classes_biblicas')
        .select('id, nome, modulo_id, modulo_titulo, total_licoes, instrutor_nome, status, igreja:igrejas(nome)')
        .eq('id', classeId!)
        .single()

      if (err || !classeData) { setError('Classe não encontrada'); setLoading(false); return }
      setClasse(classeData)

      const [alunosRes, aulasRes] = await Promise.all([
        supabase.from('classe_biblica_alunos')
          .select('id, pessoa_id, licoes_concluidas, pessoa:pessoas(nome)')
          .eq('classe_id', classeId!).order('created_at'),
        supabase.from('classe_biblica_aulas')
          .select('id, ponto_numero, ponto_titulo, questionario_liberado')
          .eq('classe_id', classeId!).eq('ativada', true).order('ponto_numero'),
      ])

      setAlunos(alunosRes.data || [])
      setAulas(aulasRes.data || [])
    } catch (e) {
      setError('Erro ao carregar classe')
    } finally {
      setLoading(false)
    }
  }

  async function loadPonto(aula: AulaInfo) {
    if (!classe?.modulo_id) return
    setSelectedAula(aula)
    setLoadingPonto(true)
    const { data } = await supabase
      .from('eb_pontos')
      .select('*')
      .eq('modulo_id', classe.modulo_id)
      .eq('ponto_numero', aula.ponto_numero)
      .single()
    setPonto(data || null)
    setRespostas({})
    setCompromissos({})
    setSubmitted(false)
    setLoadingPonto(false)
  }

  async function submitQuiz() {
    if (!ponto || !selectedAluno || !selectedAula || !classe) return
    setSubmitting(true)

    let corretas = 0
    const total = ponto.perguntas.length
    for (const p of ponto.perguntas) {
      if (respostas[p.id] === p.resposta_correta) corretas++
    }
    const percentual = total > 0 ? Math.round((corretas / total) * 100) : 0

    await supabase.from('classe_biblica_respostas').insert({
      classe_id: classe.id,
      aluno_id: selectedAluno.id,
      aluno_nome: getNome(selectedAluno),
      ponto_numero: ponto.ponto_numero,
      ponto_titulo: ponto.titulo,
      pontuacao: corretas,
      total_perguntas: total,
      percentual_acerto: percentual,
      respostas,
      compromissos,
    })

    // Update licoes_concluidas
    await supabase.from('classe_biblica_alunos').update({
      licoes_concluidas: selectedAluno.licoes_concluidas + 1,
    }).eq('id', selectedAluno.id)

    setScore({ corretas, total })
    setSubmitted(true)
    setSubmitting(false)
  }

  async function submitNps() {
    if (npsNota === null || !selectedAluno || !selectedAula || !classe) return
    await supabase.from('eb_nps').insert({
      classe_id: classe.id,
      aluno_id: selectedAluno.id,
      aula_id: selectedAula.id,
      ponto_numero: selectedAula.ponto_numero,
      nota: npsNota,
      comentario: npsComentario || null,
    })
    setNpsSent(true)
  }

  function getNome(a: AlunoInfo) {
    return Array.isArray(a.pessoa) ? a.pessoa[0]?.nome || '—' : (a.pessoa as any)?.nome || '—'
  }

  const igrejaNome = classe ? (Array.isArray(classe.igreja) ? classe.igreja[0]?.nome : (classe.igreja as any)?.nome) : ''

  // ---- LOADING ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Carregando classe...</p>
        </div>
      </div>
    )
  }

  // ---- ERROR ----
  if (error || !classe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card p-8 text-center max-w-sm">
          <HiOutlineAcademicCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800">Classe não encontrada</h1>
          <p className="text-sm text-gray-500 mt-2">Verifique se o link está correto ou entre em contato com seu professor.</p>
        </div>
      </div>
    )
  }

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
          <div className="card p-5 space-y-3">
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

          {/* NPS */}
          <div className="card p-5">
            {npsSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-2">
                  <HiOutlineCheck className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-700">Obrigado pela sua avaliação!</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-700 text-center mb-3">
                  O quanto você gostou desta aula?
                </h3>
                <div className="flex justify-center gap-1.5 mb-3 flex-wrap">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setNpsNota(n)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                        npsNota === n
                          ? n <= 6 ? 'bg-red-500 text-white scale-110' : n <= 8 ? 'bg-yellow-500 text-white scale-110' : 'bg-green-500 text-white scale-110'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-4 px-1">
                  <span>Não gostei</span>
                  <span>Adorei!</span>
                </div>
                {npsNota !== null && (
                  <>
                    <textarea value={npsComentario} onChange={e => setNpsComentario(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 mb-3"
                      placeholder="Deixe um comentário (opcional)..." rows={2} />
                    <button onClick={submitNps}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
                      Enviar avaliação
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <button onClick={() => { setSelectedAula(null); setPonto(null); setSubmitted(false); setNpsNota(null); setNpsSent(false); setNpsComentario('') }}
            className="w-full btn-primary py-3 text-center">
            Voltar às Aulas
          </button>
        </div>
      </div>
    )
  }

  // ---- QUIZ SCREEN ----
  if (selectedAula && ponto) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto space-y-4">
          <button onClick={() => { setSelectedAula(null); setPonto(null) }}
            className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1">
            <HiOutlineChevronLeft className="w-4 h-4" /> Voltar
          </button>

          {/* Header */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
            <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">
              Ponto {ponto.ponto_numero}
            </p>
            <h2 className="text-lg font-bold mt-1">{ponto.titulo}</h2>
            {ponto.subtitulo && <p className="text-blue-200 text-sm mt-0.5">{ponto.subtitulo}</p>}
          </div>

          {/* Conteúdo introdutório */}
          {ponto.introducao && (
            <div className="card p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ponto.introducao}</p>
            </div>
          )}

          {/* Perguntas */}
          {ponto.perguntas.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <HiOutlineClipboardCheck className="w-4 h-4" /> Questionário
              </h3>
              {ponto.perguntas.map((p, idx) => (
                <div key={p.id} className="card p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-800">
                    <span className="text-primary-600 font-bold">{idx + 1}.</span> {p.texto}
                  </p>
                  <div className="space-y-1.5">
                    {p.opcoes.map(o => (
                      <button key={o.id} onClick={() => setRespostas(prev => ({ ...prev, [p.id]: o.id }))}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-sm ${
                          respostas[p.id] === o.id
                            ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-primary-300 hover:bg-gray-50'
                        }`}>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          respostas[p.id] === o.id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {o.id.toUpperCase()}
                        </span>
                        {o.texto}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Compromissos */}
          {ponto.compromissos_fe && ponto.compromissos_fe.length > 0 && (
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <HiOutlineStar className="w-4 h-4" /> Compromissos de Fé
              </h3>
              {ponto.compromissos_fe.map(c => (
                <label key={c.id} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={compromissos[c.id] || false}
                    onChange={e => setCompromissos(prev => ({ ...prev, [c.id]: e.target.checked }))}
                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">{c.texto}</span>
                </label>
              ))}
            </div>
          )}

          {/* Submit */}
          {ponto.perguntas.length > 0 && (
            <button onClick={submitQuiz} disabled={submitting || Object.keys(respostas).length < ponto.perguntas.length}
              className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
                Object.keys(respostas).length >= ponto.perguntas.length
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/25'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {submitting ? 'Enviando...' : `Enviar Respostas (${Object.keys(respostas).length}/${ponto.perguntas.length})`}
            </button>
          )}
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

  // ---- SELECT STUDENT + BROWSE AULAS ----
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
                {igrejaNome}{classe.instrutor_nome && ` • Prof. ${classe.instrutor_nome}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            {classe.modulo_titulo && (
              <span className="text-xs px-3 py-1 rounded-full bg-white/20 font-medium">{classe.modulo_titulo}</span>
            )}
            <span className="text-xs text-white/60">{classe.total_licoes} pontos</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-10 space-y-4 pb-8">
        {/* Identificação */}
        {!selectedAluno ? (
          <div className="card p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <HiOutlineUserCircle className="w-5 h-5" /> Quem é você?
            </h2>
            <p className="text-xs text-gray-500 mb-4">Selecione seu nome para acessar as aulas e questionários.</p>
            <div className="space-y-1">
              {alunos.map(a => (
                <button key={a.id} onClick={() => setSelectedAluno(a)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary-50 text-left transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {getNome(a).charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{getNome(a)}</p>
                    <p className="text-[10px] text-gray-400">{a.licoes_concluidas} lições concluídas</p>
                  </div>
                </button>
              ))}
            </div>
            {alunos.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum aluno matriculado nesta turma.</p>
            )}
          </div>
        ) : (
          <>
            {/* Aluno selecionado */}
            <div className="card p-4 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold">
                  {getNome(selectedAluno).charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{getNome(selectedAluno)}</p>
                  <p className="text-[10px] text-gray-400">{selectedAluno.licoes_concluidas} lições concluídas</p>
                </div>
              </div>
              <button onClick={() => setSelectedAluno(null)} className="text-xs text-gray-400 hover:text-gray-600">
                Trocar
              </button>
            </div>

            {/* Aulas disponíveis */}
            <div className="card p-5">
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
          </>
        )}
      </div>
    </div>
  )
}

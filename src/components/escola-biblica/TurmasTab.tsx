import { useEffect, useState } from 'react'
import { toastSuccess, toastError } from '@/lib/toast'
import DateDropdowns from '@/components/ui/DateDropdowns'
import { useAuth } from '@/contexts/AuthContext'
import {
  useAddAlunoClasseBiblica,
  useAtivarAulaClasseBiblica,
  useClasseBiblicaDetail,
  useClasseBiblicaPontosDisponiveis,
  useClassesBiblicas,
  useCreateInteressadoClasseBiblica,
  useCreateClasseBiblica,
  useLiberarQuestionarioClasseBiblica,
  useRemoveAlunoClasseBiblica,
  useRegistrarBatismoClasseBiblica,
  useSearchPessoasClasse,
  useToggleDecisaoClasseBiblica,
  type ClasseBiblicaAluno,
  type ClasseBiblicaAula,
  type ClasseBiblicaListItem,
} from '@/hooks/useClassesBiblicas'
import {
  useClasseBiblicaTurmaExtras,
  useCreateClasseBiblicaInteracao,
  useSaveClasseBiblicaDiario,
} from '@/hooks/useClasseBiblicaTurmaExtras'
import { useScopedIgrejas } from '@/hooks/useScopedIgrejas'
import {
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineSearch,
  HiOutlineClipboardCheck,
  HiOutlineLink,
  HiOutlineLockOpen,
  HiOutlineLockClosed,
  HiOutlineDocumentText,
  HiOutlineChevronLeft,
} from 'react-icons/hi'

type TurmaEB = ClasseBiblicaListItem
type AlunoEB = ClasseBiblicaAluno
type AulaEB = ClasseBiblicaAula

function formatDate(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('pt-BR')
  } catch {
    return d
  }
}

function TabTurmas() {
  const { profile } = useAuth()
  const { igrejas: scopedIgrejas } = useScopedIgrejas()
  const {
    classes: turmasData,
    loading,
    error: turmasError,
    refetch: refetchTurmas,
  } = useClassesBiblicas()
  const turmas = turmasData as TurmaEB[]
  const [selectedTurma, setSelectedTurma] = useState<TurmaEB | null>(null)
  const {
    detail: turmaDetail,
    loading: loadingTurmaDetail,
    error: turmaDetailError,
    refetch: refetchTurmaDetail,
  } = useClasseBiblicaDetail(selectedTurma?.id)
  const alunos = (turmaDetail?.alunos as AlunoEB[]) ?? []
  const aulas = (turmaDetail?.aulas as AulaEB[]) ?? []
  const {
    pontosDisponiveis,
    loading: loadingPontosDisponiveis,
    error: pontosDisponiveisError,
  } = useClasseBiblicaPontosDisponiveis(selectedTurma?.modulo_id, aulas)
  const {
    interacoes,
    diario,
    loading: loadingTurmaExtras,
    error: turmaExtrasError,
    refetch: refetchTurmaExtras,
  } = useClasseBiblicaTurmaExtras(selectedTurma?.id)

  // Create turma
  const [showNova, setShowNova] = useState(false)
  const [novaTurma, setNovaTurma] = useState({
    nome: '',
    modulo_id: 'principios_fe' as string,
    data_inicio: '',
    igreja_id: '',
  })

  // Add student
  const [showAddAluno, setShowAddAluno] = useState(false)
  const [alunoSearch, setAlunoSearch] = useState('')
  const {
    pessoas: alunoResults,
    loading: searchingAluno,
    error: alunoResultsError,
  } = useSearchPessoasClasse(
    alunoSearch,
    selectedTurma?.igreja_id || '',
    alunos.map((aluno) => aluno.pessoa_id),
    showAddAluno && !!selectedTurma,
  )

  // Create new student (interessado)
  const [showNovoAluno, setShowNovoAluno] = useState(false)
  const [novoAluno, setNovoAluno] = useState({ nome: '', celular: '', email: '', tipo: 'interessado' })

  // Activate lesson
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [novaAula, setNovaAula] = useState({ ponto_numero: 0, ponto_titulo: '', presentes: [] as string[] })

  const [detailTab, setDetailTab] = useState<'alunos' | 'aulas' | 'interacoes' | 'diario'>('alunos')

  // Professor interactions
  const [showNovaInteracao, setShowNovaInteracao] = useState<string | null>(null)
  const [interacaoForm, setInteracaoForm] = useState({ tipo: 'visita', descricao: '', pedido_oracao: false, data: new Date().toISOString().slice(0, 10) })

  // DiÃ¡rio de turma
  const [showNovoDiario, setShowNovoDiario] = useState(false)
  const [diarioForm, setDiarioForm] = useState({ data: new Date().toISOString().slice(0, 10), ponto_numero: 0, ponto_titulo: '', resumo: '', observacoes: '', presentes: 0, ausentes: 0 })
  const [savingNovoAluno, setSavingNovoAluno] = useState(false)
  const [processingAlunoId, setProcessingAlunoId] = useState<string | null>(null)
  const [registeringBatismoId, setRegisteringBatismoId] = useState<string | null>(null)
  const [showBatismoAlunoId, setShowBatismoAlunoId] = useState<string | null>(null)
  const [batismoDate, setBatismoDate] = useState(new Date().toISOString().slice(0, 10))
  const [savingInteracaoAlunoId, setSavingInteracaoAlunoId] = useState<string | null>(null)
  const [copyingLink, setCopyingLink] = useState(false)
  const loadingDetail = loadingTurmaDetail || loadingTurmaExtras

  const createTurmaMutation = useCreateClasseBiblica()
  const addAlunoMutation = useAddAlunoClasseBiblica()
  const removeAlunoMutation = useRemoveAlunoClasseBiblica()
  const toggleDecisaoMutation = useToggleDecisaoClasseBiblica()
  const ativarAulaMutation = useAtivarAulaClasseBiblica()
  const liberarQuestionarioMutation = useLiberarQuestionarioClasseBiblica()
  const createInteressadoMutation = useCreateInteressadoClasseBiblica()
  const registrarBatismoMutation = useRegistrarBatismoClasseBiblica()
  const saveDiarioMutation = useSaveClasseBiblicaDiario()
  const createInteracaoMutation = useCreateClasseBiblicaInteracao()

  useEffect(() => {
    if (scopedIgrejas.length === 1 && !novaTurma.igreja_id) {
      setNovaTurma((prev) => ({ ...prev, igreja_id: scopedIgrejas[0].id }))
    }
  }, [scopedIgrejas, novaTurma.igreja_id])

  useEffect(() => {
    if (!selectedTurma) return

    const turmaAtualizada = turmas.find((turma) => turma.id === selectedTurma.id)
    if (turmaAtualizada) {
      setSelectedTurma(turmaAtualizada)
    }
  }, [turmas, selectedTurma?.id])

  async function criarTurma() {
    if (!profile) return
    if (!novaTurma.nome.trim()) {
      toastError('Informe o nome da turma.')
      return
    }

    const igrejaId = novaTurma.igreja_id || scopedIgrejas[0]?.id || profile.igreja_id || ''
    if (!igrejaId) {
      toastError('Selecione a igreja da turma.')
      return
    }

    const moduloTitulos: Record<string, string> = {
      principios_fe: 'PrincÃ­pios de FÃ©',
      crencas_fundamentais: 'CrenÃ§as Fundamentais',
    }
    const moduloPontos: Record<string, number> = { principios_fe: 37, crencas_fundamentais: 25 }
    const igrejaSelecionada = scopedIgrejas.find((igreja) => igreja.id === igrejaId)

    try {
      await createTurmaMutation.mutateAsync({
        nome: novaTurma.nome.trim(),
        igreja_id: igrejaId,
        instrutor_id: profile.id,
        instrutor_nome: profile.nome || null,
        data_inicio: novaTurma.data_inicio || null,
        total_licoes: moduloPontos[novaTurma.modulo_id] || 37,
        modulo_id: novaTurma.modulo_id,
        modulo_titulo: moduloTitulos[novaTurma.modulo_id] || null,
        formato_typeform: novaTurma.modulo_id === 'crencas_fundamentais',
        associacao_id: igrejaSelecionada?.associacao_id || profile.associacao_id || null,
        uniao_id: igrejaSelecionada?.uniao_id || profile.uniao_id || null,
      })

      toastSuccess('Turma criada com sucesso.')
      setShowNova(false)
      setNovaTurma({ nome: '', modulo_id: 'principios_fe', data_inicio: '', igreja_id: igrejaId })
    } catch (error) {
      console.error('Erro ao criar turma:', error)
      toastError('Nao foi possivel criar a turma agora.')
    }
  }

  function openTurma(turma: TurmaEB) {
    setSelectedTurma(turma)
    setDetailTab('alunos')
  }

  async function searchAlunos(q: string) {
    setAlunoSearch(q)
  }

  async function addAluno(pessoaId: string) {
    if (!selectedTurma) return
    try {
      await addAlunoMutation.mutateAsync({ classe_id: selectedTurma.id, pessoa_id: pessoaId })
      toastSuccess('Aluno adicionado com sucesso.')
      setShowAddAluno(false)
      setAlunoSearch('')
    } catch (error) {
      console.error('Erro ao adicionar aluno:', error)
      toastError('Nao foi possivel adicionar o aluno agora.')
    }
  }

  async function criarNovoAluno() {
    if (!novoAluno.nome.trim() || !selectedTurma || !profile) return
    try {
      setSavingNovoAluno(true)
      const igrejaSelecionada = scopedIgrejas.find((igreja) => igreja.id === selectedTurma.igreja_id)
      await createInteressadoMutation.mutateAsync({
        classe_id: selectedTurma.id,
        nome: novoAluno.nome,
        celular: novoAluno.celular || null,
        email: novoAluno.email || null,
        tipo: novoAluno.tipo,
        igreja_id: selectedTurma.igreja_id,
        associacao_id: igrejaSelecionada?.associacao_id || profile.associacao_id,
        uniao_id: igrejaSelecionada?.uniao_id || profile.uniao_id,
      })
      toastSuccess('Interessado cadastrado e matriculado com sucesso.')
      setShowNovoAluno(false)
      setNovoAluno({ nome: '', celular: '', email: '', tipo: 'interessado' })
    } catch (error) {
      console.error('Erro ao criar novo aluno:', error)
      toastError('Nao foi possivel cadastrar o interessado agora.')
    } finally {
      setSavingNovoAluno(false)
    }
  }

  async function removeAluno(alunoId: string) {
    if (!selectedTurma || !confirm('Remover este aluno da turma?')) return
    try {
      await removeAlunoMutation.mutateAsync({ aluno_id: alunoId })
      toastSuccess('Aluno removido da turma.')
    } catch (error) {
      console.error('Erro ao remover aluno:', error)
      toastError('Nao foi possivel remover o aluno agora.')
    }
  }

  async function toggleDecisao(a: AlunoEB) {
    try {
      setProcessingAlunoId(a.id)
      await toggleDecisaoMutation.mutateAsync({
        aluno_id: a.id,
        pessoa_id: a.pessoa_id,
        decisao_atual: a.decisao_batismo,
      })
      toastSuccess(a.decisao_batismo ? 'Decisao removida.' : 'Decisao registrada.')
    } catch (error) {
      console.error('Erro ao atualizar decisao:', error)
      toastError('Nao foi possivel atualizar a decisao agora.')
    } finally {
      setProcessingAlunoId(null)
    }
  }

  async function registrarBatismo(a: AlunoEB, dataBatismoISO: string) {
    try {
      setRegisteringBatismoId(a.id)
      if (!dataBatismoISO) {
        toastError('Informe a data do batismo.')
        return
      }

      await registrarBatismoMutation.mutateAsync({
        aluno_id: a.id,
        pessoa_id: a.pessoa_id,
        data_batismo: dataBatismoISO,
      })

      toastSuccess(`Batismo de ${getNome(a)} registrado com sucesso.`)
      setShowBatismoAlunoId(null)
      setBatismoDate(new Date().toISOString().slice(0, 10))
    } catch (error) {
      console.error('Erro ao registrar batismo:', error)
      toastError('Nao foi possivel registrar o batismo agora.')
    } finally {
      setRegisteringBatismoId(null)
    }
  }

  async function ativarAula() {
    if (!selectedTurma || !profile) return
    try {
      await ativarAulaMutation.mutateAsync({
        classe_id: selectedTurma.id,
        ponto_numero: novaAula.ponto_numero,
        ponto_titulo: novaAula.ponto_titulo,
        presentes: novaAula.presentes,
        alunos,
        professor_id: profile.id,
        professor_nome: profile.nome || null,
      })
      toastSuccess('Aula ativada com sucesso.')
      setShowNovaAula(false)
      setNovaAula({ ponto_numero: novaAula.ponto_numero + 1, ponto_titulo: '', presentes: [] })
    } catch (error) {
      console.error('Erro ao ativar aula:', error)
      toastError('Nao foi possivel ativar a aula agora.')
    }
  }

  async function liberarQuestionario(aulaId: string) {
    try {
      await liberarQuestionarioMutation.mutateAsync({
        aula_id: aulaId,
        profile_id: profile?.id || null,
      })
      toastSuccess('Questionario liberado para a turma.')
    } catch (error) {
      console.error('Erro ao liberar questionario:', error)
      toastError('Nao foi possivel liberar o questionario agora.')
    }
  }

  async function salvarDiario() {
    if (!selectedTurma || !profile || !diarioForm.resumo.trim()) return
    try {
      await saveDiarioMutation.mutateAsync({
        classe_id: selectedTurma.id,
        data: diarioForm.data,
        ponto_numero: diarioForm.ponto_numero || null,
        ponto_titulo: diarioForm.ponto_titulo || null,
        resumo: diarioForm.resumo,
        observacoes: diarioForm.observacoes || null,
        presentes: diarioForm.presentes,
        ausentes: diarioForm.ausentes,
        professor_id: profile.id,
        professor_nome: profile.nome || null,
      })
      toastSuccess('Diario salvo com sucesso.')
      setShowNovoDiario(false)
      setDiarioForm({ data: new Date().toISOString().slice(0, 10), ponto_numero: 0, ponto_titulo: '', resumo: '', observacoes: '', presentes: 0, ausentes: 0 })
      await refetchTurmaExtras()
    } catch (error) {
      console.error('Erro ao salvar diario:', error)
      toastError('Nao foi possivel salvar o diario agora.')
    }
  }

  async function registrarInteracao(alunoId: string) {
    if (!selectedTurma || !profile || !interacaoForm.tipo) return
    try {
      setSavingInteracaoAlunoId(alunoId)
      await createInteracaoMutation.mutateAsync({
        classe_id: selectedTurma.id,
        aluno_id: alunoId,
        professor_id: profile.id,
        professor_nome: profile.nome || null,
        tipo: interacaoForm.tipo,
        descricao: interacaoForm.descricao || null,
        pedido_oracao: interacaoForm.pedido_oracao,
        data_interacao: interacaoForm.data,
      })
      toastSuccess('Interacao registrada com sucesso.')
      setShowNovaInteracao(null)
      setInteracaoForm({ tipo: 'visita', descricao: '', pedido_oracao: false, data: new Date().toISOString().slice(0, 10) })
      await refetchTurmaExtras()
    } catch (error) {
      console.error('Erro ao registrar interacao:', error)
      toastError('Nao foi possivel registrar a interacao agora.')
    } finally {
      setSavingInteracaoAlunoId(null)
    }
  }

  function openWhatsApp(celular: string | null, nomeAluno: string) {
    if (!celular) {
      toastError('Este aluno nao possui celular cadastrado.')
      return
    }
    const num = celular.replace(/\D/g, '')
    if (num.length < 10) {
      toastError('O numero do aluno parece incompleto.')
      return
    }
    const msg = encodeURIComponent(`OlÃ¡ ${nomeAluno}, tudo bem? Estou entrando em contato sobre a Escola BÃ­blica.`)
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank')
  }

  function getNome(a: AlunoEB) {
    return Array.isArray(a.pessoa) ? a.pessoa[0]?.nome || 'â€”' : (a.pessoa as any)?.nome || 'â€”'
  }

  function getCelular(a: AlunoEB) {
    return Array.isArray(a.pessoa) ? a.pessoa[0]?.celular : (a.pessoa as any)?.celular
  }

  async function copyLink(turmaId: string) {
    const url = `${window.location.origin}/eb/${turmaId}`
    try {
      setCopyingLink(true)
      await navigator.clipboard.writeText(url)
      toastSuccess('Link copiado. Agora voce pode enviar para os alunos.')
    } catch (error) {
      console.error('Erro ao copiar link da turma:', error)
      toastError('Nao foi possivel copiar o link agora.')
    } finally {
      setCopyingLink(false)
    }
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
          <HiOutlineChevronLeft className="w-4 h-4" /> Voltar Ã s turmas
        </button>

        {/* Turma Header */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{selectedTurma.nome}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {igrejaNome}{selectedTurma.data_inicio && ` â€¢ InÃ­cio: ${formatDate(selectedTurma.data_inicio)}`}
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
              { v: decisoes, l: 'DecisÃµes', c: 'text-green-600' },
              { v: aulas.length, l: 'Aulas', c: 'text-blue-600' },
              { v: aulas.filter(a => a.questionario_liberado).length, l: 'QuestionÃ¡rios', c: 'text-purple-600' },
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
              className="flex-1 flex items-center justify-center gap-2 bg-primary-50 text-primary-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-100 transition-colors disabled:opacity-60"
              disabled={copyingLink}>
              <HiOutlineLink className="w-4 h-4" />
              {copyingLink ? 'Copiando link...' : 'Copiar Link para Alunos'}
            </button>
          </div>
        </div>

        {(turmaDetailError || turmaExtrasError) && (
          <div className="card border border-red-200 bg-red-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">Nao foi possivel carregar todos os detalhes da turma.</p>
                <p className="text-xs text-red-600 mt-1">{turmaDetailError || turmaExtrasError}</p>
              </div>
              <button
                onClick={() => {
                  void refetchTurmaDetail()
                  void refetchTurmaExtras()
                }}
                className="btn-secondary text-sm w-fit"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[
            { id: 'alunos' as const, label: 'Alunos', icon: HiOutlineUserGroup },
            { id: 'aulas' as const, label: 'Aulas', icon: HiOutlineAcademicCap },
            { id: 'interacoes' as const, label: `InteraÃ§Ãµes (${interacoes.length})`, icon: HiOutlineClipboardCheck },
            { id: 'diario' as const, label: `DiÃ¡rio (${diario.length})`, icon: HiOutlineDocumentText },
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
                  <button onClick={() => setShowNovoAluno(false)} className="btn-secondary text-xs" disabled={savingNovoAluno}>Cancelar</button>
                  <button onClick={criarNovoAluno} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg"
                    disabled={!novoAluno.nome.trim() || savingNovoAluno}>
                    {savingNovoAluno ? 'Cadastrando...' : 'Cadastrar e Matricular'}
                  </button>
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
                {alunoResultsError && (
                  <p className="text-xs text-red-600">Nao foi possivel buscar pessoas agora.</p>
                )}
                {!searchingAluno && !alunoResultsError && alunoSearch.trim().length >= 2 && alunoResults.length === 0 && (
                  <p className="text-xs text-gray-500">Nenhuma pessoa encontrada para esta igreja.</p>
                )}
                {alunoResults.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {alunoResults.map(p => (
                      <button key={p.id} onClick={() => addAluno(p.id)}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-primary-50 text-gray-700 disabled:opacity-60"
                        disabled={addAlunoMutation.isPending}>
                        {addAlunoMutation.isPending ? 'Adicionando...' : p.nome}
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
                {alunos.map(a => {
                  const batismoPanelOpen = showBatismoAlunoId === a.id

                  return (
                  <div key={a.id} className="space-y-2">
                    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {getNome(a).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{getNome(a)}</p>
                      <p className="text-[10px] text-gray-400">
                        {a.licoes_concluidas} liÃ§Ãµes
                        {getCelular(a) && ` â€¢ ${getCelular(a)}`}
                      </p>
                    </div>
                    {a.decisao_batismo && (a as any).status !== 'batizado' && (
                      <button onClick={() => {
                        if (batismoPanelOpen) {
                          setShowBatismoAlunoId(null)
                          return
                        }

                        setBatismoDate(new Date().toISOString().slice(0, 10))
                        setShowBatismoAlunoId(a.id)
                      }}
                        className="text-xs px-2.5 py-1 rounded-lg border border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
                        disabled={registeringBatismoId === a.id}>
                        {registeringBatismoId === a.id ? 'Registrando...' : batismoPanelOpen ? 'Fechar Batismo' : 'Registrar Batismo'}
                      </button>
                    )}
                    {(a as any).status === 'batizado' ? (
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium">Batizado</span>
                    ) : (
                      <button onClick={() => toggleDecisao(a)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-60 ${
                          a.decisao_batismo
                            ? 'border-green-400 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-400 hover:border-green-300'
                        }`}
                        disabled={processingAlunoId === a.id}>
                        <HiOutlineCheck className="w-3.5 h-3.5 inline mr-0.5" />
                        {processingAlunoId === a.id ? 'Salvando...' : a.decisao_batismo ? 'DecisÃ£o âœ“' : 'Batismo?'}
                      </button>
                    )}
                    <button
                      onClick={() => removeAluno(a.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                      disabled={processingAlunoId === a.id || registeringBatismoId === a.id || removeAlunoMutation.isPending}
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                    </div>

                    {batismoPanelOpen && (
                      <div className="ml-12 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <p className="text-xs font-semibold text-blue-700">Confirmar batismo de {getNome(a)}</p>
                        <p className="text-[11px] text-blue-600 mt-1">Defina a data para atualizar a secretaria e concluir o fluxo da Escola Biblica.</p>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            type="date"
                            value={batismoDate}
                            onChange={(event) => setBatismoDate(event.target.value)}
                            className="input-field text-sm sm:max-w-[220px]"
                          />
                          <div className="flex gap-2 sm:ml-auto">
                            <button
                              onClick={() => setShowBatismoAlunoId(null)}
                              className="btn-secondary text-xs"
                              disabled={registeringBatismoId === a.id}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => registrarBatismo(a, batismoDate)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-60"
                              disabled={!batismoDate || registeringBatismoId === a.id}
                            >
                              {registeringBatismoId === a.id ? 'Salvando...' : 'Confirmar Batismo'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
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
                disabled={alunos.length === 0 || ativarAulaMutation.isPending}>
                <HiOutlinePlus className="w-3.5 h-3.5" /> {ativarAulaMutation.isPending ? 'Ativando...' : 'Ativar Aula'}
              </button>
            </div>

            {showNovaAula && alunos.length > 0 && (
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Selecione o ponto doutrinÃ¡rio</label>
                  {loadingPontosDisponiveis ? (
                    <p className="text-xs text-gray-500 bg-white rounded-lg p-2">Carregando pontos disponÃ­veis...</p>
                  ) : pontosDisponiveisError ? (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{pontosDisponiveisError}</p>
                  ) : pontosDisponiveis.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">Todos os pontos jÃ¡ foram ativados nesta turma.</p>
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
                          Ponto {p.ponto_numero} â€” {p.titulo}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-gray-400">PresenÃ§a</label>
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
                    <button onClick={() => setShowNovaAula(false)} className="btn-secondary text-xs" disabled={ativarAulaMutation.isPending}>Cancelar</button>
                    <button onClick={ativarAula} disabled={novaAula.ponto_numero === 0 || ativarAulaMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">
                      {ativarAulaMutation.isPending ? 'Ativando...' : 'Ativar'}
                    </button>
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
                        className="text-[10px] px-2.5 py-1 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 flex items-center gap-1 disabled:opacity-60"
                        disabled={liberarQuestionarioMutation.isPending}>
                        <HiOutlineLockClosed className="w-3 h-3" /> {liberarQuestionarioMutation.isPending ? 'Liberando...' : 'Liberar'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: DiÃ¡rio de Turma */}
        {detailTab === 'diario' && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">DiÃ¡rio de Turma</h3>
              <button onClick={() => setShowNovoDiario(!showNovoDiario)}
                className="btn-primary text-xs flex items-center gap-1">
                <HiOutlinePlus className="w-3.5 h-3.5" /> Novo Registro
              </button>
            </div>

            {/* Form novo diÃ¡rio */}
            {showNovoDiario && (
              <div className="p-4 bg-primary-50/30 border border-primary-200 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400">Data</label>
                    <DateDropdowns value={diarioForm.data} onChange={v => setDiarioForm(prev => ({ ...prev, data: v }))} yearRange={5} futureYears={1} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Ponto estudado</label>
                    {loadingPontosDisponiveis && (
                      <p className="text-xs text-gray-500 bg-white rounded-lg p-2 mt-1">Carregando pontos disponÃ­veis...</p>
                    )}
                    {pontosDisponiveisError && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2 mt-1">{pontosDisponiveisError}</p>
                    )}
                    <select value={diarioForm.ponto_numero}
                      onChange={e => {
                        const num = parseInt(e.target.value)
                        const p = pontosDisponiveis.find(p => p.ponto_numero === num)
                        setDiarioForm(prev => ({ ...prev, ponto_numero: num, ponto_titulo: p?.titulo || '' }))
                      }}
                      className="input-field text-sm"
                      disabled={loadingPontosDisponiveis || !!pontosDisponiveisError}>
                      <option value={0}>Selecione...</option>
                      {aulas.map(a => (
                        <option key={a.ponto_numero} value={a.ponto_numero}>Ponto {a.ponto_numero} â€” {a.ponto_titulo}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">Resumo da aula *</label>
                  <textarea value={diarioForm.resumo}
                    onChange={e => setDiarioForm(prev => ({ ...prev, resumo: e.target.value }))}
                    className="input-field text-sm min-h-[80px]"
                    placeholder="O que foi estudado, discussÃµes, pontos principais..." />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">ObservaÃ§Ãµes (opcional)</label>
                  <textarea value={diarioForm.observacoes}
                    onChange={e => setDiarioForm(prev => ({ ...prev, observacoes: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="Alunos que precisam de atenÃ§Ã£o, pendÃªncias..." rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400">Presentes</label>
                    <input type="number" value={diarioForm.presentes} min={0}
                      onChange={e => setDiarioForm(prev => ({ ...prev, presentes: parseInt(e.target.value) || 0 }))}
                      className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Ausentes</label>
                    <input type="number" value={diarioForm.ausentes} min={0}
                      onChange={e => setDiarioForm(prev => ({ ...prev, ausentes: parseInt(e.target.value) || 0 }))}
                      className="input-field text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNovoDiario(false)} className="btn-secondary text-xs" disabled={saveDiarioMutation.isPending}>Cancelar</button>
                  <button onClick={salvarDiario} className="btn-primary text-xs" disabled={!diarioForm.resumo.trim() || saveDiarioMutation.isPending}>
                    {saveDiarioMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de registros */}
            {diario.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum registro no diÃ¡rio</p>
            ) : (
              <div className="space-y-3">
                {diario.map(d => (
                  <div key={d.id} className="border border-gray-100 rounded-xl p-4 hover:border-primary-200 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-gray-400">{formatDate(d.data)}</p>
                        {d.ponto_titulo && (
                          <p className="text-sm font-medium text-gray-800 mt-0.5">
                            Ponto {d.ponto_numero}: {d.ponto_titulo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{d.presentes} presentes</span>
                        {d.ausentes > 0 && <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{d.ausentes} ausentes</span>}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{d.resumo}</p>
                    {d.observacoes && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2 italic">{d.observacoes}</p>
                    )}
                    <p className="text-[10px] text-gray-300 mt-2">Prof. {d.professor_nome || 'â€”'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: InteraÃ§Ãµes do Professor */}
        {detailTab === 'interacoes' && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Registro de InteraÃ§Ãµes</h3>
              <span className="text-xs text-gray-400">{interacoes.length} registros</span>
            </div>

            {/* AÃ§Ãµes rÃ¡pidas por aluno */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Selecione um aluno para registrar uma aÃ§Ã£o:</p>
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
                        <p className="text-[10px] text-gray-400">{alunoInteracoes.length} interaÃ§Ãµes</p>
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

                    {/* FormulÃ¡rio de interaÃ§Ã£o */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 space-y-3">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 flex gap-2">
                            {[
                              { id: 'visita', label: 'Visita', emoji: 'ðŸ ' },
                              { id: 'ligacao', label: 'LigaÃ§Ã£o', emoji: 'ðŸ“ž' },
                              { id: 'mensagem', label: 'Mensagem', emoji: 'ðŸ’¬' },
                              { id: 'oracao', label: 'OraÃ§Ã£o', emoji: 'ðŸ™' },
                            ].map(t => (
                              <button key={t.id} onClick={() => setInteracaoForm(prev => ({ ...prev, tipo: t.id }))}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                                  interacaoForm.tipo === t.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}>
                                {t.emoji} {t.label}
                              </button>
                            ))}
                          </div>
                          <div className="shrink-0">
                            <DateDropdowns value={interacaoForm.data} onChange={v => setInteracaoForm(prev => ({ ...prev, data: v }))} yearRange={2} futureYears={0} />
                          </div>
                        </div>
                        <textarea value={interacaoForm.descricao}
                          onChange={e => setInteracaoForm(prev => ({ ...prev, descricao: e.target.value }))}
                          className="input-field text-sm min-h-[60px]" placeholder="Descreva a interaÃ§Ã£o (opcional)..." />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={interacaoForm.pedido_oracao}
                              onChange={e => setInteracaoForm(prev => ({ ...prev, pedido_oracao: e.target.checked }))}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <span className="text-xs text-gray-600">Pedido de oraÃ§Ã£o</span>
                          </label>
                          <button onClick={() => registrarInteracao(a.id)}
                            className="bg-primary-600 hover:bg-primary-700 text-white text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                            disabled={savingInteracaoAlunoId === a.id || !interacaoForm.tipo}>
                            {savingInteracaoAlunoId === a.id ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* HistÃ³rico rÃ¡pido do aluno */}
                    {alunoInteracoes.length > 0 && !isOpen && (
                      <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
                        {alunoInteracoes.slice(0, 5).map(i => (
                          <span key={i.id} className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {i.tipo === 'visita' ? 'ðŸ ' : i.tipo === 'ligacao' ? 'ðŸ“ž' : i.tipo === 'mensagem' ? 'ðŸ’¬' : 'ðŸ™'}
                            {' '}{formatDate(i.data_interacao)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* HistÃ³rico geral */}
            {interacoes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2 mt-4">HistÃ³rico Completo</h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {interacoes.map(i => {
                    const aluno = alunos.find(a => a.id === i.aluno_id)
                    const nomeAluno = aluno ? getNome(aluno) : 'â€”'
                    return (
                      <div key={i.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 text-xs">
                        <span className="text-lg shrink-0">
                          {i.tipo === 'visita' ? 'ðŸ ' : i.tipo === 'ligacao' ? 'ðŸ“ž' : i.tipo === 'mensagem' ? 'ðŸ’¬' : 'ðŸ™'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-700">
                            <span className="text-primary-600">{i.professor_nome || 'Professor'}</span>
                            {' â†’ '}
                            <span>{nomeAluno}</span>
                          </p>
                          {i.descricao && <p className="text-gray-500 mt-0.5">{i.descricao}</p>}
                          {i.pedido_oracao && <span className="text-[10px] text-amber-600">Pedido de oraÃ§Ã£o</span>}
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
          <p className="text-xs text-gray-500">Gerencie suas turmas de estudo bÃ­blico</p>
        </div>
        <button onClick={() => setShowNova(!showNova)} className="btn-primary text-sm flex items-center gap-1.5">
          <HiOutlinePlus className="w-4 h-4" /> Nova Turma
        </button>
      </div>

      {turmasError && (
        <div className="card border border-red-200 bg-red-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Nao foi possivel carregar as turmas.</p>
              <p className="text-xs text-red-600 mt-1">{turmasError}</p>
            </div>
            <button onClick={() => refetchTurmas()} className="btn-secondary text-sm w-fit">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {showNova && (
        <div className="card p-5 space-y-4 border-primary-200">
          <h3 className="text-sm font-semibold text-gray-700">Criar Nova Turma</h3>
          {scopedIgrejas.length > 1 && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Igreja da turma</label>
              <select
                value={novaTurma.igreja_id}
                onChange={e => setNovaTurma(p => ({ ...p, igreja_id: e.target.value }))}
                className="input-field"
              >
                <option value="">Selecione uma igreja...</option>
                {scopedIgrejas.map((igreja) => (
                  <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
                ))}
              </select>
            </div>
          )}
          {scopedIgrejas.length === 1 && (
            <div className="rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
              <p className="text-xs text-primary-600 uppercase tracking-wide">Igreja vinculada</p>
              <p className="text-sm font-semibold text-primary-900 mt-1">{scopedIgrejas[0].nome}</p>
            </div>
          )}
          {scopedIgrejas.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">Nenhuma igreja disponivel neste escopo.</p>
              <p className="text-xs text-amber-700 mt-1">Revise a lotacao do usuario antes de criar uma turma.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setNovaTurma(p => ({ ...p, modulo_id: 'principios_fe' }))}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                novaTurma.modulo_id === 'principios_fe' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}>
              <p className="text-sm font-semibold text-gray-800">PrincÃ­pios de FÃ©</p>
              <p className="text-xs text-gray-500">37 pontos doutrinÃ¡rios</p>
            </button>
            <button type="button" onClick={() => setNovaTurma(p => ({ ...p, modulo_id: 'crencas_fundamentais' }))}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                novaTurma.modulo_id === 'crencas_fundamentais' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
              }`}>
              <p className="text-sm font-semibold text-gray-800">CrenÃ§as Fundamentais</p>
              <p className="text-xs text-gray-500">25 temas essenciais</p>
            </button>
          </div>
          <input value={novaTurma.nome} onChange={e => setNovaTurma(p => ({ ...p, nome: e.target.value }))}
            className="input-field" placeholder="Nome da turma (ex: Turma SÃ¡bado ManhÃ£ - Central)" autoFocus />
          <DateDropdowns label="Data de inÃ­cio" value={novaTurma.data_inicio} onChange={v => setNovaTurma(p => ({ ...p, data_inicio: v }))} yearRange={2} futureYears={1} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNova(false)} className="btn-secondary text-sm">Cancelar</button>
            <button
              onClick={criarTurma}
              className="btn-primary text-sm disabled:opacity-60"
              disabled={!novaTurma.nome.trim() || scopedIgrejas.length === 0 || createTurmaMutation.isPending}
            >
              {createTurmaMutation.isPending ? 'Criando...' : 'Criar Turma'}
            </button>
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
          <p className="text-xs text-gray-500">ConcluÃ­das</p>
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
                      {igNome}{t.instrutor_nome && ` â€¢ Prof. ${t.instrutor_nome}`}
                      {t.data_inicio && ` â€¢ ${formatDate(t.data_inicio)}`}
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



export default TabTurmas

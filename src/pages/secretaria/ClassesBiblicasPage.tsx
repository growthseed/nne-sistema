import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import DateDropdowns from '@/components/ui/DateDropdowns'
import { useAuth } from '@/contexts/AuthContext'
import {
  type ClasseBiblicaAluno as Aluno,
  type ClasseBiblicaListItem as ClasseBiblica,
  useAddAlunoClasseBiblica,
  useAtivarAulaClasseBiblica,
  useClasseBiblicaDetail,
  useClassesBiblicas,
  useCreateClasseBiblica,
  useLiberarQuestionarioClasseBiblica,
  useRegisterLicaoClasseBiblica,
  useRemoveAlunoClasseBiblica,
  useSearchPessoasClasse,
  useToggleDecisaoClasseBiblica,
} from '@/hooks/useClassesBiblicas'
import { useScopedIgrejas } from '@/hooks/useScopedIgrejas'
import { formatDateBR } from '@/lib/secretaria-constants'
import {
  HiOutlineAcademicCap,
  HiOutlineBookOpen,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUserGroup,
} from 'react-icons/hi'

export default function ClassesBiblicasPage() {
  const { profile } = useAuth()
  const { igrejas: scopedIgrejas } = useScopedIgrejas()
  const { classes, loading, error, refetch } = useClassesBiblicas()

  // Detail view
  const [selectedClasse, setSelectedClasse] = useState<ClasseBiblica | null>(null)
  const {
    detail,
    loading: loadingDetail,
    error: detailError,
    refetch: refetchDetail,
  } = useClasseBiblicaDetail(selectedClasse?.id)
  const alunos = detail?.alunos ?? []
  const presencas = detail?.presencas ?? []
  const aulas = detail?.aulas ?? []

  // New class form
  const [showNovaClasse, setShowNovaClasse] = useState(false)
  const [novaClasse, setNovaClasse] = useState({
    nome: '',
    data_inicio: '',
    total_licoes: 37,
    modulo_id: 'principios_fe' as string,
    igreja_id: '',
  })

  // Add student
  const [showAddAluno, setShowAddAluno] = useState(false)
  const [pessoasSearch, setPessoasSearch] = useState('')
  const {
    pessoas: pessoasOptions,
    loading: searchingPessoas,
    error: pessoasError,
  } = useSearchPessoasClasse(
    pessoasSearch,
    selectedClasse?.igreja_id || '',
    alunos.map((aluno) => aluno.pessoa_id),
    showAddAluno && !!selectedClasse,
  )

  // New lesson
  const [showNovaLicao, setShowNovaLicao] = useState(false)
  const [novaLicao, setNovaLicao] = useState({ numero: 1, titulo: '', presentes: [] as string[] })

  // Aulas (novo sistema)
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [novaAula, setNovaAula] = useState({ ponto_numero: 1, ponto_titulo: '', presentes: [] as string[] })
  const createClasseMutation = useCreateClasseBiblica()
  const addAlunoMutation = useAddAlunoClasseBiblica()
  const removeAlunoMutation = useRemoveAlunoClasseBiblica()
  const toggleDecisaoMutation = useToggleDecisaoClasseBiblica()
  const registrarLicaoMutation = useRegisterLicaoClasseBiblica()
  const ativarAulaMutation = useAtivarAulaClasseBiblica()
  const liberarQuestionarioMutation = useLiberarQuestionarioClasseBiblica()

  useEffect(() => {
    if (scopedIgrejas.length === 1 && !novaClasse.igreja_id) {
      setNovaClasse((prev) => ({ ...prev, igreja_id: scopedIgrejas[0].id }))
    }
  }, [scopedIgrejas, novaClasse.igreja_id])

  useEffect(() => {
    if (!selectedClasse) return

    const classeAtualizada = classes.find((classe) => classe.id === selectedClasse.id)
    if (classeAtualizada) {
      setSelectedClasse(classeAtualizada)
    }
  }, [classes, selectedClasse?.id])

  useEffect(() => {
    if (!showAddAluno) {
      setPessoasSearch('')
    }
  }, [showAddAluno])

  useEffect(() => {
    if (!selectedClasse || showNovaLicao) return

    const maxLicao = presencas.reduce((max, presenca) => Math.max(max, presenca.licao_numero), 0)
    setNovaLicao({ numero: maxLicao + 1, titulo: '', presentes: [] })
  }, [presencas, selectedClasse?.id, showNovaLicao])

  useEffect(() => {
    if (!selectedClasse || showNovaAula) return

    const maxAula = aulas.reduce((max, aula) => Math.max(max, aula.ponto_numero), 0)
    setNovaAula({ ponto_numero: maxAula + 1, ponto_titulo: '', presentes: [] })
  }, [aulas, selectedClasse?.id, showNovaAula])

  function getNomePessoa(aluno: Aluno) {
    if (Array.isArray(aluno.pessoa)) {
      return aluno.pessoa[0]?.nome || '—'
    }

    return aluno.pessoa?.nome || '—'
  }

  function getNomeIgreja(classe: ClasseBiblica) {
    if (Array.isArray(classe.igreja)) {
      return classe.igreja[0]?.nome || ''
    }

    return classe.igreja?.nome || ''
  }

  async function criarClasse() {
    if (!profile) return
    if (!novaClasse.nome.trim()) {
      toast.error('Informe o nome da classe.')
      return
    }

    const igrejaId = novaClasse.igreja_id || scopedIgrejas[0]?.id || profile.igreja_id || ''
    if (!igrejaId) {
      toast.error('Selecione a igreja da classe.')
      return
    }

    const moduloTitulos: Record<string, string> = {
      principios_fe: 'Principios de Fe',
      crencas_fundamentais: 'Crencas Fundamentais',
    }
    const moduloPontos: Record<string, number> = {
      principios_fe: 37,
      crencas_fundamentais: 25,
    }

    const igrejaSelecionada = scopedIgrejas.find((igreja) => igreja.id === igrejaId)

    try {
      await createClasseMutation.mutateAsync({
        nome: novaClasse.nome.trim(),
        igreja_id: igrejaId,
        instrutor_id: profile.id,
        instrutor_nome: profile.nome || null,
        data_inicio: novaClasse.data_inicio || null,
        total_licoes: moduloPontos[novaClasse.modulo_id] || novaClasse.total_licoes,
        modulo_id: novaClasse.modulo_id,
        modulo_titulo: moduloTitulos[novaClasse.modulo_id] || null,
        formato_typeform: novaClasse.modulo_id === 'crencas_fundamentais',
        associacao_id: igrejaSelecionada?.associacao_id || profile.associacao_id || null,
        uniao_id: igrejaSelecionada?.uniao_id || profile.uniao_id || null,
      })

      toast.success('Classe biblica criada com sucesso.')
      setShowNovaClasse(false)
      setNovaClasse({
        nome: '',
        data_inicio: '',
        total_licoes: 37,
        modulo_id: 'principios_fe',
        igreja_id: igrejaId,
      })
    } catch (err) {
      console.error('Erro ao criar classe:', err)
      toast.error('Nao foi possivel criar a classe agora.')
    }
  }

  function openDetail(classe: ClasseBiblica) {
    setSelectedClasse(classe)
    setShowAddAluno(false)
    setShowNovaLicao(false)
    setShowNovaAula(false)
    setPessoasSearch('')
  }

  async function addAluno(pessoaId: string) {
    if (!selectedClasse) return

    try {
      await addAlunoMutation.mutateAsync({
        classe_id: selectedClasse.id,
        pessoa_id: pessoaId,
      })

      toast.success('Aluno adicionado com sucesso.')
      setShowAddAluno(false)
      setPessoasSearch('')
    } catch (err) {
      console.error('Erro ao adicionar aluno:', err)
      toast.error('Nao foi possivel adicionar o aluno agora.')
    }
  }

  async function removeAluno(alunoId: string) {
    if (!confirm('Remover este aluno da classe?')) return

    try {
      await removeAlunoMutation.mutateAsync({ aluno_id: alunoId })
      toast.success('Aluno removido da classe.')
    } catch (err) {
      console.error(err)
      toast.error('Nao foi possivel remover o aluno agora.')
    }
  }

  async function toggleDecisao(aluno: Aluno) {
    try {
      await toggleDecisaoMutation.mutateAsync({
        aluno_id: aluno.id,
        pessoa_id: aluno.pessoa_id,
        decisao_atual: aluno.decisao_batismo,
      })

      toast.success(aluno.decisao_batismo ? 'Decisao removida.' : 'Decisao registrada.')
    } catch (err) {
      console.error(err)
      toast.error('Nao foi possivel atualizar a decisao agora.')
    }
  }

  async function registrarLicao() {
    if (!selectedClasse) return

    try {
      await registrarLicaoMutation.mutateAsync({
        classe_id: selectedClasse.id,
        numero: novaLicao.numero,
        titulo: novaLicao.titulo,
        presentes: novaLicao.presentes,
        alunos,
      })

      toast.success('Licao registrada com sucesso.')
      setShowNovaLicao(false)
      setNovaLicao({ numero: novaLicao.numero + 1, titulo: '', presentes: [] })
    } catch (err) {
      console.error('Erro ao registrar licao:', err)
      toast.error('Nao foi possivel registrar a licao agora.')
    }
  }
  function togglePresente(pessoaId: string) {
    setNovaLicao(prev => ({
      ...prev,
      presentes: prev.presentes.includes(pessoaId)
        ? prev.presentes.filter(id => id !== pessoaId)
        : [...prev.presentes, pessoaId],
    }))
  }

  async function ativarAula() {
    if (!selectedClasse || !profile) return

    try {
      await ativarAulaMutation.mutateAsync({
        classe_id: selectedClasse.id,
        ponto_numero: novaAula.ponto_numero,
        ponto_titulo: novaAula.ponto_titulo,
        presentes: novaAula.presentes,
        alunos,
        professor_id: profile.id,
        professor_nome: profile.nome || null,
      })

      toast.success('Aula ativada com sucesso.')
      setShowNovaAula(false)
      setNovaAula({ ponto_numero: novaAula.ponto_numero + 1, ponto_titulo: '', presentes: [] })
    } catch (err) {
      console.error('Erro ao ativar aula:', err)
      toast.error('Nao foi possivel ativar a aula agora.')
    }
  }

  async function liberarQuestionario(aulaId: string) {
    try {
      await liberarQuestionarioMutation.mutateAsync({
        aula_id: aulaId,
        profile_id: profile?.id || null,
      })

      toast.success('Questionario liberado para a turma.')
    } catch (err) {
      console.error('Erro ao liberar questionario:', err)
      toast.error('Nao foi possivel liberar o questionario agora.')
    }
  }
  function toggleAulaPresente(pessoaId: string) {
    setNovaAula(prev => ({
      ...prev,
      presentes: prev.presentes.includes(pessoaId)
        ? prev.presentes.filter(id => id !== pessoaId)
        : [...prev.presentes, pessoaId],
    }))
  }

  const statusColors: Record<string, string> = {
    ativa: 'bg-green-100 text-green-700',
    concluida: 'bg-blue-100 text-blue-700',
    cancelada: 'bg-red-100 text-red-700',
  }

  if (loading && classes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  // ============ DETAIL VIEW ============
  if (selectedClasse) {
    const progresso = selectedClasse.total_licoes > 0
      ? Math.round(((selectedClasse._licoes_dadas || presencas.length) / selectedClasse.total_licoes) * 100)
      : 0
    const decisoes = alunos.filter(a => a.decisao_batismo).length

    return (
      <div className="space-y-6 max-w-4xl">
        <button
          onClick={() => setSelectedClasse(null)}
          className="text-sm text-gray-500 hover:text-primary-600 flex items-center gap-1"
        >
          <HiOutlineChevronDown className="w-4 h-4 rotate-90" /> Voltar Ã s classes
        </button>

        {detailError && (
          <div className="card border border-red-200 bg-red-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700">Nao foi possivel carregar os detalhes da classe.</p>
                <p className="text-xs text-red-600 mt-1">{detailError}</p>
              </div>
              <button onClick={() => refetchDetail()} className="btn-secondary text-sm w-fit">
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Class header */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{selectedClasse.nome}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {getNomeIgreja(selectedClasse)}
                {selectedClasse.data_inicio && ` â€¢ InÃ­cio: ${formatDateBR(selectedClasse.data_inicio)}`}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[selectedClasse.status] || 'bg-gray-100 text-gray-600'}`}>
              {selectedClasse.status}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{presencas.length} de {selectedClasse.total_licoes} liÃ§Ãµes</span>
              <span>{progresso}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${progresso}%` }} />
            </div>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-700">{alunos.length}</p>
              <p className="text-[10px] text-gray-400">Alunos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">{decisoes}</p>
              <p className="text-[10px] text-gray-400">DecisÃµes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary-600">{presencas.length}</p>
              <p className="text-[10px] text-gray-400">LiÃ§Ãµes Dadas</p>
            </div>
          </div>
        </div>

        {/* Students */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <HiOutlineUserGroup className="w-4 h-4" /> Alunos
            </h2>
            <button
              onClick={() => setShowAddAluno(!showAddAluno)}
              className="btn-primary text-xs flex items-center gap-1 disabled:opacity-60"
              disabled={addAlunoMutation.isPending}
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>

          {/* Add student search */}
          {showAddAluno && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  value={pessoasSearch}
                  onChange={e => setPessoasSearch(e.target.value)}
                  className="input-field pl-10 text-sm"
                  placeholder="Buscar pessoa por nome..."
                  autoFocus
                />
              </div>
              {searchingPessoas && <p className="text-xs text-gray-400">Buscando...</p>}
              {pessoasError && <p className="text-xs text-red-500">{pessoasError}</p>}
              {!searchingPessoas && pessoasSearch.trim().length >= 2 && pessoasOptions.length === 0 && !pessoasError && (
                <p className="text-xs text-gray-400">Nenhuma pessoa disponivel para esta classe.</p>
              )}
              {pessoasOptions.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {pessoasOptions.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addAluno(p.id)}
                      className="w-full text-left text-sm px-3 py-2 rounded hover:bg-primary-50 text-gray-700 disabled:opacity-60"
                      disabled={addAlunoMutation.isPending}
                    >
                      {p.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loadingDetail ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : alunos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum aluno cadastrado</p>
          ) : (
            <div className="space-y-1">
              {alunos.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {getNomePessoa(a).charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{getNomePessoa(a)}</p>
                    <p className="text-[10px] text-gray-400">
                      {a.licoes_concluidas} liÃ§Ãµes â€¢ {a.status}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDecisao(a)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                      a.decisao_batismo
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600'
                    }`}
                    title={a.decisao_batismo ? 'DecisÃ£o registrada' : 'Registrar decisÃ£o de batismo'}
                    disabled={toggleDecisaoMutation.isPending}
                  >
                    <HiOutlineCheck className="w-3.5 h-3.5 inline mr-0.5" />
                    {a.decisao_batismo ? 'DecisÃ£o' : 'Batismo?'}
                  </button>
                  <button
                    onClick={() => removeAluno(a.id)}
                    className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-60"
                    title="Remover aluno"
                    disabled={removeAlunoMutation.isPending}
                  >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lessons / Attendance */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <HiOutlineBookOpen className="w-4 h-4" /> LiÃ§Ãµes & PresenÃ§a
            </h2>
            <button
              onClick={() => { setShowNovaLicao(!showNovaLicao); setNovaLicao(prev => ({ ...prev, presentes: [] })) }}
              className="btn-primary text-xs flex items-center gap-1"
              disabled={alunos.length === 0 || registrarLicaoMutation.isPending}
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> Registrar LiÃ§Ã£o
            </button>
          </div>

          {/* New lesson form */}
          {showNovaLicao && alunos.length > 0 && (
            <div className="mb-4 p-3 bg-primary-50/30 border border-primary-200 rounded-lg space-y-3">
              <div className="flex gap-2">
                <div className="w-20">
                  <label className="text-[10px] text-gray-400">LiÃ§Ã£o nÂº</label>
                  <input
                    type="number"
                    value={novaLicao.numero}
                    onChange={e => setNovaLicao(prev => ({ ...prev, numero: parseInt(e.target.value) || 1 }))}
                    className="input-field text-sm"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">TÃ­tulo (opcional)</label>
                  <input
                    value={novaLicao.titulo}
                    onChange={e => setNovaLicao(prev => ({ ...prev, titulo: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="TÃ­tulo da liÃ§Ã£o..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-gray-400">PresenÃ§a</label>
                  <button
                    onClick={() => setNovaLicao(prev => ({
                      ...prev,
                      presentes: prev.presentes.length === alunos.length ? [] : alunos.map(a => a.pessoa_id),
                    }))}
                    className="text-[10px] text-primary-600 hover:underline"
                  >
                    {novaLicao.presentes.length === alunos.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                </div>
                <div className="space-y-1">
                  {alunos.map(a => (
                    <label key={a.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novaLicao.presentes.includes(a.pessoa_id)}
                        onChange={() => togglePresente(a.pessoa_id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{getNomePessoa(a)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{novaLicao.presentes.length} de {alunos.length} presentes</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowNovaLicao(false)} className="btn-secondary text-xs">Cancelar</button>
                  <button
                    onClick={registrarLicao}
                    className="btn-primary text-xs disabled:opacity-60"
                    disabled={registrarLicaoMutation.isPending}
                  >
                    {registrarLicaoMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lesson history */}
          {presencas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma liÃ§Ã£o registrada</p>
          ) : (
            <div className="space-y-1">
              {presencas.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {p.licao_numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{p.licao_titulo || `LiÃ§Ã£o ${p.licao_numero}`}</p>
                    <p className="text-[10px] text-gray-400">{formatDateBR(p.data)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-green-600">{p.presentes.length} presentes</p>
                    {p.ausentes.length > 0 && (
                      <p className="text-[10px] text-gray-400">{p.ausentes.length} ausentes</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aulas Ativadas (novo sistema) */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <HiOutlineAcademicCap className="w-4 h-4" /> Aulas Ativadas
            </h2>
            <button
              onClick={() => { setShowNovaAula(!showNovaAula); setNovaAula(prev => ({ ...prev, presentes: [] })) }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-60"
              disabled={alunos.length === 0 || ativarAulaMutation.isPending}
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> Ativar Aula
            </button>
          </div>

          {/* FormulÃ¡rio nova aula */}
          {showNovaAula && alunos.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex gap-2">
                <div className="w-20">
                  <label className="text-[10px] text-gray-400">Ponto nÂº</label>
                  <input
                    type="number"
                    value={novaAula.ponto_numero}
                    onChange={e => setNovaAula(prev => ({ ...prev, ponto_numero: parseInt(e.target.value) || 1 }))}
                    className="input-field text-sm"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">TÃ­tulo do ponto</label>
                  <input
                    value={novaAula.ponto_titulo}
                    onChange={e => setNovaAula(prev => ({ ...prev, ponto_titulo: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="Ex: Deus, Jesus Cristo..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-gray-400">PresenÃ§a</label>
                  <button
                    onClick={() => setNovaAula(prev => ({
                      ...prev,
                      presentes: prev.presentes.length === alunos.length ? [] : alunos.map(a => a.pessoa_id),
                    }))}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    {novaAula.presentes.length === alunos.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                </div>
                <div className="space-y-1">
                  {alunos.map(a => {
                    return (
                      <label key={a.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={novaAula.presentes.includes(a.pessoa_id)}
                          onChange={() => toggleAulaPresente(a.pessoa_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{getNomePessoa(a)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{novaAula.presentes.length} de {alunos.length} presentes</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowNovaAula(false)} className="btn-secondary text-xs">Cancelar</button>
                  <button
                    onClick={ativarAula}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-60"
                    disabled={ativarAulaMutation.isPending}
                  >
                    {ativarAulaMutation.isPending ? 'Ativando...' : 'Ativar Aula'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de aulas */}
          {aulas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma aula ativada</p>
          ) : (
            <div className="space-y-1">
              {aulas.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {a.ponto_numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{a.ponto_titulo || `Ponto ${a.ponto_numero}`}</p>
                    <p className="text-[10px] text-gray-400">
                      {a.data_aula ? formatDateBR(a.data_aula) : ''}
                      {a.ativada && ' â€¢ Ativada'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.questionario_liberado ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">QuestionÃ¡rio liberado</span>
                    ) : (
                      <button
                        onClick={() => liberarQuestionario(a.id)}
                        className="text-[10px] px-2 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-60"
                        disabled={liberarQuestionarioMutation.isPending}
                      >
                        Liberar QuestionÃ¡rio
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============ LIST VIEW ============
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Classes BÃ­blicas</h1>
          <p className="text-gray-500 mt-1">Gerencie turmas e acompanhe o progresso dos estudos</p>
        </div>
        <button
          onClick={() => setShowNovaClasse(!showNovaClasse)}
          className="btn-primary inline-flex items-center gap-2 w-fit"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Nova Classe
        </button>
      </div>

      {error && (
        <div className="card border border-red-200 bg-red-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">Nao foi possivel carregar as classes biblicas.</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
            <button onClick={() => refetch()} className="btn-secondary text-sm w-fit">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* New class form */}
      {showNovaClasse && (
        <div className="card p-5 space-y-4 border-blue-200">
          <h3 className="text-sm font-semibold text-gray-700">Criar Nova Classe BÃ­blica</h3>

          {scopedIgrejas.length > 1 && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Igreja da classe</label>
              <select
                value={novaClasse.igreja_id}
                onChange={e => setNovaClasse(prev => ({ ...prev, igreja_id: e.target.value }))}
                className="input-field"
              >
                <option value="">Selecione uma igreja...</option>
                {scopedIgrejas.map((igreja) => (
                  <option key={igreja.id} value={igreja.id}>
                    {igreja.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scopedIgrejas.length === 1 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs text-blue-600 uppercase tracking-wide">Igreja vinculada</p>
              <p className="text-sm font-semibold text-blue-900 mt-1">{scopedIgrejas[0].nome}</p>
            </div>
          )}

          {scopedIgrejas.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">Nenhuma igreja disponivel neste escopo.</p>
              <p className="text-xs text-amber-700 mt-1">Revise a lotacao do usuario antes de criar uma classe.</p>
            </div>
          )}

          {/* SeleÃ§Ã£o de MÃ³dulo */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Material de Estudo</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNovaClasse(prev => ({ ...prev, modulo_id: 'principios_fe', total_licoes: 37 }))}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  novaClasse.modulo_id === 'principios_fe'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">PrincÃ­pios de FÃ©</p>
                <p className="text-xs text-gray-500 mt-0.5">37 pontos doutrinÃ¡rios</p>
              </button>
              <button
                type="button"
                onClick={() => setNovaClasse(prev => ({ ...prev, modulo_id: 'crencas_fundamentais', total_licoes: 25 }))}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  novaClasse.modulo_id === 'crencas_fundamentais'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">CrenÃ§as Fundamentais</p>
                <p className="text-xs text-gray-500 mt-0.5">25 temas (formato Typeform)</p>
              </button>
            </div>
          </div>

          <input
            value={novaClasse.nome}
            onChange={e => setNovaClasse(prev => ({ ...prev, nome: e.target.value }))}
            className="input-field"
            placeholder="Nome da classe (ex: Classe BÃ­blica Central - SÃ¡bado ManhÃ£)"
            autoFocus
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <DateDropdowns label="Data de inÃ­cio" value={novaClasse.data_inicio} onChange={v => setNovaClasse(prev => ({ ...prev, data_inicio: v }))} yearRange={2} futureYears={1} />
            </div>
            <div className="w-28">
              <label className="text-xs text-gray-400">Total de pontos</label>
              <input
                type="number"
                value={novaClasse.total_licoes}
                onChange={e => setNovaClasse(prev => ({ ...prev, total_licoes: parseInt(e.target.value) || 37 }))}
                className="input-field"
                min={1}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNovaClasse(false)} className="btn-secondary text-sm">Cancelar</button>
            <button
              onClick={criarClasse}
              className="btn-primary text-sm disabled:opacity-60"
              disabled={!novaClasse.nome.trim() || scopedIgrejas.length === 0 || createClasseMutation.isPending}
            >
              {createClasseMutation.isPending ? 'Criando...' : 'Criar Classe'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-primary-600">{classes.filter(c => c.status === 'ativa').length}</p>
          <p className="text-xs text-gray-500">Ativas</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-gray-600">{classes.reduce((s, c) => s + (c._alunos_count || 0), 0)}</p>
          <p className="text-xs text-gray-500">Alunos Total</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{classes.filter(c => c.status === 'concluida').length}</p>
          <p className="text-xs text-gray-500">ConcluÃ­das</p>
        </div>
      </div>

      {/* Class list */}
      {classes.length === 0 ? (
        <div className="card py-12 text-center">
          <HiOutlineAcademicCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma classe bÃ­blica criada</p>
          <button onClick={() => setShowNovaClasse(true)} className="text-primary-600 hover:underline text-sm mt-2">
            Criar primeira classe
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map(c => {
            const progresso = c.total_licoes > 0 ? Math.round(((c._licoes_dadas || 0) / c.total_licoes) * 100) : 0

            return (
              <div
                key={c.id}
                onClick={() => openDetail(c)}
                className="card py-4 px-5 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-800">{c.nome}</h3>
                      {c.modulo_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                          {c.modulo_id === 'principios_fe' ? 'PF' : 'CF'}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.modulo_titulo || ''}{c.modulo_titulo && getNomeIgreja(c) ? ' â€¢ ' : ''}
                      {getNomeIgreja(c)}
                      {c.data_inicio && ` â€¢ InÃ­cio: ${formatDateBR(c.data_inicio)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{c._alunos_count || 0}</p>
                      <p className="text-[10px] text-gray-400">alunos</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary-600">{c._licoes_dadas || 0}/{c.total_licoes}</p>
                      <p className="text-[10px] text-gray-400">liÃ§Ãµes</p>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progresso}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}




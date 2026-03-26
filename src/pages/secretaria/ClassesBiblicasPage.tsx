import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DateDropdowns from '@/components/ui/DateDropdowns'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateBR } from '@/lib/secretaria-constants'
import {
  HiOutlineAcademicCap, HiOutlinePlus, HiOutlineX, HiOutlineUserGroup,
  HiOutlineCheck, HiOutlineBookOpen, HiOutlineRefresh, HiOutlineTrash,
  HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineSearch
} from 'react-icons/hi'

interface ClasseBiblica {
  id: string
  nome: string
  data_inicio: string | null
  data_previsao_termino: string | null
  status: string
  total_licoes: number
  observacoes: string | null
  created_at: string
  igreja: { nome: string } | { nome: string }[] | null
  modulo_id: string | null
  modulo_titulo: string | null
  instrutor_nome: string | null
  formato_typeform: boolean
  classe_online: boolean
  link_online: string | null
  total_alunos: number
  _alunos_count?: number
  _licoes_dadas?: number
}

interface AulaEB {
  id: string
  classe_id: string
  ponto_numero: number
  ponto_titulo: string | null
  professor_nome: string | null
  data_aula: string
  ativada: boolean
  ativada_em: string | null
  questionario_liberado: boolean
  questionario_liberado_em: string | null
  observacoes: string | null
  _presentes?: number
  _responderam?: number
}

interface Aluno {
  id: string
  pessoa_id: string
  status: string
  licoes_concluidas: number
  decisao_batismo: boolean
  data_decisao: string | null
  pessoa: { nome: string; celular: string | null } | { nome: string; celular: string | null }[] | null
}

interface PessoaOption {
  id: string
  nome: string
}

interface PresencaRegistro {
  id: string
  licao_numero: number
  licao_titulo: string | null
  data: string
  presentes: string[]
  ausentes: string[]
}

export default function ClassesBiblicasPage() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<ClasseBiblica[]>([])
  const [loading, setLoading] = useState(true)

  // Detail view
  const [selectedClasse, setSelectedClasse] = useState<ClasseBiblica | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [presencas, setPresencas] = useState<PresencaRegistro[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  // New class form
  const [showNovaClasse, setShowNovaClasse] = useState(false)
  const [novaClasse, setNovaClasse] = useState({ nome: '', data_inicio: '', total_licoes: 37, modulo_id: 'principios_fe' as string })

  // Add student
  const [showAddAluno, setShowAddAluno] = useState(false)
  const [pessoasSearch, setPessoasSearch] = useState('')
  const [pessoasOptions, setPessoasOptions] = useState<PessoaOption[]>([])
  const [searchingPessoas, setSearchingPessoas] = useState(false)

  // New lesson
  const [showNovaLicao, setShowNovaLicao] = useState(false)
  const [novaLicao, setNovaLicao] = useState({ numero: 1, titulo: '', presentes: [] as string[] })

  // Aulas (novo sistema)
  const [aulas, setAulas] = useState<AulaEB[]>([])
  const [showNovaAula, setShowNovaAula] = useState(false)
  const [novaAula, setNovaAula] = useState({ ponto_numero: 1, ponto_titulo: '', presentes: [] as string[] })

  function buildScopeFilter(query: any) {
    if (!profile) return query
    if (profile.papel === 'admin') return query
    if (profile.papel === 'admin_uniao') return query.eq('igreja.uniao_id', profile.uniao_id!)
    if (profile.papel === 'admin_associacao') return query.eq('igreja.associacao_id', profile.associacao_id!)
    return query.eq('igreja_id', profile.igreja_id!)
  }

  useEffect(() => {
    if (profile) fetchClasses()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchClasses() {
    setLoading(true)
    try {
      let query = supabase
        .from('classes_biblicas')
        .select('id, nome, data_inicio, data_previsao_termino, status, total_licoes, observacoes, created_at, modulo_id, modulo_titulo, instrutor_nome, formato_typeform, classe_online, link_online, total_alunos, igreja:igrejas(nome)')
        .order('created_at', { ascending: false })

      if (profile!.papel !== 'admin') {
        query = query.eq('igreja_id', profile!.igreja_id!)
      }

      const { data, error } = await query
      if (error) throw error

      // Get counts per class
      const classIds = (data || []).map(c => c.id)
      if (classIds.length > 0) {
        const [alunosRes, presencasRes] = await Promise.all([
          supabase.from('classe_biblica_alunos').select('classe_id').in('classe_id', classIds),
          supabase.from('classe_biblica_presenca').select('classe_id').in('classe_id', classIds),
        ])

        const alunosCounts: Record<string, number> = {}
        ;(alunosRes.data || []).forEach(a => { alunosCounts[a.classe_id] = (alunosCounts[a.classe_id] || 0) + 1 })

        const licoesCounts: Record<string, number> = {}
        ;(presencasRes.data || []).forEach(p => { licoesCounts[p.classe_id] = (licoesCounts[p.classe_id] || 0) + 1 })

        setClasses((data || []).map(c => ({
          ...c,
          _alunos_count: alunosCounts[c.id] || 0,
          _licoes_dadas: licoesCounts[c.id] || 0,
        })))
      } else {
        setClasses([])
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  async function criarClasse() {
    if (!novaClasse.nome.trim() || !profile) return
    const moduloTitulos: Record<string, string> = {
      principios_fe: 'Princípios de Fé',
      crencas_fundamentais: 'Crenças Fundamentais'
    }
    const moduloPontos: Record<string, number> = {
      principios_fe: 37,
      crencas_fundamentais: 25
    }
    try {
      const { error } = await supabase.from('classes_biblicas').insert({
        nome: novaClasse.nome,
        igreja_id: profile.igreja_id,
        instrutor_id: profile.id,
        instrutor_nome: profile.nome || null,
        data_inicio: novaClasse.data_inicio || null,
        total_licoes: moduloPontos[novaClasse.modulo_id] || novaClasse.total_licoes,
        modulo_id: novaClasse.modulo_id,
        modulo_titulo: moduloTitulos[novaClasse.modulo_id] || null,
        formato_typeform: novaClasse.modulo_id === 'crencas_fundamentais',
        associacao_id: profile.associacao_id || null,
        uniao_id: profile.uniao_id || null,
      })
      if (error) throw error
      setShowNovaClasse(false)
      setNovaClasse({ nome: '', data_inicio: '', total_licoes: 37, modulo_id: 'principios_fe' })
      fetchClasses()
    } catch (err) {
      console.error('Erro ao criar classe:', err)
    }
  }

  async function openDetail(classe: ClasseBiblica) {
    setSelectedClasse(classe)
    setLoadingDetail(true)
    try {
      const [alunosRes, presencasRes] = await Promise.all([
        supabase
          .from('classe_biblica_alunos')
          .select('id, pessoa_id, status, licoes_concluidas, decisao_batismo, data_decisao, pessoa:pessoas(nome, celular)')
          .eq('classe_id', classe.id)
          .order('created_at'),
        supabase
          .from('classe_biblica_presenca')
          .select('id, licao_numero, licao_titulo, data, presentes, ausentes')
          .eq('classe_id', classe.id)
          .order('licao_numero'),
      ])

      setAlunos(alunosRes.data || [])
      setPresencas(presencasRes.data || [])
      await fetchAulas(classe.id)

      // Set next lesson number
      const maxLicao = (presencasRes.data || []).reduce((max, p) => Math.max(max, p.licao_numero), 0)
      setNovaLicao(prev => ({ ...prev, numero: maxLicao + 1 }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetail(false)
    }
  }

  async function searchPessoas(q: string) {
    setPessoasSearch(q)
    if (q.length < 2) { setPessoasOptions([]); return }
    setSearchingPessoas(true)
    try {
      let query = supabase
        .from('pessoas')
        .select('id, nome')
        .ilike('nome', `%${q}%`)
        .limit(10)

      if (profile!.igreja_id) {
        query = query.eq('igreja_id', profile!.igreja_id)
      }

      const { data } = await query
      // Filter out already enrolled students
      const enrolledIds = new Set(alunos.map(a => a.pessoa_id))
      setPessoasOptions((data || []).filter(p => !enrolledIds.has(p.id)))
    } catch (err) {
      console.error(err)
    } finally {
      setSearchingPessoas(false)
    }
  }

  async function addAluno(pessoaId: string) {
    if (!selectedClasse) return
    try {
      const { error } = await supabase.from('classe_biblica_alunos').insert({
        classe_id: selectedClasse.id,
        pessoa_id: pessoaId,
      })
      if (error) throw error

      // Also update pessoa etapa_funil to classe_biblica
      await supabase.from('pessoas').update({ etapa_funil: 'classe_biblica' }).eq('id', pessoaId)

      setShowAddAluno(false)
      setPessoasSearch('')
      setPessoasOptions([])
      openDetail(selectedClasse)
    } catch (err) {
      console.error('Erro ao adicionar aluno:', err)
    }
  }

  async function removeAluno(alunoId: string) {
    if (!selectedClasse) return
    try {
      await supabase.from('classe_biblica_alunos').delete().eq('id', alunoId)
      openDetail(selectedClasse)
    } catch (err) {
      console.error(err)
    }
  }

  async function toggleDecisao(aluno: Aluno) {
    try {
      await supabase.from('classe_biblica_alunos').update({
        decisao_batismo: !aluno.decisao_batismo,
        data_decisao: !aluno.decisao_batismo ? new Date().toISOString().slice(0, 10) : null,
      }).eq('id', aluno.id)

      // Update funil if decision
      if (!aluno.decisao_batismo) {
        await supabase.from('pessoas').update({ etapa_funil: 'decisao' }).eq('id', aluno.pessoa_id)
      }

      if (selectedClasse) openDetail(selectedClasse)
    } catch (err) {
      console.error(err)
    }
  }

  async function registrarLicao() {
    if (!selectedClasse) return
    try {
      const alunoIds = alunos.map(a => a.pessoa_id)
      const ausentes = alunoIds.filter(id => !novaLicao.presentes.includes(id))

      const { error } = await supabase.from('classe_biblica_presenca').insert({
        classe_id: selectedClasse.id,
        licao_numero: novaLicao.numero,
        licao_titulo: novaLicao.titulo || null,
        data: new Date().toISOString().slice(0, 10),
        presentes: novaLicao.presentes,
        ausentes,
      })
      if (error) throw error

      // Update licoes_concluidas for present students
      for (const aluno of alunos) {
        if (novaLicao.presentes.includes(aluno.pessoa_id)) {
          await supabase.from('classe_biblica_alunos').update({
            licoes_concluidas: aluno.licoes_concluidas + 1,
          }).eq('id', aluno.id)
        }
      }

      setShowNovaLicao(false)
      setNovaLicao({ numero: novaLicao.numero + 1, titulo: '', presentes: [] })
      openDetail(selectedClasse)
    } catch (err) {
      console.error('Erro ao registrar lição:', err)
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

  async function fetchAulas(classeId: string) {
    const { data } = await supabase
      .from('classe_biblica_aulas')
      .select('*')
      .eq('classe_id', classeId)
      .order('ponto_numero')
    setAulas(data || [])
  }

  async function ativarAula() {
    if (!selectedClasse || !profile) return
    try {
      const { data, error } = await supabase.from('classe_biblica_aulas').insert({
        classe_id: selectedClasse.id,
        ponto_numero: novaAula.ponto_numero,
        ponto_titulo: novaAula.ponto_titulo || `Ponto ${novaAula.ponto_numero}`,
        professor_id: profile.id,
        professor_nome: profile.nome || null,
        data_aula: new Date().toISOString(),
        ativada: true,
        ativada_em: new Date().toISOString(),
      }).select().single()
      if (error) throw error

      // Registrar presença dos marcados
      if (data && novaAula.presentes.length > 0) {
        const presencaRows = alunos.map(a => ({
          aula_id: data.id,
          aluno_id: a.id,
          aluno_nome: (a.pessoa as any)?.nome || '',
          presente: novaAula.presentes.includes(a.pessoa_id),
          registrado_por: profile.id,
        }))
        await supabase.from('classe_biblica_aula_presenca').insert(presencaRows)
      }

      setShowNovaAula(false)
      setNovaAula({ ponto_numero: novaAula.ponto_numero + 1, ponto_titulo: '', presentes: [] })
      fetchAulas(selectedClasse.id)
    } catch (err) {
      console.error('Erro ao ativar aula:', err)
    }
  }

  async function liberarQuestionario(aulaId: string) {
    try {
      await supabase.from('classe_biblica_aulas').update({
        questionario_liberado: true,
        questionario_liberado_em: new Date().toISOString(),
        questionario_liberado_por: profile?.id,
      }).eq('id', aulaId)
      if (selectedClasse) fetchAulas(selectedClasse.id)
    } catch (err) {
      console.error('Erro ao liberar questionário:', err)
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

  if (loading) {
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
          <HiOutlineChevronDown className="w-4 h-4 rotate-90" /> Voltar às classes
        </button>

        {/* Class header */}
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{selectedClasse.nome}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {(selectedClasse.igreja as any)?.nome || ''}
                {selectedClasse.data_inicio && ` • Início: ${formatDateBR(selectedClasse.data_inicio)}`}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[selectedClasse.status] || 'bg-gray-100 text-gray-600'}`}>
              {selectedClasse.status}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{presencas.length} de {selectedClasse.total_licoes} lições</span>
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
              <p className="text-[10px] text-gray-400">Decisões</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary-600">{presencas.length}</p>
              <p className="text-[10px] text-gray-400">Lições Dadas</p>
            </div>
          </div>
        </div>

        {/* Students */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <HiOutlineUserGroup className="w-4 h-4" /> Alunos
            </h2>
            <button onClick={() => setShowAddAluno(!showAddAluno)} className="btn-primary text-xs flex items-center gap-1">
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
                  onChange={e => searchPessoas(e.target.value)}
                  className="input-field pl-10 text-sm"
                  placeholder="Buscar pessoa por nome..."
                  autoFocus
                />
              </div>
              {searchingPessoas && <p className="text-xs text-gray-400">Buscando...</p>}
              {pessoasOptions.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {pessoasOptions.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addAluno(p.id)}
                      className="w-full text-left text-sm px-3 py-2 rounded hover:bg-primary-50 text-gray-700"
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
                    {(a.pessoa as any)?.nome?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{(a.pessoa as any)?.nome || '—'}</p>
                    <p className="text-[10px] text-gray-400">
                      {a.licoes_concluidas} lições • {a.status}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDecisao(a)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                      a.decisao_batismo
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600'
                    }`}
                    title={a.decisao_batismo ? 'Decisão registrada' : 'Registrar decisão de batismo'}
                  >
                    <HiOutlineCheck className="w-3.5 h-3.5 inline mr-0.5" />
                    {a.decisao_batismo ? 'Decisão' : 'Batismo?'}
                  </button>
                  <button
                    onClick={() => removeAluno(a.id)}
                    className="p-1 text-gray-300 hover:text-red-500"
                    title="Remover aluno"
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
              <HiOutlineBookOpen className="w-4 h-4" /> Lições & Presença
            </h2>
            <button
              onClick={() => { setShowNovaLicao(!showNovaLicao); setNovaLicao(prev => ({ ...prev, presentes: [] })) }}
              className="btn-primary text-xs flex items-center gap-1"
              disabled={alunos.length === 0}
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> Registrar Lição
            </button>
          </div>

          {/* New lesson form */}
          {showNovaLicao && alunos.length > 0 && (
            <div className="mb-4 p-3 bg-primary-50/30 border border-primary-200 rounded-lg space-y-3">
              <div className="flex gap-2">
                <div className="w-20">
                  <label className="text-[10px] text-gray-400">Lição nº</label>
                  <input
                    type="number"
                    value={novaLicao.numero}
                    onChange={e => setNovaLicao(prev => ({ ...prev, numero: parseInt(e.target.value) || 1 }))}
                    className="input-field text-sm"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">Título (opcional)</label>
                  <input
                    value={novaLicao.titulo}
                    onChange={e => setNovaLicao(prev => ({ ...prev, titulo: e.target.value }))}
                    className="input-field text-sm"
                    placeholder="Título da lição..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-gray-400">Presença</label>
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
                      <span className="text-sm text-gray-700">{(a.pessoa as any)?.nome || '—'}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{novaLicao.presentes.length} de {alunos.length} presentes</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowNovaLicao(false)} className="btn-secondary text-xs">Cancelar</button>
                  <button onClick={registrarLicao} className="btn-primary text-xs">Salvar</button>
                </div>
              </div>
            </div>
          )}

          {/* Lesson history */}
          {presencas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma lição registrada</p>
          ) : (
            <div className="space-y-1">
              {presencas.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {p.licao_numero}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{p.licao_titulo || `Lição ${p.licao_numero}`}</p>
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
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
              disabled={alunos.length === 0}
            >
              <HiOutlinePlus className="w-3.5 h-3.5" /> Ativar Aula
            </button>
          </div>

          {/* Formulário nova aula */}
          {showNovaAula && alunos.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex gap-2">
                <div className="w-20">
                  <label className="text-[10px] text-gray-400">Ponto nº</label>
                  <input
                    type="number"
                    value={novaAula.ponto_numero}
                    onChange={e => setNovaAula(prev => ({ ...prev, ponto_numero: parseInt(e.target.value) || 1 }))}
                    className="input-field text-sm"
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400">Título do ponto</label>
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
                  <label className="text-[10px] text-gray-400">Presença</label>
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
                    const nome = Array.isArray(a.pessoa) ? a.pessoa[0]?.nome : (a.pessoa as any)?.nome
                    return (
                      <label key={a.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={novaAula.presentes.includes(a.pessoa_id)}
                          onChange={() => toggleAulaPresente(a.pessoa_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{nome || '—'}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{novaAula.presentes.length} de {alunos.length} presentes</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowNovaAula(false)} className="btn-secondary text-xs">Cancelar</button>
                  <button onClick={ativarAula} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg">Ativar Aula</button>
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
                      {a.ativada && ' • Ativada'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.questionario_liberado ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Questionário liberado</span>
                    ) : (
                      <button
                        onClick={() => liberarQuestionario(a.id)}
                        className="text-[10px] px-2 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        Liberar Questionário
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
          <h1 className="text-2xl font-bold text-gray-800">Classes Bíblicas</h1>
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

      {/* New class form */}
      {showNovaClasse && (
        <div className="card p-5 space-y-4 border-blue-200">
          <h3 className="text-sm font-semibold text-gray-700">Criar Nova Classe Bíblica</h3>

          {/* Seleção de Módulo */}
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
                <p className="text-sm font-semibold text-gray-800">Princípios de Fé</p>
                <p className="text-xs text-gray-500 mt-0.5">37 pontos doutrinários</p>
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
                <p className="text-sm font-semibold text-gray-800">Crenças Fundamentais</p>
                <p className="text-xs text-gray-500 mt-0.5">25 temas (formato Typeform)</p>
              </button>
            </div>
          </div>

          <input
            value={novaClasse.nome}
            onChange={e => setNovaClasse(prev => ({ ...prev, nome: e.target.value }))}
            className="input-field"
            placeholder="Nome da classe (ex: Classe Bíblica Central - Sábado Manhã)"
            autoFocus
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <DateDropdowns label="Data de início" value={novaClasse.data_inicio} onChange={v => setNovaClasse(prev => ({ ...prev, data_inicio: v }))} yearRange={2} futureYears={1} />
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
            <button onClick={criarClasse} className="btn-primary text-sm" disabled={!novaClasse.nome.trim()}>Criar Classe</button>
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
          <p className="text-xs text-gray-500">Concluídas</p>
        </div>
      </div>

      {/* Class list */}
      {classes.length === 0 ? (
        <div className="card py-12 text-center">
          <HiOutlineAcademicCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma classe bíblica criada</p>
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
                      {c.modulo_titulo || ''}{c.modulo_titulo && (Array.isArray(c.igreja) ? c.igreja[0]?.nome : (c.igreja as any)?.nome) ? ' • ' : ''}
                      {Array.isArray(c.igreja) ? c.igreja[0]?.nome || '' : (c.igreja as any)?.nome || ''}
                      {c.data_inicio && ` • Início: ${formatDateBR(c.data_inicio)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-right">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{c._alunos_count || 0}</p>
                      <p className="text-[10px] text-gray-400">alunos</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary-600">{c._licoes_dadas || 0}/{c.total_licoes}</p>
                      <p className="text-[10px] text-gray-400">lições</p>
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

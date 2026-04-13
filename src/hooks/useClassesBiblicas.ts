import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { fetchScopedIgrejas } from '@/hooks/useScopedIgrejas'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

export interface ClasseBiblicaListItem {
  id: string
  igreja_id: string
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

export interface ClasseBiblicaAluno {
  id: string
  pessoa_id: string
  status: string
  licoes_concluidas: number
  decisao_batismo: boolean
  data_decisao: string | null
  pessoa: { nome: string; celular: string | null } | { nome: string; celular: string | null }[] | null
}

export interface ClasseBiblicaPresenca {
  id: string
  licao_numero: number
  licao_titulo: string | null
  data: string
  presentes: string[]
  ausentes: string[]
}

export interface ClasseBiblicaAula {
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
}

export interface PessoaOption {
  id: string
  nome: string
}

export interface ClasseBiblicaDetail {
  alunos: ClasseBiblicaAluno[]
  presencas: ClasseBiblicaPresenca[]
  aulas: ClasseBiblicaAula[]
}

interface CreateClasseBiblicaPayload {
  nome: string
  igreja_id: string
  instrutor_id: string
  instrutor_nome: string | null
  data_inicio: string | null
  total_licoes: number
  modulo_id: string
  modulo_titulo: string | null
  formato_typeform: boolean
  associacao_id: string | null
  uniao_id: string | null
}

interface AddAlunoPayload {
  classe_id: string
  pessoa_id: string
}

interface RemoveAlunoPayload {
  aluno_id: string
}

interface ToggleDecisaoPayload {
  aluno_id: string
  pessoa_id: string
  decisao_atual: boolean
}

interface RegisterLicaoPayload {
  classe_id: string
  numero: number
  titulo: string
  presentes: string[]
  alunos: ClasseBiblicaAluno[]
}

interface AtivarAulaPayload {
  classe_id: string
  ponto_numero: number
  ponto_titulo: string
  presentes: string[]
  alunos: ClasseBiblicaAluno[]
  professor_id: string
  professor_nome: string | null
}

interface LiberarQuestionarioPayload {
  aula_id: string
  profile_id: string | null
}

interface SearchPessoasParams {
  search: string
  igrejaId: string
  excludePessoaIds: string[]
}

function getPessoaNome(aluno: ClasseBiblicaAluno) {
  if (Array.isArray(aluno.pessoa)) {
    return aluno.pessoa[0]?.nome || ''
  }

  return aluno.pessoa?.nome || ''
}

async function fetchClassesBiblicas(profile: UserProfile): Promise<ClasseBiblicaListItem[]> {
  let query = supabase
    .from('classes_biblicas')
    .select('id, igreja_id, nome, data_inicio, data_previsao_termino, status, total_licoes, observacoes, created_at, modulo_id, modulo_titulo, instrutor_nome, formato_typeform, classe_online, link_online, total_alunos, igreja:igrejas(nome)')
    .order('created_at', { ascending: false })

  if (profile.papel !== 'admin') {
    const igrejas = await fetchScopedIgrejas(profile)
    const igrejaIds = igrejas.map((igreja) => igreja.id)

    if (igrejaIds.length === 0) {
      return []
    }

    query = query.in('igreja_id', igrejaIds)
  }

  const { data, error } = await query
  if (error) throw error

  const classes = (data as ClasseBiblicaListItem[]) || []
  const classIds = classes.map((classe) => classe.id)

  if (classIds.length === 0) {
    return []
  }

  const [alunosRes, presencasRes] = await Promise.all([
    supabase.from('classe_biblica_alunos').select('classe_id').in('classe_id', classIds),
    supabase.from('classe_biblica_presenca').select('classe_id').in('classe_id', classIds),
  ])

  if (alunosRes.error) throw alunosRes.error
  if (presencasRes.error) throw presencasRes.error

  const alunosCounts: Record<string, number> = {}
  for (const aluno of alunosRes.data || []) {
    alunosCounts[aluno.classe_id] = (alunosCounts[aluno.classe_id] || 0) + 1
  }

  const licoesCounts: Record<string, number> = {}
  for (const presenca of presencasRes.data || []) {
    licoesCounts[presenca.classe_id] = (licoesCounts[presenca.classe_id] || 0) + 1
  }

  return classes.map((classe) => ({
    ...classe,
    _alunos_count: alunosCounts[classe.id] || 0,
    _licoes_dadas: licoesCounts[classe.id] || 0,
  }))
}

async function fetchClasseBiblicaDetail(classeId: string): Promise<ClasseBiblicaDetail> {
  const [alunosRes, presencasRes, aulasRes] = await Promise.all([
    supabase
      .from('classe_biblica_alunos')
      .select('id, pessoa_id, status, licoes_concluidas, decisao_batismo, data_decisao, pessoa:pessoas(nome, celular)')
      .eq('classe_id', classeId)
      .order('created_at'),
    supabase
      .from('classe_biblica_presenca')
      .select('id, licao_numero, licao_titulo, data, presentes, ausentes')
      .eq('classe_id', classeId)
      .order('licao_numero'),
    supabase
      .from('classe_biblica_aulas')
      .select('*')
      .eq('classe_id', classeId)
      .order('ponto_numero'),
  ])

  if (alunosRes.error) throw alunosRes.error
  if (presencasRes.error) throw presencasRes.error
  if (aulasRes.error) throw aulasRes.error

  return {
    alunos: (alunosRes.data as ClasseBiblicaAluno[]) || [],
    presencas: (presencasRes.data as ClasseBiblicaPresenca[]) || [],
    aulas: (aulasRes.data as ClasseBiblicaAula[]) || [],
  }
}

async function searchPessoasClasse(params: SearchPessoasParams): Promise<PessoaOption[]> {
  const normalizedSearch = params.search.trim()

  if (normalizedSearch.length < 2 || !params.igrejaId) {
    return []
  }

  const { data, error } = await supabase
    .from('pessoas')
    .select('id, nome')
    .eq('igreja_id', params.igrejaId)
    .ilike('nome', `%${normalizedSearch}%`)
    .limit(10)

  if (error) throw error

  const excludeSet = new Set(params.excludePessoaIds)
  return ((data as PessoaOption[]) || []).filter((pessoa) => !excludeSet.has(pessoa.id))
}

async function createClasseBiblica(payload: CreateClasseBiblicaPayload) {
  const { error } = await supabase.from('classes_biblicas').insert(payload)
  if (error) throw error
}

async function addAlunoClasseBiblica(payload: AddAlunoPayload) {
  const { error } = await supabase.from('classe_biblica_alunos').insert(payload)
  if (error) throw error

  const { error: pessoaError } = await supabase
    .from('pessoas')
    .update({ etapa_funil: 'classe_biblica' })
    .eq('id', payload.pessoa_id)

  if (pessoaError) throw pessoaError
}

async function removeAlunoClasseBiblica(payload: RemoveAlunoPayload) {
  const { error } = await supabase
    .from('classe_biblica_alunos')
    .delete()
    .eq('id', payload.aluno_id)

  if (error) throw error
}

async function toggleDecisaoClasseBiblica(payload: ToggleDecisaoPayload) {
  const novaDecisao = !payload.decisao_atual

  const { error } = await supabase
    .from('classe_biblica_alunos')
    .update({
      decisao_batismo: novaDecisao,
      data_decisao: novaDecisao ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', payload.aluno_id)

  if (error) throw error

  if (!payload.decisao_atual) {
    const { error: pessoaError } = await supabase
      .from('pessoas')
      .update({ etapa_funil: 'decisao' })
      .eq('id', payload.pessoa_id)

    if (pessoaError) throw pessoaError
  }
}

async function registerLicaoClasseBiblica(payload: RegisterLicaoPayload) {
  const alunoIds = payload.alunos.map((aluno) => aluno.pessoa_id)
  const ausentes = alunoIds.filter((id) => !payload.presentes.includes(id))

  const { error } = await supabase
    .from('classe_biblica_presenca')
    .insert({
      classe_id: payload.classe_id,
      licao_numero: payload.numero,
      licao_titulo: payload.titulo || null,
      data: new Date().toISOString().slice(0, 10),
      presentes: payload.presentes,
      ausentes,
    })

  if (error) throw error

  const alunosPresentes = payload.alunos.filter((aluno) => payload.presentes.includes(aluno.pessoa_id))
  await Promise.all(
    alunosPresentes.map(async (aluno) => {
      const { error: updateError } = await supabase
        .from('classe_biblica_alunos')
        .update({
          licoes_concluidas: aluno.licoes_concluidas + 1,
        })
        .eq('id', aluno.id)

      if (updateError) throw updateError
    }),
  )
}

async function ativarAulaClasseBiblica(payload: AtivarAulaPayload) {
  const { data, error } = await supabase
    .from('classe_biblica_aulas')
    .insert({
      classe_id: payload.classe_id,
      ponto_numero: payload.ponto_numero,
      ponto_titulo: payload.ponto_titulo || `Ponto ${payload.ponto_numero}`,
      professor_id: payload.professor_id,
      professor_nome: payload.professor_nome,
      data_aula: new Date().toISOString(),
      ativada: true,
      ativada_em: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  if (!data || payload.presentes.length === 0) {
    return
  }

  const presencaRows = payload.alunos.map((aluno) => ({
    aula_id: data.id,
    aluno_id: aluno.id,
    aluno_nome: getPessoaNome(aluno),
    presente: payload.presentes.includes(aluno.pessoa_id),
    registrado_por: payload.professor_id,
  }))

  const { error: presencaError } = await supabase
    .from('classe_biblica_aula_presenca')
    .insert(presencaRows)

  if (presencaError) throw presencaError
}

async function liberarQuestionarioClasseBiblica(payload: LiberarQuestionarioPayload) {
  const { error } = await supabase
    .from('classe_biblica_aulas')
    .update({
      questionario_liberado: true,
      questionario_liberado_em: new Date().toISOString(),
      questionario_liberado_por: payload.profile_id,
    })
    .eq('id', payload.aula_id)

  if (error) throw error
}

export function useClassesBiblicas() {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: ['classes-biblicas', profile?.id, profile?.papel, profile?.uniao_id, profile?.associacao_id, profile?.igreja_id],
    queryFn: () => fetchClassesBiblicas(profile!),
    enabled: !!profile,
  })

  return {
    classes: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar as classes biblicas.' : null,
    refetch: query.refetch,
  }
}

export function useClasseBiblicaDetail(classeId?: string | null) {
  const query = useQuery({
    queryKey: ['classe-biblica-detail', classeId],
    queryFn: () => fetchClasseBiblicaDetail(classeId!),
    enabled: !!classeId,
  })

  return {
    detail: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar os detalhes da classe.' : null,
    refetch: query.refetch,
  }
}

export function useSearchPessoasClasse(search: string, igrejaId: string, excludePessoaIds: string[], enabled = true) {
  const query = useQuery({
    queryKey: ['classe-biblica-pessoas-search', igrejaId, search.trim(), excludePessoaIds.join(',')],
    queryFn: () => searchPessoasClasse({ search, igrejaId, excludePessoaIds }),
    enabled: enabled && search.trim().length >= 2 && !!igrejaId,
  })

  return {
    pessoas: query.data ?? [],
    loading: query.isFetching,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao buscar pessoas.' : null,
  }
}

function invalidateClasseBiblicaQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['classes-biblicas'] }),
    queryClient.invalidateQueries({ queryKey: ['classe-biblica-detail'] }),
    queryClient.invalidateQueries({ queryKey: ['secretaria-stats'] }),
  ])
}

export function useCreateClasseBiblica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClasseBiblica,
    onSuccess: async () => {
      await invalidateClasseBiblicaQueries(queryClient)
    },
  })
}

export function useAddAlunoClasseBiblica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addAlunoClasseBiblica,
    onSuccess: async () => {
      await invalidateClasseBiblicaQueries(queryClient)
    },
  })
}

export function useRemoveAlunoClasseBiblica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeAlunoClasseBiblica,
    onSuccess: async () => {
      await invalidateClasseBiblicaQueries(queryClient)
    },
  })
}

export function useToggleDecisaoClasseBiblica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleDecisaoClasseBiblica,
    onSuccess: async () => {
      await invalidateClasseBiblicaQueries(queryClient)
    },
  })
}

export function useRegisterLicaoClasseBiblica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: registerLicaoClasseBiblica,
    onSuccess: async () => {
      await invalidateClasseBiblicaQueries(queryClient)
    },
  })
}

export function useAtivarAulaClasseBiblica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ativarAulaClasseBiblica,
    onSuccess: async () => {
      await invalidateClasseBiblicaQueries(queryClient)
    },
  })
}

export function useLiberarQuestionarioClasseBiblica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: liberarQuestionarioClasseBiblica,
    onSuccess: async () => {
      await invalidateClasseBiblicaQueries(queryClient)
    },
  })
}

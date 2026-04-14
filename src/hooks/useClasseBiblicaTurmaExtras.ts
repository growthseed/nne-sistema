import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ClasseBiblicaInteracao {
  id: string
  aluno_id: string
  tipo: string
  descricao: string | null
  pedido_oracao: boolean
  data_interacao: string
  professor_nome: string | null
}

export interface ClasseBiblicaDiarioEntry {
  id: string
  data: string
  ponto_numero: number | null
  ponto_titulo: string | null
  resumo: string
  observacoes: string | null
  presentes: number
  ausentes: number
  professor_nome: string | null
}

interface ClasseBiblicaTurmaExtras {
  interacoes: ClasseBiblicaInteracao[]
  diario: ClasseBiblicaDiarioEntry[]
}

interface SaveClasseBiblicaDiarioPayload {
  classe_id: string
  data: string
  ponto_numero: number | null
  ponto_titulo: string | null
  resumo: string
  observacoes: string | null
  presentes: number
  ausentes: number
  professor_id: string
  professor_nome: string | null
}

interface CreateClasseBiblicaInteracaoPayload {
  classe_id: string
  aluno_id: string
  professor_id: string
  professor_nome: string | null
  tipo: string
  descricao: string | null
  pedido_oracao: boolean
  data_interacao: string
}

async function fetchClasseBiblicaTurmaExtras(classeId: string): Promise<ClasseBiblicaTurmaExtras> {
  if (!classeId) {
    return { interacoes: [], diario: [] }
  }

  const [interacoesRes, diarioRes] = await Promise.all([
    supabase
      .from('eb_interacoes')
      .select('*')
      .eq('classe_id', classeId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('eb_diario_turma')
      .select('*')
      .eq('classe_id', classeId)
      .order('data', { ascending: false })
      .limit(50),
  ])

  if (interacoesRes.error) throw interacoesRes.error
  if (diarioRes.error) throw diarioRes.error

  return {
    interacoes: (interacoesRes.data as ClasseBiblicaInteracao[]) || [],
    diario: (diarioRes.data as ClasseBiblicaDiarioEntry[]) || [],
  }
}

async function saveClasseBiblicaDiario(payload: SaveClasseBiblicaDiarioPayload) {
  const { error } = await supabase
    .from('eb_diario_turma')
    .upsert(payload, { onConflict: 'classe_id,data' })

  if (error) throw error
}

async function createClasseBiblicaInteracao(payload: CreateClasseBiblicaInteracaoPayload) {
  const { error } = await supabase
    .from('eb_interacoes')
    .insert(payload)

  if (error) throw error
}

async function invalidateClasseBiblicaTurmaExtras(
  queryClient: ReturnType<typeof useQueryClient>,
  classeId: string,
) {
  await queryClient.invalidateQueries({ queryKey: ['classe-biblica-turma-extras', classeId] })
}

export function useClasseBiblicaTurmaExtras(classeId?: string | null) {
  const query = useQuery({
    queryKey: ['classe-biblica-turma-extras', classeId],
    queryFn: () => fetchClasseBiblicaTurmaExtras(classeId!),
    enabled: !!classeId,
  })

  return {
    interacoes: query.data?.interacoes ?? [],
    diario: query.data?.diario ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar extras da turma.' : null,
    refetch: query.refetch,
  }
}

export function useSaveClasseBiblicaDiario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveClasseBiblicaDiario,
    onSuccess: async (_data, payload) => {
      await invalidateClasseBiblicaTurmaExtras(queryClient, payload.classe_id)
    },
  })
}

export function useCreateClasseBiblicaInteracao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClasseBiblicaInteracao,
    onSuccess: async (_data, payload) => {
      await invalidateClasseBiblicaTurmaExtras(queryClient, payload.classe_id)
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ClasseBiblicaResposta {
  id: string
  aluno_nome: string | null
  ponto_numero: number
  ponto_titulo: string | null
  pontuacao: number
  total_perguntas: number
  percentual_acerto: number
  submetido_em: string
  revisado_por_professor: boolean
  professor_comentario: string | null
  respostas: Record<string, string>
  compromissos: Record<string, boolean>
}

interface ReviewClasseBiblicaRespostaPayload {
  id: string
  comentario: string
}

async function fetchClasseBiblicaRespostas(turmaId: string): Promise<ClasseBiblicaResposta[]> {
  if (!turmaId) {
    return []
  }

  const { data, error } = await supabase
    .from('classe_biblica_respostas')
    .select('*')
    .eq('classe_id', turmaId)
    .order('submetido_em', { ascending: false })

  if (error) throw error
  return (data as ClasseBiblicaResposta[]) || []
}

async function reviewClasseBiblicaResposta(payload: ReviewClasseBiblicaRespostaPayload) {
  const { error } = await supabase
    .from('classe_biblica_respostas')
    .update({
      revisado_por_professor: true,
      professor_comentario: payload.comentario,
    })
    .eq('id', payload.id)

  if (error) throw error
}

export function useClasseBiblicaRespostas(turmaId: string) {
  const query = useQuery({
    queryKey: ['classe-biblica-respostas', turmaId],
    queryFn: () => fetchClasseBiblicaRespostas(turmaId),
    enabled: !!turmaId,
  })

  return {
    respostas: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar respostas.' : null,
    refetch: query.refetch,
  }
}

export function useReviewClasseBiblicaResposta(turmaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reviewClasseBiblicaResposta,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['classe-biblica-respostas', turmaId] })
    },
  })
}

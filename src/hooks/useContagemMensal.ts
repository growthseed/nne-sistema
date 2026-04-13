import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { ContagemMensal, UserProfile } from '@/types'
import { fetchScopedIgrejas } from '@/hooks/useScopedIgrejas'

export interface ContagemMensalWithIgreja extends ContagemMensal {
  igreja?: { nome: string } | null
}

export interface SaveContagemMensalPayload {
  igreja_id: string
  ano: number
  mes: number
  total_membros: number
  total_interessados: number
  batismos: number
  transferencias_entrada: number
  transferencias_saida: number
  exclusoes: number
  obitos: number
}

async function fetchContagens(profile: UserProfile): Promise<ContagemMensalWithIgreja[]> {
  let query = supabase
    .from('contagem_mensal')
    .select('*, igreja:igrejas(nome)')
    .order('ano', { ascending: false })
    .order('mes', { ascending: false })
    .limit(50)

  if (profile.papel !== 'admin') {
    const igrejas = await fetchScopedIgrejas(profile)
    const igrejaIds = igrejas.map((igreja) => igreja.id)
    if (igrejaIds.length === 0) return []
    query = query.in('igreja_id', igrejaIds)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as ContagemMensalWithIgreja[]) || []
}

async function saveContagemMensal(payload: SaveContagemMensalPayload) {
  const { error } = await supabase
    .from('contagem_mensal')
    .insert(payload)

  if (error) throw error
}

export function useContagemMensal() {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: ['contagem-mensal', profile?.id, profile?.papel, profile?.uniao_id, profile?.associacao_id, profile?.igreja_id],
    queryFn: () => fetchContagens(profile!),
    enabled: !!profile,
  })

  return {
    contagens: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar contagens mensais.' : null,
    refetch: query.refetch,
  }
}

export function useSaveContagemMensal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveContagemMensal,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contagem-mensal'] }),
        queryClient.invalidateQueries({ queryKey: ['secretaria-stats'] }),
      ])
    },
  })
}

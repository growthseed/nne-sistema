import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Igreja, UserProfile } from '@/types'

export async function getAssociacaoIdsByUniao(uniaoId: string) {
  const { data, error } = await supabase
    .from('associacoes')
    .select('id')
    .eq('uniao_id', uniaoId)

  if (error) throw error
  return data?.map((associacao) => associacao.id) || []
}

export async function fetchScopedIgrejas(profile: UserProfile): Promise<Igreja[]> {
  let query = supabase
    .from('igrejas')
    .select('id, nome, associacao_id, uniao_id, ativo, endereco_rua, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, coordenadas_lat, coordenadas_lng, pastor, telefone, email, created_at')
    .eq('ativo', true)
    .order('nome')

  if (profile.papel === 'admin') {
    const { data, error } = await query
    if (error) throw error
    return (data as Igreja[]) || []
  }

  if (profile.papel === 'admin_uniao') {
    if (!profile.uniao_id) return []
    const associacaoIds = await getAssociacaoIdsByUniao(profile.uniao_id)
    if (associacaoIds.length === 0) return []

    const { data, error } = await query.in('associacao_id', associacaoIds)
    if (error) throw error
    return (data as Igreja[]) || []
  }

  if (profile.papel === 'admin_associacao') {
    if (!profile.associacao_id) return []
    const { data, error } = await query.eq('associacao_id', profile.associacao_id)
    if (error) throw error
    return (data as Igreja[]) || []
  }

  if (!profile.igreja_id) return []
  const { data, error } = await query.eq('id', profile.igreja_id)
  if (error) throw error
  return (data as Igreja[]) || []
}

export function useScopedIgrejas() {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: ['scoped-igrejas', profile?.id, profile?.papel, profile?.uniao_id, profile?.associacao_id, profile?.igreja_id],
    queryFn: () => fetchScopedIgrejas(profile!),
    enabled: !!profile,
  })

  return {
    igrejas: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar igrejas.' : null,
  }
}

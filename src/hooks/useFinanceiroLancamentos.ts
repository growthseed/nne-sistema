import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { DadosFinanceiros, UserProfile } from '@/types'
import { fetchScopedIgrejas, getAssociacaoIdsByUniao, useScopedIgrejas } from '@/hooks/useScopedIgrejas'

export interface EntryWithIgreja extends DadosFinanceiros {
  igreja?: { nome: string } | null
}

export interface LancamentoFilters {
  mes: number
  ano: number
  status: string
}

export interface SaveLancamentoPayload extends Omit<DadosFinanceiros, 'created_at' | 'updated_at' | 'igreja'> {
  id?: string
}

interface UpdateLancamentoStatusPayload {
  id: string
  status: DadosFinanceiros['status']
}

async function fetchLancamentos(profile: UserProfile, filters: LancamentoFilters): Promise<EntryWithIgreja[]> {
  let query = supabase
    .from('dados_financeiros')
    .select('*, igreja:igrejas(nome)')
    .eq('mes', filters.mes)
    .eq('ano', filters.ano)
    .order('created_at', { ascending: false })

  if (profile.papel === 'admin') {
    // admin sees all
  } else if (profile.papel === 'admin_uniao') {
    if (!profile.uniao_id) return []
    const associacaoIds = await getAssociacaoIdsByUniao(profile.uniao_id)
    if (associacaoIds.length === 0) return []
    query = query.in('associacao_id', associacaoIds)
  } else if (profile.papel === 'admin_associacao') {
    if (!profile.associacao_id) return []
    query = query.eq('associacao_id', profile.associacao_id)
  } else if (profile.papel === 'tesoureiro') {
    if (!profile.igreja_id) return []
    query = query.eq('igreja_id', profile.igreja_id)
  } else {
    if (!profile.igreja_id) return []
    query = query.eq('igreja_id', profile.igreja_id)
  }

  if (filters.status !== 'todos') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data as EntryWithIgreja[]) || []
}

async function saveLancamento(payload: SaveLancamentoPayload) {
  const { id, ...data } = payload

  if (id) {
    const { error } = await supabase
      .from('dados_financeiros')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('dados_financeiros')
    .insert(data)

  if (error) throw error
}

async function updateLancamentoStatus(payload: UpdateLancamentoStatusPayload) {
  const { error } = await supabase
    .from('dados_financeiros')
    .update({ status: payload.status, updated_at: new Date().toISOString() })
    .eq('id', payload.id)

  if (error) throw error
}

async function deleteLancamento(id: string) {
  const { error } = await supabase
    .from('dados_financeiros')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export function useScopedFinanceiroIgrejas() {
  return useScopedIgrejas()
}

export function useFinanceiroLancamentos(filters: LancamentoFilters) {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: ['financeiro-lancamentos', profile?.id, profile?.papel, profile?.uniao_id, profile?.associacao_id, profile?.igreja_id, filters.mes, filters.ano, filters.status],
    queryFn: () => fetchLancamentos(profile!, filters),
    enabled: !!profile,
  })

  return {
    entries: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar lancamentos financeiros.' : null,
    refetch: query.refetch,
  }
}

export function useSaveLancamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveLancamento,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['financeiro-lancamentos'] })
    },
  })
}

export function useUpdateLancamentoStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateLancamentoStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['financeiro-lancamentos'] })
    },
  })
}

export function useDeleteLancamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteLancamento,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['financeiro-lancamentos'] })
    },
  })
}

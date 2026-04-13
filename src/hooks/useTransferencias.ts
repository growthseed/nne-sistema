import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { TransferenciaStatus, UserProfile } from '@/types'

export interface TransferenciaView {
  id: string
  pessoa_id: string
  pessoa: { nome: string } | null
  igreja_origem: { nome: string } | null
  igreja_destino: { nome: string } | null
  tipo: 'transferencia' | 'carta'
  status: TransferenciaStatus
  motivo: string | null
  observacao: string | null
  created_at: string
}

export interface IgrejaOption {
  id: string
  nome: string
}

interface CreateTransferenciaPayload {
  pessoa_id: string
  igreja_origem_id: string
  igreja_destino_id: string
  tipo: 'transferencia' | 'carta'
  motivo: string | null
  solicitado_por: string
}

interface UpdateTransferenciaStatusPayload {
  id: string
  status: Extract<TransferenciaStatus, 'aprovada' | 'rejeitada' | 'concluida'>
  userId: string
}

async function fetchTransferencias(profile: UserProfile): Promise<TransferenciaView[]> {
  let query = supabase
    .from('transferencias')
    .select('id, pessoa_id, tipo, status, motivo, observacao, created_at, pessoa:pessoas!pessoa_id(nome), igreja_origem:igrejas!igreja_origem_id(nome), igreja_destino:igrejas!igreja_destino_id(nome)')
    .order('created_at', { ascending: false })

  if (profile.papel === 'secretario_igreja' && profile.igreja_id) {
    query = query.or(`igreja_origem_id.eq.${profile.igreja_id},igreja_destino_id.eq.${profile.igreja_id}`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as unknown as TransferenciaView[]
}

async function fetchIgrejasAtivas(): Promise<IgrejaOption[]> {
  const { data, error } = await supabase
    .from('igrejas')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data || []
}

async function createTransferencia(payload: CreateTransferenciaPayload) {
  const { error } = await supabase.from('transferencias').insert(payload)
  if (error) throw error
}

async function updateTransferenciaStatus(payload: UpdateTransferenciaStatusPayload) {
  const baseUpdate = {
    status: payload.status,
    data_aprovacao: new Date().toISOString(),
  } as Record<string, string>

  if (payload.status === 'aprovada' || payload.status === 'rejeitada') {
    baseUpdate.aprovado_por = payload.userId
  }

  const { error } = await supabase
    .from('transferencias')
    .update(baseUpdate)
    .eq('id', payload.id)

  if (error) throw error
}

export function useTransferencias() {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: ['transferencias', profile?.id, profile?.papel, profile?.uniao_id, profile?.associacao_id, profile?.igreja_id],
    queryFn: () => fetchTransferencias(profile!),
    enabled: !!profile,
  })

  return {
    transferencias: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar transferencias.' : null,
    refetch: query.refetch,
  }
}

export function useIgrejasAtivas() {
  const query = useQuery({
    queryKey: ['igrejas-ativas'],
    queryFn: fetchIgrejasAtivas,
  })

  return {
    igrejas: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar igrejas.' : null,
  }
}

export function useCreateTransferencia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTransferencia,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transferencias'] }),
        queryClient.invalidateQueries({ queryKey: ['secretaria-stats'] }),
      ])
    },
  })
}

export function useUpdateTransferenciaStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTransferenciaStatus,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transferencias'] }),
        queryClient.invalidateQueries({ queryKey: ['secretaria-stats'] }),
      ])
    },
  })
}

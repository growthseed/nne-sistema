import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ModuloEB {
  id: string
  titulo: string
  subtitulo: string | null
  descricao: string | null
  capa_url: string | null
  total_pontos: number
  tipo: string
  ativo: boolean
}

export interface PerguntaEB {
  id: string
  numero: number
  texto: string
  opcoes: OpcaoEB[]
  resposta_correta: string
  explicacao: string
  referencias: ReferenciaEB[]
}

export interface OpcaoEB { id: string; texto: string }
export interface ReferenciaEB { texto: string; livro: string; capitulo: number; versiculo: string; conteudo: string }
export interface CompromissoFe { id: string; texto: string }

export interface ConteudoBloco { tipo: string; texto?: string; itens?: string[] }
export interface Secao { id: string; titulo: string | null; tipo: string; conteudo: ConteudoBloco[]; subSecoes?: SubSecao[] }
export interface SubSecao { id: string; titulo: string; tipo: string; conteudo: ConteudoBloco[] }

export interface PontoEB {
  id: string
  modulo_id: string
  ponto_numero: number
  titulo: string
  subtitulo: string | null
  introducao: string | null
  imagem_url: string | null
  video_url: string | null
  secoes: Secao[]
  perguntas: PerguntaEB[]
  compromissos_fe: CompromissoFe[]
}

async function fetchModulos(): Promise<ModuloEB[]> {
  const { data, error } = await supabase
    .from('eb_modulos')
    .select('*')
    .eq('ativo', true)

  if (error) throw error

  return (data as ModuloEB[]) || []
}

async function fetchPontos(moduloId: string): Promise<PontoEB[]> {
  if (!moduloId) return []

  const { data, error } = await supabase
    .from('eb_pontos')
    .select('*')
    .eq('modulo_id', moduloId)
    .order('ponto_numero')

  if (error) throw error

  return (data as PontoEB[]) || []
}

async function fetchPontoById(id: string): Promise<PontoEB | null> {
  if (!id) return null

  const { data, error } = await supabase
    .from('eb_pontos')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return (data as PontoEB) || null
}

export function useEbModulos() {
  const query = useQuery({
    queryKey: ['eb-modulos'],
    queryFn: fetchModulos,
  })

  return {
    modulos: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar modulos.' : null,
    refetch: query.refetch,
  }
}

export function useEbPontos(moduloId: string) {
  const query = useQuery({
    queryKey: ['eb-pontos', moduloId],
    queryFn: () => fetchPontos(moduloId),
    enabled: !!moduloId,
  })

  return {
    pontos: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar pontos.' : null,
    refetch: query.refetch,
  }
}

export function useEbPonto(id: string | null) {
  const query = useQuery({
    queryKey: ['eb-ponto', id],
    queryFn: () => fetchPontoById(id!),
    enabled: !!id,
  })

  return {
    ponto: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar ponto.' : null,
    refetch: query.refetch,
  }
}

interface UpdatePontoPayload {
  id: string
  data: Partial<PontoEB>
}

interface UpdateModuloPayload {
  id: string
  data: Partial<ModuloEB>
}

interface CreatePontoPayload {
  data: Partial<PontoEB>
}

interface DeletePontoPayload {
  id: string
  moduloId: string
}

async function updatePonto(payload: UpdatePontoPayload) {
  const { error } = await supabase
    .from('eb_pontos')
    .update({ ...payload.data, updated_at: new Date().toISOString() })
    .eq('id', payload.id)

  if (error) throw error
}

async function updateModulo(payload: UpdateModuloPayload) {
  const { error } = await supabase
    .from('eb_modulos')
    .update({ ...payload.data, updated_at: new Date().toISOString() })
    .eq('id', payload.id)

  if (error) throw error
}

async function createPonto(payload: CreatePontoPayload) {
  const { error } = await supabase
    .from('eb_pontos')
    .insert(payload.data)

  if (error) throw error
}

async function deletePonto(payload: DeletePontoPayload) {
  const { error } = await supabase
    .from('eb_pontos')
    .delete()
    .eq('id', payload.id)

  if (error) throw error
}

export function useUpdatePonto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updatePonto,
    onSuccess: async (_data, payload) => {
      await queryClient.invalidateQueries({ queryKey: ['eb-pontos', payload.data.modulo_id] })
    },
  })
}

export function useUpdateModulo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateModulo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['eb-modulos'] })
    },
  })
}

export function useCreatePonto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPonto,
    onSuccess: async (_data, payload) => {
      await queryClient.invalidateQueries({ queryKey: ['eb-pontos', payload.data.modulo_id] })
    },
  })
}

export function useDeletePonto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePonto,
    onSuccess: async (_data, payload) => {
      await queryClient.invalidateQueries({ queryKey: ['eb-pontos', payload.moduloId] })
    },
  })
}

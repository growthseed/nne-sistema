import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { UserProfile } from '@/types'
import { calcularIdade, AGE_BUCKETS } from '@/lib/secretaria-constants'

interface SecretariaStats {
  membrosAtivos: number
  membrosInativos: number
  membrosFalecidos: number
  membrosTransferidos: number
  membrosExcluidos: number
  interessados: number
  batismosAno: number
  exclusoesAno: number
  obitosAno: number
  transferenciasAno: number
  transferenciasPendentes: number
  membrosPorAssociacao: { sigla: string; count: number }[]
  membrosPorSexo: { sexo: string; count: number }[]
  distribuicaoEtaria: { faixa: string; count: number }[]
  aniversariantes7dias: { id: string; nome: string; data_nascimento: string; igreja_nome?: string }[]
  crescimentoMensal: { mes: number; ano: number; batismos: number; exclusoes: number; obitos: number }[]
}

function buildScopeFilter(query: any, profile: UserProfile) {
  if (profile.papel === 'admin') return query
  if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id)
  if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id)
  return query.eq('igreja_id', profile.igreja_id)
}

async function fetchSecretariaStats(profile: UserProfile): Promise<SecretariaStats> {
  const anoAtual = new Date().getFullYear()

  const [
    ativosRes,
    inativosRes,
    falecidosRes,
    transferidosRes,
    excluidosRes,
    interessadosRes,
    contagemRes,
    transfPendRes,
    assocRes,
    pessoasParaCharts,
    anivRes,
  ] = await Promise.all([
    buildScopeFilter(supabase.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'ativo'), profile),
    buildScopeFilter(supabase.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'inativo'), profile),
    buildScopeFilter(supabase.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'falecido'), profile),
    buildScopeFilter(supabase.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'transferido'), profile),
    buildScopeFilter(supabase.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'excluido'), profile),
    buildScopeFilter(supabase.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'interessado'), profile),
    supabase.from('contagem_mensal').select('mes, ano, batismos, exclusoes, obitos, transferencias_entrada, transferencias_saida').eq('ano', anoAtual),
    supabase.from('transferencias').select('id', { count: 'exact', head: true }).in('status', ['solicitada', 'pendente']),
    supabase.from('associacoes').select('id, sigla'),
    buildScopeFilter(supabase.from('pessoas').select('sexo, data_nascimento, associacao_id, situacao').eq('tipo', 'membro').eq('situacao', 'ativo').limit(5000), profile),
    buildScopeFilter(supabase.from('pessoas').select('id, nome, data_nascimento, igreja:igrejas(nome)').eq('tipo', 'membro').eq('situacao', 'ativo').not('data_nascimento', 'is', null).limit(5000), profile),
  ])

  const firstError = [
    ativosRes.error,
    inativosRes.error,
    falecidosRes.error,
    transferidosRes.error,
    excluidosRes.error,
    interessadosRes.error,
    contagemRes.error,
    transfPendRes.error,
    assocRes.error,
    pessoasParaCharts.error,
    anivRes.error,
  ].find(Boolean)

  if (firstError) throw firstError

  const countAtivos = ativosRes.count || 0
  const countInativos = inativosRes.count || 0
  const countFalecidos = falecidosRes.count || 0
  const countTransferidos = transferidosRes.count || 0
  const countExcluidos = excluidosRes.count || 0

  const contagem = contagemRes.data || []
  const batismosAno = contagem.reduce((sum, current) => sum + (current.batismos || 0), 0)
  const exclusoesAno = contagem.reduce((sum, current) => sum + (current.exclusoes || 0), 0)
  const obitosAno = contagem.reduce((sum, current) => sum + (current.obitos || 0), 0)
  const transferenciasAno = contagem.reduce((sum, current) => sum + (current.transferencias_entrada || 0) + (current.transferencias_saida || 0), 0)

  const crescimentoMensal = contagem
    .map(current => ({
      mes: current.mes,
      ano: current.ano,
      batismos: current.batismos || 0,
      exclusoes: current.exclusoes || 0,
      obitos: current.obitos || 0,
    }))
    .sort((a, b) => a.mes - b.mes)

  const assocMap = new Map((assocRes.data || []).map(associacao => [associacao.id, associacao.sigla]))
  const pessoasData = pessoasParaCharts.data || []

  const byAssoc: Record<string, number> = {}
  pessoasData.forEach(pessoa => {
    if (pessoa.associacao_id && pessoa.situacao === 'ativo') {
      const sigla = assocMap.get(pessoa.associacao_id) || 'N/D'
      byAssoc[sigla] = (byAssoc[sigla] || 0) + 1
    }
  })

  const membrosPorAssociacao = Object.entries(byAssoc)
    .map(([sigla, count]) => ({ sigla, count }))
    .sort((a, b) => b.count - a.count)

  const bySexo: Record<string, number> = {}
  pessoasData
    .filter(pessoa => pessoa.situacao === 'ativo')
    .forEach(pessoa => {
      const sexo = pessoa.sexo || 'nao_informado'
      bySexo[sexo] = (bySexo[sexo] || 0) + 1
    })

  const membrosPorSexo = Object.entries(bySexo).map(([sexo, count]) => ({ sexo, count }))

  const ageCounts: Record<string, number> = {}
  AGE_BUCKETS.forEach(bucket => {
    ageCounts[bucket.label] = 0
  })

  pessoasData
    .filter(pessoa => pessoa.situacao === 'ativo' && pessoa.data_nascimento)
    .forEach(pessoa => {
      const idade = calcularIdade(pessoa.data_nascimento)
      const bucket = AGE_BUCKETS.find(current => idade >= current.min && idade <= current.max)
      if (bucket) ageCounts[bucket.label] += 1
    })

  const distribuicaoEtaria = AGE_BUCKETS.map(bucket => ({ faixa: bucket.label, count: ageCounts[bucket.label] }))

  const hoje = new Date()
  const aniversariantes = (anivRes.data || [])
    .filter(pessoa => {
      if (!pessoa.data_nascimento) return false
      const nascimento = new Date(`${pessoa.data_nascimento}T00:00:00`)
      const aniversarioEsteAno = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())
      if (aniversarioEsteAno < hoje) aniversarioEsteAno.setFullYear(aniversarioEsteAno.getFullYear() + 1)
      const diffDays = Math.ceil((aniversarioEsteAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 7
    })
    .map(pessoa => ({
      id: pessoa.id,
      nome: pessoa.nome,
      data_nascimento: pessoa.data_nascimento,
      igreja_nome: (pessoa.igreja as any)?.nome,
    }))
    .sort((a, b) => {
      const nascimentoA = new Date(`${a.data_nascimento}T00:00:00`)
      const nascimentoB = new Date(`${b.data_nascimento}T00:00:00`)
      const aniversarioA = new Date(hoje.getFullYear(), nascimentoA.getMonth(), nascimentoA.getDate())
      const aniversarioB = new Date(hoje.getFullYear(), nascimentoB.getMonth(), nascimentoB.getDate())
      return aniversarioA.getTime() - aniversarioB.getTime()
    })
    .slice(0, 10)

  return {
    membrosAtivos: countAtivos,
    membrosInativos: countInativos,
    membrosFalecidos: countFalecidos,
    membrosTransferidos: countTransferidos,
    membrosExcluidos: countExcluidos,
    interessados: interessadosRes.count || 0,
    batismosAno,
    exclusoesAno,
    obitosAno,
    transferenciasAno,
    transferenciasPendentes: transfPendRes.count || 0,
    membrosPorAssociacao,
    membrosPorSexo,
    distribuicaoEtaria,
    aniversariantes7dias: aniversariantes,
    crescimentoMensal,
  }
}

export function useSecretariaStats() {
  const { profile } = useAuth()

  const query = useQuery({
    queryKey: ['secretaria-stats', profile?.id, profile?.papel, profile?.uniao_id, profile?.associacao_id, profile?.igreja_id],
    queryFn: () => fetchSecretariaStats(profile!),
    enabled: !!profile,
  })

  return {
    stats: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : query.error ? 'Erro ao carregar indicadores da secretaria.' : null,
    refetch: query.refetch,
  }
}

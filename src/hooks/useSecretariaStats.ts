import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
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

function buildScopeFilter(query: any, profile: any) {
  if (profile.papel === 'admin') return query
  if (profile.papel === 'admin_uniao') return query.eq('uniao_id', profile.uniao_id)
  if (profile.papel === 'admin_associacao') return query.eq('associacao_id', profile.associacao_id)
  return query.eq('igreja_id', profile.igreja_id)
}

export function useSecretariaStats() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<SecretariaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    fetchStats()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchStats() {
    try {
      setLoading(true)
      setError(null)
      const anoAtual = new Date().getFullYear()

      // Parallel queries
      const [
        membrosRes,
        interessadosRes,
        contagemRes,
        transfPendRes,
        assocRes,
        pessoasParaCharts,
        anivRes,
      ] = await Promise.all([
        // Membros por situacao
        supabase.from('pessoas').select('situacao').eq('tipo', 'membro'),
        // Total interessados
        buildScopeFilter(
          supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('tipo', 'interessado'),
          profile
        ),
        // Contagem mensal do ano
        supabase.from('contagem_mensal').select('mes, ano, batismos, exclusoes, obitos, transferencias_entrada, transferencias_saida').eq('ano', anoAtual),
        // Transferências pendentes
        supabase.from('transferencias').select('id', { count: 'exact', head: true }).in('status', ['solicitada', 'pendente']),
        // Associações para labels
        supabase.from('associacoes').select('id, sigla'),
        // Pessoas para charts (membros com dados)
        supabase.from('pessoas').select('sexo, data_nascimento, associacao_id, situacao, igreja:igrejas(nome)').eq('tipo', 'membro'),
        // Aniversariantes próximos 7 dias
        supabase.from('pessoas').select('id, nome, data_nascimento, igreja:igrejas(nome)').eq('tipo', 'membro').eq('situacao', 'ativo').not('data_nascimento', 'is', null),
      ])

      // Process member counts by status
      const membros = membrosRes.data || []
      const bySituacao = membros.reduce((acc: Record<string, number>, m) => {
        acc[m.situacao || 'ativo'] = (acc[m.situacao || 'ativo'] || 0) + 1
        return acc
      }, {})

      // Process contagem
      const contagem = contagemRes.data || []
      const batismosAno = contagem.reduce((s, c) => s + (c.batismos || 0), 0)
      const exclusoesAno = contagem.reduce((s, c) => s + (c.exclusoes || 0), 0)
      const obitosAno = contagem.reduce((s, c) => s + (c.obitos || 0), 0)
      const transferenciasAno = contagem.reduce((s, c) => s + (c.transferencias_entrada || 0) + (c.transferencias_saida || 0), 0)

      // Crescimento mensal (últimos 12 meses)
      const crescimentoMensal = contagem.map(c => ({
        mes: c.mes,
        ano: c.ano,
        batismos: c.batismos || 0,
        exclusoes: c.exclusoes || 0,
        obitos: c.obitos || 0,
      })).sort((a, b) => a.mes - b.mes)

      // Membros por associação
      const assocMap = new Map((assocRes.data || []).map(a => [a.id, a.sigla]))
      const pessoasData = pessoasParaCharts.data || []
      const byAssoc: Record<string, number> = {}
      pessoasData.forEach(p => {
        if (p.associacao_id && p.situacao === 'ativo') {
          const sigla = assocMap.get(p.associacao_id) || 'N/D'
          byAssoc[sigla] = (byAssoc[sigla] || 0) + 1
        }
      })
      const membrosPorAssociacao = Object.entries(byAssoc)
        .map(([sigla, count]) => ({ sigla, count }))
        .sort((a, b) => b.count - a.count)

      // Membros por sexo
      const bySexo: Record<string, number> = {}
      pessoasData.filter(p => p.situacao === 'ativo').forEach(p => {
        const s = p.sexo || 'nao_informado'
        bySexo[s] = (bySexo[s] || 0) + 1
      })
      const membrosPorSexo = Object.entries(bySexo).map(([sexo, count]) => ({ sexo, count }))

      // Distribuição etária
      const ageCounts: Record<string, number> = {}
      AGE_BUCKETS.forEach(b => { ageCounts[b.label] = 0 })
      pessoasData.filter(p => p.situacao === 'ativo' && p.data_nascimento).forEach(p => {
        const idade = calcularIdade(p.data_nascimento)
        const bucket = AGE_BUCKETS.find(b => idade >= b.min && idade <= b.max)
        if (bucket) ageCounts[bucket.label]++
      })
      const distribuicaoEtaria = AGE_BUCKETS.map(b => ({ faixa: b.label, count: ageCounts[b.label] }))

      // Aniversariantes próximos 7 dias
      const hoje = new Date()
      const aniversariantes = (anivRes.data || []).filter(p => {
        if (!p.data_nascimento) return false
        const nasc = new Date(p.data_nascimento + 'T00:00:00')
        const anivEsteAno = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
        if (anivEsteAno < hoje) anivEsteAno.setFullYear(anivEsteAno.getFullYear() + 1)
        const diffDays = Math.ceil((anivEsteAno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 7
      }).map(p => ({
        id: p.id,
        nome: p.nome,
        data_nascimento: p.data_nascimento,
        igreja_nome: (p.igreja as any)?.nome,
      })).sort((a, b) => {
        const da = new Date(a.data_nascimento + 'T00:00:00')
        const db = new Date(b.data_nascimento + 'T00:00:00')
        const hoje = new Date()
        const anivA = new Date(hoje.getFullYear(), da.getMonth(), da.getDate())
        const anivB = new Date(hoje.getFullYear(), db.getMonth(), db.getDate())
        return anivA.getTime() - anivB.getTime()
      }).slice(0, 10)

      setStats({
        membrosAtivos: bySituacao['ativo'] || 0,
        membrosInativos: bySituacao['inativo'] || 0,
        membrosFalecidos: bySituacao['falecido'] || 0,
        membrosTransferidos: bySituacao['transferido'] || 0,
        membrosExcluidos: bySituacao['excluido'] || 0,
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
      })
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching secretaria stats:', err)
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, error, refetch: fetchStats }
}

// Motor analítico do Censo NNE.
// Centraliza vocabulários, agregações e índices compostos para uso pelas
// telas estratégica (União), tática (Associação) e operacional (Igreja).
//
// Pirâmide de leitura inspirada em report executivo:
//   • Estratégico (União): heatmap, ranking, matriz importância × desempenho.
//   • Tático (Associação): ranking de igrejas, dispersão (boxplot), top dores.
//   • Operacional (Igreja): notas por área, SWOT, perfil dos respondentes.

// =================== VOCABULÁRIOS ===================
// Mantidos em sincronia com CadastroPublicoPage (formulário público).
export const SATISFACAO_ITENS = [
  'Culto Divino', 'Escola Sabatina', 'Culto de Domingo', 'Culto de quarta-feira',
  'Pequenos grupos', 'Música em geral', 'Visão missionária', 'Departamento Infantil',
  'Área social', 'Área administrativa', 'Evangelização', 'Integração social',
  'Departamento Jovem', 'Programa da terceira idade',
] as const

export const FREQUENCIA_ITENS = [
  'Escola Sabatina', 'Culto Divino', 'Culto de Domingo', 'Culto de quarta-feira',
  'Pequenos grupos', 'Atividades missionárias durante a semana',
] as const

export const ENFASES_OPTIONS = [
  'Treinamento de líderes', 'Recreação', 'Cultos de oração', 'Crianças', 'Adolescentes',
  'Terceira idade', 'Visitação', 'Estudo bíblico', 'Área financeira', 'Doutrinamento',
  'Sustento de missionários', 'Ampliação do espaço físico', 'Saúde dos membros',
  'Assistência aos novos convertidos', 'Discipulado', 'Ação social', 'Evangelismo',
  'Evangelismo digital', 'Jovens', 'Música', 'Ministério com famílias',
  'Programa de rádio e TV', 'Área para retiro', 'Integração/comunhão dos membros', 'Administração',
] as const

// Agrupamento das áreas avaliadas em domínios estratégicos.
export const DOMINIOS = {
  vidaEspiritual: ['Culto Divino', 'Culto de quarta-feira', 'Escola Sabatina'],
  missao: ['Evangelização', 'Visão missionária'],
  comunhao: ['Integração social', 'Área social', 'Pequenos grupos', 'Departamento Jovem'],
  estrutura: ['Área administrativa', 'Música em geral'],
  publicos: ['Departamento Infantil', 'Departamento Jovem', 'Programa da terceira idade'],
} as const

// Mapeia uma prioridade (ENFASES_OPTIONS) para a(s) área(s) avaliada(s)
// correspondente(s) em SATISFACAO_ITENS, para a matriz importância × desempenho.
export const PRIORIDADE_AREA_MAP: Record<string, string[]> = {
  'Treinamento de líderes':                ['Área administrativa'],
  'Cultos de oração':                       ['Culto de quarta-feira'],
  'Crianças':                               ['Departamento Infantil'],
  'Adolescentes':                           ['Departamento Jovem'],
  'Terceira idade':                         ['Programa da terceira idade'],
  'Visitação':                              ['Integração social'],
  'Estudo bíblico':                         ['Escola Sabatina'],
  'Doutrinamento':                          ['Escola Sabatina', 'Culto Divino'],
  'Sustento de missionários':               ['Visão missionária'],
  'Saúde dos membros':                      ['Área social'],
  'Assistência aos novos convertidos':      ['Integração social'],
  'Discipulado':                            ['Pequenos grupos', 'Escola Sabatina'],
  'Ação social':                            ['Área social'],
  'Evangelismo':                            ['Evangelização'],
  'Evangelismo digital':                    ['Evangelização'],
  'Jovens':                                 ['Departamento Jovem'],
  'Música':                                 ['Música em geral'],
  'Ministério com famílias':                ['Integração social'],
  'Integração/comunhão dos membros':        ['Integração social'],
  'Administração':                          ['Área administrativa'],
  'Área financeira':                        ['Área administrativa'],
}
// Prioridades sem proxy honesto em SATISFACAO_ITENS (Recreação, Área para retiro,
// Ampliação do espaço físico, Programa de rádio e TV) ficam com quadrante
// 'sem_dados' e devem ser exibidas como "demanda sem área avaliada" — nunca ocultadas.

// =================== TIPOS ===================
export interface CensoRow {
  id: string
  nome: string | null
  email: string | null
  telefone: string | null
  sexo: string | null
  estado_civil: string | null
  data_nascimento: string | null
  cidade: string | null
  estado: string | null
  igreja_id: string | null
  associacao_id: string | null
  uniao_id: string | null
  tempo_membro: string | null
  como_conheceu: string | null
  distancia_igreja: string | null
  meio_transporte: string | null
  satisfacao: Record<string, number> | null
  prioridades: string[] | null
  participacao: Record<string, number> | null
  pontos_fortes: string[] | null
  pontos_fracos: string[] | null
  cargos_ocupa: string[] | null
  opiniao_departamentos: string | null
  etapa_atual: number
  completo: boolean
  created_at: string
}

export interface AreaScore {
  area: string
  media: number          // 1..4 (raw)
  pct: number            // 0..100 (normalizado para barras)
  respondentes: number
  classificacao: 'saudavel' | 'atencao' | 'critico' | 'sem_dados'
}

export interface IndicesCompostos {
  vidaEspiritual: number    // 0..100
  missao: number
  comunhao: number
  estrutura: number
  publicos: number
  geral: number             // média geral satisfação 0..100
  mobilizacao: number       // satisfação missão + frequência atividades miss.
  saudeRelacional: number   // satisfação comunhão + freq. pequenos grupos
}

// =================== HELPERS BÁSICOS ===================
export function normalizeText(raw: string): string {
  return raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function titleCase(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function classifyScore(media: number, scale: 'satisfacao' | 'frequencia' = 'satisfacao'): AreaScore['classificacao'] {
  if (!Number.isFinite(media) || media === 0) return 'sem_dados'
  if (scale === 'satisfacao') {
    if (media >= 3.2) return 'saudavel'
    if (media >= 2.4) return 'atencao'
    return 'critico'
  }
  // frequência: 0..4
  if (media >= 2.5) return 'saudavel'
  if (media >= 1.2) return 'atencao'
  return 'critico'
}

export function classColors(c: AreaScore['classificacao']) {
  switch (c) {
    case 'saudavel': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', solid: '#10b981', soft: '#d1fae5' }
    case 'atencao':  return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', solid: '#f59e0b', soft: '#fef3c7' }
    case 'critico':  return { bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-300',   solid: '#ef4444', soft: '#fee2e2' }
    default:         return { bg: 'bg-gray-100',  text: 'text-gray-500',  border: 'border-gray-300',  solid: '#9ca3af', soft: '#f3f4f6' }
  }
}

// =================== AGREGAÇÕES POR ÁREA ===================
export function computeAreaScores(rows: CensoRow[]): AreaScore[] {
  return SATISFACAO_ITENS.map(area => {
    const values = rows
      .map(r => r.satisfacao?.[area])
      .filter((v): v is number => typeof v === 'number' && v >= 1 && v <= 4)
    const media = values.length > 0 ? avg(values) : 0
    const pct = media > 0 ? Math.round(((media - 1) / 3) * 100) : 0  // 1→0%, 4→100%
    return {
      area,
      media: +media.toFixed(2),
      pct,
      respondentes: values.length,
      classificacao: classifyScore(media, 'satisfacao'),
    }
  })
}

export function computeFrequenciaScores(rows: CensoRow[]) {
  return FREQUENCIA_ITENS.map(item => {
    const values = rows
      .map(r => r.participacao?.[item])
      .filter((v): v is number => typeof v === 'number' && v >= 0 && v <= 4)
    const media = values.length > 0 ? avg(values) : 0
    const ativos = values.filter(v => v >= 1).length
    return {
      item,
      media: +media.toFixed(2),
      ativos,
      respondentes: values.length,
      taxaAdesao: values.length > 0 ? Math.round((ativos / values.length) * 100) : 0,
      classificacao: classifyScore(media, 'frequencia'),
    }
  })
}

// =================== ÍNDICES COMPOSTOS ===================
export function computeIndices(rows: CensoRow[]): IndicesCompostos {
  const areaScores = computeAreaScores(rows)
  const byArea = new Map(areaScores.map(s => [s.area, s.pct]))
  const freqScores = computeFrequenciaScores(rows)
  const byFreq = new Map(freqScores.map(f => [f.item, f.media]))

  function avgOfAreas(areas: readonly string[]): number {
    const vals = areas.map(a => byArea.get(a)).filter((v): v is number => typeof v === 'number' && v > 0)
    return vals.length > 0 ? avg(vals) : 0
  }

  const vidaEspiritual = avgOfAreas(DOMINIOS.vidaEspiritual)
  const missao         = avgOfAreas(DOMINIOS.missao)
  const comunhao       = avgOfAreas(DOMINIOS.comunhao)
  const estrutura      = avgOfAreas(DOMINIOS.estrutura)
  const publicos       = avgOfAreas(DOMINIOS.publicos)

  // Mobilização = média de (missão satisfação) + (freq atividades missionárias × 25)
  const freqMissoes = byFreq.get('Atividades missionárias durante a semana') || 0
  const mobilizacao = missao > 0 ? Math.round((missao + (freqMissoes / 4) * 100) / 2) : 0

  // Saúde Relacional = comunhão + freq pequenos grupos × 25
  const freqPG = byFreq.get('Pequenos grupos') || 0
  const saudeRelacional = comunhao > 0 ? Math.round((comunhao + (freqPG / 4) * 100) / 2) : 0

  const todasAreas = areaScores.filter(s => s.respondentes > 0).map(s => s.pct)
  const geral = todasAreas.length > 0 ? avg(todasAreas) : 0

  return {
    vidaEspiritual: Math.round(vidaEspiritual),
    missao: Math.round(missao),
    comunhao: Math.round(comunhao),
    estrutura: Math.round(estrutura),
    publicos: Math.round(publicos),
    geral: Math.round(geral),
    mobilizacao,
    saudeRelacional,
  }
}

// =================== TOP DORES E FORÇAS ===================
export function topPontos(
  rows: CensoRow[],
  campo: 'pontos_fortes' | 'pontos_fracos',
  limit = 10,
) {
  const buckets: Record<string, { count: number; displays: Record<string, number> }> = {}
  rows.forEach(r => {
    const arr = r[campo]
    if (!Array.isArray(arr)) return
    arr.forEach(raw => {
      if (!raw || typeof raw !== 'string') return
      const norm = normalizeText(raw)
      if (!norm) return
      if (!buckets[norm]) buckets[norm] = { count: 0, displays: {} }
      buckets[norm].count += 1
      const disp = titleCase(raw)
      buckets[norm].displays[disp] = (buckets[norm].displays[disp] || 0) + 1
    })
  })
  return Object.entries(buckets)
    .map(([norm, b]) => {
      const best = Object.entries(b.displays).sort((a, c) => c[1] - a[1])[0]?.[0] || norm
      return { tema: best, count: b.count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function topPrioridades(rows: CensoRow[], limit = 10) {
  const map: Record<string, number> = {}
  rows.forEach(r => {
    if (!Array.isArray(r.prioridades)) return
    r.prioridades.forEach(p => {
      if (!p) return
      map[p] = (map[p] || 0) + 1
    })
  })
  // Denominador = quem efetivamente respondeu a etapa de prioridades.
  // Usar rows.length incluiria parciais que pararam antes da etapa 9 e
  // deflacionaria a importância (mudando quadrantes na matriz I×D).
  const total = rows.filter(r => Array.isArray(r.prioridades) && r.prioridades.length > 0).length
  return Object.entries(map)
    .map(([prioridade, count]) => ({
      prioridade,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// =================== MATRIZ IMPORTÂNCIA × DESEMPENHO ===================
// Cruza o quanto a prioridade é demandada com a satisfação atual da área
// correspondente. Quadrante de ação = alta demanda + baixa satisfação.
export function importanciaXDesempenho(rows: CensoRow[]) {
  const prios = topPrioridades(rows, 30)
  const areas = computeAreaScores(rows)
  const byArea = new Map(areas.map(a => [a.area, a]))

  return prios
    .map(p => {
      const areasMapeadas = PRIORIDADE_AREA_MAP[p.prioridade] || []
      const scores = areasMapeadas.map(a => byArea.get(a)).filter((s): s is AreaScore => !!s && s.respondentes > 0)
      const desempenho = scores.length > 0 ? avg(scores.map(s => s.pct)) : null
      const importancia = p.pct
      let quadrante: 'agir_agora' | 'manter' | 'baixa_relevancia' | 'over_invest' | 'sem_dados' = 'sem_dados'
      if (desempenho === null) quadrante = 'sem_dados'
      else if (importancia >= 30 && desempenho < 60) quadrante = 'agir_agora'
      else if (importancia >= 30 && desempenho >= 60) quadrante = 'manter'
      else if (importancia < 30 && desempenho < 60) quadrante = 'baixa_relevancia'
      else quadrante = 'over_invest'
      return {
        prioridade: p.prioridade,
        importancia,
        desempenho: desempenho !== null ? Math.round(desempenho) : null,
        quadrante,
        areas: areasMapeadas,
      }
    })
}

// =================== RANKINGS ===================
export interface ScopedAggregate {
  id: string
  nome: string
  sigla?: string
  total: number
  completos: number
  parciais: number
  membrosInventario: number
  cobertura: number      // completos / membrosInventario × 100
  indiceGeral: number    // 0..100
  saudeRelacional: number
  mobilizacao: number
}

export function aggregateByScope(
  rows: CensoRow[],
  scopeKey: 'igreja_id' | 'associacao_id',
  meta: Map<string, { nome: string; sigla?: string; membros: number }>,
): ScopedAggregate[] {
  const groups: Record<string, CensoRow[]> = {}
  rows.forEach(r => {
    const k = (r as any)[scopeKey] as string | null
    if (!k) return
    if (!groups[k]) groups[k] = []
    groups[k].push(r)
  })
  return Object.entries(groups).map(([id, list]) => {
    const completos = list.filter(r => r.completo).length
    const indices = computeIndices(list)
    const m = meta.get(id) || { nome: '—', membros: 0 }
    return {
      id,
      nome: m.nome,
      sigla: m.sigla,
      total: list.length,
      completos,
      parciais: list.length - completos,
      membrosInventario: m.membros,
      cobertura: m.membros > 0 ? Math.min(100, Math.round((completos / m.membros) * 100)) : 0,
      indiceGeral: indices.geral,
      saudeRelacional: indices.saudeRelacional,
      mobilizacao: indices.mobilizacao,
    }
  }).sort((a, b) => b.indiceGeral - a.indiceGeral)
}

// =================== DEMOGRÁFICOS ===================
export interface DemoBreakdown {
  sexo: Record<string, number>
  faixaEtaria: Record<string, number>
  estadoCivil: Record<string, number>
  tempoMembro: Record<string, number>
  comoConheceu: Record<string, number>
  distancia: Record<string, number>
  transporte: Record<string, number>
}

function calcAge(birth: string): number {
  const d = new Date(birth + 'T00:00:00')
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

function ageGroup(age: number): string {
  if (age < 18) return '< 18'
  if (age < 26) return '18-25'
  if (age < 36) return '26-35'
  if (age < 46) return '36-45'
  if (age < 56) return '46-55'
  if (age < 66) return '56-65'
  return '65+'
}

export function computeDemographics(rows: CensoRow[]): DemoBreakdown {
  const out: DemoBreakdown = {
    sexo: {}, faixaEtaria: {}, estadoCivil: {},
    tempoMembro: {}, comoConheceu: {}, distancia: {}, transporte: {},
  }
  rows.forEach(r => {
    if (r.sexo) out.sexo[r.sexo] = (out.sexo[r.sexo] || 0) + 1
    if (r.data_nascimento) {
      const ag = ageGroup(calcAge(r.data_nascimento))
      out.faixaEtaria[ag] = (out.faixaEtaria[ag] || 0) + 1
    }
    if (r.estado_civil) out.estadoCivil[r.estado_civil] = (out.estadoCivil[r.estado_civil] || 0) + 1
    if (r.tempo_membro) out.tempoMembro[r.tempo_membro] = (out.tempoMembro[r.tempo_membro] || 0) + 1
    if (r.como_conheceu) out.comoConheceu[r.como_conheceu] = (out.comoConheceu[r.como_conheceu] || 0) + 1
    if (r.distancia_igreja) out.distancia[r.distancia_igreja] = (out.distancia[r.distancia_igreja] || 0) + 1
    if (r.meio_transporte) out.transporte[r.meio_transporte] = (out.transporte[r.meio_transporte] || 0) + 1
  })
  return out
}

// =================== HEATMAP DATA ===================
// Para a visão estratégica: linhas = associações, colunas = áreas avaliadas.
export function heatmapAssocXArea(
  rows: CensoRow[],
  associacoes: { id: string; sigla: string; nome: string }[],
) {
  const byAssoc = new Map<string, CensoRow[]>()
  rows.forEach(r => {
    if (!r.associacao_id) return
    if (!byAssoc.has(r.associacao_id)) byAssoc.set(r.associacao_id, [])
    byAssoc.get(r.associacao_id)!.push(r)
  })
  return associacoes.map(a => {
    const list = byAssoc.get(a.id) || []
    const scores = computeAreaScores(list)
    return {
      assocId: a.id,
      sigla: a.sigla,
      nome: a.nome,
      n: list.length,
      cells: scores.map(s => ({ area: s.area, media: s.media, pct: s.pct, respondentes: s.respondentes, classificacao: s.classificacao })),
    }
  })
}

// =================== ENGAJAMENTO INDIVIDUAL ===================
// Score 0..100 que combina cargos atuais, frequência alta e satisfação alta.
export function computeEngajamentoIndividual(r: CensoRow): number {
  const cargosScore = Math.min(100, ((r.cargos_ocupa?.length || 0)) * 33) // 1 cargo=33, 3+=100
  const freqVals = r.participacao ? Object.values(r.participacao).filter(v => typeof v === 'number') as number[] : []
  const freqAvg = freqVals.length > 0 ? avg(freqVals) : 0
  const freqScore = Math.round((freqAvg / 4) * 100)
  const satVals = r.satisfacao ? Object.values(r.satisfacao).filter(v => typeof v === 'number') as number[] : []
  const satAvg = satVals.length > 0 ? avg(satVals) : 0
  const satScore = satAvg > 0 ? Math.round(((satAvg - 1) / 3) * 100) : 0
  // pesos: cargos 30%, frequência 40%, satisfação 30%
  return Math.round(cargosScore * 0.3 + freqScore * 0.4 + satScore * 0.3)
}

export function engajamentoLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Alto', color: 'text-emerald-700 bg-emerald-100' }
  if (score >= 50) return { label: 'Médio', color: 'text-amber-700 bg-amber-100' }
  if (score >= 25) return { label: 'Baixo', color: 'text-orange-700 bg-orange-100' }
  return { label: 'Muito baixo', color: 'text-red-700 bg-red-100' }
}

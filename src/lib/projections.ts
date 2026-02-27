/**
 * Utilitario de projecoes de crescimento/declinio
 * Usa regressao linear para projetar membros e receita
 */

interface DataPoint {
  month: number
  value: number
}

/**
 * Regressao linear: y = mx + b
 */
function linearRegression(data: DataPoint[]): { slope: number; intercept: number; r2: number } {
  const n = data.length
  if (n < 2) return { slope: 0, intercept: data[0]?.value || 0, r2: 0 }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (const d of data) {
    sumX += d.month
    sumY += d.value
    sumXY += d.month * d.value
    sumX2 += d.month * d.month
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  const meanY = sumY / n
  const ssRes = data.reduce((sum, d) => sum + (d.value - (slope * d.month + intercept)) ** 2, 0)
  const ssTot = data.reduce((sum, d) => sum + (d.value - meanY) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot

  return { slope, intercept, r2 }
}

/**
 * Projecao de membros para os proximos N meses
 */
export function projectMembership(
  historicalData: { mes: number; ano: number; total_membros: number }[],
  monthsAhead: number = 12
): { mes: number; ano: number; projetado: number }[] {
  const sorted = [...historicalData].sort((a, b) =>
    a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
  )
  if (sorted.length < 2) return []

  const dataPoints: DataPoint[] = sorted.map((d, i) => ({ month: i + 1, value: d.total_membros }))
  const { slope, intercept } = linearRegression(dataPoints)

  const last = sorted[sorted.length - 1]
  const projections: { mes: number; ano: number; projetado: number }[] = []

  for (let i = 1; i <= monthsAhead; i++) {
    let projMes = last.mes + i
    let projAno = last.ano
    while (projMes > 12) { projMes -= 12; projAno++ }
    const projValue = Math.max(0, Math.round(slope * (dataPoints.length + i) + intercept))
    projections.push({ mes: projMes, ano: projAno, projetado: projValue })
  }

  return projections
}

/**
 * Projecao de receita para os proximos N meses
 */
export function projectRevenue(
  historicalData: { mes: number; ano: number; receita: number }[],
  monthsAhead: number = 12
): { mes: number; ano: number; projetado: number }[] {
  const sorted = [...historicalData].sort((a, b) =>
    a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes
  )
  if (sorted.length < 2) return []

  const dataPoints: DataPoint[] = sorted.map((d, i) => ({ month: i + 1, value: d.receita }))
  const { slope, intercept } = linearRegression(dataPoints)

  const last = sorted[sorted.length - 1]
  const projections: { mes: number; ano: number; projetado: number }[] = []

  for (let i = 1; i <= monthsAhead; i++) {
    let projMes = last.mes + i
    let projAno = last.ano
    while (projMes > 12) { projMes -= 12; projAno++ }
    const projValue = Math.max(0, Math.round(slope * (dataPoints.length + i) + intercept))
    projections.push({ mes: projMes, ano: projAno, projetado: projValue })
  }

  return projections
}

/**
 * Taxa de crescimento percentual
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Number(((current - previous) / previous * 100).toFixed(1))
}

/**
 * Analise de distribuicao etaria
 */
export function analyzeAgeDistribution(
  pessoas: { data_nascimento: string | null }[]
): { faixa: string; count: number; percentage: number }[] {
  const hoje = new Date()
  const faixas: Record<string, number> = {
    '0-14': 0, '15-24': 0, '25-34': 0, '35-44': 0,
    '45-54': 0, '55-64': 0, '65+': 0
  }

  let total = 0
  for (const p of pessoas) {
    if (!p.data_nascimento) continue
    const nasc = new Date(p.data_nascimento)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const diffMes = hoje.getMonth() - nasc.getMonth()
    if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nasc.getDate())) idade--

    if (idade < 15) faixas['0-14']++
    else if (idade < 25) faixas['15-24']++
    else if (idade < 35) faixas['25-34']++
    else if (idade < 45) faixas['35-44']++
    else if (idade < 55) faixas['45-54']++
    else if (idade < 65) faixas['55-64']++
    else faixas['65+']++
    total++
  }

  return Object.entries(faixas).map(([faixa, count]) => ({
    faixa,
    count,
    percentage: total > 0 ? Number((count / total * 100).toFixed(1)) : 0
  }))
}

/**
 * Calculo de KPI Score para missionario
 * Media ponderada: estudos 25%, visitas 20%, pessoas_trazidas 25%, batismos 20%, receita 10%
 */
export function calculateKPIScore(
  actual: { estudos: number; visitas: number; pessoas_trazidas: number; batismos: number; receita: number },
  goals: { estudos: number; visitas: number; pessoas_trazidas: number; batismos: number; receita: number }
): number {
  const safeDiv = (a: number, b: number) => b === 0 ? (a > 0 ? 1 : 0) : Math.min(a / b, 1)

  const score =
    safeDiv(actual.estudos, goals.estudos) * 25 +
    safeDiv(actual.visitas, goals.visitas) * 20 +
    safeDiv(actual.pessoas_trazidas, goals.pessoas_trazidas) * 25 +
    safeDiv(actual.batismos, goals.batismos) * 20 +
    safeDiv(actual.receita, goals.receita) * 10

  return Math.round(score)
}

/**
 * Gerar URL do Google Calendar para adicionar evento
 */
export function generateGoogleCalendarUrl(event: {
  titulo: string
  descricao?: string
  data: string
  horaInicio?: string
  horaFim?: string
  local?: string
}): string {
  const formatDateTime = (date: string, time?: string) => {
    const d = date.replace(/-/g, '')
    const t = time ? time.replace(/:/g, '') + '00' : '080000'
    return `${d}T${t}`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.titulo,
    dates: `${formatDateTime(event.data, event.horaInicio)}/${formatDateTime(event.data, event.horaFim || event.horaInicio)}`,
  })

  if (event.descricao) params.set('details', event.descricao)
  if (event.local) params.set('location', event.local)

  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`
}

/**
 * Labels de meses para graficos
 */
export const MESES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function formatMesAno(mes: number, ano: number): string {
  return `${MESES_LABELS[mes - 1]}/${ano}`
}

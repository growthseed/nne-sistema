// ==========================================
// Secretaria Constants & Labels
// ==========================================

export const SITUACAO_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  falecido: 'Falecido',
  transferido: 'Transferido',
  excluido: 'Excluído',
}

export const SITUACAO_COLORS: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-600',
  falecido: 'bg-purple-100 text-purple-700',
  transferido: 'bg-blue-100 text-blue-700',
  excluido: 'bg-red-100 text-red-700',
}

export const SITUACAO_CHART_COLORS: Record<string, string> = {
  ativo: '#22c55e',
  inativo: '#9ca3af',
  falecido: '#a855f7',
  transferido: '#3b82f6',
  excluido: '#ef4444',
}

export const ETAPA_FUNIL_LABELS: Record<string, string> = {
  contato: 'Contato Inicial',
  classe_biblica: 'Classe Bíblica',
  estudos_regulares: 'Estudos Regulares',
  decisao: 'Decisão',
  batismo: 'Batismo',
  integracao: 'Integração',
}

export const ETAPA_FUNIL_COLORS: Record<string, string> = {
  contato: '#94a3b8',
  classe_biblica: '#60a5fa',
  estudos_regulares: '#fbbf24',
  decisao: '#f97316',
  batismo: '#22c55e',
  integracao: '#8b5cf6',
}

export const SEXO_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
}

export const ESTADO_CIVIL_LABELS: Record<string, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  viuvo: 'Viúvo(a)',
  divorciado: 'Divorciado(a)',
  separado: 'Separado(a)',
  uniao_estavel: 'União Estável',
}

export const AGE_BUCKETS = [
  { label: '0-17', min: 0, max: 17 },
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-45', min: 36, max: 45 },
  { label: '46-55', min: 46, max: 55 },
  { label: '56-65', min: 56, max: 65 },
  { label: '65+', min: 66, max: 200 },
]

export const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
]

export const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

export function calcularIdade(dataNascimento: string): number {
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

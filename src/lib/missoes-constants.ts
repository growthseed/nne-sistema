/**
 * Constantes centralizadas do modulo Missoes
 * Evita duplicacao em 8+ paginas
 */

import type { CargoMinisterial, StatusMissionario, TipoAtividade } from '@/types'
import {
  FiMapPin,
  FiBookOpen,
  FiUsers,
  FiCalendar,
  FiCheckCircle,
  FiActivity,
  FiTarget,
  FiFileText,
} from 'react-icons/fi'

// ========== NAVEGACAO ==========

export const MISSOES_TABS = [
  { to: '/missoes', label: 'Dashboard' },
  { to: '/missoes/meu-painel', label: 'Meu Painel' },
  { to: '/missoes/inventario', label: 'Ficha de Campo' },
  { to: '/missoes/metas', label: 'Metas e KPIs' },
  { to: '/missoes/planejador-visitas', label: 'Planejador' },
  { to: '/missoes/relatorio-campo', label: 'Relatorio Campo' },
  { to: '/missoes/relatorio', label: 'Novo Relatorio' },
  { to: '/missoes/diagnostico', label: 'Diagnostico' },
  { to: '/missoes/painel-geral', label: 'Painel Geral' },
]

// ========== CARGOS MINISTERIAIS ==========

export const CARGO_LABELS: Record<CargoMinisterial, string> = {
  ministro: 'Ministro',
  pastor_ordenado: 'Pastor Ordenado',
  pastor_licenciado: 'Pastor Licenciado',
  obreiro_biblico: 'Obreiro Biblico',
  obreiro_aspirante: 'Obreiro Aspirante',
  obreiro_pre_aspirante: 'Obreiro Pre-Aspirante',
  colportor: 'Colportor',
  diretor_colportagem: 'Diretor de Colportagem',
  aux_diretor_colportagem: 'Aux. Diretor Colportagem',
  evangelista: 'Evangelista',
  contratado: 'Contratado',
  missionario_voluntario: 'Missionario Voluntario',
  missionario_auxiliar: 'Missionario Auxiliar',
  diretor_departamental: 'Diretor Departamental',
  presidente: 'Presidente',
  secretario: 'Secretario',
  tesoureiro_campo: 'Tesoureiro de Campo',
}

/** Hierarquia de cargos (maior = mais alto) */
export const CARGO_HIERARCHY: Record<CargoMinisterial, number> = {
  ministro: 10,
  pastor_ordenado: 9,
  pastor_licenciado: 8,
  obreiro_biblico: 7,
  obreiro_aspirante: 6,
  obreiro_pre_aspirante: 5,
  diretor_colportagem: 4,
  aux_diretor_colportagem: 3,
  colportor: 3,
  evangelista: 3,
  contratado: 2,
  missionario_auxiliar: 2,
  missionario_voluntario: 1,
  diretor_departamental: 7,
  presidente: 10,
  secretario: 7,
  tesoureiro_campo: 7,
}

// ========== STATUS ==========

export const STATUS_LABELS: Record<StatusMissionario, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  licenca: 'Licenca',
  transferido: 'Transferido',
  aposentado: 'Aposentado',
  falecido: 'Falecido',
  exonerado: 'Exonerado',
  suspenso: 'Suspenso',
}

export const STATUS_COLORS: Record<StatusMissionario, string> = {
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-700',
  licenca: 'bg-yellow-100 text-yellow-700',
  transferido: 'bg-blue-100 text-blue-700',
  aposentado: 'bg-purple-100 text-purple-700',
  falecido: 'bg-gray-200 text-gray-500',
  exonerado: 'bg-red-100 text-red-700',
  suspenso: 'bg-orange-100 text-orange-700',
}

// ========== TIPOS DE ATIVIDADE ==========

export const TIPO_ATIVIDADE_LABELS: Record<TipoAtividade, string> = {
  visita_pastoral: 'Visita Pastoral',
  estudo_biblico: 'Estudo Biblico',
  reuniao: 'Reuniao',
  evento: 'Evento',
  classe_batismal: 'Classe Batismal',
  aconselhamento: 'Aconselhamento',
  treinamento: 'Treinamento',
  viagem: 'Viagem',
  administrativo: 'Administrativo',
  outro: 'Outro',
}

export const TIPO_ATIVIDADE_ICONS: Record<TipoAtividade, typeof FiBookOpen> = {
  visita_pastoral: FiMapPin,
  estudo_biblico: FiBookOpen,
  reuniao: FiUsers,
  evento: FiCalendar,
  classe_batismal: FiCheckCircle,
  aconselhamento: FiActivity,
  treinamento: FiTarget,
  viagem: FiMapPin,
  administrativo: FiFileText,
  outro: FiActivity,
}

// ========== ORDENACOES (Timeline SDARM) ==========

export const ORDENACAO_MARCOS = [
  { key: 'batismo', label: 'Batismo' },
  { key: 'colportagem', label: 'Colportagem' },
  { key: 'pre_aspirante', label: 'Pre-Aspirante' },
  { key: 'aspirante', label: 'Aspirante' },
  { key: 'obreiro_biblico', label: 'Obreiro Biblico' },
  { key: 'pastor', label: 'Pastor' },
  { key: 'ministro', label: 'Ministro' },
] as const

// ========== OPTIONS PARA FORMULARIOS ==========

export const ESCOLARIDADE_OPTIONS = [
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental Completo',
  'Ensino Medio Incompleto',
  'Ensino Medio Completo',
  'Superior Incompleto',
  'Superior Completo',
  'Pos-Graduacao',
  'Mestrado',
  'Doutorado',
  'Teologia (SALT)',
]

export const ESTADO_CIVIL_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viuvo(a)' },
  { value: 'separado', label: 'Separado(a)' },
]

export const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export const SEXO_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
]

// ========== MESES ==========

export const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ========== CAMPOS DO RELATORIO DIARIO (4 blocos GS 4.1) ==========

export const RELATORIO_ATIVIDADES_MISSIONARIAS = [
  { key: 'familias_visitadas', label: 'Familias Visitadas' },
  { key: 'membros_visitados', label: 'Membros Visitados' },
  { key: 'interessados_visitados', label: 'Interessados Visitados' },
  { key: 'estudos_biblicos', label: 'Estudos Biblicos' },
  { key: 'folhetos_distribuidos', label: 'Folhetos Distribuidos' },
  { key: 'contatos_missionarios', label: 'Contatos Missionarios' },
  { key: 'cultos_residencias', label: 'Cultos em Residencias' },
  { key: 'sermoes_conferencias', label: 'Sermoes / Conferencias' },
  { key: 'seminarios_palestras', label: 'Seminarios / Palestras' },
  { key: 'cartas_email', label: 'Cartas / E-mails' },
  { key: 'classes_batismais_ativ', label: 'Classes Batismais' },
  { key: 'funerais', label: 'Funerais' },
] as const

export const RELATORIO_HORAS = [
  { key: 'horas_viagens', label: 'Viagens', decimal: true },
  { key: 'horas_comissoes', label: 'Comissoes', decimal: true },
  { key: 'horas_estudo_pessoal', label: 'Estudo Pessoal', decimal: true },
  { key: 'horas_reunioes_igreja', label: 'Reunioes na Igreja', decimal: true },
  { key: 'horas_escritorio', label: 'Escritorio / Sede', decimal: true },
  { key: 'horas_diligencias', label: 'Diligencias da Obra', decimal: true },
  { key: 'horas_aconselhamentos', label: 'Aconselhamentos', decimal: true },
  { key: 'horas_recebendo_visitas', label: 'Recebendo Visitas', decimal: true },
] as const

export const RELATORIO_PASTORAIS = [
  { key: 'organizacoes_igrejas', label: 'Organizacao de Igrejas' },
  { key: 'santa_ceia', label: 'Santa Ceia' },
  { key: 'cerimonias_batismais', label: 'Cerimonias Batismais' },
  { key: 'pessoas_batizadas', label: 'Pessoas Batizadas' },
  { key: 'pessoas_excluidas', label: 'Pessoas Excluidas' },
  { key: 'casamentos', label: 'Casamentos' },
  { key: 'apresentacao_criancas', label: 'Apresentacao de Criancas' },
  { key: 'reunioes_membros', label: 'Reunioes de Membros' },
] as const

export const RELATORIO_DESPESAS = [
  { key: 'passagens', label: 'Passagens (R$)', currency: true },
  { key: 'alimentacao', label: 'Alimentacao (R$)', currency: true },
  { key: 'hotel', label: 'Hotel (R$)', currency: true },
  { key: 'comunicacao', label: 'Comunicacao (R$)', currency: true },
  { key: 'km_carro', label: 'Km Carro' },
  { key: 'km_moto', label: 'Km Moto' },
] as const

export const RELATORIO_TODOS_CAMPOS = [
  ...RELATORIO_ATIVIDADES_MISSIONARIAS,
  ...RELATORIO_HORAS,
  ...RELATORIO_PASTORAIS,
  ...RELATORIO_DESPESAS,
] as const

// ========== TIPO DE IGREJA ==========

export const TIPO_IGREJA_OPTIONS = [
  'Templo',
  'Salao Alugado',
  'Salao Proprio',
  'Salao Cedido',
  'Indefinido',
]

// ========== TIPO CONTA BANCARIA ==========

export const TIPO_CONTA_OPTIONS = [
  { value: 'Corrente', label: 'Conta Corrente' },
  { value: 'Poupanca', label: 'Poupanca' },
  { value: 'Pagamento', label: 'Conta Pagamento' },
]

export const PIX_TIPO_OPTIONS = [
  { value: 'cpf', label: 'CPF' },
  { value: 'email', label: 'E-mail' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave Aleatoria' },
]

import type { UserRole } from '@/types'

export const ADMIN_ROLES = ['admin', 'admin_uniao', 'admin_associacao'] as const satisfies readonly UserRole[]
export const SECRETARIA_ROLES = [...ADMIN_ROLES, 'secretario_igreja'] as const satisfies readonly UserRole[]
export const FINANCEIRO_ROLES = [...ADMIN_ROLES, 'tesoureiro'] as const satisfies readonly UserRole[]
export const ESCOLA_BIBLICA_ROLES = [...ADMIN_ROLES, 'secretario_igreja', 'diretor_es', 'professor_es'] as const satisfies readonly UserRole[]
export const ESCOLA_SABATINA_ROLES = [...ADMIN_ROLES, 'diretor_es', 'professor_es', 'secretario_es'] as const satisfies readonly UserRole[]
export const MISSOES_DASHBOARD_ROLES = [...ADMIN_ROLES, 'secretario_igreja', 'membro'] as const satisfies readonly UserRole[]
export const MISSOES_PLANNER_ROLES = [...ADMIN_ROLES, 'secretario_igreja'] as const satisfies readonly UserRole[]
export const REPORT_ROLES = [...ADMIN_ROLES, 'secretario_igreja', 'tesoureiro'] as const satisfies readonly UserRole[]
export const MAP_ROLES = [...ADMIN_ROLES, 'secretario_igreja'] as const satisfies readonly UserRole[]

export type AccessRuleKey =
  | 'dashboard'
  | 'cadastro'
  | 'cadastro_dashboard'
  | 'membros'
  | 'membro_detalhe'
  | 'membro_cartao'
  | 'familias'
  | 'secretaria'
  | 'secretaria_contagem'
  | 'secretaria_transferencias'
  | 'secretaria_aniversariantes'
  | 'secretaria_funil'
  | 'secretaria_saude'
  | 'secretaria_classes_biblicas'
  | 'secretaria_segmentacao'
  | 'secretaria_qualidade_dados'
  | 'organizacao_unioes'
  | 'organizacao_associacoes'
  | 'organizacao_igrejas'
  | 'financeiro'
  | 'financeiro_lancamentos'
  | 'financeiro_receita_campo'
  | 'escola_biblica'
  | 'escola_biblica_conteudo'
  | 'escola_biblica_professores'
  | 'escola_sabatina'
  | 'escola_sabatina_presenca'
  | 'missoes'
  | 'missoes_inventario'
  | 'missoes_detalhe'
  | 'missoes_ficha_campo'
  | 'missoes_relatorio'
  | 'missoes_meu_painel'
  | 'missoes_metas'
  | 'missoes_planejador'
  | 'missoes_relatorio_campo'
  | 'missoes_diagnostico'
  | 'missoes_painel_geral'
  | 'mapas'
  | 'ibge'
  | 'relatorios'
  | 'analytics'
  | 'configuracoes'
  | 'configuracoes_admin'
  | 'configuracoes_usuario'

export type SidebarGroupKey =
  | 'inicio'
  | 'secretaria'
  | 'financeiro'
  | 'missoes'
  | 'escola-biblica'
  | 'escola-sabatina'
  | 'organizacao'
  | 'inteligencia'
  | 'admin'

export type SidebarIconKey =
  | 'home'
  | 'user-group'
  | 'academic-cap'
  | 'map'
  | 'chart-bar'
  | 'document-report'
  | 'globe'
  | 'cog'
  | 'office-building'
  | 'document-text'
  | 'light-bulb'
  | 'users'
  | 'briefcase'
  | 'clipboard-check'
  | 'calendar'
  | 'presentation-chart-bar'
  | 'search-circle'
  | 'library'

interface AccessRule {
  label: string
  module: SidebarGroupKey | 'global'
  roles: readonly UserRole[] | null
  redirectTo?: string
}

interface SidebarItem {
  key: AccessRuleKey
  to: string
  icon: SidebarIconKey
  end?: boolean
}

interface SidebarGroup {
  key: SidebarGroupKey
  label: string
  items: SidebarItem[]
}

export const ACCESS_RULES: Record<AccessRuleKey, AccessRule> = {
  dashboard: { label: 'Painel Geral', module: 'inicio', roles: null },
  cadastro: { label: 'Cadastro', module: 'secretaria', roles: SECRETARIA_ROLES },
  cadastro_dashboard: { label: 'Respostas do Censo', module: 'admin', roles: ADMIN_ROLES },
  membros: { label: 'Membros', module: 'secretaria', roles: SECRETARIA_ROLES },
  membro_detalhe: { label: 'Detalhe do Membro', module: 'secretaria', roles: SECRETARIA_ROLES },
  membro_cartao: { label: 'Cartao de Membro', module: 'secretaria', roles: SECRETARIA_ROLES },
  familias: { label: 'Familias', module: 'secretaria', roles: SECRETARIA_ROLES },
  secretaria: { label: 'Painel da Secretaria', module: 'secretaria', roles: SECRETARIA_ROLES },
  secretaria_contagem: { label: 'Contagem Mensal', module: 'secretaria', roles: SECRETARIA_ROLES },
  secretaria_transferencias: { label: 'Transferencias', module: 'secretaria', roles: SECRETARIA_ROLES },
  secretaria_aniversariantes: { label: 'Aniversariantes', module: 'secretaria', roles: SECRETARIA_ROLES },
  secretaria_funil: { label: 'Funil de Conversao', module: 'inteligencia', roles: ADMIN_ROLES },
  secretaria_saude: { label: 'Saude dos Membros', module: 'inteligencia', roles: ADMIN_ROLES },
  secretaria_classes_biblicas: { label: 'Classes Biblicas', module: 'secretaria', roles: SECRETARIA_ROLES },
  secretaria_segmentacao: { label: 'Segmentacao', module: 'inteligencia', roles: ADMIN_ROLES },
  secretaria_qualidade_dados: { label: 'Qualidade de Dados', module: 'secretaria', roles: SECRETARIA_ROLES },
  organizacao_unioes: { label: 'Unioes', module: 'admin', roles: ['admin', 'admin_uniao'] },
  organizacao_associacoes: { label: 'Associacoes', module: 'organizacao', roles: ADMIN_ROLES },
  organizacao_igrejas: { label: 'Igrejas', module: 'organizacao', roles: ADMIN_ROLES },
  financeiro: { label: 'Painel Financeiro', module: 'financeiro', roles: FINANCEIRO_ROLES },
  financeiro_lancamentos: { label: 'Lancamentos', module: 'financeiro', roles: FINANCEIRO_ROLES },
  financeiro_receita_campo: { label: 'Receita de Campo', module: 'financeiro', roles: FINANCEIRO_ROLES },
  escola_biblica: { label: 'Painel Escola Biblica', module: 'escola-biblica', roles: ESCOLA_BIBLICA_ROLES },
  escola_biblica_conteudo: { label: 'Conteudo e Turmas', module: 'escola-biblica', roles: ESCOLA_BIBLICA_ROLES },
  escola_biblica_professores: { label: 'Professores', module: 'escola-biblica', roles: ADMIN_ROLES },
  escola_sabatina: { label: 'Classes', module: 'escola-sabatina', roles: ESCOLA_SABATINA_ROLES },
  escola_sabatina_presenca: { label: 'Presenca', module: 'escola-sabatina', roles: ESCOLA_SABATINA_ROLES },
  missoes: { label: 'Dashboard de Missoes', module: 'missoes', roles: MISSOES_DASHBOARD_ROLES },
  missoes_inventario: { label: 'Inventario Missionario', module: 'missoes', roles: ADMIN_ROLES },
  missoes_detalhe: { label: 'Detalhe do Missionario', module: 'missoes', roles: ADMIN_ROLES },
  missoes_ficha_campo: { label: 'Ficha de Campo', module: 'missoes', roles: ADMIN_ROLES },
  missoes_relatorio: { label: 'Relatorio Missionario', module: 'missoes', roles: ADMIN_ROLES },
  missoes_meu_painel: { label: 'Meu Painel Missionario', module: 'missoes', roles: ADMIN_ROLES },
  missoes_metas: { label: 'Metas e KPIs', module: 'missoes', roles: ADMIN_ROLES },
  missoes_planejador: { label: 'Planejador de Visitas', module: 'missoes', roles: MISSOES_PLANNER_ROLES },
  missoes_relatorio_campo: { label: 'Relatorio de Campo', module: 'missoes', roles: ADMIN_ROLES },
  missoes_diagnostico: { label: 'Diagnostico', module: 'missoes', roles: ADMIN_ROLES },
  missoes_painel_geral: { label: 'Painel Geral Missionario', module: 'missoes', roles: ADMIN_ROLES },
  mapas: { label: 'Mapa Territorial', module: 'inteligencia', roles: MAP_ROLES },
  ibge: { label: 'Dados IBGE', module: 'inteligencia', roles: ADMIN_ROLES },
  relatorios: { label: 'Relatorios', module: 'inteligencia', roles: REPORT_ROLES },
  analytics: { label: 'Analises', module: 'inteligencia', roles: ADMIN_ROLES },
  configuracoes: { label: 'Configuracoes', module: 'global', roles: null },
  configuracoes_admin: { label: 'Configuracoes Admin', module: 'admin', roles: ['admin'] },
  configuracoes_usuario: { label: 'Editar Usuario', module: 'admin', roles: ADMIN_ROLES },
}

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    key: 'inicio',
    label: 'Inicio',
    items: [
      { key: 'dashboard', to: '/', icon: 'home', end: true },
    ],
  },
  {
    key: 'secretaria',
    label: 'Secretaria',
    items: [
      { key: 'secretaria', to: '/secretaria', icon: 'document-text', end: true },
      { key: 'membros', to: '/membros', icon: 'user-group' },
      { key: 'familias', to: '/membros/familias', icon: 'users' },
      { key: 'secretaria_contagem', to: '/secretaria/contagem', icon: 'clipboard-check' },
      { key: 'secretaria_transferencias', to: '/secretaria/transferencias', icon: 'document-report' },
      { key: 'secretaria_aniversariantes', to: '/secretaria/aniversariantes', icon: 'calendar' },
      { key: 'secretaria_classes_biblicas', to: '/secretaria/classes-biblicas', icon: 'academic-cap' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    items: [
      { key: 'financeiro', to: '/financeiro', icon: 'chart-bar', end: true },
      { key: 'financeiro_lancamentos', to: '/financeiro/lancamentos', icon: 'document-text' },
      { key: 'financeiro_receita_campo', to: '/financeiro/receita-campo', icon: 'document-report' },
    ],
  },
  {
    key: 'missoes',
    label: 'Missoes',
    items: [
      { key: 'missoes', to: '/missoes', icon: 'light-bulb', end: true },
      { key: 'missoes_meu_painel', to: '/missoes/meu-painel', icon: 'briefcase' },
      { key: 'missoes_relatorio', to: '/missoes/relatorio', icon: 'document-text' },
      { key: 'missoes_inventario', to: '/missoes/inventario', icon: 'clipboard-check' },
      { key: 'missoes_planejador', to: '/missoes/planejador-visitas', icon: 'calendar' },
      { key: 'missoes_painel_geral', to: '/missoes/painel-geral', icon: 'chart-bar' },
    ],
  },
  {
    key: 'escola-biblica',
    label: 'Escola Biblica',
    items: [
      { key: 'escola_biblica', to: '/escola-biblica', icon: 'light-bulb', end: true },
      { key: 'escola_biblica_conteudo', to: '/escola-biblica/conteudo', icon: 'library' },
      { key: 'escola_biblica_professores', to: '/escola-biblica/professores', icon: 'users' },
    ],
  },
  {
    key: 'escola-sabatina',
    label: 'Escola Sabatina',
    items: [
      { key: 'escola_sabatina', to: '/escola-sabatina', icon: 'academic-cap', end: true },
      { key: 'escola_sabatina_presenca', to: '/escola-sabatina/presenca', icon: 'clipboard-check' },
    ],
  },
  {
    key: 'organizacao',
    label: 'Organizacao',
    items: [
      { key: 'organizacao_igrejas', to: '/organizacao/igrejas', icon: 'office-building' },
      { key: 'organizacao_associacoes', to: '/organizacao/associacoes', icon: 'office-building' },
    ],
  },
  {
    key: 'inteligencia',
    label: 'Inteligencia',
    items: [
      { key: 'mapas', to: '/mapas', icon: 'map' },
      { key: 'ibge', to: '/ibge', icon: 'globe' },
      { key: 'relatorios', to: '/relatorios', icon: 'document-report' },
      { key: 'analytics', to: '/analytics', icon: 'chart-bar' },
      { key: 'secretaria_funil', to: '/secretaria/funil', icon: 'presentation-chart-bar' },
      { key: 'secretaria_saude', to: '/secretaria/saude', icon: 'search-circle' },
      { key: 'secretaria_segmentacao', to: '/secretaria/segmentacao', icon: 'user-group' },
    ],
  },
  {
    key: 'admin',
    label: 'Administracao',
    items: [
      { key: 'configuracoes_admin', to: '/configuracoes', icon: 'cog' },
      { key: 'cadastro_dashboard', to: '/cadastro/dashboard', icon: 'clipboard-check' },
      { key: 'organizacao_unioes', to: '/organizacao/unioes', icon: 'office-building' },
    ],
  },
]

export function getAccessRule(key: AccessRuleKey) {
  return ACCESS_RULES[key]
}

export function canAccessRoles(
  role: UserRole | null | undefined,
  roles: readonly UserRole[] | null,
) {
  if (!roles || roles.length === 0) return true
  if (!role) return false
  return roles.includes(role)
}

export function canAccessRule(role: UserRole | null | undefined, key: AccessRuleKey) {
  return canAccessRoles(role, ACCESS_RULES[key].roles)
}

export function getVisibleSidebarGroups(role: UserRole | null | undefined) {
  return SIDEBAR_GROUPS
    .map(group => ({
      ...group,
      items: group.items
        .filter(item => canAccessRule(role, item.key))
        .map(item => ({
          ...item,
          label: ACCESS_RULES[item.key].label,
        })),
    }))
    .filter(group => group.items.length > 0)
}

export function getSidebarGroupForPath(path: string, groups = SIDEBAR_GROUPS): SidebarGroupKey | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.to === '/' && path === '/') return group.key
      if (item.to !== '/' && path.startsWith(item.to)) return group.key
    }
  }

  return null
}

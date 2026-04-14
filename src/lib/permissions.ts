import type { UserRole } from '@/types'
import {
  ADMIN_ROLES,
  SECRETARIA_ROLES,
  FINANCEIRO_ROLES,
  ESCOLA_BIBLICA_ROLES,
  MISSOES_DASHBOARD_ROLES,
} from '@/lib/access'

export type AppDomain = 'secretaria' | 'financeiro' | 'missoes' | 'escola_biblica' | 'configuracoes'

export const domainRoles: Record<AppDomain, readonly UserRole[]> = {
  secretaria: SECRETARIA_ROLES,
  financeiro: FINANCEIRO_ROLES,
  missoes: MISSOES_DASHBOARD_ROLES,
  escola_biblica: ESCOLA_BIBLICA_ROLES,
  configuracoes: [] as unknown as readonly UserRole[],
}

/**
 * Verifica se um papel (role) tem acesso a um domínio funcional.
 * Domínios com array vazio permitem acesso a qualquer usuário autenticado.
 */
export function canAccessDomain(papel: UserRole | null | undefined, domain: AppDomain): boolean {
  const roles = domainRoles[domain]
  if (!roles || roles.length === 0) return true
  if (!papel) return false
  return (roles as readonly string[]).includes(papel)
}

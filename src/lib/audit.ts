import { supabase } from '@/lib/supabase'

export type AuditAction =
  | 'USER_ROLE_CHANGED'
  | 'USER_DISABLED'
  | 'USER_ENABLED'
  | 'USER_LOTACAO_CHANGED'
  | 'USER_RESET_PASSWORD'
  | 'USER_SET_PASSWORD'
  | 'USER_PERFIL_UPDATED'

/**
 * Registra uma ação administrativa na tabela `auditoria`.
 * Falhas são silenciosas (não bloqueiam a ação principal).
 * NUNCA incluir senhas ou tokens em `payload`.
 */
export async function logAudit(
  action: AuditAction,
  payload: Record<string, unknown>,
  actorId: string,
): Promise<void> {
  try {
    const { error } = await supabase.from('auditoria').insert({
      actor_id: actorId,
      action,
      payload,
    })
    if (error) {
      console.warn('[audit] Falha ao registrar:', action, error.message)
    }
  } catch (err) {
    console.warn('[audit] Erro inesperado:', err)
  }
}

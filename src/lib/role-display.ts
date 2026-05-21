import type { UserRole } from '@/types'
import { CARGO_LABELS } from '@/lib/missoes-constants'

const PAPEL_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  admin_uniao: 'Admin União',
  admin_associacao: 'Admin Associação',
  diretor_es: 'Diretor ES',
  professor_es: 'Professor ES',
  secretario_es: 'Secretário ES',
  tesoureiro: 'Tesoureiro',
  secretario_igreja: 'Secretário Igreja',
  missionario: 'Missionário',
  membro: 'Membro',
}

/**
 * Label do papel para exibição. Para `missionario`, prioriza o cargo
 * ministerial (Pastor, Sênior, Master, etc) usando os labels do banco
 * (configuracoes.cargo_labels) com fallback no constante hardcoded.
 *
 * @param papel               UserRole do usuário
 * @param cargoMinisterial    chave em missionarios.cargo_ministerial (opcional)
 * @param cargoLabelsOverride mapa carregado de configuracoes.cargo_labels (opcional)
 */
export function displayPapelLabel(
  papel: UserRole | string | null | undefined,
  cargoMinisterial?: string | null,
  cargoLabelsOverride?: Record<string, string>,
): string {
  if (!papel) return ''
  if (papel === 'missionario' && cargoMinisterial) {
    const fromOverride = cargoLabelsOverride?.[cargoMinisterial]
    if (fromOverride) return fromOverride
    const fromDefault = (CARGO_LABELS as Record<string, string>)[cargoMinisterial]
    if (fromDefault) return fromDefault
  }
  return PAPEL_LABELS[papel as UserRole] || String(papel)
}

export { PAPEL_LABELS }

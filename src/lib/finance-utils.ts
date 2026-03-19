/**
 * Utility to calculate financial totals from dados_financeiros records.
 * Handles both legacy fields (dizimo, primicias, etc.) imported from GS 4.1
 * and new fields (receita_dizimos, receita_oferta_regular, etc.) from the new system.
 */

export interface DadosFinanceirosRow {
  // New fields
  receita_dizimos?: number | null
  receita_oferta_regular?: number | null
  receita_oferta_especial?: number | null
  receita_oferta_missoes?: number | null
  receita_oferta_agradecimento?: number | null
  receita_oferta_es?: number | null
  receita_doacoes?: number | null
  receita_fundo_assistencial?: number | null
  receita_proventos_imoveis?: number | null
  receita_outras?: number | null
  receita_primicias?: number | null
  receita_evangelismo?: number | null
  receita_radio_colportagem?: number | null
  receita_construcao?: number | null
  receita_gratificacao_6?: number | null
  receita_missoes_mundial?: number | null
  receita_missoes_autonomas?: number | null
  // Legacy fields (from GS 4.1 import)
  dizimo?: number | null
  primicias?: number | null
  assist_social?: number | null
  esc_sabatina?: number | null
  evangelismo?: number | null
  radio_curso_biblico?: number | null
  construcao?: number | null
  musica?: number | null
  gratidao_6pct?: number | null
  diverso_assoc?: number | null
  missoes_mensais?: number | null
  missoes_anuais?: number | null
  of_cultos_construcao?: number | null
  of_missionaria?: number | null
  of_juvenil?: number | null
  of_gratidao_pobres?: number | null
  diversos_local?: number | null
  // Expenses
  despesa_salarios?: number | null
  despesa_manutencao?: number | null
  despesa_agua?: number | null
  despesa_energia?: number | null
  despesa_internet?: number | null
  despesa_material_es?: number | null
  despesa_outras?: number | null
  despesa_aluguel?: number | null
  despesa_telefone?: number | null
  despesa_transporte?: number | null
  despesa_eventos?: number | null
  // Legacy expenses
  desp_zeladoria?: number | null
  desp_manutencao?: number | null
  desp_dizimo_local?: number | null
  desp_repasse_dorcas?: number | null
  desp_repasse_grat6pct?: number | null
  flores?: number | null
}

/** Total dízimos (new + legacy) */
export function totalDizimos(r: DadosFinanceirosRow): number {
  return (r.receita_dizimos || 0) + (r.dizimo || 0)
}

/** Total ofertas/receitas (new + legacy, excluding dízimos) */
export function totalOfertas(r: DadosFinanceirosRow): number {
  return (
    (r.receita_oferta_regular || 0) +
    (r.receita_oferta_especial || 0) +
    (r.receita_oferta_missoes || 0) +
    (r.receita_oferta_agradecimento || 0) +
    (r.receita_oferta_es || 0) +
    (r.receita_doacoes || 0) +
    (r.receita_fundo_assistencial || 0) +
    (r.receita_proventos_imoveis || 0) +
    (r.receita_outras || 0) +
    (r.receita_primicias || 0) +
    (r.receita_evangelismo || 0) +
    (r.receita_radio_colportagem || 0) +
    (r.receita_construcao || 0) +
    (r.receita_gratificacao_6 || 0) +
    (r.receita_missoes_mundial || 0) +
    (r.receita_missoes_autonomas || 0) +
    // Legacy
    (r.primicias || 0) +
    (r.assist_social || 0) +
    (r.esc_sabatina || 0) +
    (r.evangelismo || 0) +
    (r.radio_curso_biblico || 0) +
    (r.construcao || 0) +
    (r.musica || 0) +
    (r.gratidao_6pct || 0) +
    (r.diverso_assoc || 0) +
    (r.missoes_mensais || 0) +
    (r.missoes_anuais || 0) +
    (r.of_cultos_construcao || 0) +
    (r.of_missionaria || 0) +
    (r.of_juvenil || 0) +
    (r.of_gratidao_pobres || 0) +
    (r.diversos_local || 0)
  )
}

/** Total receitas = dízimos + ofertas */
export function totalReceitas(r: DadosFinanceirosRow): number {
  return totalDizimos(r) + totalOfertas(r)
}

/** Total despesas (new + legacy) */
export function totalDespesas(r: DadosFinanceirosRow): number {
  return (
    (r.despesa_salarios || 0) +
    (r.despesa_manutencao || 0) +
    (r.despesa_agua || 0) +
    (r.despesa_energia || 0) +
    (r.despesa_internet || 0) +
    (r.despesa_material_es || 0) +
    (r.despesa_outras || 0) +
    (r.despesa_aluguel || 0) +
    (r.despesa_telefone || 0) +
    (r.despesa_transporte || 0) +
    (r.despesa_eventos || 0) +
    // Legacy
    (r.desp_zeladoria || 0) +
    (r.desp_manutencao || 0) +
    (r.desp_dizimo_local || 0) +
    (r.desp_repasse_dorcas || 0) +
    (r.desp_repasse_grat6pct || 0) +
    (r.flores || 0)
  )
}

/** Columns to select from dados_financeiros for financial calculations */
export const FINANCIAL_SELECT_COLS = 'igreja_id, receita_dizimos, receita_oferta_regular, receita_oferta_especial, receita_oferta_missoes, receita_oferta_agradecimento, receita_oferta_es, receita_doacoes, receita_fundo_assistencial, receita_outras, receita_primicias, dizimo, primicias, assist_social, esc_sabatina, evangelismo, construcao, missoes_mensais, of_cultos_construcao, of_missionaria, of_juvenil, despesa_salarios, despesa_manutencao, despesa_agua, despesa_energia, despesa_internet, despesa_outras'

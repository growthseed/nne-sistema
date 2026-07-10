// Motor de sugestão de visitas (mapper sugestivo).
// Ranqueia pessoas do escopo do visitador (missionário, pastor, obreiro)
// combinando sinais já existentes no banco: tipo, situação, último contato,
// aniversário, recência de cadastro e vínculo familiar.
//
// Mantido como função pura para ser testável e reutilizável (página do
// planejador hoje; futuramente o bot de WhatsApp pode consumir o mesmo motor).

import type { Pessoa } from '@/types'

export interface SugestaoVisita {
  pessoa: Pessoa
  score: number
  motivos: string[]
}

const DIA_MS = 24 * 60 * 60 * 1000

function diasDesde(dateStr: string | null | undefined, hoje: Date): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((hoje.getTime() - d.getTime()) / DIA_MS)
}

export function computeSugestoesVisita(
  pessoas: Pessoa[],
  hoje: Date = new Date(),
  limit = 40,
): SugestaoVisita[] {
  const mesAtual = hoje.getMonth() + 1

  const sugestoes = pessoas.map(pessoa => {
    let score = 0
    const motivos: string[] = []

    if (pessoa.tipo === 'interessado' && pessoa.situacao !== 'inativo') {
      score += 40
      motivos.push('Interessado em acompanhamento')
    }

    if (pessoa.situacao === 'inativo') {
      score += 35
      motivos.push('Membro inativo — reconexão')
    }

    const diasContato = diasDesde((pessoa as any).data_ultimo_contato, hoje)
    if (diasContato === null) {
      score += 15
      motivos.push('Nunca teve contato registrado')
    } else if (diasContato >= 90) {
      score += 25
      motivos.push(`Sem contato há ${diasContato} dias`)
    } else if (diasContato >= 45) {
      score += 12
      motivos.push(`Sem contato há ${diasContato} dias`)
    }

    if (pessoa.data_nascimento) {
      const nasc = new Date(pessoa.data_nascimento)
      if (!isNaN(nasc.getTime()) && nasc.getMonth() + 1 === mesAtual) {
        score += 15
        motivos.push(`Aniversário ${String(nasc.getDate()).padStart(2, '0')}/${String(mesAtual).padStart(2, '0')}`)
      }
    }

    const diasCadastro = diasDesde(pessoa.created_at, hoje)
    if (diasCadastro !== null && diasCadastro <= 30) {
      score += 20
      motivos.push('Cadastro recente — integração')
    }

    if (!pessoa.familia_id) {
      score += 10
      motivos.push('Família não mapeada — cadastrar familiares')
    }

    if (pessoa.coordenadas_lat && pessoa.coordenadas_lng) {
      score += 5 // roteirizável no mapa
    }

    return { pessoa, score, motivos }
  })

  return sugestoes
    .filter(s => s.score >= 25 && s.motivos.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

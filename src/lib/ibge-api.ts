// Cliente da API pública do IBGE com cache em memória + sessionStorage.
// Não armazena nada no banco — todas as chamadas ficam locais.

const IBGE_BASE = 'https://servicodados.ibge.gov.br/api'

export interface MunicipioIBGE {
  id: number
  nome: string
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } }
}

export interface PopulacaoMunicipio {
  ibgeId: number
  nome: string
  populacao: number | null
}

// Normaliza nome de cidade pra match com o banco (sem acento, lower, trim, espaços simples).
export function normCidade(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

const SS_PREFIX = 'nne_ibge_'

function ssGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key)
    return raw ? JSON.parse(raw) as T : null
  } catch { return null }
}
function ssSet(key: string, value: unknown): void {
  try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(value)) } catch { /* quota */ }
}

// Busca todos os municípios de um estado (sigla, ex: 'PA', 'MA').
export async function fetchMunicipiosEstado(uf: string): Promise<MunicipioIBGE[]> {
  const upper = uf.toUpperCase()
  const cacheKey = `mun_${upper}`
  const cached = ssGet<MunicipioIBGE[]>(cacheKey)
  if (cached) return cached

  const res = await fetch(`${IBGE_BASE}/v1/localidades/estados/${upper}/municipios`)
  if (!res.ok) throw new Error(`IBGE municípios ${upper}: HTTP ${res.status}`)
  const data = (await res.json()) as MunicipioIBGE[]
  ssSet(cacheKey, data)
  return data
}

// Busca população (Censo 2022 oficial) em batch. Recebe lista de IDs IBGE.
// Endpoint agregado: 4714 = Censo 2022 (resultados gerais) · variável 93 =
// População residente. Antes usávamos 6579/9324 (estimativa 2021) mas esse
// endpoint começou a retornar HTTP 500 em maio/2026. O 4714/93 (Censo 2022)
// é o dado oficial mais recente e está estável.
export async function fetchPopulacaoBatch(ibgeIds: number[]): Promise<Map<number, number>> {
  if (ibgeIds.length === 0) return new Map()
  const cacheKey = `pop2022_${ibgeIds.slice().sort().join('_')}`
  const cached = ssGet<Array<[number, number]>>(cacheKey)
  if (cached) return new Map(cached)

  // API do IBGE recomenda lotes de até ~100 cidades por chamada
  const BATCH = 80
  const out = new Map<number, number>()
  for (let i = 0; i < ibgeIds.length; i += BATCH) {
    const slice = ibgeIds.slice(i, i + BATCH)
    const localidades = slice.join('|')
    const url = `${IBGE_BASE}/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N6[${localidades}]`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.warn(`IBGE 4714 lote ${i}-${i + slice.length}: HTTP ${res.status}`)
        continue
      }
      const json = await res.json()
      const series = json?.[0]?.resultados?.[0]?.series ?? []
      for (const s of series) {
        const id = Number(s?.localidade?.id)
        const v = s?.serie?.['2022']
        const pop = v && v !== '...' ? Number(v) : null
        if (Number.isFinite(id) && Number.isFinite(pop)) out.set(id, pop as number)
      }
    } catch (e) {
      console.warn('IBGE 4714 fetch falhou', e)
    }
  }

  ssSet(cacheKey, Array.from(out.entries()))
  return out
}

// Helper de alto nível: dada uma lista de (cidade, uf), devolve mapa
// normCidade(cidade) → populacao.
export async function populacaoPorCidadeUF(
  pares: Array<{ cidade: string; uf: string }>,
): Promise<Map<string, number>> {
  // Agrupa por UF
  const byUF = new Map<string, Set<string>>()
  pares.forEach(({ cidade, uf }) => {
    if (!cidade || !uf) return
    const u = uf.toUpperCase()
    if (!byUF.has(u)) byUF.set(u, new Set())
    byUF.get(u)!.add(normCidade(cidade))
  })

  const result = new Map<string, number>()

  for (const [uf, cidades] of byUF) {
    const muns = await fetchMunicipiosEstado(uf).catch(() => [])
    // Match nome → id
    const matched: Array<{ id: number; nomeOrig: string; key: string }> = []
    for (const m of muns) {
      const key = normCidade(m.nome)
      if (cidades.has(key)) {
        matched.push({ id: m.id, nomeOrig: m.nome, key: `${key}__${uf}` })
      }
    }
    if (matched.length === 0) continue

    const populacoes = await fetchPopulacaoBatch(matched.map(m => m.id)).catch(() => new Map())
    matched.forEach(m => {
      const pop = populacoes.get(m.id)
      if (pop !== undefined) result.set(m.key, pop)
    })
  }

  return result
}

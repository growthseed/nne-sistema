/**
 * Geocodifica igrejas usando API do IBGE
 * Mapeia endereco_cidade + endereco_estado → coordenadas_lat/lng
 *
 * Usage: node scripts/geocode-igrejas.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'
)

const DRY_RUN = process.argv.includes('--dry-run')

// Cache de coordenadas por cidade/UF para não repetir chamadas
const cache = new Map()

async function getCoords(cidade, uf) {
  const key = `${cidade}|${uf}`
  if (cache.has(key)) return cache.get(key)

  try {
    // Normalizar nome da cidade
    const cidadeNorm = cidade
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().trim()

    // 1. Buscar ID do município no IBGE
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
    const res = await fetch(url)
    if (!res.ok) { cache.set(key, null); return null }

    const municipios = await res.json()

    // Match por nome normalizado
    const match = municipios.find(m => {
      const mNorm = m.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return mNorm === cidadeNorm
    })

    if (!match) {
      // Tentar match parcial
      const partial = municipios.find(m => {
        const mNorm = m.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        return cidadeNorm.includes(mNorm) || mNorm.includes(cidadeNorm)
      })
      if (!partial) { cache.set(key, null); return null }

      // Usar coordenadas do match parcial
      const coords = await fetchCoordsFromIBGE(partial.id)
      cache.set(key, coords)
      return coords
    }

    const coords = await fetchCoordsFromIBGE(match.id)
    cache.set(key, coords)
    return coords
  } catch (err) {
    console.error(`  Erro ao geocodificar ${cidade}/${uf}:`, err.message)
    cache.set(key, null)
    return null
  }
}

async function fetchCoordsFromIBGE(municipioId) {
  try {
    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${municipioId}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    // A API do IBGE não retorna lat/lng diretamente, mas podemos usar outra API
    // Vamos usar a API de malhas do IBGE que retorna centróide
    const geoUrl = `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${municipioId}?formato=application/vnd.geo+json`
    const geoRes = await fetch(geoUrl)
    if (!geoRes.ok) return null
    const geoData = await geoRes.json()

    // Calcular centróide do polígono
    if (geoData.features && geoData.features.length > 0) {
      const geometry = geoData.features[0].geometry
      const coords = geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : geometry.coordinates[0]

      let latSum = 0, lngSum = 0
      for (const [lng, lat] of coords) {
        latSum += lat
        lngSum += lng
      }
      return {
        lat: Number((latSum / coords.length).toFixed(6)),
        lng: Number((lngSum / coords.length).toFixed(6)),
      }
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== GEOCODIFICANDO IGREJAS ===')

  // Buscar igrejas sem coordenadas com cidade preenchida
  let all = []
  let offset = 0
  while (true) {
    const { data } = await sb.from('igrejas')
      .select('id, nome, endereco_cidade, endereco_estado')
      .is('coordenadas_lat', null)
      .not('endereco_cidade', 'is', null)
      .neq('endereco_cidade', '')
      .not('endereco_estado', 'is', null)
      .range(offset, offset + 499)

    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 500) break
    offset += 500
  }

  console.log(`Igrejas sem coordenadas (com cidade): ${all.length}`)

  // Agrupar por cidade/UF para minimizar chamadas à API
  const grupos = new Map()
  for (const ig of all) {
    const key = `${ig.endereco_cidade}|${ig.endereco_estado}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key).push(ig)
  }

  console.log(`Cidades únicas: ${grupos.size}`)

  let geocoded = 0
  let failed = 0
  let processed = 0

  for (const [key, igrejas] of grupos) {
    const [cidade, uf] = key.split('|')
    processed++

    if (processed % 20 === 0) {
      console.log(`  Progresso: ${processed}/${grupos.size} cidades...`)
    }

    const coords = await getCoords(cidade, uf)

    if (coords) {
      for (const ig of igrejas) {
        if (!DRY_RUN) {
          await sb.from('igrejas')
            .update({ coordenadas_lat: coords.lat, coordenadas_lng: coords.lng })
            .eq('id', ig.id)
        }
        geocoded++
      }
    } else {
      for (const ig of igrejas) {
        failed++
      }
      if (failed <= 20) {
        console.log(`  FALHOU: ${cidade}/${uf} (${igrejas.length} igrejas)`)
      }
    }

    // Rate limit: 100ms entre chamadas
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n=== RESULTADO ===`)
  console.log(`Geocodificadas: ${geocoded}`)
  console.log(`Sem match: ${failed}`)
  console.log(`Total processadas: ${geocoded + failed}`)
}

main().catch(console.error)

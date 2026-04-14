// cleanup-entity-matches.mjs
// Unmatch (set pessoa_id = NULL) recibos whose pessoa_nome_legado is an entity, not a real person.
// Patterns: IGREJA*, ASSOCIAÇÃO*, AUTO SOCORRO*, CAIXA*, PEQUENO GRUPO*, etc.

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY',
  { auth: { persistSession: false } }
)

const ENTITY_PATTERNS = [
  /\bIGREJA\b/i,
  /\bASSOCIA[CÇ][AÃ]O\b/i,
  /\bAUTO\s+SOCORRO\b/i,
  /\bCAIXA\b/i,
  /\bPEQUENO\s+GRUPO\b/i,
  /\bCASA\s+DE\s+ORA[CÇ][AÃ]O\b/i,
  /\bGRUPO\s+DE\s+/i,
  /\bCOLEGI[OA]\b/i,
  /\bPASTORAL\b/i,
  /\bCOMERCI/i,
]

function isEntity(nome) {
  return ENTITY_PATTERNS.some(rx => rx.test(nome))
}

const t0 = Date.now()
console.log('🔍 Scanning matched recibos for entity names...')

// Pull all matched recibos in pages
const entityIds = []
const distinct = new Map()
let from = 0
while (true) {
  const { data, error } = await sb.from('pessoa_contribuicao_mensal')
    .select('id, pessoa_nome_legado, pessoa_id')
    .not('pessoa_id', 'is', null)
    .range(from, from + 999)
  if (error) { console.error(error); break }
  if (!data || data.length === 0) break
  for (const r of data) {
    if (isEntity(r.pessoa_nome_legado)) {
      entityIds.push(r.id)
      const k = r.pessoa_nome_legado.trim()
      distinct.set(k, (distinct.get(k) || 0) + 1)
    }
  }
  if (data.length < 1000) break
  from += 1000
}

console.log(`\n📊 Found ${entityIds.length} entity recibos (${distinct.size} unique names)`)
console.log('Top 10 entities:')
const sorted = [...distinct.entries()].sort((a, b) => b[1] - a[1])
for (const [name, n] of sorted.slice(0, 10)) {
  console.log(`  ${String(n).padStart(4)}x: ${name}`)
}

if (entityIds.length === 0) {
  console.log('Nothing to clean. Exit.')
  process.exit(0)
}

// Update in batches
console.log(`\n🔧 Setting pessoa_id=NULL + match_method='entity_excluded' on ${entityIds.length} rows...`)
const BATCH = 200
let updated = 0
for (let i = 0; i < entityIds.length; i += BATCH) {
  const batch = entityIds.slice(i, i + BATCH)
  const { error } = await sb.from('pessoa_contribuicao_mensal')
    .update({
      pessoa_id: null,
      match_method: 'entity_excluded',
      observacao: 'Auto-excluded: name matches entity pattern (igreja, associação, etc)',
    })
    .in('id', batch)
  if (error) {
    console.log(`  batch ${Math.floor(i / BATCH) + 1}: ❌ ${error.message}`)
  } else {
    updated += batch.length
  }
}

console.log(`\n✅ Updated ${updated} rows in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

// Re-stats
const { count: matched } = await sb.from('pessoa_contribuicao_mensal').select('*', { count: 'exact', head: true }).not('pessoa_id', 'is', null)
const { count: unmatched } = await sb.from('pessoa_contribuicao_mensal').select('*', { count: 'exact', head: true }).is('pessoa_id', null)
const { count: excluded } = await sb.from('pessoa_contribuicao_mensal').select('*', { count: 'exact', head: true }).eq('match_method', 'entity_excluded')
console.log(`\nAfter cleanup:`)
console.log(`  Matched (real pessoas):    ${matched}`)
console.log(`  Unmatched (no match):      ${unmatched - excluded}`)
console.log(`  Entity excluded:           ${excluded}`)

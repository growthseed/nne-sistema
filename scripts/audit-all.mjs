import { createClient } from '@supabase/supabase-js'

const s = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'
)

// 1. Table counts
const tables = ['missionarios', 'usuarios', 'associacoes', 'unioes', 'igrejas', 'dados_financeiros', 'relatorios_missionarios', 'contagem_mensal', 'configuracoes']
console.log('=== TABLE COUNTS ===')
for (const t of tables) {
  const { count, error } = await s.from(t).select('*', { count: 'exact', head: true })
  console.log(`  ${t}: ${error ? 'ERROR: ' + error.message : count}`)
}

// 2. Associations
console.log('\n=== ASSOCIAÇÕES ===')
const { data: assocs } = await s.from('associacoes').select('id, nome, sigla').order('nome')
for (const a of assocs || []) {
  console.log(`  ${a.sigla || '???'} - ${a.nome} (${a.id})`)
}

// 3. All missionaries with their churches
console.log('\n=== MISSIONÁRIOS ===')
const { data: miss } = await s.from('missionarios').select('id, nome, cargo_ministerial, status, associacao_id, igrejas_responsavel').order('nome')
const { data: allIgrejas } = await s.from('igrejas').select('id, nome, membros_ativos, associacao_id').order('nome')

const igrejaMap = {}
for (const ig of allIgrejas || []) igrejaMap[ig.id] = ig

for (const m of miss || []) {
  const assoc = (assocs || []).find(a => a.id === m.associacao_id)
  const igrejaIds = m.igrejas_responsavel || []
  let totalMemb = 0
  for (const igId of igrejaIds) totalMemb += (igrejaMap[igId]?.membros_ativos || 0)
  console.log(`\n  ${m.nome} (${m.cargo_ministerial}, ${m.status}) - ${assoc?.sigla || 'sem assoc'}`)
  console.log(`    ${igrejaIds.length} igrejas, ${totalMemb} membros (soma individual)`)
  for (const igId of igrejaIds) {
    const ig = igrejaMap[igId]
    if (ig) {
      console.log(`      → ${ig.nome}: ${ig.membros_ativos} membros`)
    } else {
      console.log(`      → ❌ ID inexistente: ${igId}`)
    }
  }
}

// 4. Per-association dedup check
console.log('\n=== CONTAGEM POR ASSOCIAÇÃO (deduplicada vs soma individual) ===')
const assocGroups = {}
for (const m of miss || []) {
  const aId = m.associacao_id || 'sem-assoc'
  if (!assocGroups[aId]) assocGroups[aId] = { missionaries: [], uniqueIgrejas: new Set() }
  assocGroups[aId].missionaries.push(m)
  for (const igId of m.igrejas_responsavel || []) assocGroups[aId].uniqueIgrejas.add(igId)
}

for (const [aId, group] of Object.entries(assocGroups)) {
  const assoc = (assocs || []).find(a => a.id === aId)
  let somaIndividual = 0
  for (const m of group.missionaries) {
    for (const igId of m.igrejas_responsavel || []) somaIndividual += (igrejaMap[igId]?.membros_ativos || 0)
  }
  let somaDedup = 0
  for (const igId of group.uniqueIgrejas) somaDedup += (igrejaMap[igId]?.membros_ativos || 0)

  const diff = somaIndividual - somaDedup
  const flag = diff > 0 ? ` ⚠️ DUPLICAÇÃO: +${diff}` : ''
  console.log(`  ${assoc?.sigla || aId}: ${group.missionaries.length} miss, ${group.uniqueIgrejas.size} igrejas únicas, dedup=${somaDedup}, soma=${somaIndividual}${flag}`)
}

// 5. Duplicate church names
console.log('\n=== IGREJAS DUPLICADAS (mesmo nome) ===')
const byName = {}
for (const ig of allIgrejas || []) {
  const key = ig.nome.trim().toUpperCase()
  if (!byName[key]) byName[key] = []
  byName[key].push(ig)
}
const dupes = Object.entries(byName).filter(([, v]) => v.length > 1)
if (dupes.length === 0) {
  console.log('  Nenhuma duplicata encontrada ✅')
} else {
  for (const [name, items] of dupes) {
    console.log(`  ${name}:`)
    for (const i of items) {
      const assoc = (assocs || []).find(a => a.id === i.associacao_id)
      // Check if referenced by any missionary
      const refs = (miss || []).filter(m => (m.igrejas_responsavel || []).includes(i.id))
      console.log(`    ID: ${i.id} | ${i.membros_ativos} membros | ${assoc?.sigla || 'sem assoc'} | refs: ${refs.length} miss`)
    }
  }
}

// 6. Orphaned church references (missionary references church ID that doesn't exist)
console.log('\n=== REFERÊNCIAS ÓRFÃS (missionário aponta para igreja inexistente) ===')
let orphanCount = 0
for (const m of miss || []) {
  for (const igId of m.igrejas_responsavel || []) {
    if (!igrejaMap[igId]) {
      console.log(`  ${m.nome} → ${igId} (inexistente)`)
      orphanCount++
    }
  }
}
if (orphanCount === 0) console.log('  Nenhuma referência órfã ✅')

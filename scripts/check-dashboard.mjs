import { createClient } from '@supabase/supabase-js'

const s = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODUyMzEsImV4cCI6MjA4NzQ2MTIzMX0.XhzfwStPx1LZ2ua1UbSgoYjtIAcwZIX3BGh0JtO9i_4'
)

const aramAssocId = '62237917-adc6-49b0-8fe9-fe078dfcb63a'

// 1. Check ALL missionarios (not just ARAM)
const { data: allMiss } = await s.from('missionarios').select('id, nome, cargo_ministerial, associacao_id, igrejas_responsavel, status')
console.log('Total missionários no sistema:', (allMiss || []).length)

// Find those with ARAM churches
const { data: aramIgrejas } = await s.from('igrejas').select('id, nome').eq('associacao_id', aramAssocId)
const aramIgrejaIds = new Set((aramIgrejas || []).map(i => i.id))
const aramIgrejaNames = {}
for (const ig of aramIgrejas || []) aramIgrejaNames[ig.id] = ig.nome

console.log('\nIgrejas ARAM:', aramIgrejaIds.size)

// Find missionaries that have ARAM churches in their igrejas_responsavel
const missWithAram = (allMiss || []).filter(m => {
  return (m.igrejas_responsavel || []).some(id => aramIgrejaIds.has(id))
})

console.log('Missionários com igrejas da ARAM:', missWithAram.length)
for (const m of missWithAram) {
  const igsAram = (m.igrejas_responsavel || []).filter(id => aramIgrejaIds.has(id))
  console.log(`  ${m.nome} (${m.cargo_ministerial}, assoc: ${m.associacao_id})`)
  for (const igId of igsAram) {
    console.log(`    → ${aramIgrejaNames[igId] || igId}`)
  }
}

// 2. Check total membros for ARAM igrejas
const { data: aramIgFull } = await s.from('igrejas').select('id, nome, membros_ativos').eq('associacao_id', aramAssocId).order('nome')
let total = 0
for (const ig of aramIgFull || []) {
  total += ig.membros_ativos || 0
}
console.log('\nTotal membros ARAM (soma igrejas):', total)

// 3. Check all 4 duplicated church pairs
console.log('\n=== DUPLICATAS GLOBAIS ===')
const dupeIds = [
  // Araci - Centro
  ['2d157144-ca40-4401-8f75-ca12873f298d', '24bc9e86-b958-4d73-8f72-9bdbb30ae732'],
  // Caucaia - Parque Potira
  ['5673fe8f-95cb-4dcb-ba82-83ff8ade3f79', '2b072b3a-42c4-4ed6-bf59-c735c8f0406e'],
  // São Bernardo - Centro
  ['a142f6de-cf87-4fed-aad9-a9a7a1a53aa2', '22ace350-f04b-4007-aaa6-a8d9eadffea5'],
  // Vitória da Conquista - Patagônia
  ['7e4b9939-3939-4e46-a1b5-b491332a409d', '7d311aa7-d878-4fb9-b0de-f17e4c27f221'],
]

for (const [id1, id2] of dupeIds) {
  // Check if any missionary references either
  const refs1 = (allMiss || []).filter(m => (m.igrejas_responsavel || []).includes(id1))
  const refs2 = (allMiss || []).filter(m => (m.igrejas_responsavel || []).includes(id2))

  const ig1 = (aramIgFull || []).find(i => i.id === id1)
  const ig2 = (aramIgFull || []).find(i => i.id === id2)

  console.log(`\nPar: ${id1} / ${id2}`)
  console.log(`  ID1 refs: ${refs1.length} missionários${refs1.length ? ' → ' + refs1.map(m => m.nome).join(', ') : ''}`)
  console.log(`  ID2 refs: ${refs2.length} missionários${refs2.length ? ' → ' + refs2.map(m => m.nome).join(', ') : ''}`)
}

// 4. Check dados_financeiros, relatorios, contagem_mensal for duplicates
for (const [id1, id2] of dupeIds) {
  const { count: fin1 } = await s.from('dados_financeiros').select('id', { count: 'exact', head: true }).eq('igreja_id', id1)
  const { count: fin2 } = await s.from('dados_financeiros').select('id', { count: 'exact', head: true }).eq('igreja_id', id2)
  const { count: rel1 } = await s.from('relatorios_missionarios').select('id', { count: 'exact', head: true }).eq('igreja_id', id1)
  const { count: rel2 } = await s.from('relatorios_missionarios').select('id', { count: 'exact', head: true }).eq('igreja_id', id2)
  if (fin1 || fin2 || rel1 || rel2) {
    console.log(`  Par ${id1.slice(0,8)}: fin=${fin1}/${fin2}, rel=${rel1}/${rel2}`)
  }
}

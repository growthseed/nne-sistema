import { createClient } from '@supabase/supabase-js'

const s = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODUyMzEsImV4cCI6MjA4NzQ2MTIzMX0.XhzfwStPx1LZ2ua1UbSgoYjtIAcwZIX3BGh0JtO9i_4'
)

const { data } = await s.from('igrejas').select('id, nome, membros_ativos, associacao_id').order('nome')

// Find duplicates
const byName = {}
for (const ig of data || []) {
  const key = ig.nome.trim().toUpperCase()
  if (!byName[key]) byName[key] = []
  byName[key].push(ig)
}
const dupes = Object.entries(byName).filter(([, v]) => v.length > 1)
console.log('Total igrejas:', (data || []).length)
console.log('Nomes duplicados:', dupes.length)
for (const [name, items] of dupes) {
  console.log('---', name, '---')
  for (const i of items) console.log('  ID:', i.id, '| Membros:', i.membros_ativos, '| Assoc:', i.associacao_id)
}

// Check missionarios with Boa Vista - Tancredo Neves
const bvtn = 'a8bbaf8d-8705-4050-b894-467814992cf6'
const { data: miss } = await s.from('missionarios').select('id, nome, igrejas_responsavel').contains('igrejas_responsavel', [bvtn])
console.log('\nMissionários referenciando "Boa Vista - Tancredo Neves":')
for (const m of miss || []) {
  console.log('  ', m.nome, '- igrejas:', m.igrejas_responsavel?.length)
}

// Check ALL ARAM missionarios
const aramAssocId = '62237917-adc6-49b0-8fe9-fe078dfcb63a'
const { data: aramMiss } = await s.from('missionarios').select('id, nome, cargo_ministerial, igrejas_responsavel, status').eq('associacao_id', aramAssocId)
console.log('\nMissionários da ARAM:')
for (const m of aramMiss || []) {
  console.log(`  ${m.nome} (${m.cargo_ministerial}) - ${m.status} - ${(m.igrejas_responsavel || []).length} igrejas`)
  for (const igId of m.igrejas_responsavel || []) {
    const ig = (data || []).find(i => i.id === igId)
    console.log(`    → ${ig ? ig.nome : 'DESCONHECIDA'} (${igId}) - ${ig ? ig.membros_ativos : '?'} membros`)
  }
}

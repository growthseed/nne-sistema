import { createClient } from '@supabase/supabase-js'

const s = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'
)

// Find Boa Vista churches
const { data } = await s.from('igrejas').select('id, nome, membros_ativos').ilike('nome', '%boa vista%').order('nome')
console.log('Igrejas Boa Vista:')
for (const ig of data || []) {
  console.log(`  ${ig.nome}: ${ig.membros_ativos} membros (${ig.id})`)
}

// Find missionaries referencing Boa Vista - Tancredo Neves
const bvtn = 'a8bbaf8d-8705-4050-b894-467814992cf6'
const { data: miss } = await s.from('missionarios').select('id, nome').contains('igrejas_responsavel', [bvtn])
console.log('\nMissionários com Boa Vista - Tancredo Neves:')
for (const m of miss || []) console.log(`  ${m.nome} (${m.id})`)

// Check financial data for BV-TN
const { data: fin } = await s.from('dados_financeiros').select('id, mes, ano').eq('igreja_id', bvtn)
console.log('\nDados financeiros BV-TN:', (fin || []).length, 'registros')

const { data: cont } = await s.from('contagem_mensal').select('id, mes, ano').eq('igreja_id', bvtn)
console.log('Contagem mensal BV-TN:', (cont || []).length, 'registros')

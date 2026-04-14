import { createClient } from '@supabase/supabase-js'

const s = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODUyMzEsImV4cCI6MjA4NzQ2MTIzMX0.XhzfwStPx1LZ2ua1UbSgoYjtIAcwZIX3BGh0JtO9i_4'
)

// Check counts of all relevant tables
const tables = ['missionarios', 'missionario_igrejas', 'usuarios', 'associacoes', 'unioes', 'igrejas', 'membros', 'dados_financeiros', 'relatorios_missionarios', 'contagem_mensal']

for (const t of tables) {
  const { count, error } = await s.from(t).select('*', { count: 'exact', head: true })
  if (error) {
    console.log(`${t}: ERROR - ${error.message}`)
  } else {
    console.log(`${t}: ${count} registros`)
  }
}

// Check usuarios with roles/cargos
const { data: users } = await s.from('usuarios').select('id, nome, cargo, email').limit(20)
console.log('\nPrimeiros 20 usuarios:')
for (const u of users || []) {
  console.log(`  ${u.nome} (${u.cargo || 'sem cargo'}) - ${u.email || ''}`)
}

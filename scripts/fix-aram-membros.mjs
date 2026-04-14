import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODUyMzEsImV4cCI6MjA4NzQ2MTIzMX0.XhzfwStPx1LZ2ua1UbSgoYjtIAcwZIX3BGh0JtO9i_4'
)

// Real member counts per church from ARAM report (current as of 16/03/2026)
const ARAM_MEMBROS = {
  'ALTO ALEGRE': 3,
  'BOA VISTA': 26,
  'CAREIRO DA VÁRZEA': 13,
  'MANAUS CENTRAL': 41,
  'MANAUS MEMBROS ISOLADOS': 11,
  'MUTIRÃO': 10,
  'PURUPURU': 33,
  'SANTA ETELVINA': 24,
  'SANTA LUZIA': 23,
  'SÃO MIGUEL': 10,
  'TANCREDO NEVES': 12,
  'TERRA NOVA': 5,
}

// Total should be 211 from list + transfers = 217 final
// But list shows: 3+26+13+41+11+10+33+24+23+10+12+5 = 211 (the list itself)
// Héber's report shows updated numbers: 217 total
// Let's use the most current from Héber's assignments
const ARAM_MEMBROS_CURRENT = {
  'ALTO ALEGRE': 3,
  'BOA VISTA': 24,
  'CAREIRO DA VÁRZEA': 13,
  'MANAUS CENTRAL': 44,
  'MANAUS MEMBROS ISOLADOS': 11,
  'MUTIRÃO': 13,
  'PURUPURU': 34,
  'SANTA ETELVINA': 25,
  'SANTA LUZIA': 24,
  'SÃO MIGUEL': 10,
  'TANCREDO NEVES': 11,
  'TERRA NOVA': 5,
}
// Sum: 3+24+13+44+11+13+34+25+24+10+11+5 = 217 ✓

async function main() {
  // First, find ARAM association
  const { data: assocs } = await supabase
    .from('associacoes')
    .select('id, nome, sigla')

  console.log('Associações encontradas:')
  for (const a of assocs || []) {
    console.log(`  ${a.sigla || ''} - ${a.nome} (${a.id})`)
  }

  const aram = (assocs || []).find(a =>
    a.nome?.toUpperCase().includes('ARAM') ||
    a.sigla?.toUpperCase() === 'ARAM' ||
    a.nome?.toUpperCase().includes('RORAIMA') ||
    a.nome?.toUpperCase().includes('AMAZONAS')
  )

  if (!aram) {
    console.log('\nARAM não encontrada. Listando todas as igrejas...')
    const { data: allIgrejas } = await supabase
      .from('igrejas')
      .select('id, nome, membros_ativos, associacao_id')
      .order('nome')

    console.log('\nTodas as igrejas:')
    for (const ig of allIgrejas || []) {
      console.log(`  ${ig.nome}: ${ig.membros_ativos} membros (assoc: ${ig.associacao_id})`)
    }
    return
  }

  console.log(`\nARAM encontrada: ${aram.nome} (${aram.id})`)

  // Get all ARAM churches
  const { data: igrejas } = await supabase
    .from('igrejas')
    .select('id, nome, membros_ativos, interessados')
    .eq('associacao_id', aram.id)
    .order('nome')

  console.log(`\nIgrejas da ARAM (${(igrejas || []).length}):`)
  let totalAtual = 0
  const nomesSeen = new Set()
  const duplicadas = []

  for (const ig of igrejas || []) {
    const membros = ig.membros_ativos || 0
    totalAtual += membros
    console.log(`  ${ig.nome}: ${membros} membros (id: ${ig.id})`)

    const nomeNorm = ig.nome.trim().toUpperCase()
    if (nomesSeen.has(nomeNorm)) {
      duplicadas.push(ig)
    }
    nomesSeen.add(nomeNorm)
  }

  console.log(`\nTotal atual no banco: ${totalAtual}`)
  console.log(`Total real (relatório): 217`)

  if (duplicadas.length > 0) {
    console.log(`\n⚠️ IGREJAS DUPLICADAS encontradas:`)
    for (const d of duplicadas) {
      console.log(`  ${d.nome} (id: ${d.id}) - ${d.membros_ativos} membros`)
    }
  }

  // Check what needs to be updated
  console.log('\n--- Atualizações necessárias ---')
  for (const [nome, membrosCorretos] of Object.entries(ARAM_MEMBROS_CURRENT)) {
    const found = (igrejas || []).filter(ig =>
      ig.nome.trim().toUpperCase() === nome.toUpperCase()
    )
    if (found.length === 0) {
      console.log(`  ❌ Igreja "${nome}" não encontrada no banco`)
    } else if (found.length > 1) {
      console.log(`  ⚠️ Igreja "${nome}" duplicada (${found.length}x): IDs ${found.map(f => f.id).join(', ')}`)
    } else {
      const ig = found[0]
      if (ig.membros_ativos !== membrosCorretos) {
        console.log(`  🔄 ${nome}: ${ig.membros_ativos} → ${membrosCorretos}`)
      } else {
        console.log(`  ✅ ${nome}: ${ig.membros_ativos} (correto)`)
      }
    }
  }
}

main().catch(console.error)

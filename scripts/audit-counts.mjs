import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'
)

async function main() {
  // Source 1: igrejas cached fields
  const { data: igrejas } = await sb.from('igrejas').select('id, nome, membros_ativos, interessados, associacao_id').not('associacao_id', 'is', null)
  const totalIgrejaField = igrejas.reduce((s, i) => s + (i.membros_ativos || 0), 0)
  const totalInterField = igrejas.reduce((s, i) => s + (i.interessados || 0), 0)

  // Source 2: real pessoas count
  const { count: membrosAtivos } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'ativo')
  const { count: membrosTotal } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro')
  const { count: interessadosTotal } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'interessado')
  const { count: pessoasTotal } = await sb.from('pessoas').select('*', { count: 'exact', head: true })

  console.log('=== GLOBAL COUNTS ===')
  console.log('igrejas.membros_ativos (sum):', totalIgrejaField)
  console.log('igrejas.interessados (sum):', totalInterField)
  console.log('pessoas membro+ativo:', membrosAtivos)
  console.log('pessoas membro (all):', membrosTotal)
  console.log('pessoas interessado:', interessadosTotal)
  console.log('pessoas total:', pessoasTotal)
  console.log('')

  // Per association
  const { data: assocs } = await sb.from('associacoes').select('id, sigla')
  console.log('=== PER ASSOCIATION ===')
  for (const a of assocs) {
    const igrsA = igrejas.filter(i => i.associacao_id === a.id)
    const sumField = igrsA.reduce((s, i) => s + (i.membros_ativos || 0), 0)
    const sumIntField = igrsA.reduce((s, i) => s + (i.interessados || 0), 0)
    const igIds = igrsA.map(i => i.id)

    if (igIds.length === 0) {
      console.log(`${a.sigla}: no churches`)
      continue
    }

    const { count: realCount } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'ativo').in('igreja_id', igIds)
    const { count: intCount } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'interessado').in('igreja_id', igIds)

    const mDiff = sumField !== realCount ? ' *** MISMATCH' : ''
    const iDiff = sumIntField !== intCount ? ' *** MISMATCH' : ''
    console.log(`${a.sigla}: membros field=${sumField} real=${realCount}${mDiff} | interessados field=${sumIntField} real=${intCount}${iDiff}`)
  }

  // Check top mismatches per church
  console.log('\n=== TOP CHURCH MISMATCHES ===')
  for (const igr of igrejas) {
    const { count: realM } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').eq('situacao', 'ativo').eq('igreja_id', igr.id)
    const { count: realI } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'interessado').eq('igreja_id', igr.id)
    const mDiff = (igr.membros_ativos || 0) - realM
    const iDiff = (igr.interessados || 0) - realI
    if (Math.abs(mDiff) > 2 || Math.abs(iDiff) > 5) {
      console.log(`${igr.nome}: membros field=${igr.membros_ativos || 0} real=${realM} (diff=${mDiff}) | int field=${igr.interessados || 0} real=${realI} (diff=${iDiff})`)
    }
  }

  // Check pessoas without igreja_id
  const { count: orphanMembros } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'membro').is('igreja_id', null)
  const { count: orphanInt } = await sb.from('pessoas').select('*', { count: 'exact', head: true }).eq('tipo', 'interessado').is('igreja_id', null)
  console.log(`\nOrphan pessoas (no igreja_id): membros=${orphanMembros} interessados=${orphanInt}`)
}

main().catch(console.error)

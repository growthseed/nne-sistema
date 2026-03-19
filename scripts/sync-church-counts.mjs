import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'
)

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===')

  // Get all churches
  const { data: igrejas } = await sb.from('igrejas').select('id, nome, membros_ativos, membros_inativos, membros_falecidos, interessados')
  console.log(`Total churches: ${igrejas.length}`)

  let updated = 0
  let skipped = 0

  for (const igr of igrejas) {
    // Count real pessoas for this church
    const { count: ativos } = await sb.from('pessoas').select('*', { count: 'exact', head: true })
      .eq('igreja_id', igr.id).eq('tipo', 'membro').eq('situacao', 'ativo')

    const { count: inativos } = await sb.from('pessoas').select('*', { count: 'exact', head: true })
      .eq('igreja_id', igr.id).eq('tipo', 'membro').eq('situacao', 'inativo')

    const { count: falecidos } = await sb.from('pessoas').select('*', { count: 'exact', head: true })
      .eq('igreja_id', igr.id).eq('tipo', 'membro').eq('situacao', 'falecido')

    const { count: interessados } = await sb.from('pessoas').select('*', { count: 'exact', head: true })
      .eq('igreja_id', igr.id).eq('tipo', 'interessado')

    const needsUpdate =
      (igr.membros_ativos || 0) !== ativos ||
      (igr.membros_inativos || 0) !== inativos ||
      (igr.membros_falecidos || 0) !== falecidos ||
      (igr.interessados || 0) !== interessados

    if (needsUpdate) {
      if (!DRY_RUN) {
        const { error } = await sb.from('igrejas').update({
          membros_ativos: ativos,
          membros_inativos: inativos,
          membros_falecidos: falecidos,
          interessados: interessados
        }).eq('id', igr.id)

        if (error) {
          console.log(`ERROR ${igr.nome}: ${error.message}`)
        } else {
          updated++
          if (Math.abs((igr.membros_ativos || 0) - ativos) > 5 || Math.abs((igr.interessados || 0) - interessados) > 20) {
            console.log(`UPDATED ${igr.nome}: membros ${igr.membros_ativos || 0}->${ativos} | int ${igr.interessados || 0}->${interessados}`)
          }
        }
      } else {
        updated++
        if (Math.abs((igr.membros_ativos || 0) - ativos) > 5 || Math.abs((igr.interessados || 0) - interessados) > 20) {
          console.log(`WOULD UPDATE ${igr.nome}: membros ${igr.membros_ativos || 0}->${ativos} | int ${igr.interessados || 0}->${interessados}`)
        }
      }
    } else {
      skipped++
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} already correct`)
}

main().catch(console.error)

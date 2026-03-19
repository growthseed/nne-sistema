import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'
)

const DRY_RUN = process.argv.includes('--dry-run')

// NNE territory associations only (exclude ARAM and CAMISE)
const NNE_SIGLAS = ['AMAPI', 'ANOB', 'ASCE', 'ASPAR', 'CAMAP']

// Map cargo_ministerial to funcao display name
const CARGO_TO_FUNCAO = {
  pastor_ordenado: 'Pastor',
  ministro: 'Ministro',
  obreiro_aspirante: 'Obreiro Aspirante',
  obreiro_pre_aspirante: 'Obreiro Pré-Aspirante',
  obreiro_biblico: 'Obreiro Bíblico',
  missionario_voluntario: 'Missionário Voluntário',
}

let totalInserted = 0
let totalSkipped = 0
let totalErrors = 0

async function loadAssociations() {
  const { data, error } = await supabase.from('associacoes').select('id, nome, sigla')
  if (error) throw new Error(`Failed to load associacoes: ${error.message}`)
  return data
}

// ============================================================
// TASK 1: Sync missionario_igrejas from igrejas_responsavel
// ============================================================
async function syncMissionarioIgrejas(assocs) {
  console.log('\n' + '='.repeat(70))
  console.log('TASK 1: Sync missionario_igrejas junction table')
  console.log('='.repeat(70))

  const nneIds = assocs.filter(a => NNE_SIGLAS.includes(a.sigla)).map(a => a.id)

  // Get all NNE missionaries with non-empty igrejas_responsavel
  const { data: missionaries, error } = await supabase
    .from('missionarios')
    .select('id, nome, cargo_ministerial, igrejas_responsavel, associacao_id')
    .in('associacao_id', nneIds)
    .not('igrejas_responsavel', 'eq', '{}')

  if (error) {
    console.error('ERROR fetching missionaries:', error.message)
    return
  }

  // Filter out those with null/empty array
  const withChurches = missionaries.filter(m => m.igrejas_responsavel && m.igrejas_responsavel.length > 0)
  console.log(`Found ${withChurches.length} NNE missionaries with igrejas_responsavel entries`)

  // Get existing junction rows for these missionaries
  const mIds = withChurches.map(m => m.id)
  const { data: existingRows, error: existErr } = await supabase
    .from('missionario_igrejas')
    .select('missionario_id, igreja_id')
    .in('missionario_id', mIds)

  if (existErr) {
    console.error('ERROR fetching existing junction rows:', existErr.message)
    return
  }

  const existingSet = new Set(
    (existingRows || []).map(r => `${r.missionario_id}|${r.igreja_id}`)
  )
  console.log(`Existing junction rows for these missionaries: ${existingSet.size}`)

  // Process in batches
  const BATCH_SIZE = 10
  let insertedCount = 0
  let skippedCount = 0

  for (let i = 0; i < withChurches.length; i += BATCH_SIZE) {
    const batch = withChurches.slice(i, i + BATCH_SIZE)
    const rowsToInsert = []

    for (const m of batch) {
      const assocSigla = assocs.find(a => a.id === m.associacao_id)?.sigla
      const funcao = CARGO_TO_FUNCAO[m.cargo_ministerial] || m.cargo_ministerial

      for (let idx = 0; idx < m.igrejas_responsavel.length; idx++) {
        const churchId = m.igrejas_responsavel[idx]
        const key = `${m.id}|${churchId}`

        if (existingSet.has(key)) {
          skippedCount++
          continue
        }

        rowsToInsert.push({
          missionario_id: m.id,
          igreja_id: churchId,
          funcao,
          principal: idx === 0,
          ativo: true,
        })

        console.log(
          `  + ${m.nome} (${assocSigla}) → church ${churchId} | funcao: ${funcao} | principal: ${idx === 0}`
        )
      }
    }

    if (rowsToInsert.length > 0) {
      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would insert ${rowsToInsert.length} rows`)
        insertedCount += rowsToInsert.length
      } else {
        const { data, error: insertErr } = await supabase
          .from('missionario_igrejas')
          .insert(rowsToInsert)
          .select()

        if (insertErr) {
          console.error(`  ERROR inserting batch: ${insertErr.message}`)
          totalErrors++
        } else {
          insertedCount += rowsToInsert.length
          console.log(`  Inserted ${rowsToInsert.length} rows`)
        }
      }
    }
  }

  console.log(`\nTask 1 Summary:`)
  console.log(`  Rows inserted: ${insertedCount}`)
  console.log(`  Rows skipped (already exist): ${skippedCount}`)
  totalInserted += insertedCount
  totalSkipped += skippedCount
}

// ============================================================
// TASK 2: Fix REGINALDO cross-association to CAMAP
// ============================================================
async function fixReginaldo(assocs) {
  console.log('\n' + '='.repeat(70))
  console.log('TASK 2: Fix REGINALDO DE SOUZA MORAES association → CAMAP')
  console.log('='.repeat(70))

  const CAMAP_ID = assocs.find(a => a.sigla === 'CAMAP')?.id
  if (!CAMAP_ID) {
    console.error('ERROR: CAMAP association not found')
    return
  }

  const { data: reg, error } = await supabase
    .from('missionarios')
    .select('id, nome, associacao_id')
    .ilike('nome', '%REGINALDO DE SOUZA MORAES%')
    .single()

  if (error || !reg) {
    console.error('ERROR finding REGINALDO:', error?.message)
    return
  }

  const currentAssoc = assocs.find(a => a.id === reg.associacao_id)?.sigla
  console.log(`  Current: ${reg.nome} → associacao: ${currentAssoc} (${reg.associacao_id})`)
  console.log(`  Target:  ${reg.nome} → associacao: CAMAP (${CAMAP_ID})`)

  if (reg.associacao_id === CAMAP_ID) {
    console.log('  Already in CAMAP, skipping.')
    totalSkipped++
    return
  }

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would update associacao_id to CAMAP')
  } else {
    const { error: updErr } = await supabase
      .from('missionarios')
      .update({ associacao_id: CAMAP_ID })
      .eq('id', reg.id)

    if (updErr) {
      console.error(`  ERROR updating REGINALDO: ${updErr.message}`)
      totalErrors++
    } else {
      console.log('  Updated successfully.')
      totalInserted++
    }
  }
}

// ============================================================
// TASK 3: Assign TO churches to AMAPI
// ============================================================
async function assignTOChurches(assocs) {
  console.log('\n' + '='.repeat(70))
  console.log('TASK 3: Assign Tocantins (TO) churches to AMAPI')
  console.log('='.repeat(70))

  const AMAPI_ID = assocs.find(a => a.sigla === 'AMAPI')?.id
  if (!AMAPI_ID) {
    console.error('ERROR: AMAPI association not found')
    return
  }

  const { data: toChurches, error } = await supabase
    .from('igrejas')
    .select('id, nome, endereco_estado, associacao_id')
    .eq('endereco_estado', 'TO')
    .is('associacao_id', null)

  if (error) {
    console.error('ERROR fetching TO churches:', error.message)
    return
  }

  console.log(`  Found ${toChurches?.length || 0} TO churches with NULL associacao_id`)

  if (!toChurches || toChurches.length === 0) {
    console.log('  No churches to update.')
    return
  }

  for (const c of toChurches) {
    console.log(`  + ${c.nome} → AMAPI (${AMAPI_ID})`)
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would update ${toChurches.length} churches`)
  } else {
    const ids = toChurches.map(c => c.id)
    const { error: updErr } = await supabase
      .from('igrejas')
      .update({ associacao_id: AMAPI_ID })
      .in('id', ids)

    if (updErr) {
      console.error(`  ERROR updating TO churches: ${updErr.message}`)
      totalErrors++
    } else {
      console.log(`  Updated ${toChurches.length} churches successfully.`)
      totalInserted += toChurches.length
    }
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  FIX FICHA DE CAMPO DATA QUALITY - NNE Territory Only              ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')
  if (DRY_RUN) {
    console.log('>>> DRY RUN MODE - No changes will be made <<<')
  }

  try {
    const assocs = await loadAssociations()
    console.log('Associations loaded:', assocs.map(a => a.sigla).join(', '))

    await syncMissionarioIgrejas(assocs)
    await fixReginaldo(assocs)
    await assignTOChurches(assocs)

    console.log('\n' + '='.repeat(70))
    console.log('FINAL SUMMARY')
    console.log('='.repeat(70))
    console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
    console.log(`  Changes applied: ${totalInserted}`)
    console.log(`  Skipped (no change needed): ${totalSkipped}`)
    console.log(`  Errors: ${totalErrors}`)
  } catch (err) {
    console.error('FATAL ERROR:', err.message)
    process.exit(1)
  }
}

main()

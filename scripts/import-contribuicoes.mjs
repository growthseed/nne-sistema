// import-contribuicoes.mjs
// Imports financial recibos from scripts/backup/financeiro_*.json into pessoa_contribuicao_mensal.
//
// Match strategy for nome → pessoa_id (per recibo):
//   1. EXACT NORMALIZED (uppercase + no accents) within same igreja → confidence 1.00
//   2. EXACT NORMALIZED globally (no igreja filter)               → confidence 0.85
//   3. FUZZY (Levenshtein ratio >= 0.85) within same igreja        → confidence = ratio
//   4. None → pessoa_id NULL, saved with pessoa_nome_legado for later review
//
// Parsing valores_raw (heuristic, since legado parser was lossy):
//   - first value  → dizimo (highest confidence: dízimo is always the 1st column)
//   - last value   → total (sum)
//   - middle vals  → ofertas (aggregated)
//   - len==1       → only dizimo, total = dizimo
//   - len==2       → dizimo + total (often equal, meaning dízimo only)
//
// Original valores_raw saved as JSONB for re-processing.
//
// Usage:
//   node scripts/import-contribuicoes.mjs --dry-run                  # no writes
//   node scripts/import-contribuicoes.mjs                            # imports all financeiro_*.json
//   node scripts/import-contribuicoes.mjs --file=financeiro_ANOB.json # specific file

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ============== CONFIG ==============
const SUPABASE_URL = 'https://prqxiqykkijzpwdpqujv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fileArg = args.find(a => a.startsWith('--file='))
const FUZZY_THRESHOLD = 0.85
const BATCH_SIZE = 100

// ============== HELPERS ==============
function normalizeName(s) {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[*]/g, ' ')              // remove asterisks (used in legado for special markers)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function parseMoneyBR(s) {
  if (!s || s === '-' || s.trim() === '') return 0
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

// "01/10" + ano=2025 → "2025-10-01"  (DD/MM with year inferred)
function parseDataRecibo(dataStr, mes, ano) {
  if (!dataStr) return null
  const m = dataStr.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const dia = m[1].padStart(2, '0')
  const mesRecibo = m[2].padStart(2, '0')
  // Use the year from the period (mes/ano of the report)
  // Note: a recibo dated 30/09 in a report for mes=10/2025 would still be 2025
  return `${ano}-${mesRecibo}-${dia}`
}

// Levenshtein distance (iterative, O(n*m))
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = new Array(b.length + 1)
  let curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length)
  if (!maxLen) return 1
  return 1 - levenshtein(a, b) / maxLen
}

// Parse valores_raw heuristically
function parseValores(valoresRaw) {
  const nums = (valoresRaw || []).map(parseMoneyBR)
  if (nums.length === 0) return { dizimo: 0, primicias: 0, ofertas: 0, outros: 0, total: 0 }

  if (nums.length === 1) {
    // Only dízimo (or unknown single value, assumed dízimo)
    return { dizimo: nums[0], primicias: 0, ofertas: 0, outros: 0, total: nums[0] }
  }
  if (nums.length === 2) {
    // dízimo + total. Often equal (dízimo only).
    const dizimo = nums[0]
    const total = nums[1]
    if (Math.abs(dizimo - total) < 0.01) {
      return { dizimo, primicias: 0, ofertas: 0, outros: 0, total }
    }
    // dízimo + 1 outra coisa (rara)
    return { dizimo, primicias: 0, ofertas: total - dizimo, outros: 0, total }
  }
  // 3+ valores: first = dízimo, last = total, middle = ofertas (agregado)
  const dizimo = nums[0]
  const total = nums[nums.length - 1]
  const ofertas = nums.slice(1, -1).reduce((s, n) => s + n, 0)
  // Sanity check: if dizimo + ofertas != total within tolerance, mark as outros
  const computed = dizimo + ofertas
  const outros = Math.abs(computed - total) > 0.01 ? Math.max(0, total - computed) : 0
  return { dizimo, primicias: 0, ofertas, outros, total }
}

// ============== MAIN ==============
async function main() {
  const t0 = Date.now()
  console.log(`📁 Discovering financeiro JSON files...`)

  // Discover financeiro files
  const backupDir = 'scripts/backup'
  let files = []
  if (fileArg) {
    files = [path.join(backupDir, fileArg.split('=')[1])]
  } else {
    const all = fs.readdirSync(backupDir)
    files = all
      .filter(f => /^financeiro_[A-Z]+(_\w+)?\.json$/.test(f))
      .filter(f => !f.includes('_test'))
      .map(f => path.join(backupDir, f))
  }
  console.log(`Files: ${files.length}`)
  for (const f of files) console.log(`  ${f}`)

  // Load all records
  const allRecords = []
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.warn(`  ⚠ ${file} not found, skipping`)
      continue
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    allRecords.push(...data)
  }
  console.log(`\nTotal church-month records: ${allRecords.length}`)
  let totalRecibos = 0
  for (const r of allRecords) totalRecibos += (r.recibos || []).length
  console.log(`Total recibos to process: ${totalRecibos}`)

  if (dryRun) console.log('🟡 DRY RUN — no DB writes')

  // Load igrejas with gs_id
  console.log('\n📥 Loading igrejas (gs_id → uuid map)...')
  const { data: igrejasData, error: igrejasErr } = await supabase
    .from('igrejas')
    .select('id, nome, gs_id, associacao_id')
    .not('gs_id', 'is', null)
  if (igrejasErr) throw igrejasErr
  const igrejaByGsId = new Map()
  for (const i of igrejasData) igrejaByGsId.set(i.gs_id, i)
  console.log(`Loaded ${igrejasData.length} igrejas with gs_id`)

  // Load all pessoas (id, nome, igreja_id) for matching
  console.log('\n📥 Loading pessoas for fuzzy matching...')
  const pessoas = []
  let from = 0, page = 1000
  while (true) {
    const { data, error } = await supabase
      .from('pessoas')
      .select('id, nome, igreja_id, gs_id')
      .range(from, from + page - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    pessoas.push(...data)
    if (data.length < page) break
    from += page
  }
  console.log(`Loaded ${pessoas.length} pessoas`)

  // Build name index: normalized nome → pessoas[]
  const pessoasByNome = new Map()       // global
  const pessoasByNomeIgreja = new Map() // by igreja
  for (const p of pessoas) {
    const norm = normalizeName(p.nome)
    if (!norm) continue
    if (!pessoasByNome.has(norm)) pessoasByNome.set(norm, [])
    pessoasByNome.get(norm).push(p)
    if (p.igreja_id) {
      const k = `${p.igreja_id}|${norm}`
      if (!pessoasByNomeIgreja.has(k)) pessoasByNomeIgreja.set(k, [])
      pessoasByNomeIgreja.get(k).push(p)
    }
  }

  // For fuzzy: build per-igreja list of normalized names (only when we need it)
  const pessoasPorIgreja = new Map() // igreja_id → [{p, normName}]
  for (const p of pessoas) {
    if (!p.igreja_id) continue
    const norm = normalizeName(p.nome)
    if (!norm) continue
    if (!pessoasPorIgreja.has(p.igreja_id)) pessoasPorIgreja.set(p.igreja_id, [])
    pessoasPorIgreja.get(p.igreja_id).push({ p, normName: norm })
  }

  // Stats
  const stats = {
    recibos_processed: 0,
    matched_exact_igreja: 0,
    matched_exact_global: 0,
    matched_fuzzy: 0,
    matched_ambiguous: 0,
    unmatched: 0,
    no_igreja: 0,
    inserted: 0,
    errors: 0,
  }

  // Process records
  const inserts = []
  for (const record of allRecords) {
    const igrejaGsId = parseInt(record.igreja_id_old)
    const igreja = igrejaByGsId.get(igrejaGsId)
    if (!igreja) stats.no_igreja++

    for (const recibo of (record.recibos || [])) {
      stats.recibos_processed++

      const nomeNorm = normalizeName(recibo.nome)
      if (!nomeNorm) continue

      // 1. Exact match within same igreja
      let pessoaId = null
      let matchMethod = 'none'
      let matchConfidence = 0

      if (igreja) {
        const exactInIgreja = pessoasByNomeIgreja.get(`${igreja.id}|${nomeNorm}`)
        if (exactInIgreja && exactInIgreja.length === 1) {
          pessoaId = exactInIgreja[0].id
          matchMethod = 'exact_igreja'
          matchConfidence = 1.00
          stats.matched_exact_igreja++
        } else if (exactInIgreja && exactInIgreja.length > 1) {
          // Multiple pessoas with same name in same igreja — pick first but mark as ambiguous
          pessoaId = exactInIgreja[0].id
          matchMethod = 'exact_igreja_ambig'
          matchConfidence = 0.70
          stats.matched_ambiguous++
        }
      }

      // 2. Exact match globally (any igreja)
      if (!pessoaId) {
        const globalMatches = pessoasByNome.get(nomeNorm)
        if (globalMatches && globalMatches.length === 1) {
          pessoaId = globalMatches[0].id
          matchMethod = 'exact_global'
          matchConfidence = 0.85
          stats.matched_exact_global++
        } else if (globalMatches && globalMatches.length > 1) {
          // Multiple — try to filter by igreja proximity, else ambiguous
          stats.matched_ambiguous++
        }
      }

      // 3. Fuzzy match within same igreja (Levenshtein)
      if (!pessoaId && igreja) {
        const candidates = pessoasPorIgreja.get(igreja.id) || []
        let best = null
        for (const c of candidates) {
          const sim = similarity(nomeNorm, c.normName)
          if (sim >= FUZZY_THRESHOLD && (!best || sim > best.sim)) {
            best = { p: c.p, sim }
          }
        }
        if (best) {
          pessoaId = best.p.id
          matchMethod = 'fuzzy_igreja'
          matchConfidence = parseFloat(best.sim.toFixed(2))
          stats.matched_fuzzy++
        }
      }

      if (!pessoaId) stats.unmatched++

      // Parse valores
      const parsed = parseValores(recibo.valores_raw)

      inserts.push({
        pessoa_id: pessoaId,
        pessoa_nome_legado: recibo.nome,
        igreja_id: igreja?.id || null,
        igreja_id_legado: igrejaGsId || null,
        mes: record.mes,
        ano: record.ano,
        recibo_numero: recibo.recibo,
        data_recibo: parseDataRecibo(recibo.data, record.mes, record.ano),
        dizimo: parsed.dizimo,
        primicias: parsed.primicias,
        ofertas: parsed.ofertas,
        outros: parsed.outros,
        total: parsed.total,
        valores_raw: recibo.valores_raw,
        fonte: 'legado_scraper',
        match_method: matchMethod,
        match_confidence: matchConfidence,
      })
    }
  }

  console.log(`\n📊 Match summary (before insert):`)
  console.log(`  Recibos processed:        ${stats.recibos_processed}`)
  console.log(`  Exact match (igreja):     ${stats.matched_exact_igreja}  (${(stats.matched_exact_igreja / stats.recibos_processed * 100).toFixed(0)}%)`)
  console.log(`  Exact match (global):     ${stats.matched_exact_global}  (${(stats.matched_exact_global / stats.recibos_processed * 100).toFixed(0)}%)`)
  console.log(`  Fuzzy match (igreja):     ${stats.matched_fuzzy}  (${(stats.matched_fuzzy / stats.recibos_processed * 100).toFixed(0)}%)`)
  console.log(`  Ambiguous:                ${stats.matched_ambiguous}`)
  console.log(`  Unmatched (NULL pessoa):  ${stats.unmatched}  (${(stats.unmatched / stats.recibos_processed * 100).toFixed(0)}%)`)
  console.log(`  Records sem igreja:       ${stats.no_igreja}`)

  // Financial totals (for sanity check)
  const totalDizimos = inserts.reduce((s, i) => s + (i.dizimo || 0), 0)
  const totalOfertas = inserts.reduce((s, i) => s + (i.ofertas || 0), 0)
  console.log(`\n💰 Totals to import:`)
  console.log(`  Dízimos: R$ ${totalDizimos.toFixed(2)}`)
  console.log(`  Ofertas: R$ ${totalOfertas.toFixed(2)}`)
  console.log(`  Total recibos: ${inserts.length}`)

  if (dryRun) {
    console.log('\n(DRY RUN — no inserts performed)')
    console.log(`\n📋 Sample matched recibos:`)
    const matched = inserts.filter(i => i.pessoa_id).slice(0, 5)
    for (const m of matched) {
      console.log(`  ${m.recibo_numero} | ${m.pessoa_nome_legado.slice(0, 30).padEnd(30)} | dz=R$${m.dizimo.toFixed(2).padStart(8)} of=R$${m.ofertas.toFixed(2).padStart(7)} | ${m.match_method} (${m.match_confidence})`)
    }
    console.log(`\n📋 Sample unmatched recibos (need fuzzy improvement):`)
    const unmatched = inserts.filter(i => !i.pessoa_id).slice(0, 5)
    for (const m of unmatched) {
      console.log(`  ${m.recibo_numero} | ${m.pessoa_nome_legado.slice(0, 40)}`)
    }
    return
  }

  // Insert in batches (simple insert — partial unique index doesn't support upsert via REST)
  console.log(`\n📤 Inserting in batches of ${BATCH_SIZE}...`)
  for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
    const batch = inserts.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('pessoa_contribuicao_mensal')
      .insert(batch)
    if (error) {
      console.log(`  batch ${i / BATCH_SIZE + 1}: ❌ ${error.message}`)
      stats.errors++
    } else {
      stats.inserted += batch.length
      if ((i / BATCH_SIZE + 1) % 10 === 0) {
        console.log(`  ${stats.inserted}/${inserts.length} inserted...`)
      }
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n=== DONE ===`)
  console.log(`Inserted/upserted: ${stats.inserted}`)
  console.log(`Errors:            ${stats.errors}`)
  console.log(`Elapsed:           ${elapsed}s`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

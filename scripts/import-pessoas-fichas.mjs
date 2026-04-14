// import-pessoas-fichas.mjs
// Imports scraped pessoa fichas from MCCD into Supabase pessoas table.
//
// SAFETY MODE: fill-only
// - For EXISTING pessoas: only fills fields that are NULL/empty in the DB.
//   Manually edited values are NEVER overwritten.
// - For NEW pessoas: inserts all fields from the legado.
// - Always-update fields (history-only, never edited manually):
//     gs_id, religiao_anterior, religiao_anterior_desde, cargo_anterior,
//     local_batismo, oficiante_batismo, endereco_completo_legado,
//     dados_legado_atualizado_em
//
// Match strategy (in order):
//   1. By gs_id if pessoa already has it set
//   2. By nome + data_nascimento (most reliable)
//   3. By nome exato (last resort, ignores ambiguous)
//
// Usage:
//   node scripts/import-pessoas-fichas.mjs              # imports pessoas_fichas_ANOB.json
//   node scripts/import-pessoas-fichas.mjs --test       # imports pessoas_fichas_ANOB_test.json
//   node scripts/import-pessoas-fichas.mjs --dry-run    # no DB writes, only report
//   node scripts/import-pessoas-fichas.mjs --force      # disable fill-only (overwrite all)

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// ============== CONFIG ==============
const SUPABASE_URL = 'https://prqxiqykkijzpwdpqujv.supabase.co'

// Service role key (same as in audit-counts.mjs, audit-all.mjs, find-bv.mjs, etc.)
// Bypasses RLS for bulk operations.
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'

function loadKey() {
  return process.env.SUPABASE_SERVICE_KEY ||
         process.env.SUPABASE_SERVICE_ROLE_KEY ||
         SERVICE_ROLE_KEY
}

const args = process.argv.slice(2)
const isTest = args.includes('--test')
const dryRun = args.includes('--dry-run')
const forceMode = args.includes('--force')  // disable fill-only
const inputFile = `scripts/backup/pessoas_fichas_ANOB${isTest ? '_test' : ''}.json`

// Fields that ALWAYS update (history-only, never edited manually in NNE)
const ALWAYS_UPDATE_FIELDS = new Set([
  'gs_id',
  'religiao_anterior',
  'religiao_anterior_desde',
  'cargo_anterior',
  'local_batismo',
  'oficiante_batismo',
  'endereco_completo_legado',
  'dados_legado_atualizado_em',
])

const supabase = createClient(SUPABASE_URL, loadKey(), {
  auth: { persistSession: false }
})

// ============== NORMALIZERS ==============
function normSexo(s) {
  if (!s) return null
  const lower = s.toLowerCase().trim()
  if (lower.startsWith('mas') || lower === 'm') return 'masculino'
  if (lower.startsWith('fem') || lower === 'f') return 'feminino'
  return null
}

function normEstadoCivil(s) {
  if (!s) return null
  const lower = s.toLowerCase().trim().replace(/\(a\)/g, '').replace(/\s+/g, '')
  if (lower.includes('solteir')) return 'solteiro'
  if (lower.includes('casad')) return 'casado'
  if (lower.includes('divorc')) return 'divorciado'
  if (lower.includes('viuv') || lower.includes('viúv')) return 'viuvo'
  if (lower.includes('separad')) return 'separado'
  if (lower.includes('uniao') || lower.includes('união')) return 'uniao_estavel'
  return null
}

// "21/05/1986" -> "1986-05-21"
function normDateBR(s) {
  if (!s) return null
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = m[1].padStart(2, '0')
  const mo = m[2].padStart(2, '0')
  return `${m[3]}-${mo}-${d}`
}

// Normalize phone: remove non-digits, ensure leading 55 not duplicated
function normFone(s) {
  if (!s) return null
  const digits = s.replace(/\D/g, '')
  if (digits.length < 8) return null
  return digits
}

function normEmail(s) {
  if (!s) return null
  const trimmed = s.trim().toLowerCase()
  if (!trimmed.includes('@')) return null
  return trimmed
}

// "RUA TABAJARA 480B. GUARITA PARNAÍBA - PI CEP: 64215210"
//      logradouro    bairro    cidade  - uf      cep
function parseEnderecoLegado(raw) {
  if (!raw) return {}
  const out = { endereco_completo_legado: raw }

  // Extract CEP at end
  const cepM = raw.match(/CEP:\s*(\d[\d\-\s]*)\s*$/i)
  if (cepM) {
    const cepDigits = cepM[1].replace(/\D/g, '')
    if (cepDigits.length === 8) out.endereco_cep = cepDigits.slice(0, 5) + '-' + cepDigits.slice(5)
    else if (cepDigits.length > 0) out.endereco_cep = cepDigits
  }

  // Strip CEP from working string
  let work = raw.replace(/CEP:.*$/i, '').trim()

  // Extract UF (last " - XX" before CEP)
  const ufM = work.match(/^(.*?)\s*-\s*([A-Z]{2})\s*$/)
  if (ufM) {
    work = ufM[1].trim()
    out.endereco_estado = ufM[2]
  }

  // The "B." marker separates bairro from cidade in many records
  // ex: "RUA TABAJARA 480B. GUARITA PARNAÍBA"
  //                       ^^^^^^^^ ^^^^^^^^
  //                       bairro    cidade
  const bM = work.match(/^(.+?)B\.\s*([^\s].*?)\s+(\S+(?:\s\S+)?)$/)
  if (bM) {
    out.endereco_rua = bM[1].trim().replace(/[\s,]+$/, '')
    out.endereco_bairro = bM[2].trim()
    out.endereco_cidade = bM[3].trim()
  } else {
    // No "B." marker - put everything in endereco_rua as fallback
    out.endereco_rua = work.trim()
  }

  return out
}

// ============== MAIN ==============
async function main() {
  console.log(`📁 Reading ${inputFile}`)
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`)
    process.exit(1)
  }
  const fichas = JSON.parse(fs.readFileSync(inputFile, 'utf-8'))
  console.log(`Loaded ${fichas.length} fichas`)
  if (dryRun) console.log('🟡 DRY RUN — no database writes')

  // Pre-load all pessoas with full record (for matching AND for fill-only diff)
  // We need ALL fields the importer touches so we can detect what's NULL/empty.
  console.log('\n📥 Loading existing pessoas from Supabase for matching + fill-only...')
  const FIELDS_TO_LOAD = [
    'id', 'nome', 'gs_id', 'data_nascimento',
    'sexo', 'nacionalidade', 'rg', 'profissao', 'escolaridade',
    'nome_pai', 'nome_mae', 'estado_civil', 'conjuge_nome', 'data_casamento',
    'celular', 'telefone', 'email',
    'data_batismo',
    'endereco_rua', 'endereco_bairro', 'endereco_cidade', 'endereco_estado', 'endereco_cep',
  ].join(', ')

  const existingByGsId = new Map()
  const existingByNomeData = new Map()
  const existingByNome = new Map() // can have duplicates → array
  const existingFull = new Map()    // id → full record (for fill-only diff)

  let from = 0, page = 1000, total = 0
  while (true) {
    const { data, error } = await supabase
      .from('pessoas')
      .select(FIELDS_TO_LOAD)
      .range(from, from + page - 1)
    if (error) { console.error(error); break }
    if (!data || data.length === 0) break
    for (const p of data) {
      total++
      existingFull.set(p.id, p)
      if (p.gs_id) existingByGsId.set(p.gs_id, p.id)
      const nomeKey = (p.nome || '').toUpperCase().trim()
      if (nomeKey && p.data_nascimento) {
        existingByNomeData.set(`${nomeKey}|${p.data_nascimento}`, p.id)
      }
      if (nomeKey) {
        if (!existingByNome.has(nomeKey)) existingByNome.set(nomeKey, [])
        existingByNome.get(nomeKey).push(p.id)
      }
    }
    if (data.length < page) break
    from += page
  }
  console.log(`Total pessoas in DB: ${total}`)
  console.log(`  with gs_id: ${existingByGsId.size}`)
  console.log(`  unique nome+nascimento: ${existingByNomeData.size}`)
  console.log(`Mode: ${forceMode ? '🔴 FORCE (overwrite all)' : '🟢 FILL-ONLY (preserve manual edits)'}`)

  // Process each ficha
  const stats = {
    matched_by_gs_id: 0,
    matched_by_nome_data: 0,
    matched_by_nome: 0,
    matched_by_nome_ambiguous: 0,
    new_pessoas: 0,
    updates_applied: 0,
    skipped_no_data: 0,
    skipped_nothing_to_fill: 0,
    fields_filled: 0,
    fields_protected: 0,
    errors: 0,
  }

  for (let i = 0; i < fichas.length; i++) {
    const f = fichas[i]
    if (f._error) { stats.errors++; continue }

    const nomeKey = (f.nome || f.nome_mccd || '').toUpperCase().trim()
    const dataNasc = normDateBR(f.nascimento)

    // 1. Match by gs_id
    let pessoaId = existingByGsId.get(f.id_legado)
    let matchType = pessoaId ? 'gs_id' : null

    // 2. Match by nome+data_nascimento
    if (!pessoaId && nomeKey && dataNasc) {
      pessoaId = existingByNomeData.get(`${nomeKey}|${dataNasc}`)
      if (pessoaId) matchType = 'nome+data'
    }

    // 3. Match by nome (only if exactly 1 match)
    if (!pessoaId && nomeKey) {
      const ids = existingByNome.get(nomeKey)
      if (ids && ids.length === 1) {
        pessoaId = ids[0]
        matchType = 'nome_unique'
      } else if (ids && ids.length > 1) {
        stats.matched_by_nome_ambiguous++
      }
    }

    // Build update payload
    const enderecoFields = parseEnderecoLegado(f.endereco_completo)
    const payload = {
      gs_id: f.id_legado,
      nome: f.nome || f.nome_mccd,
      sexo: normSexo(f.sexo),
      data_nascimento: dataNasc,
      nacionalidade: f.nacionalidade || null,
      rg: f.rg || null,
      profissao: f.profissao || null,
      escolaridade: f.escolaridade || null,
      nome_pai: f.pai || null,
      nome_mae: f.mae || null,
      estado_civil: normEstadoCivil(f.estado_civil),
      conjuge_nome: f.conjuge || null,
      data_casamento: normDateBR(f.data_casamento),
      celular: normFone(f.celular),
      telefone: normFone(f.telefone),
      email: normEmail(f.email),
      religiao_anterior: f.religiao_anterior || null,
      religiao_anterior_desde: f.religiao_desde || null,
      cargo_anterior: f.cargo_anterior || null,
      data_batismo: normDateBR(f.data_admissao),
      local_batismo: f.local_admissao || null,
      oficiante_batismo: f.oficiante || null,
      ...enderecoFields,
      tipo: 'membro',
      dados_legado_atualizado_em: new Date().toISOString(),
    }

    // Remove null/undefined to avoid wiping existing data
    for (const k of Object.keys(payload)) {
      if (payload[k] === null || payload[k] === undefined || payload[k] === '') delete payload[k]
    }

    if (Object.keys(payload).length === 0) { stats.skipped_no_data++; continue }

    if (pessoaId) {
      if (matchType === 'gs_id') stats.matched_by_gs_id++
      else if (matchType === 'nome+data') stats.matched_by_nome_data++
      else if (matchType === 'nome_unique') stats.matched_by_nome++

      // FILL-ONLY: filter the payload to only include fields that are NULL/empty in the DB
      // (always-update fields bypass this check)
      let finalPayload = payload
      if (!forceMode) {
        const existing = existingFull.get(pessoaId) || {}
        finalPayload = {}
        for (const [k, v] of Object.entries(payload)) {
          if (ALWAYS_UPDATE_FIELDS.has(k)) {
            finalPayload[k] = v
            continue
          }
          const dbVal = existing[k]
          const isEmpty = dbVal === null || dbVal === undefined || dbVal === ''
          if (isEmpty) {
            finalPayload[k] = v
            stats.fields_filled++
          } else {
            stats.fields_protected++
          }
        }
        // If after filtering nothing left except gs_id+timestamp, skip
        const meaningful = Object.keys(finalPayload).filter(
          k => k !== 'gs_id' && k !== 'dados_legado_atualizado_em'
        )
        if (meaningful.length === 0) {
          stats.skipped_nothing_to_fill++
          continue
        }
      }

      if (!dryRun) {
        const { error } = await supabase.from('pessoas').update(finalPayload).eq('id', pessoaId)
        if (error) {
          console.log(`  ❌ update id=${f.id_legado} (${f.nome_mccd}): ${error.message}`)
          stats.errors++
        } else {
          stats.updates_applied++
        }
      }
    } else {
      // Create new pessoa
      stats.new_pessoas++
      if (!dryRun) {
        const { error } = await supabase.from('pessoas').insert(payload)
        if (error) {
          console.log(`  ❌ insert id=${f.id_legado} (${f.nome_mccd}): ${error.message}`)
          stats.errors++
        } else {
          stats.updates_applied++
        }
      }
    }

    if ((i + 1) % 25 === 0) console.log(`  processed ${i + 1}/${fichas.length}`)
  }

  console.log('\n=== IMPORT SUMMARY ===')
  console.log(`Total fichas:                ${fichas.length}`)
  console.log(`Mode:                        ${forceMode ? 'FORCE' : 'FILL-ONLY'}`)
  console.log(`---`)
  console.log(`Matched by gs_id:            ${stats.matched_by_gs_id}`)
  console.log(`Matched by nome+nasc:        ${stats.matched_by_nome_data}`)
  console.log(`Matched by nome único:       ${stats.matched_by_nome}`)
  console.log(`Ambiguous (skipped):         ${stats.matched_by_nome_ambiguous}`)
  console.log(`New pessoas to insert:       ${stats.new_pessoas}`)
  console.log(`---`)
  console.log(`Fields filled (was NULL):    ${stats.fields_filled}`)
  console.log(`Fields protected (had data): ${stats.fields_protected}`)
  console.log(`Skipped (nothing to fill):   ${stats.skipped_nothing_to_fill}`)
  console.log(`---`)
  console.log(`Updates applied to DB:       ${stats.updates_applied}`)
  console.log(`Skipped (no data):           ${stats.skipped_no_data}`)
  console.log(`Errors:                      ${stats.errors}`)
  if (dryRun) console.log('\n(DRY RUN - no actual writes)')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

// scraper-membros-fichas.mjs
// Visit each membro's full ficha (sub=visualizar) and extract address, contact, personal data.
// Uses MCCD-extracted IDs from mccd_ids_ANOB.json.
//
// Usage:
//   node scripts/scraper-membros-fichas.mjs --limit=10        # test with first 10
//   node scripts/scraper-membros-fichas.mjs --limit=50        # 50 fichas
//   node scripts/scraper-membros-fichas.mjs --full            # all 1499
//
// Output: scripts/backup/pessoas_fichas_ANOB.json (incremental save every 25 records)

import { chromium } from 'playwright'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'

const BASE = 'https://secretaria.org.br/secretaria/gs/'
const LOGIN_URL = 'https://secretaria.org.br/secretaria/new'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = 'scripts/backup'
const DELAY = 700
const RELOGIN_EVERY = 50

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

// Parse CLI
const args = process.argv.slice(2)
const fullMode = args.includes('--full')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = fullMode ? Infinity : (limitArg ? parseInt(limitArg.split('=')[1]) : 10)

// Output file changes by mode (test vs full)
const isTest = !fullMode && limit <= 50
const outFile = `${OUTPUT_DIR}/pessoas_fichas_ANOB${isTest ? '_test' : ''}.json`

// Load IDs
const allIds = JSON.parse(readFileSync(`${OUTPUT_DIR}/mccd_ids_ANOB.json`, 'utf-8'))
const targetIds = allIds.slice(0, limit === Infinity ? allIds.length : limit)
console.log(`Loaded ${allIds.length} IDs from MCCD; processing ${targetIds.length}`)
console.log(`Mode: ${fullMode ? 'FULL' : 'LIMIT=' + limit} | Output: ${outFile}`)

// ============== PARSER ==============
// Parse a ficha by reading rows of Table[0] line by line and finding labels.
async function parseFicha(page, id, nomeMccd) {
  const rec = {
    id_legado: id,
    nome_mccd: nomeMccd,
    nome: '',
    status_pagina: '',
    igreja_pagina: '',
    associacao_pagina: '',
    sexo: '',
    nascimento: '',
    cidade_nascimento: '',
    nacionalidade: '',
    rg: '',
    profissao: '',
    escolaridade: '',
    pai: '',
    mae: '',
    estado_civil: '',
    conjuge: '',
    data_casamento: '',
    endereco_completo: '',
    telefone: '',
    celular: '',
    email: '',
    religiao_anterior: '',
    religiao_desde: '',
    cargo_anterior: '',
    admissao_tipo: '',
    data_admissao: '',
    local_admissao: '',
    oficiante: '',
    _scraped_at: new Date().toISOString(),
  }

  // Use MCCD name as primary (h1/h2 doesn't exist on these pages)
  rec.nome = nomeMccd

  // Read Table[0] rows
  const tables = await page.locator('table').all()
  if (tables.length === 0) return null

  const rows = await tables[0].locator('tr').all()
  // SKIP row[0] — it's a "supercell" that concatenates all rows into one string,
  // which would corrupt our label-based parser by pulling values from the wrong place.
  const lines = []
  for (let r = 1; r < rows.length; r++) {
    const cells = await rows[r].locator('td, th').allTextContents()
    const text = cells.map(c => c.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' ')
    lines.push(text)
  }

  // Helper: find a line that starts with label, return value (label stripped)
  const find = (label) => {
    for (const line of lines) {
      if (line.startsWith(label)) {
        return line.slice(label.length).trim()
      }
    }
    return ''
  }
  // Helper: find a line that EQUALS label, return next non-empty line
  const findNext = (label) => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === label) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j]) return lines[j]
        }
      }
    }
    return ''
  }

  // Direct labelled fields (line starts with "Label: value")
  rec.status_pagina = find('Membro:')
  rec.igreja_pagina = find('Igreja:')
  rec.associacao_pagina = find('Associação:')
  rec.sexo = find('Sexo:')
  rec.nascimento = find('Nascimento:')
  // Cidade is ambiguous (appears in nascimento AND admissão); take FIRST occurrence
  rec.cidade_nascimento = find('Cidade:')
  rec.nacionalidade = find('Nacionalidade:')
  rec.rg = find('RG/Origem:')
  rec.profissao = find('Profissão:')
  rec.escolaridade = find('Escolaridade:')
  rec.pai = find('Pai:')
  rec.mae = find('Mãe:')
  rec.estado_civil = find('Estado Civil:')
  rec.conjuge = find('Conjuge:')
  rec.data_casamento = find('Casamento:')

  // Telefone/Celular/Email — direct
  rec.telefone = find('Telefone:')
  rec.celular = find('Celular:')
  rec.email = find('E-mail:')

  // Endereço — appears as standalone label "Endereço", value is on the next line
  rec.endereco_completo = findNext('Endereço')

  // Religious data
  rec.religiao_anterior = find('Religião Anterior:')
  rec.religiao_desde = find('Desde:')
  rec.cargo_anterior = find('Cargo que Ocupava:')
  rec.admissao_tipo = find('Admitido na Igreja por:')
  rec.data_admissao = find('Data:')
  // 2nd Cidade: occurrence (admission city) - find all
  const cidadeOccurrences = lines.filter(l => l.startsWith('Cidade:'))
  if (cidadeOccurrences.length >= 2) {
    rec.local_admissao = cidadeOccurrences[1].slice('Cidade:'.length).trim()
  }
  rec.oficiante = find('Oficiante:') || find('Ministro:')

  return rec
}

// ============== AUTH ==============
async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
}

// ============== MAIN ==============
async function main() {
  const t0 = Date.now()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  await login(page)
  console.log('Logged in')

  // Switch to ANOB (just in case some data is association-scoped)
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=6', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  const out = []
  let okCount = 0, emptyCount = 0, errorCount = 0

  for (let i = 0; i < targetIds.length; i++) {
    const t = targetIds[i]

    // Periodic re-login
    if (i > 0 && i % RELOGIN_EVERY === 0) {
      console.log('  (re-login)')
      await login(page)
      await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=6', { waitUntil: 'networkidle' })
      await page.waitForTimeout(500)
    }

    const url = `${BASE}index.php?action=cadastro&option=membro&sub=visualizar&membro=${t.id}`
    try {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 18000 })
      } catch {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 18000 })
      }
      await page.waitForTimeout(DELAY)

      const rec = await parseFicha(page, t.id, t.nome)
      if (rec) {
        out.push(rec)
        const hasContact = rec.celular || rec.telefone || rec.email
        const hasEndereco = !!rec.endereco_completo
        if (hasContact || hasEndereco) {
          okCount++
        } else {
          emptyCount++
        }
        if (i < 20 || i % 25 === 0) {
          console.log(`[${i + 1}/${targetIds.length}] id=${t.id} ${(rec.nome || t.nome).slice(0, 35).padEnd(35)} | ${rec.igreja_pagina.slice(0,18).padEnd(18)} | end=${hasEndereco ? 'Y' : '-'} cel=${rec.celular ? 'Y' : '-'} mail=${rec.email ? 'Y' : '-'}`)
        }
      } else {
        emptyCount++
        console.log(`[${i + 1}/${targetIds.length}] id=${t.id} EMPTY (no tables)`)
      }
    } catch (e) {
      errorCount++
      console.log(`[${i + 1}/${targetIds.length}] id=${t.id} ERROR ${e.message?.slice(0, 80)}`)
      out.push({ id_legado: t.id, nome_mccd: t.nome, _error: e.message?.slice(0, 200) })
    }

    // Incremental save every 25
    if ((i + 1) % 25 === 0) {
      writeFileSync(outFile, JSON.stringify(out, null, 2))
    }
  }

  // Final save
  writeFileSync(outFile, JSON.stringify(out, null, 2))

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n=== DONE ===`)
  console.log(`Saved ${out.length} records → ${outFile}`)
  console.log(`OK with contact/address: ${okCount} | Empty: ${emptyCount} | Error: ${errorCount}`)
  console.log(`Elapsed: ${elapsed}s (avg ${(elapsed / targetIds.length).toFixed(1)}s/ficha)`)

  // Summary stats
  const stats = {
    total: out.length,
    com_endereco: out.filter(r => r.endereco_completo).length,
    com_celular: out.filter(r => r.celular).length,
    com_telefone: out.filter(r => r.telefone).length,
    com_email: out.filter(r => r.email).length,
    com_data_nasc: out.filter(r => r.nascimento).length,
    com_estado_civil: out.filter(r => r.estado_civil).length,
    com_conjuge: out.filter(r => r.conjuge).length,
  }
  console.log('\nField coverage:')
  for (const [k, v] of Object.entries(stats)) {
    const pct = stats.total > 0 ? ((v / stats.total) * 100).toFixed(0) : 0
    console.log(`  ${k.padEnd(20)}: ${String(v).padStart(4)} / ${stats.total} (${pct}%)`)
  }

  await browser.close()
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

// debug-financeiro-pages.mjs — fetch specific financeiro pages and dump HTML for analysis
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const BASE = 'https://secretaria.org.br/secretaria/gs/'
const LOGIN_URL = 'https://secretaria.org.br/secretaria/new'
const CPF = '02099493766'
const PASS = 'estrela'
const OUT = 'scripts/backup/debug'

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const TARGETS = [
  { igreja: 312, nome: 'AGUA_PRETA',     mes: 2, ano: 2026, expect: 'CONTROL - parser worked' },
  { igreja: 529, nome: 'ANOB_SEDE',      mes: 2, ano: 2026, expect: 'BUG1 - 32 recibos but R$0 dizimos' },
  { igreja: 658, nome: 'MISSIONARIOS',   mes: 2, ano: 2026, expect: 'BUG1 - 12 recibos but R$0 dizimos' },
  { igreja: 310, nome: 'NATAL',          mes: 2, ano: 2026, expect: 'BUG2 - was active before, now no table' },
  { igreja: 317, nome: 'RECIFE',         mes: 2, ano: 2026, expect: 'BUG2 - was active before, now no table' },
  { igreja: 309, nome: 'MACEIO',         mes: 2, ano: 2026, expect: 'BUG2 - was active before, now no table' },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(20000)

// Login
console.log('Logging in...')
await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.fill('input[name="login"]', CPF)
await page.fill('input[name="senha"]', PASS)
await page.click('button[type="submit"]')
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1500)
console.log('Logged in. URL:', page.url())

// Switch to ANOB
await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=6', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
console.log('Switched to ANOB')

for (const t of TARGETS) {
  const url = `${BASE}index.php?action=relatorio&option=financeiro&sub=listar&igreja=${t.igreja}&mes=${t.mes}/${t.ano}`
  console.log(`\n=== ${t.nome} (${t.igreja}) ${t.mes}/${t.ano} — ${t.expect} ===`)
  console.log(`URL: ${url}`)

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)

  // Save full HTML
  const html = await page.content()
  const fname = `${OUT}/${t.nome}_${t.mes}-${t.ano}.html`
  writeFileSync(fname, html)
  console.log(`HTML: ${fname} (${html.length} bytes)`)

  // Analyze: count tables, dump table summaries
  const tables = await page.locator('table').all()
  console.log(`Tables found: ${tables.length}`)

  for (let ti = 0; ti < tables.length; ti++) {
    const rows = await tables[ti].locator('tr').all()
    console.log(`  Table[${ti}]: ${rows.length} rows`)
    // Print first 3 and last 3 rows
    const toShow = []
    for (let ri = 0; ri < Math.min(rows.length, 3); ri++) toShow.push(ri)
    if (rows.length > 6) {
      toShow.push(-1)
      for (let ri = Math.max(3, rows.length - 3); ri < rows.length; ri++) toShow.push(ri)
    }
    for (const ri of toShow) {
      if (ri === -1) { console.log('    ...'); continue }
      const cells = await rows[ri].locator('td, th').allTextContents()
      const cleaned = cells.map(c => c.trim()).filter(Boolean)
      if (cleaned.length > 0) {
        console.log(`    [${ri}] ${cleaned.slice(0, 16).join(' | ')}`)
      }
    }
  }

  // Check if page has any "no data" / "vazio" / "logout" indicator
  const bodyText = (await page.locator('body').textContent()) || ''
  const lower = bodyText.toLowerCase()
  if (lower.includes('logout') || lower.includes('sessão')) {
    console.log('  ⚠ Possible session issue')
  }
  if (lower.includes('não há') || lower.includes('vazio') || lower.includes('inexistente')) {
    console.log('  ⚠ Empty data marker found in body')
  }
  console.log(`  Body length: ${bodyText.length} chars`)
}

await browser.close()
console.log('\nDone. Inspect HTML files in', OUT)

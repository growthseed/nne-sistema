// debug-membro-ficha.mjs — fetch a single membro's full ficha to map address/contact fields
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'https://secretaria.org.br/secretaria/gs/'
const LOGIN_URL = 'https://secretaria.org.br/secretaria/new'
const CPF = '02099493766'
const PASS = 'estrela'

const TARGETS = [
  { id: 1800, label: 'ABILENE_CARVALHO' },
  { id: 15706, label: 'AGNALDO_CORREIA' },
  { id: 6148, label: 'ADAIR_RODRIGUES' },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(30000)

await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await page.fill('input[name="login"]', CPF)
await page.fill('input[name="senha"]', PASS)
await page.click('button[type="submit"]')
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1500)
console.log('Logged in')

await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=6', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

for (const t of TARGETS) {
  // Try sub=visualizar (the full ficha)
  const url = `${BASE}index.php?action=cadastro&option=membro&sub=visualizar&membro=${t.id}`
  console.log(`\n=== ${t.label} (id=${t.id}) ===`)
  console.log(`URL: ${url}`)
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  const html = await page.content()
  writeFileSync(`scripts/backup/debug/membro_${t.id}.html`, html)
  console.log(`HTML: ${html.length} bytes`)

  // Dump table structure
  const tables = await page.locator('table').all()
  console.log(`Tables: ${tables.length}`)
  for (let ti = 0; ti < Math.min(tables.length, 8); ti++) {
    const rows = await tables[ti].locator('tr').all()
    console.log(`\n  Table[${ti}] (${rows.length} rows)`)
    // Print first 25 rows
    for (let ri = 0; ri < Math.min(rows.length, 25); ri++) {
      const cells = await rows[ri].locator('td, th').allTextContents()
      const cleaned = cells.map(c => c.trim().replace(/\s+/g, ' ')).filter(Boolean)
      if (cleaned.length) {
        const line = cleaned.join(' | ').slice(0, 200)
        console.log(`    [${ri}] ${line}`)
      }
    }
  }

  // Dump form inputs (sometimes ficha has input fields with values pre-filled)
  const inputs = await page.locator('input, select, textarea').all()
  const filled = []
  for (const inp of inputs) {
    const name = await inp.getAttribute('name')
    if (!name || ['action','option','sub','palavra','Procurar','file','back'].includes(name)) continue
    const tag = await inp.evaluate(el => el.tagName)
    let val = ''
    try {
      if (tag === 'SELECT') {
        val = (await inp.locator('option:checked').textContent())?.trim() || ''
      } else {
        val = (await inp.inputValue()) || ''
      }
    } catch {}
    if (val) filled.push({ name, val: val.slice(0, 60) })
  }
  if (filled.length) {
    console.log(`\n  Pre-filled inputs: ${filled.length}`)
    for (const f of filled) console.log(`    ${f.name} = "${f.val}"`)
  }
}

await browser.close()
console.log('\nDone')

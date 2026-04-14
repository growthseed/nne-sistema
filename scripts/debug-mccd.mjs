// debug-mccd.mjs — explore the MCCD tab of financeiro report
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'https://secretaria.org.br/secretaria/gs/'
const LOGIN_URL = 'https://secretaria.org.br/secretaria/new'
const CPF = '02099493766'
const PASS = 'estrela'

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
console.log('Switched to ANOB')

// Try MCCD tab — root (no params)
console.log('\n=== MCCD root ===')
await page.goto(BASE + 'index.php?action=relatorio&option=financeiro&sub=mccd', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
console.log('URL:', page.url())
let html = await page.content()
writeFileSync('scripts/backup/debug/MCCD_root.html', html)
console.log(`HTML saved (${html.length} bytes)`)

// Inspect tables and forms
let tables = await page.locator('table').all()
console.log(`Tables: ${tables.length}`)
for (let ti = 0; ti < Math.min(tables.length, 6); ti++) {
  const rows = await tables[ti].locator('tr').all()
  console.log(`  Table[${ti}] (${rows.length} rows)`)
  for (let ri = 0; ri < Math.min(rows.length, 5); ri++) {
    const cells = await rows[ri].locator('td, th').allTextContents()
    const cleaned = cells.map(c => c.trim()).filter(Boolean)
    if (cleaned.length) console.log(`    [${ri}] ${cleaned.slice(0,10).join(' | ').slice(0,150)}`)
  }
}

// Check for forms (filter by month/church/etc)
const forms = await page.locator('form').all()
console.log(`\nForms: ${forms.length}`)
for (let fi = 0; fi < forms.length; fi++) {
  const action = await forms[fi].getAttribute('action')
  const method = await forms[fi].getAttribute('method')
  console.log(`  Form[${fi}] action=${action} method=${method}`)
  const inputs = await forms[fi].locator('input, select').all()
  for (const inp of inputs) {
    const name = await inp.getAttribute('name')
    const type = await inp.getAttribute('type')
    const value = await inp.getAttribute('value')
    if (name) console.log(`    input name=${name} type=${type} value=${value}`)
  }
}

// Try MCCD with church and month — using AGUA PRETA 312 Fev/2026
console.log('\n=== MCCD igreja=312 mes=2/2026 ===')
const mccdUrl = BASE + 'index.php?action=relatorio&option=financeiro&sub=mccd&igreja=312&mes=2/2026'
await page.goto(mccdUrl, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
console.log('URL:', page.url())
html = await page.content()
writeFileSync('scripts/backup/debug/MCCD_igreja312.html', html)
console.log(`HTML saved (${html.length} bytes)`)

tables = await page.locator('table').all()
console.log(`Tables: ${tables.length}`)
for (let ti = 0; ti < Math.min(tables.length, 6); ti++) {
  const rows = await tables[ti].locator('tr').all()
  console.log(`  Table[${ti}] (${rows.length} rows)`)
  const sample = []
  for (let ri = 0; ri < Math.min(rows.length, 4); ri++) sample.push(ri)
  if (rows.length > 8) {
    sample.push(-1)
    for (let ri = rows.length - 3; ri < rows.length; ri++) sample.push(ri)
  }
  for (const ri of sample) {
    if (ri === -1) { console.log('    ...'); continue }
    const cells = await rows[ri].locator('td, th').allTextContents()
    const cleaned = cells.map(c => c.trim()).filter(Boolean)
    if (cleaned.length) console.log(`    [${ri}] ${cleaned.slice(0,12).join(' | ').slice(0,180)}`)
  }
}

await browser.close()
console.log('\nDone')

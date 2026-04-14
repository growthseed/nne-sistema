import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'

if (!existsSync('scripts/screenshots')) mkdirSync('scripts/screenshots', { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)

  // Login
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  console.log('Logged in')

  // Switch to ARAM
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=5', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Go to financeiro page to get the month links
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // Find all links in the table (month links)
  const allLinks = await page.locator('table a').all()
  console.log(`Found ${allLinks.length} table links`)

  // Collect unique hrefs for month detail pages
  const monthHrefs = []
  for (const link of allLinks) {
    const href = await link.getAttribute('href')
    const text = (await link.textContent())?.trim()
    if (href && href.includes('sub=listar') && href.includes('igreja=') && href.includes('mes=')) {
      monthHrefs.push({ href, text })
    }
  }
  console.log(`Found ${monthHrefs.length} month detail links`)
  // Show a few
  for (const m of monthHrefs.slice(0, 10)) {
    console.log(`  "${m.text}" → ${m.href}`)
  }

  // Click on the FIRST month link to see the detail page structure
  if (monthHrefs.length > 0) {
    const target = monthHrefs[0]
    console.log(`\n=== NAVIGATING TO: ${target.href} ===`)
    await page.goto(BASE + target.href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'scripts/screenshots/fin-detail-page.png', fullPage: true })

    // Get page title and URL
    console.log('URL:', page.url())

    // Get all tables
    const tables = await page.locator('table').all()
    console.log(`\nTables on detail page: ${tables.length}`)
    for (let t = 0; t < tables.length; t++) {
      const rows = await tables[t].locator('tr').all()
      console.log(`\n  === Table ${t} (${rows.length} rows) ===`)
      for (let r = 0; r < rows.length; r++) {
        const cells = await rows[r].locator('td, th').allTextContents()
        const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
        if (line) console.log(`    [${r}] ${line}`)
      }
    }

    // Get all inputs/selects (form fields)
    const inputs = await page.locator('input').all()
    console.log(`\nInputs: ${inputs.length}`)
    for (const inp of inputs) {
      const name = await inp.getAttribute('name')
      const type = await inp.getAttribute('type')
      const value = await inp.inputValue().catch(() => '')
      if (name) console.log(`  ${type} "${name}" = "${value}"`)
    }

    const selects = await page.locator('select').all()
    console.log(`\nSelects: ${selects.length}`)
    for (const sel of selects) {
      const name = await sel.getAttribute('name')
      const opts = await sel.locator('option').allTextContents()
      console.log(`  "${name}": ${opts.join(' | ')}`)
    }

    // Check the full HTML of main content area for structure
    const bodyHTML = await page.locator('body').innerHTML()
    // Look for financial-specific keywords
    const keywords = ['dizimo', 'dízimo', 'oferta', 'caixa', 'total', 'valor', 'recibo', 'envelope']
    for (const kw of keywords) {
      const idx = bodyHTML.toLowerCase().indexOf(kw)
      if (idx >= 0) {
        console.log(`\nKeyword "${kw}" found at index ${idx}:`)
        console.log(`  ...${bodyHTML.slice(Math.max(0, idx - 50), idx + 100)}...`)
      }
    }
  }

  // Also try a different month that might have data (e.g., Jan 2026 for Boa Vista)
  console.log('\n\n=== TRYING BOA VISTA JAN 2026 ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro&sub=listar&igreja=205&mes=1/2026', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'scripts/screenshots/fin-boa-vista-jan2026.png', fullPage: true })

  const tables2 = await page.locator('table').all()
  console.log(`Tables: ${tables2.length}`)
  for (let t = 0; t < tables2.length; t++) {
    const rows = await tables2[t].locator('tr').all()
    console.log(`\n  === Table ${t} (${rows.length} rows) ===`)
    for (let r = 0; r < rows.length; r++) {
      const cells = await rows[r].locator('td, th').allTextContents()
      const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
      if (line) console.log(`    [${r}] ${line}`)
    }
  }

  // Try MANAUS CENTRAL Dec 2025
  console.log('\n\n=== TRYING MANAUS CENTRAL DEC 2025 ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro&sub=listar&igreja=203&mes=12/2025', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'scripts/screenshots/fin-manaus-dec2025.png', fullPage: true })

  const tables3 = await page.locator('table').all()
  console.log(`Tables: ${tables3.length}`)
  for (let t = 0; t < tables3.length; t++) {
    const rows = await tables3[t].locator('tr').all()
    console.log(`\n  === Table ${t} (${rows.length} rows) ===`)
    for (let r = 0; r < rows.length; r++) {
      const cells = await rows[r].locator('td, th').allTextContents()
      const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
      if (line) console.log(`    [${r}] ${line}`)
    }
  }

  // Try the Consolidado page via direct URL
  console.log('\n\n=== CONSOLIDADO VIA URL ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro&sub=consolidado', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'scripts/screenshots/fin-consolidado-direct.png', fullPage: true })
  console.log('URL:', page.url())

  const tables4 = await page.locator('table').all()
  console.log(`Tables: ${tables4.length}`)
  for (let t = 0; t < tables4.length; t++) {
    const rows = await tables4[t].locator('tr').all()
    console.log(`\n  === Table ${t} (${rows.length} rows) ===`)
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const cells = await rows[r].locator('td, th').allTextContents()
      const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
      if (line) console.log(`    [${r}] ${line}`)
    }
  }

  // Try Associação tab
  console.log('\n\n=== ASSOCIAÇÃO VIA URL ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro&sub=associacao', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'scripts/screenshots/fin-associacao-direct.png', fullPage: true })
  console.log('URL:', page.url())

  const tables5 = await page.locator('table').all()
  console.log(`Tables: ${tables5.length}`)
  for (let t = 0; t < tables5.length; t++) {
    const rows = await tables5[t].locator('tr').all()
    console.log(`\n  === Table ${t} (${rows.length} rows) ===`)
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const cells = await rows[r].locator('td, th').allTextContents()
      const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
      if (line) console.log(`    [${r}] ${line}`)
    }
  }

  // Try Detalhado tab
  console.log('\n\n=== DETALHADO VIA URL ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro&sub=detalhado', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: 'scripts/screenshots/fin-detalhado-direct.png', fullPage: true })
  console.log('URL:', page.url())

  const selDet = await page.locator('select').all()
  for (const sel of selDet) {
    const name = await sel.getAttribute('name')
    const opts = await sel.locator('option').allTextContents()
    console.log(`  Select "${name}": ${opts.slice(0, 15).join(' | ')}`)
  }

  const tables6 = await page.locator('table').all()
  console.log(`Tables: ${tables6.length}`)
  for (let t = 0; t < tables6.length; t++) {
    const rows = await tables6[t].locator('tr').all()
    console.log(`\n  === Table ${t} (${rows.length} rows) ===`)
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
      const cells = await rows[r].locator('td, th').allTextContents()
      const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
      if (line) console.log(`    [${r}] ${line}`)
    }
  }

  await browser.close()
  console.log('\nDone!')
}

main().catch(console.error)

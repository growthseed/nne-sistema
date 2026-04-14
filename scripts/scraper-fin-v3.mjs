import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = 'scripts/backup'
const DELAY = 800

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

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

  // Switch to ARAM first
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=5', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Go to financeiro page
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  // 1. Explore: click on a month link (e.g., month 1 of 2026 for ALTO ALEGRE)
  console.log('\n=== Clicking month 1/2026 for ALTO ALEGRE ===')
  const monthLinks = await page.locator('table a').all()
  console.log(`Found ${monthLinks.length} links in table`)

  // Find the first green/active link
  let firstLink = null
  for (const link of monthLinks) {
    const href = await link.getAttribute('href')
    const text = (await link.textContent())?.trim()
    if (href && text && /^\d+$/.test(text)) {
      console.log(`  Found month link: "${text}" → ${href}`)
      if (!firstLink) firstLink = { href, text }
    }
  }

  if (firstLink) {
    console.log(`\nNavigating to: ${firstLink.href}`)
    await page.goto(BASE + firstLink.href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(DELAY)
    await page.screenshot({ path: 'scripts/screenshots/fin-month-detail.png', fullPage: true })

    // Get all form fields / data
    const tables = await page.locator('table').all()
    console.log(`Tables on detail page: ${tables.length}`)
    for (let t = 0; t < tables.length; t++) {
      const rows = await tables[t].locator('tr').all()
      console.log(`\n  Table ${t} (${rows.length} rows):`)
      for (let r = 0; r < Math.min(rows.length, 30); r++) {
        const cells = await rows[r].locator('td, th').allTextContents()
        const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
        if (line) console.log(`    ${line}`)
      }
    }
  }

  // 2. Try Consolidado tab
  console.log('\n\n=== CONSOLIDADO ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  const consolLink = page.locator('a:has-text("Consolidado")').first()
  if (await consolLink.count() > 0) {
    await consolLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(DELAY)
    await page.screenshot({ path: 'scripts/screenshots/fin-consolidado.png', fullPage: true })
    console.log('URL:', page.url())

    const selects = await page.locator('select').all()
    for (const sel of selects) {
      const name = await sel.getAttribute('name')
      const opts = await sel.locator('option').allTextContents()
      console.log(`  Select "${name}": ${opts.join(' | ')}`)
    }

    const tables = await page.locator('table').all()
    for (let t = 0; t < tables.length; t++) {
      const rows = await tables[t].locator('tr').all()
      console.log(`\n  Table ${t} (${rows.length} rows):`)
      for (let r = 0; r < Math.min(rows.length, 20); r++) {
        const cells = await rows[r].locator('td, th').allTextContents()
        const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
        if (line) console.log(`    ${line}`)
      }
    }
  }

  // 3. Try Associação tab
  console.log('\n\n=== ASSOCIAÇÃO ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)
  const assocLink = page.locator('a:has-text("Associação")').first()
  if (await assocLink.count() > 0) {
    await assocLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(DELAY)
    await page.screenshot({ path: 'scripts/screenshots/fin-associacao.png', fullPage: true })
    console.log('URL:', page.url())

    const tables = await page.locator('table').all()
    for (let t = 0; t < tables.length; t++) {
      const rows = await tables[t].locator('tr').all()
      console.log(`\n  Table ${t} (${rows.length} rows):`)
      for (let r = 0; r < Math.min(rows.length, 25); r++) {
        const cells = await rows[r].locator('td, th').allTextContents()
        const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
        if (line) console.log(`    ${line}`)
      }
    }
  }

  // 4. Try Detalhado tab
  console.log('\n\n=== DETALHADO ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)
  const detLink = page.locator('a:has-text("Detalhado")').first()
  if (await detLink.count() > 0) {
    await detLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(DELAY)
    await page.screenshot({ path: 'scripts/screenshots/fin-detalhado.png', fullPage: true })
    console.log('URL:', page.url())

    const selects = await page.locator('select').all()
    for (const sel of selects) {
      const name = await sel.getAttribute('name')
      const opts = await sel.locator('option').allTextContents()
      console.log(`  Select "${name}": ${opts.slice(0, 10).join(' | ')}`)
    }

    const tables = await page.locator('table').all()
    for (let t = 0; t < tables.length; t++) {
      const rows = await tables[t].locator('tr').all()
      console.log(`\n  Table ${t} (${rows.length} rows):`)
      for (let r = 0; r < Math.min(rows.length, 20); r++) {
        const cells = await rows[r].locator('td, th').allTextContents()
        const line = cells.map(c => c.trim()).filter(Boolean).join(' | ')
        if (line) console.log(`    ${line}`)
      }
    }
  }

  await browser.close()
  console.log('\nDone!')
}

main().catch(console.error)

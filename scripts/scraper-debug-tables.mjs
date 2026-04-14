import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)

  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', '02099493766')
  await page.fill('input[name="senha"]', 'estrela')
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  console.log('Logged in, URL:', page.url())

  // Switch to ARAM
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=5', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // MANAUS CENTRAL (203)
  console.log('\n=== Church 203 (MANAUS CENTRAL) ===')
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja&sub=visualizar&igreja=203', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  console.log('URL:', page.url())

  await page.screenshot({ path: 'scripts/screenshots/church-203-debug.png', fullPage: true })

  const bodyText = await page.locator('body').textContent()
  console.log('Body text (first 500):', bodyText?.slice(0, 500))

  const tables = await page.locator('table').all()
  console.log(`Tables: ${tables.length}`)
  for (let t = 0; t < tables.length; t++) {
    const rows = await tables[t].locator('tr').all()
    console.log(`\n  Table ${t} (${rows.length} rows):`)
    for (let r = 0; r < Math.min(rows.length, 8); r++) {
      const cells = await rows[r].locator('td, th').allTextContents()
      console.log(`    [${r}] ${cells.map(c => c.trim().slice(0, 60)).filter(Boolean).join(' | ')}`)
    }
    if (rows.length > 8) console.log(`    ... (${rows.length - 8} more)`)
  }

  // Also check all links on the page
  const links = await page.locator('a[href*="membro"], a[href*="interessado"]').all()
  console.log(`\nMember/interessado links: ${links.length}`)
  for (const link of links.slice(0, 10)) {
    const href = await link.getAttribute('href')
    const text = (await link.textContent())?.trim()
    console.log(`  "${text}" → ${href}`)
  }

  await browser.close()
}
main().catch(console.error)

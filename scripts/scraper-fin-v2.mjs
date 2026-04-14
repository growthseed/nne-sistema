import { chromium } from 'playwright'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'

async function main() {
  const browser = await chromium.launch({ headless: false }) // visible to debug
  const page = await browser.newPage()

  // Login through the main page form (not direct URL)
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  console.log('Logged in:', page.url())

  // Check cookies
  const cookies = await page.context().cookies()
  console.log('Cookies:', cookies.map(c => `${c.name}=${c.value?.slice(0, 20)}...`).join(', '))

  // Switch to ARAM
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=5', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  console.log('Switched to ARAM:', page.url())

  // Try financial report - navigate from menu
  console.log('\n=== Navigating to Relatorio > Financeiro via menu ===')

  // Click the Relatórios menu first
  const relatorioMenu = page.locator('a:has-text("Relatórios")').first()
  if (await relatorioMenu.count() > 0) {
    await relatorioMenu.hover()
    await page.waitForTimeout(500)
  }

  const finLink = page.locator('a:has-text("Financeiro")').first()
  if (await finLink.count() > 0) {
    await finLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    console.log('Financial page URL:', page.url())
    console.log('Title:', await page.title())
    await page.screenshot({ path: 'scripts/screenshots/fin-menu-click.png', fullPage: true })

    const text = await page.locator('body').textContent()
    console.log('Body preview:', text?.slice(0, 500))
  }

  // Try clicking Relatórios > Visualizar
  console.log('\n=== Relatório > Visualizar ===')
  await page.goto(BASE + 'index.php?action=pendencia&option=index', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Click menu
  const vizLink = page.locator('a[href*="relatorio"][href*="visualizar"]').first()
  if (await vizLink.count() > 0) {
    await vizLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    console.log('Visualizar URL:', page.url())
    await page.screenshot({ path: 'scripts/screenshots/relatorio-visualizar.png', fullPage: true })

    const text = await page.locator('body').textContent()
    console.log('Body preview:', text?.slice(0, 500))

    // Check selects/forms
    const selects = await page.locator('select').all()
    for (const sel of selects) {
      const name = await sel.getAttribute('name')
      const opts = await sel.locator('option').allTextContents()
      console.log(`  Select "${name}": ${opts.slice(0, 10).join(' | ')}`)
    }

    const tables = await page.locator('table').all()
    console.log(`  Tables: ${tables.length}`)
    for (let t = 0; t < Math.min(tables.length, 3); t++) {
      const rows = await tables[t].locator('tr').all()
      console.log(`  Table ${t}: ${rows.length} rows`)
      for (let r = 0; r < Math.min(rows.length, 3); r++) {
        const cells = await rows[r].locator('td, th').allTextContents()
        console.log(`    Row ${r}: ${cells.map(c => c.trim()).filter(Boolean).slice(0, 8).join(' | ')}`)
      }
    }
  }

  // Try Relatório > Inserir
  console.log('\n=== Relatório > Inserir ===')
  await page.goto(BASE + 'index.php?action=pendencia&option=index', { waitUntil: 'networkidle' })
  const insLink = page.locator('a[href*="relatorio"][href*="inserir"]').first()
  if (await insLink.count() > 0) {
    await insLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    console.log('Inserir URL:', page.url())
    await page.screenshot({ path: 'scripts/screenshots/relatorio-inserir.png', fullPage: true })

    const text = await page.locator('body').textContent()
    console.log('Body preview:', text?.slice(0, 500))

    const selects = await page.locator('select').all()
    for (const sel of selects) {
      const name = await sel.getAttribute('name')
      const opts = await sel.locator('option').allTextContents()
      console.log(`  Select "${name}": ${opts.slice(0, 10).join(' | ')}`)
    }
  }

  // Try the Demonstrativos link (goes to secretariaMissionario)
  console.log('\n=== Demonstrativos Financeiros ===')
  await page.goto(BASE + 'index.php?action=pendencia&option=index', { waitUntil: 'networkidle' })
  const demoLink = page.locator('a:has-text("Demonstrativos Financeiros")').first()
  if (await demoLink.count() > 0) {
    const href = await demoLink.getAttribute('href')
    console.log('Demo link:', href)
    await page.goto(href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    console.log('Demo URL:', page.url())
    console.log('Demo title:', await page.title())
    await page.screenshot({ path: 'scripts/screenshots/demonstrativos-v2.png', fullPage: true })

    const text = await page.locator('body').textContent()
    console.log('Body preview:', text?.slice(0, 800))

    // Check for iframes
    const iframes = await page.locator('iframe').all()
    console.log(`Iframes: ${iframes.length}`)

    // All links
    const links = await page.locator('a').all()
    for (const link of links) {
      const lHref = await link.getAttribute('href')
      const lText = (await link.textContent())?.trim()
      if (lHref && lText && lText.length > 2 && lText.length < 60) {
        console.log(`  "${lText}" → ${lHref?.slice(0, 100)}`)
      }
    }
  }

  // Keep open for inspection
  console.log('\nBrowser open for 20 seconds...')
  await page.waitForTimeout(20000)
  await browser.close()
}

main().catch(console.error)

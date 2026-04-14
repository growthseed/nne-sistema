import { chromium } from 'playwright'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

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

  // 1. Explore FINANCIAL REPORT page
  console.log('\n=== RELATÓRIO FINANCEIRO ===')
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/screenshots/financeiro-page.png', fullPage: true })

  const bodyText = await page.locator('body').textContent()
  console.log('Page text:', bodyText?.slice(0, 1000))

  // Check all links
  const links = await page.locator('a').all()
  console.log('\nLinks on financeiro page:')
  for (const link of links) {
    const href = await link.getAttribute('href')
    const text = (await link.textContent())?.trim()
    if (href && text && (href.includes('financeiro') || href.includes('relatorio') || href.includes('caixa'))) {
      console.log(`  "${text}" → ${href}`)
    }
  }

  // Check forms/selects
  const selects = await page.locator('select').all()
  console.log(`\nSelects: ${selects.length}`)
  for (const sel of selects) {
    const name = await sel.getAttribute('name')
    const opts = await sel.locator('option').allTextContents()
    console.log(`  "${name}": ${opts.slice(0, 10).join(' | ')}`)
  }

  const inputs = await page.locator('input').all()
  console.log(`\nInputs: ${inputs.length}`)
  for (const inp of inputs) {
    const name = await inp.getAttribute('name')
    const type = await inp.getAttribute('type')
    const value = await inp.inputValue().catch(() => '')
    if (name) console.log(`  ${type} "${name}" = "${value}"`)
  }

  // 2. Try different financial URLs
  const finUrls = [
    'index.php?action=relatorio&option=financeiro&sub=dizimos',
    'index.php?action=relatorio&option=financeiro&sub=ofertas',
    'index.php?action=relatorio&option=financeiro&sub=caixa',
    'index.php?action=relatorio&option=financeiro&sub=visualizar',
    'index.php?action=relatorio&option=financeiro&sub=geral',
    'index.php?action=relatorio&option=inserir',
    'index.php?action=relatorio&option=visualizar',
  ]

  for (const url of finUrls) {
    console.log(`\n--- ${url} ---`)
    await page.goto(BASE + url, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const title = await page.title()
    const text = await page.locator('body').textContent()
    console.log(`  Title: ${title}`)
    console.log(`  Preview: ${text?.slice(0, 300)}`)

    // Check tables
    const tables = await page.locator('table').all()
    if (tables.length > 0) {
      for (let t = 0; t < Math.min(tables.length, 2); t++) {
        const rows = await tables[t].locator('tr').all()
        console.log(`  Table ${t}: ${rows.length} rows`)
        if (rows.length > 0) {
          const firstRow = await rows[0].locator('th, td').allTextContents()
          console.log(`    Headers: ${firstRow.map(h => h.trim()).filter(Boolean).slice(0, 10).join(' | ')}`)
        }
        if (rows.length > 1) {
          const secondRow = await rows[1].locator('td').allTextContents()
          console.log(`    Row 1: ${secondRow.map(h => h.trim()).filter(Boolean).slice(0, 10).join(' | ')}`)
        }
      }
    }

    // Check selects
    const sels = await page.locator('select').all()
    for (const sel of sels) {
      const name = await sel.getAttribute('name')
      const opts = await sel.locator('option').allTextContents()
      console.log(`  Select "${name}": ${opts.slice(0, 8).join(' | ')}`)
    }
  }

  // 3. Explore the external financial system
  console.log('\n=== DEMONSTRATIVOS FINANCEIROS (external) ===')
  // This links to secretariaMissionario with a token
  const demoLink = await page.locator('a:has-text("Demonstrativos Financeiros")').first()
  if (await demoLink.count() > 0) {
    const href = await demoLink.getAttribute('href')
    console.log(`Demo link: ${href}`)
    await page.goto(href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'scripts/screenshots/demonstrativos.png', fullPage: true })
    const demoText = await page.locator('body').textContent()
    console.log(`Preview: ${demoText?.slice(0, 500)}`)

    const demoLinks = await page.locator('a').all()
    for (const dl of demoLinks) {
      const dHref = await dl.getAttribute('href')
      const dText = (await dl.textContent())?.trim()
      if (dHref && dText && dText.length > 2 && dText.length < 60) {
        console.log(`  "${dText}" → ${dHref}`)
      }
    }
  }

  await browser.close()
  console.log('\nDone!')
}

main().catch(console.error)

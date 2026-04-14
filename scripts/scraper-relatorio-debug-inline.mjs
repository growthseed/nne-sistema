import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const SSDIR = join(__dirname, 'screenshots')
if (!existsSync(SSDIR)) mkdirSync(SSDIR, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)

  // Login
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]').catch(() => {})
  ])
  // Fill and submit
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', '02099493766')
  await page.fill('input[name="senha"]', 'estrela')
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(3000)
  console.log('After login URL:', page.url())

  // Don't go to index.php directly - go to the specific action
  // Switch to AMAPI
  console.log('Switching to AMAPI...')
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=19', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  console.log('URL:', page.url())

  // Check if still logged in
  const isLogin = page.url().includes('/new/')
  if (isLogin) {
    console.log('Session expired, re-logging in')
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
    await page.fill('input[name="login"]', '02099493766')
    await page.fill('input[name="senha"]', 'estrela')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    console.log('Re-login URL:', page.url())

    // Now try switch again
    await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=19', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    console.log('URL after re-switch:', page.url())
  }

  // Go to missionary report list for 2024
  console.log('Going to missionary list...')
  await page.goto(BASE + 'index.php?action=relatorio&option=missionario&ano=2024', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  console.log('URL:', page.url())
  await page.screenshot({ path: join(SSDIR, 'miss_list_v2.png'), fullPage: true })

  if (page.url().includes('/new/')) {
    console.log('Still being redirected to login. Aborting.')
    await browser.close()
    return
  }

  // Save HTML
  writeFileSync(join(SSDIR, 'miss_list_v2.html'), await page.content())

  // Get all links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).slice(0, 100).map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent.trim().substring(0, 50)
    }))
  })
  console.log(`Found ${links.length} links`)
  const missLinks = links.filter(l => l.href && l.href.includes('miss'))
  console.log(`Miss links: ${missLinks.length}`)
  for (const l of missLinks.slice(0, 10)) {
    console.log(`  "${l.text}" → ${l.href}`)
  }

  // Get tables
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map((t, i) => ({
      idx: i, rows: t.querySelectorAll('tr').length
    }))
  })
  console.log('Tables:', JSON.stringify(tables))

  if (missLinks.length === 0) {
    // Dump body text
    const bt = await page.evaluate(() => document.body.innerText.substring(0, 2000))
    console.log('Body text:\n', bt)
  }

  // If we have miss links, proceed to view a report
  if (missLinks.length > 0) {
    const firstLink = missLinks[0]
    const missMatch = firstLink.href.match(/miss=(\d+)/)
    const mesMatch = firstLink.href.match(/mes=(\d+)/)
    const missId = missMatch[1]
    const mes = mesMatch ? mesMatch[1] : '1'

    // Switch missionary
    await page.goto(BASE + `index.php?action=relatorio&option=missionario&sub=trocar&miss=${missId}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Pagina 1
    const url1 = BASE + `visualizar_relatorio_missionario.php?mes=${mes}&ano=2024&miss=${missId}&pagina1`
    console.log('\n\nLoading pagina1:', url1)
    await page.goto(url1, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
    console.log('URL:', page.url())

    writeFileSync(join(SSDIR, 'pagina1_v2.html'), await page.content())
    await page.screenshot({ path: join(SSDIR, 'pagina1_v2.png'), fullPage: true })

    const p1Analysis = await page.evaluate(() => {
      const result = []
      const tables = document.querySelectorAll('table')
      for (let t = 0; t < tables.length; t++) {
        const table = tables[t]
        const rows = table.querySelectorAll('tr')
        const tbl = { idx: t, rowCount: rows.length, rows: [] }
        for (let r = 0; r < Math.min(rows.length, 40); r++) {
          const cells = rows[r].querySelectorAll('td, th')
          tbl.rows.push(Array.from(cells).map(c => c.textContent.trim().substring(0, 25)))
        }
        result.push(tbl)
      }
      return result
    })

    for (const t of p1Analysis) {
      console.log(`\n=== P1 Table ${t.idx} (${t.rowCount} rows) ===`)
      for (let r = 0; r < t.rows.length; r++) {
        console.log(`  R${r}: ${t.rows[r].join(' | ')}`)
      }
    }

    // Pagina 2
    const url2 = BASE + `visualizar_relatorio_missionario.php?mes=${mes}&ano=2024&miss=${missId}&pagina2`
    console.log('\n\nLoading pagina2:', url2)
    await page.goto(url2, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    writeFileSync(join(SSDIR, 'pagina2_v2.html'), await page.content())
    await page.screenshot({ path: join(SSDIR, 'pagina2_v2.png'), fullPage: true })

    const p2Analysis = await page.evaluate(() => {
      const result = []
      const tables = document.querySelectorAll('table')
      for (let t = 0; t < tables.length; t++) {
        const table = tables[t]
        const rows = table.querySelectorAll('tr')
        const tbl = { idx: t, rowCount: rows.length, rows: [] }
        for (let r = 0; r < Math.min(rows.length, 40); r++) {
          const cells = rows[r].querySelectorAll('td, th')
          tbl.rows.push(Array.from(cells).map(c => c.textContent.trim().substring(0, 25)))
        }
        result.push(tbl)
      }
      return result
    })

    for (const t of p2Analysis) {
      console.log(`\n=== P2 Table ${t.idx} (${t.rowCount} rows) ===`)
      for (let r = 0; r < t.rows.length; r++) {
        console.log(`  R${r}: ${t.rows[r].join(' | ')}`)
      }
    }
  }

  await browser.close()
  console.log('\nDone!')
}

main().catch(console.error)

import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'

async function main() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)

  // Login
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', '02099493766')
  await page.fill('input[name="senha"]', 'estrela')
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)

  // Switch to AMAPI
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=19', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Switch to known missionary (ABRAÃO OLIVEIRA DOS REIS)
  // Use miss ID from our data
  const missId = 5699 // from our scraped data
  await page.goto(BASE + `index.php?action=relatorio&option=missionario&sub=trocar&miss=${missId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // View pagina1
  const url1 = BASE + `visualizar_relatorio_missionario.php?mes=1&ano=2024&miss=${missId}&pagina1`
  console.log('\n=== PAGINA 1 ===')
  await page.goto(url1, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // Save full HTML
  const html1 = await page.content()
  writeFileSync('scripts/screenshots/pagina1.html', html1)

  // Dump all tables in detail
  const p1Info = await page.evaluate(() => {
    const result = []
    const tables = document.querySelectorAll('table')
    for (let t = 0; t < tables.length; t++) {
      const rows = tables[t].querySelectorAll('tr')
      const tbl = { idx: t, rowCount: rows.length, firstRows: [] }
      for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const cells = rows[r].querySelectorAll('td, th')
        tbl.firstRows.push(Array.from(cells).map(c => c.textContent.trim().substring(0, 40)))
      }
      // Also get last rows (totals)
      tbl.lastRows = []
      for (let r = Math.max(0, rows.length - 3); r < rows.length; r++) {
        const cells = rows[r].querySelectorAll('td, th')
        tbl.lastRows.push(Array.from(cells).map(c => c.textContent.trim().substring(0, 40)))
      }
      result.push(tbl)
    }
    return result
  })

  for (const t of p1Info) {
    console.log(`\nTable ${t.idx} (${t.rowCount} rows):`)
    console.log('  First rows:')
    for (const r of t.firstRows) console.log('    ', r.join(' | '))
    console.log('  Last rows:')
    for (const r of t.lastRows) console.log('    ', r.join(' | '))
  }

  await page.screenshot({ path: 'scripts/screenshots/debug_pagina1.png', fullPage: true })

  // Now pagina2
  const url2 = BASE + `visualizar_relatorio_missionario.php?mes=1&ano=2024&miss=${missId}&pagina2`
  console.log('\n\n=== PAGINA 2 ===')
  await page.goto(url2, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  const html2 = await page.content()
  writeFileSync('scripts/screenshots/pagina2.html', html2)

  const p2Info = await page.evaluate(() => {
    const result = []
    const tables = document.querySelectorAll('table')
    for (let t = 0; t < tables.length; t++) {
      const rows = tables[t].querySelectorAll('tr')
      const tbl = { idx: t, rowCount: rows.length, firstRows: [] }
      for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const cells = rows[r].querySelectorAll('td, th')
        tbl.firstRows.push(Array.from(cells).map(c => c.textContent.trim().substring(0, 40)))
      }
      tbl.lastRows = []
      for (let r = Math.max(0, rows.length - 3); r < rows.length; r++) {
        const cells = rows[r].querySelectorAll('td, th')
        tbl.lastRows.push(Array.from(cells).map(c => c.textContent.trim().substring(0, 40)))
      }
      result.push(tbl)
    }
    return result
  })

  for (const t of p2Info) {
    console.log(`\nTable ${t.idx} (${t.rowCount} rows):`)
    console.log('  First rows:')
    for (const r of t.firstRows) console.log('    ', r.join(' | '))
    console.log('  Last rows:')
    for (const r of t.lastRows) console.log('    ', r.join(' | '))
  }

  await page.screenshot({ path: 'scripts/screenshots/debug_pagina2.png', fullPage: true })

  await browser.close()
}

main().catch(console.error)

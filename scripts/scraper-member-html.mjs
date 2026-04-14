import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)

  // Login
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', '02099493766')
  await page.fill('input[name="senha"]', 'estrela')
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  console.log('Logged in:', page.url())

  // Switch to ARAM
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=5', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // First go to church to confirm session, then navigate to member
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja&sub=visualizar&igreja=206', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  console.log('Church page:', page.url())

  // Now click on a member link from the church page
  const memberLink = page.locator('a[href*="option=membro&sub=visualizar"]').first()
  if (await memberLink.count() > 0) {
    const href = await memberLink.getAttribute('href')
    console.log('Navigating to member:', href)
    await page.goto(BASE + href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    console.log('Member page:', page.url())
    await page.screenshot({ path: 'scripts/screenshots/member-detail-real.png', fullPage: true })

    // Save raw HTML
    const html = await page.content()
    writeFileSync('scripts/screenshots/member-detail-real.html', html)

    // Extract table structure
    const result = await page.evaluate(() => {
      const tables = document.querySelectorAll('table')
      const out = []
      tables.forEach((table, t) => {
        const rows = table.querySelectorAll('tr')
        const tdata = []
        rows.forEach((row, r) => {
          const cells = row.querySelectorAll('td, th')
          const rdata = []
          cells.forEach(cell => {
            let direct = ''
            cell.childNodes.forEach(n => { if (n.nodeType === 3) direct += n.textContent })
            rdata.push({
              cls: cell.className,
              direct: direct.trim().slice(0, 100),
              full: cell.textContent.trim().slice(0, 100),
              hasInput: !!cell.querySelector('input, select, textarea'),
              inputName: cell.querySelector('[name]')?.getAttribute('name') || '',
              inputValue: cell.querySelector('input')?.value || cell.querySelector('select')?.selectedOptions?.[0]?.textContent?.trim() || ''
            })
          })
          tdata.push(rdata)
        })
        out.push(tdata)
      })
      return out
    })

    console.log(`\nTables found: ${result.length}`)
    for (let t = 0; t < result.length; t++) {
      console.log(`\n=== Table ${t} (${result[t].length} rows) ===`)
      for (let r = 0; r < Math.min(result[t].length, 30); r++) {
        const row = result[t][r]
        const cols = row.map(c => {
          if (c.hasInput) return `[INPUT:${c.inputName}=${c.inputValue.slice(0, 30)}]`
          if (c.direct) return `"${c.direct}"`
          if (c.full) return `(${c.full})`
          return '(empty)'
        })
        console.log(`  R${r}: ${cols.join(' | ')}`)
      }
    }

    // Also extract form fields explicitly
    console.log('\n=== FORM FIELDS ===')
    const fields = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[name], select[name], textarea[name]')
      return Array.from(inputs).map(el => ({
        tag: el.tagName,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        value: el.tagName === 'SELECT' ? el.selectedOptions?.[0]?.textContent?.trim() : el.value
      })).filter(f => f.value && f.name)
    })
    for (const f of fields) {
      console.log(`  ${f.tag} name="${f.name}" type="${f.type || ''}" value="${f.value?.slice(0, 60)}"`)
    }
  } else {
    console.log('No member links found on church page')
    await page.screenshot({ path: 'scripts/screenshots/no-member-link.png', fullPage: true })
  }

  await browser.close()
}
main().catch(console.error)

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

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
  console.log('Logged in, URL:', page.url())

  // Switch to ARAM
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=5', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  console.log('Switched to ARAM, URL:', page.url())

  // Go to church BOA VISTA (206) detail page
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja&sub=visualizar&igreja=206', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  console.log('Church page URL:', page.url())
  await page.screenshot({ path: 'scripts/screenshots/church-206-detail.png', fullPage: true })

  // Find member links from the church page
  const html = await page.content()
  const memberRegex = /href="([^"]*option=membro[^"]*)">([^<]+)</g
  let match
  const memberUrls = []
  while ((match = memberRegex.exec(html)) !== null) {
    memberUrls.push({ href: match[1].replace(/&amp;/g, '&'), nome: match[2].trim() })
  }
  console.log(`Found ${memberUrls.length} member links on church page`)
  for (const m of memberUrls.slice(0, 5)) {
    console.log(`  "${m.nome}" → ${m.href}`)
  }

  if (memberUrls.length === 0) {
    // Try looking at all links
    const allLinks = await page.locator('a').all()
    console.log('\nAll links on church page:')
    for (const link of allLinks) {
      const href = await link.getAttribute('href')
      const text = (await link.textContent())?.trim()
      if (href && text && text.length > 2 && text.length < 80) {
        console.log(`  "${text}" → ${href.slice(0, 100)}`)
      }
    }

    // Check tables for member data
    const tables = await page.locator('table').all()
    console.log(`\nTables: ${tables.length}`)
    for (let t = 0; t < tables.length; t++) {
      const rows = await tables[t].locator('tr').all()
      console.log(`\n  Table ${t} (${rows.length} rows):`)
      for (let r = 0; r < Math.min(rows.length, 10); r++) {
        const cells = await rows[r].locator('td, th').allTextContents()
        const rowLinks = await rows[r].locator('a').all()
        const hrefs = []
        for (const rl of rowLinks) {
          hrefs.push(await rl.getAttribute('href'))
        }
        console.log(`    [${r}] ${cells.map(c => c.trim()).filter(Boolean).join(' | ')}`)
        if (hrefs.length > 0) console.log(`         hrefs: ${hrefs.join(', ')}`)
      }
    }
  }

  // Navigate to first member
  if (memberUrls.length > 0) {
    // Pick an active member first
    const target = memberUrls[1] || memberUrls[0] // skip first which may be search form
    console.log(`\n=== NAVIGATING TO MEMBER: ${target.nome} ===`)
    await page.goto(BASE + target.href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'scripts/screenshots/member-active-detail.png', fullPage: true })
    console.log('URL:', page.url())

    // Save raw HTML
    const mainHTML = await page.content()
    writeFileSync('scripts/screenshots/member-detail-html.txt', mainHTML)

    // Look for status text using evaluate to get the full page text structure
    const statusInfo = await page.evaluate(() => {
      const results = []
      // Find all text nodes
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false)
      let node
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim()
        if (text && (text.includes('Membro') || text.includes('Ativo') || text.includes('Inativo') || text.includes('Interessado'))) {
          const parent = node.parentElement
          results.push({
            text,
            tag: parent?.tagName,
            class: parent?.className,
            id: parent?.id,
            parentText: parent?.textContent?.trim()?.slice(0, 100)
          })
        }
      }
      return results
    })
    console.log('\nStatus-related text nodes:')
    for (const r of statusInfo) {
      console.log(`  [${r.tag}.${r.class}#${r.id}] "${r.text}" parent: "${r.parentText}"`)
    }

    // Get ALL td pairs with their structure
    console.log('\n=== ALL TD CONTENT ===')
    const tdData = await page.evaluate(() => {
      const tds = document.querySelectorAll('td')
      return Array.from(tds).map((td, i) => ({
        index: i,
        text: td.textContent?.trim()?.slice(0, 120),
        directText: Array.from(td.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(''),
        className: td.className,
        colspan: td.getAttribute('colspan'),
        bgColor: td.getAttribute('bgcolor') || td.style?.backgroundColor
      })).filter(t => t.text && t.text.length > 0)
    })
    for (const td of tdData) {
      console.log(`  TD[${td.index}] cls="${td.className}" bg="${td.bgColor}" direct="${td.directText?.slice(0, 50)}" full="${td.text?.slice(0, 100)}"`)
    }

    // Try to get h2/h3/title that might contain member type
    const titles = await page.evaluate(() => {
      const els = document.querySelectorAll('h1, h2, h3, h4, h5, b, strong, font[color], .titulo, .subtitulo')
      return Array.from(els).map(e => ({
        tag: e.tagName,
        text: e.textContent?.trim()?.slice(0, 100),
        color: e.getAttribute('color') || e.style?.color
      })).filter(t => t.text && t.text.length > 0 && t.text.length < 100)
    })
    console.log('\n=== HEADINGS/TITLES ===')
    for (const t of titles) {
      console.log(`  [${t.tag}] color="${t.color}" "${t.text}"`)
    }
  }

  await browser.close()
  console.log('\nDone!')
}

main().catch(console.error)

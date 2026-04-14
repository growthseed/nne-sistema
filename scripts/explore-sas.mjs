/**
 * Explore Portal SAS Educação for UX patterns
 */
import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const SCREENSHOTS_DIR = 'scripts/screenshots/sas'
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--start-maximized'],
  })

  const page = await browser.newPage()

  // 1. Login page
  console.log('1. Accessing login page...')
  await page.goto('https://app.portalsaseducacao.com.br/painel/', { waitUntil: 'networkidle2', timeout: 30000 })

  // 2. Fill login form
  console.log('2. Logging in...')
  await new Promise(r => setTimeout(r, 2000))

  const inputs = await page.$$('input:not([type="hidden"])')
  console.log('  Found', inputs.length, 'input fields')

  if (inputs.length >= 2) {
    await inputs[0].click({ clickCount: 3 })
    await inputs[0].type('valentina.peixoto@aluno.cerenascenca.com.br')
    await inputs[1].click({ clickCount: 3 })
    await inputs[1].type('Liana22565352@')
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-filled.png'), fullPage: true })

  // Find and click submit button
  const buttons = await page.$$('button')
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent?.trim(), btn)
    if (text && (text.includes('Entrar') || text.includes('Login') || text.includes('Acessar'))) {
      console.log('  Clicking button:', text)
      await btn.click()
      break
    }
  }

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null)
  await new Promise(r => setTimeout(r, 5000))
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-dashboard.png'), fullPage: true })
  console.log('  Screenshot: 03-dashboard.png')

  // 3. Get page info
  const title = await page.title()
  const url = page.url()
  console.log('  Title:', title)
  console.log('  URL:', url)

  // Extract navigation and structure
  const structure = await page.evaluate(() => {
    const result = { nav: [], headings: [], cards: [], bodyText: '' }

    // All links
    document.querySelectorAll('a').forEach(a => {
      const text = a.textContent?.trim()
      const href = a.getAttribute('href')
      if (text && text.length > 1 && text.length < 60) {
        result.nav.push({ text, href })
      }
    })

    // Headings
    document.querySelectorAll('h1, h2, h3').forEach(h => {
      const text = h.textContent?.trim()
      if (text) result.headings.push({ tag: h.tagName, text: text.slice(0, 80) })
    })

    // Buttons
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim()
      if (text && text.length > 1 && text.length < 40) {
        result.cards.push('BTN: ' + text)
      }
    })

    // Main body text (truncated)
    result.bodyText = document.body?.innerText?.slice(0, 2000) || ''

    return result
  })

  console.log('\n=== PAGE TEXT (first 2000 chars) ===')
  console.log(structure.bodyText)

  console.log('\n=== NAVIGATION LINKS ===')
  const uniqueLinks = new Map()
  for (const item of structure.nav) {
    if (!uniqueLinks.has(item.text)) uniqueLinks.set(item.text, item.href)
  }
  for (const [text, href] of uniqueLinks) {
    console.log('  ', text, '→', href)
  }

  console.log('\n=== HEADINGS ===')
  for (const h of structure.headings) {
    console.log('  ', h.tag, ':', h.text)
  }

  // 4. Navigate to key pages and screenshot
  const navLinks = [...uniqueLinks.entries()]
    .filter(([, href]) => href && href.startsWith('/') && !href.includes('logout'))
    .slice(0, 8)

  let idx = 4
  for (const [text, href] of navLinks) {
    try {
      console.log(`\n${idx}. → ${text} (${href})`)
      await page.goto(`https://app.portalsaseducacao.com.br${href}`, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null)
      await new Promise(r => setTimeout(r, 3000))

      const safeName = text.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 25)
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `0${idx}-${safeName}.png`), fullPage: true })
      console.log(`  Screenshot saved`)
      idx++
    } catch (err) {
      console.log('  Skip:', err.message)
    }
  }

  console.log('\n=== DONE ===')
  await browser.close()
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})

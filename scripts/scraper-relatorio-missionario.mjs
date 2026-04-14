/**
 * scraper-relatorio-missionario.mjs
 *
 * Explores the GS 4.1 system (sdarm.app/secretaria/gs/) to find and scrape
 * missionary daily reports (relatorio missionario / relatorio diario / relatorio obreiro).
 *
 * Phase 1: Explore navigation to discover where missionary reports live.
 * Phase 2: Once found, scrape data for each NNE association.
 *
 * Run: node scripts/scraper-relatorio-missionario.mjs
 */

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = 'scripts/backup'
const SCREENSHOT_DIR = 'scripts/screenshots'
const DELAY = 800

const ASSOCIATIONS = [
  { id: 19, sigla: 'AMAPI' },
  { id: 6, sigla: 'ANOB' },
  { id: 20, sigla: 'ASCE' },
  { id: 4, sigla: 'ASPAR' },
  { id: 34, sigla: 'CAMAP' },
]

// URL patterns to explore for missionary reports
const EXPLORE_URLS = [
  'index.php?action=relatorio',
  'index.php?action=relatorio&option=obreiro',
  'index.php?action=relatorio&option=diario',
  'index.php?action=relatorio&option=missionario',
  'index.php?action=relatorio&option=mensal',
  'index.php?action=relatorio&option=trimestral',
  'index.php?action=relatorio&option=geral',
  'index.php?action=obreiro',
  'index.php?action=obreiro&option=relatorio',
  'index.php?action=obreiro&option=diario',
  'index.php?action=atividade',
  'index.php?action=atividade&option=relatorio',
  'index.php?action=atividade&option=diario',
  'index.php?action=diario',
  'index.php?action=missionario',
]

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true })

async function login(page) {
  console.log('  Logging in...')
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 })
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1500)
  console.log('  Logged in. URL:', page.url())
}

async function switchAssociation(page, assocId) {
  const url = BASE + `index.php?action=cadastro&option=associacao&sub=trocar&associacao=${assocId}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(DELAY)
}

async function extractPageInfo(page) {
  const title = await page.title()
  const url = page.url()

  // Get all links, especially those related to reports
  const allLinks = await page.evaluate(() => {
    const links = []
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || ''
      const text = (a.textContent || '').trim().substring(0, 100)
      links.push({ href, text })
    })
    return links
  })

  // Filter for interesting links
  const reportKeywords = ['relatorio', 'obreiro', 'diario', 'missionario', 'atividade', 'mensal', 'trimestral', 'estatistic']
  const interestingLinks = allLinks.filter(l => {
    const combined = (l.href + ' ' + l.text).toLowerCase()
    return reportKeywords.some(kw => combined.includes(kw))
  })

  // Get form elements
  const forms = await page.evaluate(() => {
    const results = []
    document.querySelectorAll('form').forEach(form => {
      const action = form.getAttribute('action') || ''
      const method = form.getAttribute('method') || ''
      const inputs = []
      form.querySelectorAll('input, select, textarea').forEach(el => {
        inputs.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
          name: el.getAttribute('name') || '',
          id: el.getAttribute('id') || '',
          value: el.getAttribute('value') || '',
        })
      })
      results.push({ action, method, inputs })
    })
    return results
  })

  // Get navigation/menu items
  const navItems = await page.evaluate(() => {
    const items = []
    // Look for nav menus, sidebars, dropdowns
    const selectors = ['nav a', '.menu a', '.sidebar a', '.nav a', '#menu a', 'ul.nav a', '.dropdown-menu a', 'li a']
    const seen = new Set()
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(a => {
        const href = a.getAttribute('href') || ''
        if (!seen.has(href)) {
          seen.add(href)
          items.push({ href, text: (a.textContent || '').trim().substring(0, 80) })
        }
      })
    }
    return items
  })

  // Get page body text summary (first 2000 chars)
  const bodyText = await page.evaluate(() => {
    return (document.body?.innerText || '').substring(0, 2000)
  })

  // Get tables info
  const tables = await page.evaluate(() => {
    const results = []
    document.querySelectorAll('table').forEach(table => {
      const headers = []
      table.querySelectorAll('th').forEach(th => headers.push((th.textContent || '').trim()))
      const rowCount = table.querySelectorAll('tr').length
      results.push({ headers, rowCount })
    })
    return results
  })

  return {
    title,
    url,
    allLinksCount: allLinks.length,
    interestingLinks,
    forms,
    navItems: navItems.slice(0, 50),
    tables,
    bodyTextPreview: bodyText.substring(0, 500),
  }
}

async function main() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  const findings = {}
  let screenshotIdx = 0

  try {
    // Step 1: Login
    await login(page)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/rel-00-after-login.png`, fullPage: true })

    // Step 2: Go to GS base and explore the main nav
    console.log('\n=== PHASE 1: Explore GS main navigation ===')
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(DELAY)

    const mainInfo = await extractPageInfo(page)
    findings['gs-main'] = mainInfo
    await page.screenshot({ path: `${SCREENSHOT_DIR}/rel-01-gs-main.png`, fullPage: true })
    console.log(`  GS Main - Title: ${mainInfo.title}`)
    console.log(`  Total links: ${mainInfo.allLinksCount}`)
    console.log(`  Interesting links (report-related):`)
    mainInfo.interestingLinks.forEach(l => console.log(`    [${l.text}] -> ${l.href}`))
    console.log(`  Nav items:`)
    mainInfo.navItems.slice(0, 20).forEach(n => console.log(`    [${n.text}] -> ${n.href}`))

    // Step 3: Explore each URL pattern
    console.log('\n=== PHASE 2: Explore URL patterns ===')
    for (let i = 0; i < EXPLORE_URLS.length; i++) {
      const urlPath = EXPLORE_URLS[i]
      const fullUrl = BASE + urlPath
      screenshotIdx++
      console.log(`\n  [${i + 1}/${EXPLORE_URLS.length}] ${urlPath}`)

      try {
        const resp = await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(e => null)
        await page.waitForTimeout(DELAY)

        const status = resp ? resp.status() : 'no-response'
        const info = await extractPageInfo(page)
        info.requestedUrl = urlPath
        info.status = status
        findings[urlPath] = info

        const ssName = `rel-explore-${String(screenshotIdx).padStart(2, '0')}-${urlPath.replace(/[?&=]/g, '_')}.png`
        await page.screenshot({ path: `${SCREENSHOT_DIR}/${ssName}`, fullPage: true })

        console.log(`    Status: ${status} | Title: ${info.title} | Final URL: ${info.url}`)
        console.log(`    Body preview: ${info.bodyTextPreview.substring(0, 150).replace(/\n/g, ' ')}`)
        if (info.interestingLinks.length > 0) {
          console.log(`    Report-related links:`)
          info.interestingLinks.forEach(l => console.log(`      [${l.text}] -> ${l.href}`))
        }
        if (info.tables.length > 0) {
          console.log(`    Tables found: ${info.tables.length}`)
          info.tables.forEach(t => console.log(`      Headers: ${t.headers.join(', ')} | Rows: ${t.rowCount}`))
        }
        if (info.forms.length > 0) {
          console.log(`    Forms found: ${info.forms.length}`)
          info.forms.forEach(f => console.log(`      Action: ${f.action} | Inputs: ${f.inputs.map(i => i.name || i.type).join(', ')}`))
        }
      } catch (err) {
        console.log(`    ERROR: ${err.message}`)
        findings[urlPath] = { error: err.message }
      }
    }

    // Step 4: Now try with a specific association (ANOB - usually has data)
    console.log('\n=== PHASE 3: Try with ANOB association ===')
    await switchAssociation(page, 6) // ANOB
    console.log('  Switched to ANOB')

    // Re-explore the most promising URLs after switching association
    const reExploreUrls = [
      'index.php?action=relatorio',
      'index.php?action=relatorio&option=obreiro',
      'index.php?action=relatorio&option=diario',
      'index.php?action=relatorio&option=missionario',
      'index.php?action=obreiro',
      'index.php?action=obreiro&option=relatorio',
    ]

    for (let i = 0; i < reExploreUrls.length; i++) {
      const urlPath = reExploreUrls[i]
      const fullUrl = BASE + urlPath
      screenshotIdx++
      console.log(`\n  [ANOB ${i + 1}/${reExploreUrls.length}] ${urlPath}`)

      try {
        await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(DELAY)

        const info = await extractPageInfo(page)
        findings[`ANOB_${urlPath}`] = info

        const ssName = `rel-anob-${String(screenshotIdx).padStart(2, '0')}-${urlPath.replace(/[?&=]/g, '_')}.png`
        await page.screenshot({ path: `${SCREENSHOT_DIR}/${ssName}`, fullPage: true })

        console.log(`    Title: ${info.title} | Final URL: ${info.url}`)
        console.log(`    Body: ${info.bodyTextPreview.substring(0, 200).replace(/\n/g, ' ')}`)
        if (info.interestingLinks.length > 0) {
          console.log(`    Report links:`)
          info.interestingLinks.forEach(l => console.log(`      [${l.text}] -> ${l.href}`))
        }
        if (info.tables.length > 0) {
          info.tables.forEach(t => console.log(`    Table: ${t.headers.join(', ')} (${t.rowCount} rows)`))
        }
      } catch (err) {
        console.log(`    ERROR: ${err.message}`)
      }
    }

    // Step 5: Also explore nav links that contain report keywords from the main page
    console.log('\n=== PHASE 4: Follow discovered report links ===')
    const discoveredLinks = new Set()
    for (const [key, data] of Object.entries(findings)) {
      if (data.interestingLinks) {
        data.interestingLinks.forEach(l => {
          if (l.href && !l.href.startsWith('http') && !l.href.startsWith('#') && !l.href.startsWith('javascript')) {
            discoveredLinks.add(l.href)
          }
        })
      }
      if (data.navItems) {
        data.navItems.forEach(n => {
          const combined = (n.href + ' ' + n.text).toLowerCase()
          if (['relatorio', 'obreiro', 'diario', 'missionario', 'atividade', 'estatistic'].some(kw => combined.includes(kw))) {
            if (n.href && !n.href.startsWith('http') && !n.href.startsWith('#') && !n.href.startsWith('javascript')) {
              discoveredLinks.add(n.href)
            }
          }
        })
      }
    }

    // Remove URLs we already explored
    const alreadyExplored = new Set([...EXPLORE_URLS, ...reExploreUrls])
    const newLinks = [...discoveredLinks].filter(l => !alreadyExplored.has(l))

    if (newLinks.length > 0) {
      console.log(`  Found ${newLinks.length} new links to explore:`)
      for (let i = 0; i < Math.min(newLinks.length, 20); i++) {
        const link = newLinks[i]
        screenshotIdx++
        console.log(`\n  [DISCOVERED ${i + 1}] ${link}`)

        try {
          const fullUrl = link.startsWith('http') ? link : BASE + link
          await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
          await page.waitForTimeout(DELAY)

          const info = await extractPageInfo(page)
          findings[`discovered_${link}`] = info

          const safeName = link.replace(/[?&=\/]/g, '_').substring(0, 60)
          await page.screenshot({ path: `${SCREENSHOT_DIR}/rel-disc-${String(screenshotIdx).padStart(2, '0')}-${safeName}.png`, fullPage: true })

          console.log(`    Title: ${info.title} | URL: ${info.url}`)
          console.log(`    Body: ${info.bodyTextPreview.substring(0, 200).replace(/\n/g, ' ')}`)
          if (info.interestingLinks.length > 0) {
            info.interestingLinks.forEach(l => console.log(`      [${l.text}] -> ${l.href}`))
          }
          if (info.tables.length > 0) {
            info.tables.forEach(t => console.log(`    Table: ${t.headers.join(', ')} (${t.rowCount} rows)`))
          }
        } catch (err) {
          console.log(`    ERROR: ${err.message}`)
        }
      }
    } else {
      console.log('  No new report-related links discovered beyond what we already explored.')
    }

    // Save all findings
    writeFileSync(
      `${OUTPUT_DIR}/relatorio-missionario-findings.json`,
      JSON.stringify(findings, null, 2),
      'utf-8'
    )
    console.log(`\n=== DONE ===`)
    console.log(`Saved findings to ${OUTPUT_DIR}/relatorio-missionario-findings.json`)
    console.log(`Screenshots in ${SCREENSHOT_DIR}/rel-*.png`)

    // Summary
    console.log('\n=== SUMMARY ===')
    console.log('Pages explored:', Object.keys(findings).length)
    const allReportLinks = new Set()
    for (const [key, data] of Object.entries(findings)) {
      if (data.interestingLinks) {
        data.interestingLinks.forEach(l => allReportLinks.add(`[${l.text}] -> ${l.href}`))
      }
    }
    console.log('\nAll unique report-related links found:')
    allReportLinks.forEach(l => console.log(`  ${l}`))

  } catch (err) {
    console.error('FATAL ERROR:', err)
  } finally {
    await browser.close()
  }
}

main()

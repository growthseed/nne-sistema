import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = 'scripts/backup'
const DELAY = 800 // ms between requests to avoid overloading

// All UNINORTE associations
const ASSOCIATIONS = [
  { id: 5, sigla: 'ARAM', nome: 'Associacao Roraima Amazonas' },
  { id: 19, sigla: 'AMAPI', nome: 'Associacao Maranhao Piaui' },
  { id: 6, sigla: 'ANOB', nome: 'Associacao Nordeste Brasileira' },
  { id: 20, sigla: 'ASCE', nome: 'Associacao Cearense' },
  { id: 4, sigla: 'ASPAR', nome: 'Associacao Para' },
  { id: 34, sigla: 'CAMAP', nome: 'Campo Missionario Amapaense' },
  { id: 28, sigla: 'CAMISE', nome: 'Campo Missionario Sergipano' },
]

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

function save(filename, data) {
  writeFileSync(`${OUTPUT_DIR}/${filename}`, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`  💾 Saved ${OUTPUT_DIR}/${filename}`)
}

function loadProgress() {
  try {
    return JSON.parse(readFileSync(`${OUTPUT_DIR}/_progress.json`, 'utf-8'))
  } catch { return {} }
}

function saveProgress(progress) {
  writeFileSync(`${OUTPUT_DIR}/_progress.json`, JSON.stringify(progress, null, 2))
}

async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  console.log('Logged in successfully')
}

async function switchAssociation(page, assocId) {
  await page.goto(BASE + `index.php?action=cadastro&option=associacao&sub=trocar&associacao=${assocId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)
}

// ==================== PHASE 1: CHURCHES ====================
async function scrapeChurches(page, assoc) {
  console.log(`\n--- Igrejas: ${assoc.sigla} ---`)
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  const churches = []

  // Find church links
  const links = await page.locator('a[href*="option=igreja&sub=visualizar"]').all()
  console.log(`  Found ${links.length} churches`)

  const churchUrls = []
  for (const link of links) {
    const href = await link.getAttribute('href')
    const nome = (await link.textContent())?.trim()
    if (href && nome) churchUrls.push({ href, nome })
  }

  for (let i = 0; i < churchUrls.length; i++) {
    const { href, nome } = churchUrls[i]
    console.log(`  [${i + 1}/${churchUrls.length}] ${nome}...`)

    await page.goto(BASE + href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(DELAY)

    const church = { nome, associacao: assoc.sigla }

    // Extract all field values from the page
    const inputs = await page.locator('input, select, textarea').all()
    for (const input of inputs) {
      const name = await input.getAttribute('name')
      if (!name) continue
      const tag = await input.evaluate(el => el.tagName)
      let value = ''
      if (tag === 'SELECT') {
        const selected = await input.locator('option:checked').textContent().catch(() => '')
        value = selected?.trim() || ''
      } else {
        value = await input.inputValue().catch(() => '')
      }
      if (value) church[name] = value
    }

    // Also get member count from the page text
    const bodyText = await page.locator('body').textContent()
    const memMatch = bodyText.match(/(\d+)\s*membr/i)
    if (memMatch) church._membros_text = memMatch[1]

    churches.push(church)
  }

  save(`igrejas_${assoc.sigla}.json`, churches)
  return churches
}

// ==================== PHASE 2: MEMBERS (per church) ====================
async function scrapeMemberList(page, assoc) {
  console.log(`\n--- Membros por igreja: ${assoc.sigla} ---`)

  // Go to member listing by church
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja&sub=listar', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  // Find church links in the list
  const links = await page.locator('a[href*="sub=listar_membros"], a[href*="sub=listar&igreja="]').all()

  // Alternative: look for any clickable church in the listing page
  let churchListLinks = []
  if (links.length === 0) {
    // Try finding church select or different link patterns
    const allLinks = await page.locator('a').all()
    for (const link of allLinks) {
      const href = await link.getAttribute('href')
      const text = (await link.textContent())?.trim()
      if (href && text && (href.includes('igreja=') || href.includes('listar'))) {
        churchListLinks.push({ href, text })
      }
    }
    console.log(`  Alt links found: ${churchListLinks.length}`)
  }

  // Try the "Por Igreja" member listing approach instead
  console.log('  Trying member listing by church...')
  await page.goto(BASE + 'ctrl_membro.php?action=listagem_igreja', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  // Check for select dropdown of churches
  const selects = await page.locator('select').all()
  if (selects.length > 0) {
    for (const sel of selects) {
      const name = await sel.getAttribute('name')
      const opts = await sel.locator('option').all()
      console.log(`  Select "${name}": ${opts.length} options`)
    }
  }

  // Try the association member listing (all members at once)
  console.log('  Trying association-wide member list...')
  await page.goto(BASE + 'ctrl_membro.php?action=listagem_associacao', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)
  await page.screenshot({ path: `scripts/screenshots/listagem_assoc_${assoc.sigla}.png`, fullPage: true })

  // Check what's on the page
  const pageText = await page.locator('body').textContent()
  console.log(`  Page text preview: ${pageText?.slice(0, 300)}`)

  return []
}

// ==================== PHASE 2B: MEMBER DETAILS ====================
async function scrapeMemberDetails(page, assoc, memberLinks) {
  console.log(`\n--- Fichas de membros: ${assoc.sigla} ---`)

  const members = []
  for (let i = 0; i < memberLinks.length; i++) {
    const { href, nome } = memberLinks[i]
    if (i % 20 === 0) console.log(`  [${i + 1}/${memberLinks.length}] ${nome}...`)

    await page.goto(BASE + href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(DELAY)

    const member = { nome, associacao: assoc.sigla }

    // Extract ALL form fields
    const inputs = await page.locator('input, select, textarea').all()
    for (const input of inputs) {
      const name = await input.getAttribute('name')
      if (!name) continue
      const tag = await input.evaluate(el => el.tagName)
      let value = ''
      if (tag === 'SELECT') {
        const selected = await input.locator('option:checked').textContent().catch(() => '')
        value = selected?.trim() || ''
      } else {
        value = await input.inputValue().catch(() => '')
      }
      if (value) member[name] = value
    }

    // Also check for labels/spans with data
    const labels = await page.locator('td, th, span, label').all()
    for (const label of labels) {
      const text = (await label.textContent())?.trim()
      if (text && text.includes(':')) {
        const [key, ...vals] = text.split(':')
        const val = vals.join(':').trim()
        if (key && val && key.length < 30) {
          member[`_${key.trim().toLowerCase().replace(/\s+/g, '_')}`] = val
        }
      }
    }

    members.push(member)
  }

  return members
}

// ==================== PHASE 3: MISSIONARIES ====================
async function scrapeMissionaries(page, assoc) {
  console.log(`\n--- Missionários: ${assoc.sigla} ---`)
  await page.goto(BASE + 'index.php?action=cadastro&option=missionario', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  const missionaries = []

  // Get table rows
  const rows = await page.locator('table tr').all()
  const missLinks = []

  for (let i = 1; i < rows.length; i++) {
    const cells = await rows[i].locator('td').allTextContents()
    const link = await rows[i].locator('a[href*="missionario"]').first()
    if (await link.count() > 0) {
      const href = await link.getAttribute('href')
      missLinks.push({
        nome: cells[1]?.trim(),
        categoria: cells[2]?.trim(),
        idade: cells[3]?.trim(),
        href,
      })
    }
  }

  console.log(`  Found ${missLinks.length} missionaries`)

  // Visit each missionary detail page
  for (let i = 0; i < missLinks.length; i++) {
    const m = missLinks[i]
    console.log(`  [${i + 1}/${missLinks.length}] ${m.nome}...`)

    await page.goto(BASE + m.href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(DELAY)

    const missionary = { nome: m.nome, categoria: m.categoria, associacao: assoc.sigla }

    // Extract all fields
    const inputs = await page.locator('input, select, textarea').all()
    for (const input of inputs) {
      const name = await input.getAttribute('name')
      if (!name) continue
      const tag = await input.evaluate(el => el.tagName)
      let value = ''
      if (tag === 'SELECT') {
        const selected = await input.locator('option:checked').textContent().catch(() => '')
        value = selected?.trim() || ''
      } else {
        value = await input.inputValue().catch(() => '')
      }
      if (value) missionary[name] = value
    }

    // Look for church assignments table
    const tables = await page.locator('table').all()
    const churchAssignments = []
    for (const table of tables) {
      const tRows = await table.locator('tr').all()
      for (const tRow of tRows) {
        const tCells = await tRow.locator('td').allTextContents()
        const cellTexts = tCells.map(c => c.trim()).filter(Boolean)
        if (cellTexts.length >= 2) {
          churchAssignments.push(cellTexts)
        }
      }
    }
    if (churchAssignments.length > 0) {
      missionary._church_assignments = churchAssignments
    }

    missionaries.push(missionary)
  }

  save(`missionarios_${assoc.sigla}.json`, missionaries)
  return missionaries
}

// ==================== PHASE 4: CHURCH-MEMBER LISTING ====================
async function scrapeChurchMembers(page, assoc, churches) {
  console.log(`\n--- Lista de membros por igreja: ${assoc.sigla} ---`)

  const allMembers = []

  for (let i = 0; i < churches.length; i++) {
    const church = churches[i]
    console.log(`  [${i + 1}/${churches.length}] ${church.nome}...`)

    // Navigate to church detail and find member list
    const churchId = church.href?.match(/igreja=(\d+)/)?.[1]
    if (!churchId) {
      // Try to find church in the listing page
      await page.goto(BASE + 'index.php?action=cadastro&option=igreja', { waitUntil: 'networkidle' })
      await page.waitForTimeout(DELAY)
      const link = page.locator(`a:has-text("${church.nome}")`).first()
      if (await link.count() > 0) {
        await link.click()
        await page.waitForLoadState('networkidle')
      }
    } else {
      await page.goto(BASE + `index.php?action=cadastro&option=igreja&sub=visualizar&igreja=${churchId}`, { waitUntil: 'networkidle' })
    }
    await page.waitForTimeout(DELAY)

    // Look for member links on the church page
    const memberLinks = await page.locator('a[href*="option=membro"], a[href*="action=cadastro"][href*="membro"]').all()

    const churchMembers = []
    for (const mLink of memberLinks) {
      const href = await mLink.getAttribute('href')
      const nome = (await mLink.textContent())?.trim()
      if (href && nome && !nome.includes('Membro') && nome.length > 2) {
        churchMembers.push({ nome, href, igreja: church.nome })
      }
    }

    // If no member links on church page, check the table
    if (churchMembers.length === 0) {
      const rows = await page.locator('table tr').all()
      for (const row of rows) {
        const link = await row.locator('a').first()
        if (await link.count() > 0) {
          const href = await link.getAttribute('href')
          const text = (await link.textContent())?.trim()
          if (href && text && text.length > 3 && !text.includes('Igrejas') && !text.includes('Voltar')) {
            churchMembers.push({ nome: text, href, igreja: church.nome })
          }
        }
      }
    }

    allMembers.push(...churchMembers)
    console.log(`    ${churchMembers.length} members found`)
  }

  return allMembers
}

// ==================== MAIN ====================
async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Set longer timeout
  page.setDefaultTimeout(30000)

  await login(page)

  const progress = loadProgress()
  const fullBackup = { timestamp: new Date().toISOString(), associations: {} }

  for (const assoc of ASSOCIATIONS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`=== ${assoc.sigla} - ${assoc.nome} ===`)
    console.log('='.repeat(60))

    // Skip if already done WITH data
    if (progress[assoc.sigla]?.completed && progress[assoc.sigla]?.members > 0) {
      console.log(`  Skipping ${assoc.sigla} (already scraped: ${progress[assoc.sigla].members} members)`)
      continue
    }

    // Re-login before each association to avoid session expiration
    await login(page)
    await switchAssociation(page, assoc.id)

    // Phase 1: Churches
    const churches = await scrapeChurches(page, assoc)

    // Phase 2: Missionaries
    await switchAssociation(page, assoc.id)
    const missionaries = await scrapeMissionaries(page, assoc)

    // Phase 3: Find all member links through churches
    await switchAssociation(page, assoc.id)

    // Go to each church and scrape members
    await page.goto(BASE + 'index.php?action=cadastro&option=igreja', { waitUntil: 'networkidle' })
    await page.waitForTimeout(DELAY)

    const churchLinks = await page.locator('a[href*="option=igreja&sub=visualizar"]').all()
    const churchData = []
    for (const link of churchLinks) {
      const href = await link.getAttribute('href')
      const nome = (await link.textContent())?.trim()
      if (href && nome) churchData.push({ nome, href })
    }

    // Visit each church to get member list
    const allMemberLinks = []
    for (let i = 0; i < churchData.length; i++) {
      const ch = churchData[i]
      console.log(`  Church [${i + 1}/${churchData.length}] ${ch.nome}...`)
      await page.goto(BASE + ch.href, { waitUntil: 'networkidle' })
      await page.waitForTimeout(DELAY)

      // Scrape member links from church page
      const bodyHTML = await page.content()
      const memberRegex = /href="([^"]*option=membro[^"]*)">([^<]+)</g
      let match
      while ((match = memberRegex.exec(bodyHTML)) !== null) {
        const [, mHref, mNome] = match
        if (mNome.trim().length > 2) {
          allMemberLinks.push({ href: mHref.replace(/&amp;/g, '&'), nome: mNome.trim(), igreja: ch.nome })
        }
      }

      // Also try generic table row links
      if (allMemberLinks.filter(m => m.igreja === ch.nome).length === 0) {
        const tableLinks = await page.locator('table a[href*="sub="]').all()
        for (const tl of tableLinks) {
          const href = await tl.getAttribute('href')
          const text = (await tl.textContent())?.trim()
          if (href && text && text.length > 3) {
            allMemberLinks.push({ href, nome: text, igreja: ch.nome })
          }
        }
      }

      const count = allMemberLinks.filter(m => m.igreja === ch.nome).length
      console.log(`    → ${count} members`)
    }

    console.log(`\n  Total member links found: ${allMemberLinks.length}`)
    save(`member_links_${assoc.sigla}.json`, allMemberLinks)

    // Phase 4: Visit each member detail page
    console.log(`\n  Scraping ${allMemberLinks.length} member profiles...`)
    const uniqueMembers = []
    const seenHrefs = new Set()

    for (let i = 0; i < allMemberLinks.length; i++) {
      const m = allMemberLinks[i]
      if (seenHrefs.has(m.href)) continue
      seenHrefs.add(m.href)

      if (i % 10 === 0 || i === allMemberLinks.length - 1) {
        console.log(`  [${i + 1}/${allMemberLinks.length}] ${m.nome}...`)
      }

      try {
        await page.goto(BASE + m.href, { waitUntil: 'networkidle', timeout: 15000 })
        await page.waitForTimeout(DELAY)

        const member = { nome: m.nome, igreja: m.igreja, associacao: assoc.sigla }

        // Get ALL form fields
        const inputs = await page.locator('input, select, textarea').all()
        for (const input of inputs) {
          const name = await input.getAttribute('name')
          if (!name) continue
          const tag = await input.evaluate(el => el.tagName)
          let value = ''
          try {
            if (tag === 'SELECT') {
              const selected = await input.locator('option:checked').textContent()
              value = selected?.trim() || ''
            } else {
              value = await input.inputValue()
            }
          } catch {}
          if (value) member[name] = value
        }

        // Extract label:value pairs from the page
        const tds = await page.locator('td').all()
        let lastLabel = ''
        for (const td of tds) {
          const text = (await td.textContent())?.trim()
          if (!text) continue
          if (text.endsWith(':')) {
            lastLabel = text.replace(':', '').trim().toLowerCase().replace(/\s+/g, '_')
          } else if (lastLabel && text.length > 0 && text.length < 200) {
            member[`_${lastLabel}`] = text
            lastLabel = ''
          }
        }

        uniqueMembers.push(member)
      } catch (err) {
        console.log(`    ⚠️ Error on ${m.nome}: ${err.message?.slice(0, 80)}`)
      }
    }

    save(`membros_${assoc.sigla}.json`, uniqueMembers)
    console.log(`  ✅ ${assoc.sigla}: ${uniqueMembers.length} member profiles scraped`)

    // Mark as done
    progress[assoc.sigla] = { completed: true, churches: churches.length, members: uniqueMembers.length, missionaries: missionaries.length }
    saveProgress(progress)
  }

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('=== BACKUP COMPLETE ===')
  console.log('='.repeat(60))
  const finalProgress = loadProgress()
  for (const [sigla, data] of Object.entries(finalProgress)) {
    console.log(`  ${sigla}: ${data.churches} igrejas, ${data.members} membros, ${data.missionaries} missionários`)
  }

  await browser.close()
}

main().catch(console.error)

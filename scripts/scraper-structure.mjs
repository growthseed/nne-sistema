import { chromium } from 'playwright'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'

async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  console.log('Logged in:', page.url())
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await login(page)

  // 1. Switch to ARAM (id=5) as test case
  console.log('\n=== Switching to ARAM ===')
  await page.goto(BASE + 'index.php?action=cadastro&option=associacao&sub=trocar&associacao=5', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  // 2. Explore IGREJAS page
  console.log('\n=== IGREJAS PAGE ===')
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/screenshots/igrejas-page.png', fullPage: true })

  // Get page HTML structure
  const igrejaTable = await page.locator('table').first()
  if (await igrejaTable.count() > 0) {
    const rows = await igrejaTable.locator('tr').all()
    console.log(`Found ${rows.length} rows in first table`)
    // Print header
    const headers = await rows[0]?.locator('th, td').allTextContents()
    console.log('Headers:', headers?.map(h => h.trim()).filter(Boolean))
    // Print first 3 data rows
    for (let i = 1; i < Math.min(4, rows.length); i++) {
      const cells = await rows[i].locator('td').allTextContents()
      console.log(`Row ${i}:`, cells.map(c => c.trim()))
    }
  }

  // Check for links to church detail pages
  const igrejaLinks = await page.locator('a[href*="igreja"]').all()
  console.log(`\nFound ${igrejaLinks.length} church-related links`)
  for (const link of igrejaLinks.slice(0, 5)) {
    const href = await link.getAttribute('href')
    const text = (await link.textContent())?.trim()
    console.log(`  "${text?.slice(0, 40)}" → ${href}`)
  }

  // 3. Explore MEMBROS page
  console.log('\n=== MEMBROS PAGE ===')
  await page.goto(BASE + 'index.php?action=cadastro&option=membro', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/screenshots/membros-page.png', fullPage: true })

  // Check for member table or list
  const membroTable = await page.locator('table').first()
  if (await membroTable.count() > 0) {
    const rows = await membroTable.locator('tr').all()
    console.log(`Found ${rows.length} rows in member table`)
    const headers = await rows[0]?.locator('th, td').allTextContents()
    console.log('Headers:', headers?.map(h => h.trim()).filter(Boolean))
    for (let i = 1; i < Math.min(4, rows.length); i++) {
      const cells = await rows[i].locator('td').allTextContents()
      console.log(`Row ${i}:`, cells.map(c => c.trim()).slice(0, 8))
    }
  }

  // Check for member detail links
  const membroLinks = await page.locator('a[href*="membro"]').all()
  console.log(`\nFound ${membroLinks.length} member-related links`)
  for (const link of membroLinks.slice(0, 5)) {
    const href = await link.getAttribute('href')
    const text = (await link.textContent())?.trim()
    console.log(`  "${text?.slice(0, 40)}" → ${href}`)
  }

  // 4. Click on first member to see detail page
  const editLinks = await page.locator('a[href*="sub=editar"], a[href*="sub=visualizar"], a[href*="sub=ficha"]').all()
  if (editLinks.length > 0) {
    const href = await editLinks[0].getAttribute('href')
    console.log(`\n=== MEMBER DETAIL: ${href} ===`)
    await page.goto(BASE + href, { waitUntil: 'networkidle' })
    await page.screenshot({ path: 'scripts/screenshots/membro-detail.png', fullPage: true })

    // Get all form fields
    const allInputs = await page.locator('input, select, textarea').all()
    console.log(`Found ${allInputs.length} form fields:`)
    for (const input of allInputs) {
      const tag = await input.evaluate(el => el.tagName)
      const name = await input.getAttribute('name')
      const id = await input.getAttribute('id')
      const value = await input.inputValue().catch(() => '')
      const label = name || id || 'unknown'
      if (name || id) {
        console.log(`  ${tag} name="${name}" id="${id}" value="${value?.slice(0, 50)}"`)
      }
    }
  }

  // 5. Check church member list page
  console.log('\n=== CHURCH MEMBER LIST ===')
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja&sub=listar', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/screenshots/igreja-listar.png', fullPage: true })

  const listContent = await page.locator('body').textContent()
  console.log('Page snippet:', listContent?.slice(0, 500))

  // 6. Explore MISSIONARIOS page
  console.log('\n=== MISSIONÁRIOS PAGE ===')
  await page.goto(BASE + 'index.php?action=cadastro&option=missionario', { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/screenshots/missionarios-page.png', fullPage: true })

  const missTable = await page.locator('table').first()
  if (await missTable.count() > 0) {
    const rows = await missTable.locator('tr').all()
    console.log(`Found ${rows.length} rows`)
    const headers = await rows[0]?.locator('th, td').allTextContents()
    console.log('Headers:', headers?.map(h => h.trim()).filter(Boolean))
    for (let i = 1; i < Math.min(4, rows.length); i++) {
      const cells = await rows[i].locator('td').allTextContents()
      console.log(`Row ${i}:`, cells.map(c => c.trim()))
    }
  }

  // 7. Check pagination patterns
  console.log('\n=== PAGINATION CHECK ===')
  await page.goto(BASE + 'index.php?action=cadastro&option=membro', { waitUntil: 'networkidle' })
  const paginationLinks = await page.locator('a[href*="pagina"], a[href*="page"], .pagination a, a[href*="pag="]').all()
  console.log(`Pagination links: ${paginationLinks.length}`)
  for (const link of paginationLinks.slice(0, 5)) {
    const href = await link.getAttribute('href')
    const text = (await link.textContent())?.trim()
    console.log(`  "${text}" → ${href}`)
  }

  // Also check select/dropdown for churches on member page
  const selects = await page.locator('select').all()
  console.log(`\nSelects on member page: ${selects.length}`)
  for (const sel of selects) {
    const name = await sel.getAttribute('name')
    const opts = await sel.locator('option').allTextContents()
    console.log(`  select name="${name}" → ${opts.length} options: ${opts.slice(0, 5).join(', ')}...`)
  }

  await browser.close()
  console.log('\nDone! Check scripts/screenshots/ for page captures.')
}

main().catch(console.error)

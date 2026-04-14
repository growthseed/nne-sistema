import { chromium } from 'playwright'

const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'

async function main() {
  const browser = await chromium.launch({ headless: false }) // visible for debugging
  const page = await browser.newPage()

  console.log('1. Navigating to login page...')
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'scripts/screenshots/01-login.png' })
  console.log('   Title:', await page.title())
  console.log('   URL:', page.url())

  // Find login form elements
  const inputs = await page.locator('input').all()
  console.log(`   Found ${inputs.length} input fields:`)
  for (const input of inputs) {
    const type = await input.getAttribute('type')
    const name = await input.getAttribute('name')
    const id = await input.getAttribute('id')
    const placeholder = await input.getAttribute('placeholder')
    console.log(`     type=${type} name=${name} id=${id} placeholder=${placeholder}`)
  }

  // Find buttons/submit
  const buttons = await page.locator('button, input[type="submit"]').all()
  console.log(`   Found ${buttons.length} buttons:`)
  for (const btn of buttons) {
    const text = await btn.textContent()
    const type = await btn.getAttribute('type')
    console.log(`     "${text?.trim()}" type=${type}`)
  }

  // Try to login
  console.log('\n2. Attempting login...')

  // Try common selectors for CPF/user field
  const userSelectors = ['input[name="cpf"]', 'input[name="username"]', 'input[name="user"]', 'input[name="login"]', 'input[type="text"]', 'input[name="email"]', '#cpf', '#username', '#login']
  const passSelectors = ['input[name="password"]', 'input[name="senha"]', 'input[type="password"]', '#password', '#senha']

  let userField = null
  for (const sel of userSelectors) {
    const el = page.locator(sel).first()
    if (await el.count() > 0) {
      userField = el
      console.log(`   User field found: ${sel}`)
      break
    }
  }

  let passField = null
  for (const sel of passSelectors) {
    const el = page.locator(sel).first()
    if (await el.count() > 0) {
      passField = el
      console.log(`   Pass field found: ${sel}`)
      break
    }
  }

  if (userField && passField) {
    await userField.fill(CPF)
    await passField.fill(PASS)
    await page.screenshot({ path: 'scripts/screenshots/02-filled.png' })

    // Click submit
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Acessar")').first()
    if (await submitBtn.count() > 0) {
      await submitBtn.click()
      console.log('   Clicked submit button')
    } else {
      await passField.press('Enter')
      console.log('   Pressed Enter')
    }

    // Wait for navigation
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(3000)

    console.log('   Post-login URL:', page.url())
    console.log('   Post-login title:', await page.title())
    await page.screenshot({ path: 'scripts/screenshots/03-after-login.png' })

    // Explore navigation/menu
    const links = await page.locator('a[href]').all()
    console.log(`\n3. Found ${links.length} links on page:`)
    const seen = new Set()
    for (const link of links) {
      const href = await link.getAttribute('href')
      const text = (await link.textContent())?.trim()
      if (href && !seen.has(href) && text) {
        seen.add(href)
        console.log(`   "${text.slice(0, 50)}" → ${href}`)
      }
    }

    // Look for menu items / sidebar
    const menuItems = await page.locator('nav a, .sidebar a, .menu a, li a').all()
    console.log(`\n4. Menu/nav items: ${menuItems.length}`)
    const seenMenu = new Set()
    for (const item of menuItems) {
      const href = await item.getAttribute('href')
      const text = (await item.textContent())?.trim()
      if (href && !seenMenu.has(href) && text) {
        seenMenu.add(href)
        console.log(`   "${text.slice(0, 50)}" → ${href}`)
      }
    }
  } else {
    console.log('   Could not find login fields!')
  }

  // Keep browser open for 30 seconds for manual inspection
  console.log('\n5. Browser will stay open for 30 seconds...')
  await page.waitForTimeout(30000)
  await browser.close()
}

main().catch(console.error)

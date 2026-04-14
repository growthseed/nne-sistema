// debug-login-form.mjs — inspect current login page structure
import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const LOGIN_URL = 'https://secretaria.org.br/secretaria/new'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(30000)

console.log('Loading', LOGIN_URL)
await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000) // give SPA time to mount

console.log('URL after load:', page.url())
console.log('Title:', await page.title())

// Dump all input fields
const inputs = await page.locator('input').all()
console.log(`\nFound ${inputs.length} <input> elements:`)
for (let i = 0; i < inputs.length; i++) {
  const el = inputs[i]
  const name = await el.getAttribute('name')
  const id = await el.getAttribute('id')
  const type = await el.getAttribute('type')
  const placeholder = await el.getAttribute('placeholder')
  const visible = await el.isVisible()
  console.log(`  [${i}] type=${type} name=${name} id=${id} placeholder=${placeholder} visible=${visible}`)
}

// Dump buttons
const buttons = await page.locator('button').all()
console.log(`\nFound ${buttons.length} <button> elements:`)
for (let i = 0; i < buttons.length; i++) {
  const el = buttons[i]
  const text = (await el.textContent())?.trim()
  const type = await el.getAttribute('type')
  const visible = await el.isVisible()
  console.log(`  [${i}] type=${type} text="${text}" visible=${visible}`)
}

// Dump forms
const forms = await page.locator('form').all()
console.log(`\nFound ${forms.length} <form> elements:`)
for (let i = 0; i < forms.length; i++) {
  const action = await forms[i].getAttribute('action')
  const method = await forms[i].getAttribute('method')
  console.log(`  [${i}] action=${action} method=${method}`)
}

// Save full HTML for inspection
const html = await page.content()
writeFileSync('scripts/backup/login-page-snapshot.html', html)
console.log(`\nFull HTML saved to scripts/backup/login-page-snapshot.html (${html.length} bytes)`)

await browser.close()

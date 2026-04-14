import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = 'scripts/backup'
const DELAY = 800

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
  console.log(`  Saved ${OUTPUT_DIR}/${filename} (${data.length} records)`)
}

function loadProgress() {
  try { return JSON.parse(readFileSync(`${OUTPUT_DIR}/_progress_v2.json`, 'utf-8')) } catch { return {} }
}

function saveProgress(progress) {
  writeFileSync(`${OUTPUT_DIR}/_progress_v2.json`, JSON.stringify(progress, null, 2))
}

async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  console.log('  Logged in')
}

async function switchAssociation(page, assocId) {
  await page.goto(BASE + `index.php?action=cadastro&option=associacao&sub=trocar&associacao=${assocId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)
}

// ==================== CHURCHES + MEMBER/INTERESSADO LISTS ====================
async function scrapeChurchesAndLists(page, assoc) {
  console.log(`\n--- Igrejas: ${assoc.sigla} ---`)

  // Navigate to church listing - try switching association first
  await switchAssociation(page, assoc.id)
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  // Get all church links
  let churchLinks = await page.locator('a[href*="option=igreja&sub=visualizar"]').all()

  // If no churches found, try re-login + switch + navigate again
  if (churchLinks.length === 0) {
    console.log('  No churches found, retrying with fresh login...')
    await login(page)
    await switchAssociation(page, assoc.id)
    await page.goto(BASE + 'index.php?action=cadastro&option=igreja', { waitUntil: 'networkidle' })
    await page.waitForTimeout(DELAY)
    churchLinks = await page.locator('a[href*="option=igreja&sub=visualizar"]').all()
  }

  const churches = []
  for (const link of churchLinks) {
    const href = await link.getAttribute('href')
    const nome = (await link.textContent())?.trim()
    const idMatch = href?.match(/igreja=(\d+)/)
    if (href && nome && idMatch) {
      churches.push({ id: parseInt(idMatch[1]), nome, href })
    }
  }
  console.log(`  Found ${churches.length} churches`)

  const allMembers = []
  const allInteressados = []
  const churchData = []

  for (let i = 0; i < churches.length; i++) {
    const ch = churches[i]
    console.log(`  [${i + 1}/${churches.length}] ${ch.nome}...`)

    // Re-login every 10 churches to prevent session expiration
    if (i > 0 && i % 10 === 0) {
      console.log('    (re-login to keep session alive)')
      await login(page)
      await switchAssociation(page, assoc.id)
    }

    await page.goto(BASE + ch.href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(DELAY)

    // Extract church info from form fields
    const church = { id: ch.id, nome: ch.nome, associacao: assoc.sigla }
    const inputs = await page.locator('input, select, textarea').all()
    for (const input of inputs) {
      const name = await input.getAttribute('name')
      if (!name || ['action', 'option', 'sub', 'palavra', 'Procurar'].includes(name)) continue
      const tag = await input.evaluate(el => el.tagName)
      let value = ''
      try {
        if (tag === 'SELECT') {
          value = (await input.locator('option:checked').textContent())?.trim() || ''
        } else {
          value = await input.inputValue()
        }
      } catch {}
      if (value) church[name] = value
    }

    // Parse ALL tables - detect members vs interessados by link patterns in rows
    const tables = await page.locator('table').all()
    let memberCount = 0
    let interessadoCount = 0

    for (let t = 0; t < tables.length; t++) {
      const rows = await tables[t].locator('tr').all()
      if (rows.length < 2) continue // skip empty/header-only tables

      for (let r = 0; r < rows.length; r++) {
        const cells = await rows[r].locator('td').allTextContents()
        const cellTexts = cells.map(c => c.trim())

        // Check for MEMBER links (option=membro&sub=visualizar)
        const memLink = await rows[r].locator('a[href*="option=membro&sub=visualizar"]').first()
        if (await memLink.count() > 0) {
          const href = await memLink.getAttribute('href')
          const nome = (await memLink.textContent())?.trim()
          const idMatch = href?.match(/membro=(\d+)/)
          if (!nome || !idMatch) continue

          let status = ''
          let idade = ''
          for (const c of cellTexts) {
            if (['Ativo', 'Inativo', 'Falecido', 'Desligado', 'Transferido'].includes(c)) status = c
            if (/^\d{1,3}$/.test(c) && parseInt(c) > 0 && parseInt(c) < 150) idade = c
          }

          allMembers.push({
            id: parseInt(idMatch[1]),
            nome, idade, status_membro: status,
            igreja: ch.nome, igreja_id: ch.id, associacao: assoc.sigla, href
          })
          memberCount++
          continue
        }

        // Check for INTERESSADO links (option=interessado&sub=visualizar)
        const intLink = await rows[r].locator('a[href*="option=interessado&sub=visualizar"]').first()
        if (await intLink.count() > 0) {
          const href = await intLink.getAttribute('href')
          const nome = (await intLink.textContent())?.trim()
          const idMatch = href?.match(/interessado=(\d+)/)
          if (!nome || !idMatch) continue

          let status = ''
          let idade = ''
          for (const c of cellTexts) {
            if (['Ativo', 'Inativo'].includes(c)) status = c
            if (/^\d{1,3}$/.test(c) && parseInt(c) > 0 && parseInt(c) < 150) idade = c
          }

          allInteressados.push({
            id: parseInt(idMatch[1]),
            nome, idade, status: status || 'Interessado',
            igreja: ch.nome, igreja_id: ch.id, associacao: assoc.sigla, href
          })
          interessadoCount++
        }
      }
    }

    church.membros_count = memberCount
    church.interessados_count = interessadoCount
    churchData.push(church)
    console.log(`    ${memberCount} membros, ${interessadoCount} interessados`)
  }

  save(`igrejas_${assoc.sigla}.json`, churchData)
  return { churches: churchData, members: allMembers, interessados: allInteressados }
}

// ==================== MEMBER DETAILS ====================
async function scrapeMemberDetails(page, assoc, memberLinks) {
  console.log(`\n--- Fichas de membros: ${assoc.sigla} (${memberLinks.length} total) ---`)

  const members = []
  const seenIds = new Set()

  for (let i = 0; i < memberLinks.length; i++) {
    const m = memberLinks[i]
    if (seenIds.has(m.id)) continue
    seenIds.add(m.id)

    if (i % 20 === 0 || i === memberLinks.length - 1) {
      console.log(`  [${i + 1}/${memberLinks.length}] ${m.nome}...`)
    }

    // Re-login every 50 unique members to prevent session expiration
    if (members.length > 0 && members.length % 50 === 0) {
      console.log('    (re-login to keep session alive)')
      await login(page)
      await switchAssociation(page, assoc.id)
    }

    try {
      await page.goto(BASE + m.href, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(DELAY)

      const member = {
        id: m.id,
        nome: m.nome,
        status_membro: m.status_membro,
        idade: m.idade,
        igreja: m.igreja,
        igreja_id: m.igreja_id,
        associacao: assoc.sigla,
      }

      // Extract all member data by parsing the concatenated text from the page
      // The member detail page has all data in table cells with known labels
      const parsed = await page.evaluate(() => {
        // Get the full text of the first table's first cell (contains all data)
        const firstCell = document.querySelector('table td')
        if (!firstCell) return null
        const fullText = firstCell.textContent || ''

        // Known labels in order — we split the text by these labels
        const labelMap = [
          ['Membro:', 'status_pagina'],
          ['Igreja:', 'igreja_pagina'],
          ['Associação:', 'associacao_pagina'],
          ['Sexo:', 'sexo'],
          ['Nascimento:', 'nascimento'],
          ['Cidade:', 'cidade_nascimento'],
          ['Nacionalidade:', 'nacionalidade'],
          ['RG/Origem:', 'rg'],
          ['Profissão:', 'profissao'],
          ['Escolaridade:', 'escolaridade'],
          ['Pai:', 'pai'],
          ['Mãe:', 'mae'],
          ['Estado Civil:', 'estado_civil'],
          ['Conjuge:', 'conjuge'],
          ['Casamento:', 'data_casamento'],
          ['Telefone:', 'telefone'],
          ['Celular:', 'celular'],
          ['E-mail:', 'email'],
          ['Religião Anterior:', 'religiao_anterior'],
          ['Desde:', 'religiao_desde'],
          ['Cargo que Ocupava:', 'cargo_anterior'],
          ['Admitido na Igreja por:', 'admissao_tipo'],
          ['Data:', 'data_admissao'],
          ['Local:', 'local_admissao'],
          ['Ministro:', 'ministro_admissao'],
        ]

        const result = {}
        for (let i = 0; i < labelMap.length; i++) {
          const [label, key] = labelMap[i]
          const idx = fullText.indexOf(label)
          if (idx === -1) continue

          const start = idx + label.length
          // Find where the next label starts
          let end = fullText.length
          for (let j = i + 1; j < labelMap.length; j++) {
            const nextIdx = fullText.indexOf(labelMap[j][0], start)
            if (nextIdx > start) { end = nextIdx; break }
          }
          // Also check for section headers
          for (const section of ['Dados Pessoais', 'Endereço', 'Dados para Contato', 'Dados Religiosos']) {
            const secIdx = fullText.indexOf(section, start)
            if (secIdx > start && secIdx < end) end = secIdx
          }

          const value = fullText.slice(start, end).trim()
          if (value && value.length < 300) {
            result[key] = value
          }
        }

        // Also extract the address block (between "Endereço" and "Dados para Contato")
        const endIdx = fullText.indexOf('Endereço')
        const contatoIdx = fullText.indexOf('Dados para Contato')
        if (endIdx > 0 && contatoIdx > endIdx) {
          const addr = fullText.slice(endIdx + 'Endereço'.length, contatoIdx).trim()
          if (addr) result.endereco = addr
        }

        return result
      })

      // Merge parsed data into member
      if (parsed) {
        for (const [key, value] of Object.entries(parsed)) {
          if (value && key !== 'status_pagina' && key !== 'igreja_pagina' && key !== 'associacao_pagina') {
            member[key] = value
          }
          // Use page status as fallback
          if (key === 'status_pagina' && value && !member.status_membro) {
            member.status_membro = value
          }
        }
      }

      members.push(member)
    } catch (err) {
      console.log(`    Error on ${m.nome}: ${err.message?.slice(0, 80)}`)
      // Still save basic info
      members.push({
        id: m.id,
        nome: m.nome,
        status_membro: m.status_membro,
        idade: m.idade,
        igreja: m.igreja,
        igreja_id: m.igreja_id,
        associacao: assoc.sigla,
        _error: err.message?.slice(0, 100)
      })
    }

    // Save incrementally every 100 members
    if (members.length % 100 === 0) {
      save(`membros_${assoc.sigla}.json`, members)
    }
  }

  return members
}

// ==================== INTERESSADO DETAILS ====================
async function scrapeInteressadoDetails(page, assoc, interessadoLinks) {
  console.log(`\n--- Fichas de interessados: ${assoc.sigla} (${interessadoLinks.length} total) ---`)

  const interessados = []
  const seenIds = new Set()

  for (let i = 0; i < interessadoLinks.length; i++) {
    const m = interessadoLinks[i]
    if (seenIds.has(m.id)) continue
    seenIds.add(m.id)

    if (i % 10 === 0 || i === interessadoLinks.length - 1) {
      console.log(`  [${i + 1}/${interessadoLinks.length}] ${m.nome}...`)
    }

    // Re-login every 50 interessados
    if (interessados.length > 0 && interessados.length % 50 === 0) {
      console.log('    (re-login to keep session alive)')
      await login(page)
      await switchAssociation(page, assoc.id)
    }

    try {
      await page.goto(BASE + m.href, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(DELAY)

      const record = {
        id: m.id,
        nome: m.nome,
        status: m.status || 'Interessado',
        tipo: 'interessado',
        igreja: m.igreja,
        igreja_id: m.igreja_id,
        associacao: assoc.sigla,
      }

      // Extract form fields
      const inputs = await page.locator('input, select, textarea').all()
      for (const input of inputs) {
        const name = await input.getAttribute('name')
        if (!name || ['action', 'option', 'sub', 'palavra', 'Procurar', 'back', 'file'].includes(name)) continue
        const tag = await input.evaluate(el => el.tagName)
        let value = ''
        try {
          if (tag === 'SELECT') {
            value = (await input.locator('option:checked').textContent())?.trim() || ''
          } else {
            value = await input.inputValue()
          }
        } catch {}
        if (value && value !== 'Selecione ..' && value !== 'Escolha ...') record[name] = value
      }

      interessados.push(record)
    } catch (err) {
      console.log(`    Error on ${m.nome}: ${err.message?.slice(0, 80)}`)
      interessados.push({
        id: m.id, nome: m.nome, status: m.status, tipo: 'interessado',
        igreja: m.igreja, igreja_id: m.igreja_id, associacao: assoc.sigla,
        _error: err.message?.slice(0, 100)
      })
    }
  }

  return interessados
}

// ==================== MISSIONARIES ====================
async function scrapeMissionaries(page, assoc) {
  console.log(`\n--- Missionarios: ${assoc.sigla} ---`)
  await page.goto(BASE + 'index.php?action=cadastro&option=missionario', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  const missionaries = []
  const rows = await page.locator('table tr').all()
  const missLinks = []

  for (let i = 1; i < rows.length; i++) {
    const cells = await rows[i].locator('td').allTextContents()
    const link = await rows[i].locator('a[href*="missionario"]').first()
    if (await link.count() > 0) {
      const href = await link.getAttribute('href')
      missLinks.push({ nome: cells[1]?.trim(), categoria: cells[2]?.trim(), idade: cells[3]?.trim(), href })
    }
  }
  console.log(`  Found ${missLinks.length} missionaries`)

  for (let i = 0; i < missLinks.length; i++) {
    const m = missLinks[i]
    if (i % 5 === 0) console.log(`  [${i + 1}/${missLinks.length}] ${m.nome}...`)
    await page.goto(BASE + m.href, { waitUntil: 'networkidle' })
    await page.waitForTimeout(DELAY)

    const missionary = { nome: m.nome, categoria: m.categoria, associacao: assoc.sigla }
    const inputs = await page.locator('input, select, textarea').all()
    for (const input of inputs) {
      const name = await input.getAttribute('name')
      if (!name || ['action', 'option', 'sub'].includes(name)) continue
      const tag = await input.evaluate(el => el.tagName)
      let value = ''
      try {
        if (tag === 'SELECT') { value = (await input.locator('option:checked').textContent())?.trim() || '' }
        else { value = await input.inputValue() }
      } catch {}
      if (value && value !== 'Selecione ..' && value !== 'Escolha ...') missionary[name] = value
    }

    // Church assignments
    const tables = await page.locator('table').all()
    const assignments = []
    for (const table of tables) {
      const tRows = await table.locator('tr').all()
      for (const tRow of tRows) {
        const tCells = await tRow.locator('td').allTextContents()
        const texts = tCells.map(c => c.trim()).filter(Boolean)
        if (texts.length >= 2) assignments.push(texts)
      }
    }
    if (assignments.length > 0) missionary._church_assignments = assignments

    missionaries.push(missionary)
  }

  save(`missionarios_${assoc.sigla}.json`, missionaries)
  return missionaries
}

// ==================== MAIN ====================
async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  const progress = loadProgress()

  for (const assoc of ASSOCIATIONS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`=== ${assoc.sigla} - ${assoc.nome} ===`)
    console.log('='.repeat(60))

    if (progress[assoc.sigla]?.completed && progress[assoc.sigla]?.members > 0) {
      console.log(`  Skipping ${assoc.sigla} (already done: ${progress[assoc.sigla].members} members, ${progress[assoc.sigla].interessados || 0} interessados)`)
      continue
    }

    // Fresh login before each association
    await login(page)
    await switchAssociation(page, assoc.id)

    // Phase 1: Churches + member/interessado lists from church pages
    const { churches, members: memberLinks, interessados: interessadoLinks } = await scrapeChurchesAndLists(page, assoc)

    console.log(`\n  Total: ${memberLinks.length} membros, ${interessadoLinks.length} interessados across ${churches.length} igrejas`)
    save(`member_links_${assoc.sigla}.json`, memberLinks)
    save(`interessado_links_${assoc.sigla}.json`, interessadoLinks)

    // Phase 2: Missionaries
    await login(page)
    await switchAssociation(page, assoc.id)
    const missionaries = await scrapeMissionaries(page, assoc)

    // Phase 3: Member detail pages
    await login(page)
    await switchAssociation(page, assoc.id)
    const memberDetails = await scrapeMemberDetails(page, assoc, memberLinks)
    save(`membros_${assoc.sigla}.json`, memberDetails)

    // Phase 4: Interessado detail pages
    await login(page)
    await switchAssociation(page, assoc.id)
    const interessadoDetails = await scrapeInteressadoDetails(page, assoc, interessadoLinks)
    save(`interessados_${assoc.sigla}.json`, interessadoDetails)

    // Mark complete
    progress[assoc.sigla] = {
      completed: true,
      churches: churches.length,
      members: memberDetails.length,
      interessados: interessadoDetails.length,
      missionaries: missionaries.length,
    }
    saveProgress(progress)

    console.log(`\n  DONE ${assoc.sigla}: ${memberDetails.length} membros, ${interessadoDetails.length} interessados, ${missionaries.length} missionarios`)
  }

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('=== BACKUP COMPLETE ===')
  console.log('='.repeat(60))
  const final = loadProgress()
  let totalM = 0, totalI = 0, totalMiss = 0
  for (const [sigla, data] of Object.entries(final)) {
    console.log(`  ${sigla}: ${data.churches} igrejas, ${data.members} membros, ${data.interessados || 0} interessados, ${data.missionaries} missionarios`)
    totalM += data.members || 0
    totalI += data.interessados || 0
    totalMiss += data.missionaries || 0
  }
  console.log(`  TOTAL: ${totalM} membros, ${totalI} interessados, ${totalMiss} missionarios`)

  await browser.close()
}

main().catch(console.error)

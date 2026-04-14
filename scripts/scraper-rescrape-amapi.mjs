import { chromium } from 'playwright'
import { writeFileSync, readFileSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = 'scripts/backup'
const DELAY = 800
const AMAPI_ID = 19

function save(filename, data) {
  writeFileSync(`${OUTPUT_DIR}/${filename}`, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`  Saved ${OUTPUT_DIR}/${filename} (${data.length} records)`)
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

async function switchAssociation(page) {
  await page.goto(BASE + `index.php?action=cadastro&option=associacao&sub=trocar&associacao=${AMAPI_ID}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)
}

async function main() {
  // Load existing member links
  const memberLinks = JSON.parse(readFileSync(`${OUTPUT_DIR}/member_links_AMAPI.json`, 'utf-8'))
  console.log(`AMAPI re-scrape: ${memberLinks.length} members to process`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)

  await login(page)
  await switchAssociation(page)

  const members = []
  const seenIds = new Set()

  for (let i = 0; i < memberLinks.length; i++) {
    const m = memberLinks[i]
    if (seenIds.has(m.id)) continue
    seenIds.add(m.id)

    if (i % 20 === 0 || i === memberLinks.length - 1) {
      console.log(`  [${i + 1}/${memberLinks.length}] ${m.nome}...`)
    }

    // Re-login every 50 unique members
    if (members.length > 0 && members.length % 50 === 0) {
      console.log('    (re-login to keep session alive)')
      await login(page)
      await switchAssociation(page)
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
        associacao: 'AMAPI',
      }

      // Extract all member data using the label-based parser
      const parsed = await page.evaluate(() => {
        const firstCell = document.querySelector('table td')
        if (!firstCell) return null
        const fullText = firstCell.textContent || ''

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
          let end = fullText.length
          for (let j = i + 1; j < labelMap.length; j++) {
            const nextIdx = fullText.indexOf(labelMap[j][0], start)
            if (nextIdx > start) { end = nextIdx; break }
          }
          for (const section of ['Dados Pessoais', 'Endereço', 'Dados para Contato', 'Dados Religiosos']) {
            const secIdx = fullText.indexOf(section, start)
            if (secIdx > start && secIdx < end) end = secIdx
          }

          const value = fullText.slice(start, end).trim()
          if (value && value.length < 300) {
            result[key] = value
          }
        }

        // Address block
        const endIdx = fullText.indexOf('Endereço')
        const contatoIdx = fullText.indexOf('Dados para Contato')
        if (endIdx > 0 && contatoIdx > endIdx) {
          const addr = fullText.slice(endIdx + 'Endereço'.length, contatoIdx).trim()
          if (addr) result.endereco = addr
        }

        return result
      })

      if (parsed) {
        for (const [key, value] of Object.entries(parsed)) {
          if (value && key !== 'status_pagina' && key !== 'igreja_pagina' && key !== 'associacao_pagina') {
            member[key] = value
          }
          if (key === 'status_pagina' && value && !member.status_membro) {
            member.status_membro = value
          }
        }
      }

      members.push(member)
    } catch (err) {
      console.log(`    Error on ${m.nome}: ${err.message?.slice(0, 80)}`)
      members.push({
        id: m.id, nome: m.nome, status_membro: m.status_membro,
        idade: m.idade, igreja: m.igreja, igreja_id: m.igreja_id,
        associacao: 'AMAPI', _error: err.message?.slice(0, 100)
      })
    }

    // Save incrementally every 100 members
    if (members.length % 100 === 0) {
      save('membros_AMAPI.json', members)
    }
  }

  save('membros_AMAPI.json', members)

  // Quality check
  const withSexo = members.filter(m => m.sexo).length
  const withNasc = members.filter(m => m.nascimento).length
  const withProf = members.filter(m => m.profissao).length
  console.log(`\n=== AMAPI Quality Check ===`)
  console.log(`  Total: ${members.length}`)
  console.log(`  With sexo: ${withSexo} (${(withSexo / members.length * 100).toFixed(1)}%)`)
  console.log(`  With nascimento: ${withNasc} (${(withNasc / members.length * 100).toFixed(1)}%)`)
  console.log(`  With profissao: ${withProf} (${(withProf / members.length * 100).toFixed(1)}%)`)

  await browser.close()
  console.log('\nDone!')
}

main().catch(console.error)

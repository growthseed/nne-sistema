import { chromium } from 'playwright'
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'

const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = 'scripts/backup'
const DELAY = 600

const ASSOCIATIONS = [
  { id: 5, sigla: 'ARAM', nome: 'Associacao Roraima Amazonas' },
  { id: 19, sigla: 'AMAPI', nome: 'Associacao Maranhao Piaui' },
  { id: 6, sigla: 'ANOB', nome: 'Associacao Nordeste Brasileira' },
  { id: 20, sigla: 'ASCE', nome: 'Associacao Cearense' },
  { id: 4, sigla: 'ASPAR', nome: 'Associacao Para' },
  { id: 34, sigla: 'CAMAP', nome: 'Campo Missionario Amapaense' },
  { id: 28, sigla: 'CAMISE', nome: 'Campo Missionario Sergipano' },
]

// Q4 2025 + Q1 2026 (and Q2 2026 partially if available)
const MONTHS_TO_SCRAPE = [
  { mes: 10, ano: 2025 },
  { mes: 11, ano: 2025 },
  { mes: 12, ano: 2025 },
  { mes: 1, ano: 2026 },
  { mes: 2, ano: 2026 },
  { mes: 3, ano: 2026 },
]

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

function parseMoneyBR(str) {
  if (!str || str === '-' || str.trim() === '') return 0
  // "1.300,00" → 1300.00
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}

async function scrapeMonthDetail(page, igrejaId, mes, ano) {
  const url = `${BASE}index.php?action=relatorio&option=financeiro&sub=listar&igreja=${igrejaId}&mes=${mes}/${ano}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  const tables = await page.locator('table').all()
  if (tables.length < 2) {
    // No data or redirected
    return null
  }

  const result = {
    igreja_id_old: igrejaId,
    mes,
    ano,
    responsavel: '',
    status: '',
    saldo_anterior: 0,
    recibos: [],
    totais: {
      dizimos: 0, primicias: 0, assistencia_social: 0, escola_sabatina: 0,
      evangelismo: 0, radio_colportagem: 0, construcao: 0, musica: 0,
      gratidao_6pct: 0, diversos_assoc: 0, soma_associacao: 0,
      caixa_local_entradas: 0, missoes_estrangeiras: 0, caixa_local_saidas: 0
    },
    ofertas_resumo: {
      cultos_construcao: 0, juvenil: 0, missionaria: 0, gratidao_pobres: 0, diversos: 0
    },
    despesas_locais: [],
    pagamentos: [],
    soma_pagamentos: 0,
    caixa_associacao: 0,
    saldo_acerto: 0
  }

  // Table 0: Header info
  try {
    const headerRows = await tables[0].locator('tr').all()
    for (const row of headerRows) {
      const text = (await row.textContent())?.trim() || ''
      if (text.includes('Responsável:')) {
        result.responsavel = text.replace(/.*Responsável:\s*/, '').trim()
      }
      if (text.includes('Status:')) {
        const statusMatch = text.match(/Status:\s*(\w+)/)
        if (statusMatch) result.status = statusMatch[1]
      }
      if (text.includes('Saldo Anterior:')) {
        const saldoMatch = text.match(/Saldo Anterior:\s*R\$\s*([\d.,]+)/)
        if (saldoMatch) result.saldo_anterior = parseMoneyBR(saldoMatch[1])
      }
    }
  } catch (e) { /* ignore */ }

  // Table 1: Recibos (main financial data)
  try {
    const dataRows = await tables[1].locator('tr').all()
    // Skip rows 0-1 (headers), process rows 2 to N-2
    for (let r = 2; r < dataRows.length; r++) {
      const cells = await dataRows[r].locator('td, th').allTextContents()
      const cleaned = cells.map(c => c.trim())

      // Check if this is a totals row (second-to-last or last)
      const joined = cleaned.join(' ')
      if (r >= dataRows.length - 2) {
        // Totals rows - parse the summary
        if (r === dataRows.length - 2) {
          // Main totals row: dizimos | primicias | ... | soma | entradas | saídas
          const nums = cleaned.filter(c => /[\d.,]/.test(c)).map(parseMoneyBR)
          if (nums.length >= 14) {
            result.totais.dizimos = nums[0]
            result.totais.primicias = nums[1]
            result.totais.assistencia_social = nums[2]
            result.totais.escola_sabatina = nums[3]
            result.totais.evangelismo = nums[4]
            result.totais.radio_colportagem = nums[5]
            result.totais.construcao = nums[6]
            result.totais.musica = nums[7]
            result.totais.gratidao_6pct = nums[8]
            result.totais.diversos_assoc = nums[9]
            result.totais.soma_associacao = nums[10]
            result.totais.missoes_estrangeiras = nums[11]
            result.totais.caixa_local_entradas = nums[12]
            result.totais.caixa_local_saidas = nums[13]
          }
        }
        continue
      }

      // Check if it's a recibo line (starts with number like 206.00320) or expense line
      const isRecibo = /^\d+\.\d+$/.test(cleaned[0])
      const isExpense = !isRecibo && /^\d{2}\/\d{2}$/.test(cleaned[0])

      if (isRecibo) {
        // Recibo: number | date | name | values...
        result.recibos.push({
          recibo: cleaned[0],
          data: cleaned[1] || '',
          nome: cleaned[2] || '',
          valores_raw: cleaned.slice(3).filter(Boolean)
        })
      } else if (isExpense) {
        // Local expense: date | description | - | value
        result.despesas_locais.push({
          data: cleaned[0],
          descricao: cleaned[1] || '',
          valor: parseMoneyBR(cleaned[cleaned.length - 1])
        })
      }
    }
  } catch (e) {
    console.log(`    Warning parsing table 1: ${e.message}`)
  }

  // Table 2: Ofertas resumo
  try {
    if (tables.length > 2) {
      const ofRows = await tables[2].locator('tr').all()
      for (const row of ofRows) {
        const cells = await row.locator('td, th').allTextContents()
        const text = cells.join(' ').toLowerCase()
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i].trim().toLowerCase()
          const nextVal = i + 1 < cells.length ? parseMoneyBR(cells[i + 1].trim()) : 0
          if (cell.includes('cultos') || cell.includes('construção')) {
            result.ofertas_resumo.cultos_construcao = nextVal
          } else if (cell.includes('juvenil')) {
            result.ofertas_resumo.juvenil = nextVal
          } else if (cell.includes('missionária') || cell.includes('missionaria')) {
            result.ofertas_resumo.missionaria = nextVal
          } else if (cell.includes('gratidão') || cell.includes('pobres')) {
            result.ofertas_resumo.gratidao_pobres = nextVal
          } else if (cell.includes('diversos')) {
            result.ofertas_resumo.diversos = nextVal
          }
        }
      }
    }
  } catch (e) { /* ignore */ }

  // Table 3: Pagamentos
  try {
    if (tables.length > 3) {
      const pagRows = await tables[3].locator('tr').all()
      for (let r = 1; r < pagRows.length; r++) {
        const cells = await pagRows[r].locator('td, th').allTextContents()
        const cleaned = cells.map(c => c.trim())
        const joined = cleaned.join(' ')

        if (joined.includes('Soma de Pagamentos')) {
          result.soma_pagamentos = parseMoneyBR(cleaned[cleaned.length - 1])
        } else if (joined.includes('Caixa Associação')) {
          result.caixa_associacao = parseMoneyBR(cleaned[cleaned.length - 1])
        } else if (joined.includes('Saldo para Acerto')) {
          result.saldo_acerto = parseMoneyBR(cleaned[cleaned.length - 1])
        } else if (cleaned.length >= 3 && /^\d{2}\/\d{2}\/\d{4}$/.test(cleaned[0])) {
          result.pagamentos.push({
            data: cleaned[0],
            descricao: cleaned[1],
            valor: parseMoneyBR(cleaned[2])
          })
        }
      }
    }
  } catch (e) { /* ignore */ }

  return result
}

async function getChurchIdsForAssociation(page) {
  // Go to financeiro page and extract church IDs from the month links
  await page.goto(BASE + 'index.php?action=relatorio&option=financeiro', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  // Get unique church IDs and names from the table
  // The page shows a grid: rows = churches, columns = months
  // Each link has: index.php?action=relatorio&option=financeiro&sub=listar&igreja={id}&mes={month}/{year}
  const churches = new Map()

  // Get rows from the main table
  const tables = await page.locator('table').all()
  for (const table of tables) {
    const rows = await table.locator('tr').all()
    for (const row of rows) {
      const links = await row.locator('a').all()
      const cells = await row.locator('td, th').allTextContents()

      // Find church name from first cell
      let churchName = cells[0]?.trim()

      for (const link of links) {
        const href = await link.getAttribute('href')
        if (href && href.includes('igreja=')) {
          const match = href.match(/igreja=(\d+)/)
          if (match && churchName && !churches.has(match[1])) {
            // Clean church name (remove year numbers, whitespace)
            if (!/^\d+$/.test(churchName) && churchName.length > 2) {
              churches.set(match[1], churchName)
            }
          }
        }
      }
    }
  }

  // Also try to extract from all links
  const allLinks = await page.locator('a[href*="igreja="]').all()
  for (const link of allLinks) {
    const href = await link.getAttribute('href')
    const match = href?.match(/igreja=(\d+)/)
    if (match && !churches.has(match[1])) {
      churches.set(match[1], `Igreja ${match[1]}`)
    }
  }

  // Better approach: parse the grid table properly
  // The table structure is: first column = church name, then month columns
  // Let's re-parse more carefully
  if (tables.length > 0) {
    const mainTable = tables[tables.length - 1] // Usually the last/main table
    const rows = await mainTable.locator('tr').all()
    for (const row of rows) {
      const firstCell = await row.locator('td:first-child, th:first-child').first()
      if (await firstCell.count() === 0) continue
      const cellText = (await firstCell.textContent())?.trim()
      if (!cellText || /^\d{4}$/.test(cellText) || cellText.length < 3) continue

      const links = await row.locator('a[href*="igreja="]').all()
      if (links.length > 0) {
        const href = await links[0].getAttribute('href')
        const match = href?.match(/igreja=(\d+)/)
        if (match) {
          churches.set(match[1], cellText)
        }
      }
    }
  }

  return Array.from(churches.entries()).map(([id, nome]) => ({ id, nome }))
}

// Load progress
const progressFile = `${OUTPUT_DIR}/_progress_financeiro.json`
let progress = {}
if (existsSync(progressFile)) {
  progress = JSON.parse(readFileSync(progressFile, 'utf-8'))
}

function saveProgress() {
  writeFileSync(progressFile, JSON.stringify(progress, null, 2))
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(20000)

  // Login
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  console.log('Logged in successfully')

  for (const assoc of ASSOCIATIONS) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`=== ${assoc.sigla} - ${assoc.nome} ===`)
    console.log('='.repeat(60))

    // Check if already done WITH data (skip empty results that may have failed)
    if (progress[assoc.sigla]?.done && progress[assoc.sigla]?.records > 0) {
      console.log(`  Skipping (already done: ${progress[assoc.sigla].records} records)`)
      continue
    }

    // Re-login before each association to avoid session expiration
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
    await page.fill('input[name="login"]', CPF)
    await page.fill('input[name="senha"]', PASS)
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    console.log('  Re-logged in')

    // Switch association
    await page.goto(BASE + `index.php?action=cadastro&option=associacao&sub=trocar&associacao=${assoc.id}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Get church IDs
    const churches = await getChurchIdsForAssociation(page)
    console.log(`  Found ${churches.length} churches:`)
    for (const c of churches) {
      console.log(`    [${c.id}] ${c.nome}`)
    }

    const financeiro = []
    const doneKey = `${assoc.sigla}_churches`
    const doneChurches = new Set(progress[doneKey] || [])

    for (let ci = 0; ci < churches.length; ci++) {
      const church = churches[ci]

      if (doneChurches.has(church.id)) {
        console.log(`  [${ci + 1}/${churches.length}] ${church.nome} - skipping (done)`)
        continue
      }

      console.log(`  [${ci + 1}/${churches.length}] ${church.nome} (id=${church.id})...`)

      for (const { mes, ano } of MONTHS_TO_SCRAPE) {
        try {
          const data = await scrapeMonthDetail(page, church.id, mes, ano)
          if (data) {
            data.igreja_nome = church.nome
            data.associacao = assoc.sigla
            financeiro.push(data)

            const hasRecibos = data.recibos.length > 0
            const total = data.totais.soma_associacao + data.totais.caixa_local_entradas
            if (hasRecibos || total > 0) {
              console.log(`    ${mes}/${ano}: ${data.recibos.length} recibos, ` +
                `Diz=${data.totais.dizimos.toFixed(2)}, ` +
                `CxAssoc=${data.totais.soma_associacao.toFixed(2)}, ` +
                `CxLocal=${data.totais.caixa_local_entradas.toFixed(2)}, ` +
                `Status=${data.status}`)
            } else {
              console.log(`    ${mes}/${ano}: sem dados`)
            }
          } else {
            console.log(`    ${mes}/${ano}: sem dados`)
          }
        } catch (e) {
          console.log(`    ${mes}/${ano}: ERROR - ${e.message}`)
        }
      }

      // Mark church as done
      doneChurches.add(church.id)
      progress[doneKey] = Array.from(doneChurches)
      saveProgress()
    }

    // Save association financial data
    const outFile = `${OUTPUT_DIR}/financeiro_${assoc.sigla}.json`
    writeFileSync(outFile, JSON.stringify(financeiro, null, 2))
    console.log(`  Saved ${financeiro.length} records to ${outFile}`)

    progress[assoc.sigla] = { done: true, churches: churches.length, records: financeiro.length }
    saveProgress()
  }

  await browser.close()
  console.log('\n=== FINANCIAL SCRAPING COMPLETE ===')

  // Print summary
  for (const assoc of ASSOCIATIONS) {
    const p = progress[assoc.sigla]
    if (p) {
      console.log(`  ${assoc.sigla}: ${p.churches} churches, ${p.records} records`)
    }
  }
}

main().catch(console.error)

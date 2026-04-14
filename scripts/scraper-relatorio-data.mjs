import { chromium } from 'playwright'
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'https://sdarm.app/secretaria/gs/'
const LOGIN_URL = 'https://sdarm.app/secretaria/new/'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = join(__dirname, 'backup')
const PROGRESS_FILE = join(OUTPUT_DIR, 'relatorio_progress_v5.json')
const SCREENSHOT_DIR = join(__dirname, 'screenshots')
const DELAY = 1000
const RELOGIN_INTERVAL = 30

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true })

const ASSOCIATIONS = [
  { id: 19, sigla: 'AMAPI' },
  { id: 6, sigla: 'ANOB' },
  { id: 20, sigla: 'ASCE' },
  { id: 4, sigla: 'ASPAR' },
  { id: 34, sigla: 'CAMAP' },
]

const YEARS = [2024, 2025]

// All numeric columns in order as shown in the pagina2 data table
// Column 0: Day number
// Column 1: Lugar das Atividades (text)
// Columns 2-13: Atividades Missionarias (12 fields)
// Columns 14-21: Horas Empregadas (8 fields)
// Columns 22-26: Despesas (5 fields)
const ALL_FIELDS = [
  'familias_visitadas', 'membros_visitados', 'interessados_visitados',
  'estudos_biblicos', 'sermoes_conferencias', 'cultos_residencias',
  'seminarios_palestras', 'folhetos_distribuidos', 'contatos_missionarios',
  'cartas_email', 'classes_batismais', 'funerais',
  'horas_viagens', 'horas_comissoes', 'horas_estudo_pessoal', 'horas_reunioes_igreja',
  'horas_escritorio', 'horas_diligencias', 'horas_aconselhamentos', 'horas_recebendo_visitas',
  'despesas_passagens', 'despesas_alimentacao', 'despesas_hotel',
  'despesas_comunicacao', 'despesas_km_rodados'
]

let pageCount = 0
let currentAssocId = null
let currentMissId = null
let debugCount = 0

function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) } catch { }
  }
  return { completed: {} }
}
function saveProgress(p) { writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)) }

async function login(page) {
  console.log('  [login]')
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 })
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  pageCount = 0
  currentAssocId = null
  currentMissId = null
}

async function ensureContext(page, assocId, missId) {
  pageCount++
  if (pageCount >= RELOGIN_INTERVAL) {
    await login(page)
  }
  if (currentAssocId !== assocId) {
    await page.goto(BASE + `index.php?action=cadastro&option=associacao&sub=trocar&associacao=${assocId}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(500)
    currentAssocId = assocId
    currentMissId = null
  }
  if (missId && currentMissId !== missId) {
    await page.goto(BASE + `index.php?action=relatorio&option=missionario&sub=trocar&miss=${missId}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(500)
    currentMissId = missId
  }
}

async function safeGoto(page, url, assocId, missId) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(DELAY)
  if (page.url().includes('/new/')) {
    console.log('  [session expired]')
    await login(page)
    currentAssocId = null
    currentMissId = null
    await ensureContext(page, assocId, missId)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(DELAY)
  }
}

async function getMissionaryList(page, assocId, year) {
  await ensureContext(page, assocId, null)
  const url = BASE + `index.php?action=relatorio&option=missionario&ano=${year}`
  await safeGoto(page, url, assocId, null)
  pageCount++

  return await page.evaluate(() => {
    const reportLinks = document.querySelectorAll('a[href*="visualizar_relatorio_missionario"]')
    const missMap = new Map()
    for (const link of reportLinks) {
      const href = link.getAttribute('href') || ''
      const missMatch = href.match(/miss=(\d+)/)
      const mesMatch = href.match(/mes=(\d+)/)
      if (!missMatch || !mesMatch) continue
      const missId = parseInt(missMatch[1])
      const month = parseInt(mesMatch[1])
      if (!missMap.has(missId)) {
        let name = ''
        let el = link
        while (el) {
          el = el.parentElement
          if (el && el.tagName === 'TR') {
            const parentTd = el.parentElement?.closest?.('td')
            if (parentTd) {
              const outerTr = parentTd.closest('tr')
              if (outerTr) {
                const nameLink = outerTr.querySelector('td:first-child a')
                if (nameLink) { name = nameLink.textContent.trim(); break }
              }
            }
          }
        }
        missMap.set(missId, { nome: name || `ID_${missId}`, missId, months: [] })
      }
      const entry = missMap.get(missId)
      if (!entry.months.includes(month)) entry.months.push(month)
    }
    return Array.from(missMap.values())
  })
}

async function scrapeReport(page, assocId, missId, year, month) {
  await ensureContext(page, assocId, missId)

  // pagina2 has the COMPLETE numeric data table (all activities + hours + expenses)
  const url = BASE + `visualizar_relatorio_missionario.php?mes=${month}&ano=${year}&miss=${missId}&pagina2`
  await safeGoto(page, url, assocId, missId)
  pageCount++

  // Debug
  if (debugCount < 2) {
    writeFileSync(join(SCREENSHOT_DIR, `rel_debug_${debugCount}.html`), await page.content())
    await page.screenshot({ path: join(SCREENSHOT_DIR, `rel_debug_${debugCount}.png`), fullPage: true })
    debugCount++
  }

  const result = await page.evaluate((fieldNames) => {
    const tables = document.querySelectorAll('table')
    let mainTable = null
    let maxScore = 0

    for (const table of tables) {
      const rows = table.querySelectorAll('tr')
      let dayCount = 0
      let maxCols = 0
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th')
        if (cells.length > maxCols) maxCols = cells.length
        if (cells.length >= 5) {
          const d = parseInt(cells[0]?.textContent?.trim())
          if (d >= 1 && d <= 31) dayCount++
        }
      }
      const score = dayCount * maxCols
      if (score > maxScore) { maxScore = score; mainTable = table }
    }

    if (!mainTable) {
      return { dados_diarios: [], totais: {}, resumo: {}, _debug: `no table (${tables.length} tables total)` }
    }

    const rows = mainTable.querySelectorAll('tr')
    const dados_diarios = []
    let totais = {}

    // Detect data column start:
    // Day | Location | Field1 | Field2 | ...
    // Location column has text like "CAETITE", look for it
    let dataColStart = 2 // default: skip day(0) + location(1)

    for (const row of rows) {
      const cells = row.querySelectorAll('th, td')
      const texts = Array.from(cells).map(c => c.textContent.trim().toLowerCase())
      if (texts.some(t => t.includes('lugar') || t.includes('atividade'))) {
        for (let i = 0; i < texts.length; i++) {
          if (texts[i].includes('lugar') || (texts[i].includes('atividade') && i < 3)) {
            dataColStart = i + 1
            break
          }
        }
        break
      }
    }

    for (const row of rows) {
      const cells = row.querySelectorAll('td, th')
      if (cells.length < dataColStart + 1) continue
      const firstVal = cells[0]?.textContent?.trim() || ''
      const dayNum = parseInt(firstVal)

      if (dayNum >= 1 && dayNum <= 31) {
        const dayData = { dia: dayNum }
        dayData.lugar = (cells[1]?.textContent?.trim() || '').substring(0, 50)
        for (let i = 0; i < fieldNames.length; i++) {
          const idx = dataColStart + i
          if (idx >= cells.length) break
          const raw = cells[idx]?.textContent?.trim() || ''
          const cleaned = raw.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
          const num = parseFloat(cleaned)
          dayData[fieldNames[i]] = isNaN(num) ? 0 : num
        }
        dados_diarios.push(dayData)
      }

      if (/somas?|total/i.test(firstVal)) {
        for (let i = 0; i < fieldNames.length; i++) {
          const idx = dataColStart + i
          if (idx >= cells.length) break
          const raw = cells[idx]?.textContent?.trim() || ''
          const cleaned = raw.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
          const num = parseFloat(cleaned)
          totais[fieldNames[i]] = isNaN(num) ? 0 : num
        }
      }
    }

    // Parse summary tables at the bottom
    const resumo = {}
    for (const table of tables) {
      if (table === mainTable) continue
      const tRows = table.querySelectorAll('tr')
      for (const row of tRows) {
        const cells = row.querySelectorAll('td, th')
        if (cells.length === 2) {
          const label = (cells[0]?.textContent?.trim() || '').toLowerCase()
          const valRaw = cells[1]?.textContent?.trim() || ''
          const cleaned = valRaw.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
          const num = parseFloat(cleaned)
          if (!isNaN(num)) {
            if (label.includes('fam')) resumo.familias_visitadas = num
            else if (label.includes('membros v')) resumo.membros_visitados = num
            else if (label.includes('interessados')) resumo.interessados_visitados = num
            else if (label.includes('estudo') && label.includes('b')) resumo.estudos_biblicos = num
            else if (label.includes('folheto')) resumo.folhetos_distribuidos = num
            else if (label.includes('contato')) resumo.contatos_missionarios = num
            else if (label.includes('viagen')) resumo.horas_viagens = num
            else if (label.includes('comiss')) resumo.horas_comissoes = num
            else if (label.includes('estudo p')) resumo.horas_estudo_pessoal = num
            else if (label.includes('reuni')) resumo.horas_reunioes_igreja = num
            else if (label.includes('escrit')) resumo.horas_escritorio = num
            else if (label.includes('dilig')) resumo.horas_diligencias = num
            else if (label.includes('carro')) resumo.despesas_km_carro = num
            else if (label.includes('moto')) resumo.despesas_km_moto = num
            else if (label.includes('aliment')) resumo.despesas_alimentacao = num
            else if (/^total$/.test(label)) resumo._total_geral = num
          }
        }
      }
    }

    return {
      dados_diarios,
      totais: Object.keys(totais).length > 0 ? totais : {},
      resumo,
      _debug: { rows: rows.length, dataColStart, tableCount: tables.length }
    }
  }, ALL_FIELDS)

  return result
}

async function main() {
  const progress = loadProgress()
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  page.setDefaultTimeout(30000)
  await login(page)

  let totalScraped = 0

  for (const assoc of ASSOCIATIONS) {
    console.log(`\n========== ${assoc.sigla} (id=${assoc.id}) ==========`)
    const outFile = join(OUTPUT_DIR, `relatorios_missionarios_${assoc.sigla}.json`)
    let allReports = []

    for (const year of YEARS) {
      console.log(`\n  --- ${assoc.sigla} ${year} ---`)
      const missionaries = await getMissionaryList(page, assoc.id, year)
      console.log(`  ${missionaries.length} missionaries with reports`)

      for (const miss of missionaries) {
        const pending = miss.months.filter(m => !progress.completed[`${assoc.sigla}_${miss.missId}_${year}_${m}`])
        if (pending.length === 0) continue

        console.log(`  ${miss.nome} (${miss.missId}): ${pending.length}mo`)

        for (const month of pending) {
          const key = `${assoc.sigla}_${miss.missId}_${year}_${month}`
          try {
            const r = await scrapeReport(page, assoc.id, miss.missId, year, month)
            allReports.push({
              missionario_nome: miss.nome,
              missionario_gs_id: miss.missId,
              associacao: assoc.sigla,
              ano: year,
              mes: month,
              dados_diarios: r.dados_diarios,
              totais: r.totais,
              resumo: r.resumo
            })
            progress.completed[key] = true
            saveProgress(progress)
            totalScraped++

            if (totalScraped % 10 === 0) writeFileSync(outFile, JSON.stringify(allReports, null, 2))

            const dc = r.dados_diarios.length
            const fc = dc > 0 ? Object.keys(r.dados_diarios[0]).filter(k => k !== 'dia' && k !== 'lugar').length : 0
            if (debugCount <= 3) {
              console.log(`    ${month}/${year}: ${dc}d ${fc}f | debug: ${JSON.stringify(r._debug)}`)
              if (dc > 0) console.log(`      day1: ${JSON.stringify(r.dados_diarios[0])}`)
              if (Object.keys(r.resumo).length) console.log(`      resumo: ${JSON.stringify(r.resumo)}`)
            } else {
              process.stdout.write(dc > 20 ? '.' : 'x')
            }
          } catch (err) {
            console.log(`    ${month}/${year}: ERR ${err.message}`)
            try { await page.screenshot({ path: join(SCREENSHOT_DIR, `err_${key}.png`) }) } catch { }
            try { await login(page) } catch { }
          }
        }
        // Print newline after dots
        if (debugCount > 3) process.stdout.write(' ')
      }
    }

    writeFileSync(outFile, JSON.stringify(allReports, null, 2))
    console.log(`\n  ${assoc.sigla}: ${allReports.length} reports saved`)
  }

  await browser.close()
  console.log(`\nDONE! Total: ${totalScraped}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })

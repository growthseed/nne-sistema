// scraper-anob-2026-q1.mjs
// Re-scrape ANOB ONLY for Feb + Mar 2026, discovering ALL churches.
// Output: scripts/backup/financeiro_ANOB_2026Q1.json (NEW file, does not touch existing backup)
// Run: node scripts/scraper-anob-2026-q1.mjs

import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

const BASE = 'https://secretaria.org.br/secretaria/gs/'
const LOGIN_URL = 'https://secretaria.org.br/secretaria/new'
const CPF = '02099493766'
const PASS = 'estrela'
const OUTPUT_DIR = 'scripts/backup'
const DELAY = 1200

const ASSOC = { id: 6, sigla: 'ANOB', nome: 'Associacao Nordeste Brasileira' }
const MONTHS = [
  { mes: 2, ano: 2026 },
  { mes: 3, ano: 2026 },
]

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

function parseMoneyBR(s) {
  if (!s || s === '-' || s.trim() === '') return 0
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

async function login(page) {
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.fill('input[name="login"]', CPF)
  await page.fill('input[name="senha"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
}

async function switchAssoc(page, assocId) {
  await page.goto(BASE + `index.php?action=cadastro&option=associacao&sub=trocar&associacao=${assocId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
}

async function discoverChurches(page) {
  // Navigate to churches list (not financeiro grid — that one missed 19)
  await page.goto(BASE + 'index.php?action=cadastro&option=igreja', { waitUntil: 'networkidle' })
  await page.waitForTimeout(DELAY)

  const links = await page.locator('a[href*="option=igreja&sub=visualizar"]').all()
  const churches = []
  for (const link of links) {
    const href = await link.getAttribute('href')
    const nome = (await link.textContent())?.trim()
    const m = href?.match(/igreja=(\d+)/)
    if (href && nome && m) {
      churches.push({ id: m[1], nome })
    }
  }
  // dedupe by id
  const seen = new Set()
  return churches.filter(c => seen.has(c.id) ? false : (seen.add(c.id), true))
}

async function scrapeMonthDetail(page, igrejaId, mes, ano) {
  const url = `${BASE}index.php?action=relatorio&option=financeiro&sub=listar&igreja=${igrejaId}&mes=${mes}/${ano}`

  // Retry up to 2 times if no table appears (handles slow renders)
  let tables = []
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    } catch {
      // Some pages stall on networkidle — fall back to domcontentloaded
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    }
    // Wait for at least one <table> to be present
    try {
      await page.waitForSelector('table', { timeout: 8000 })
    } catch { /* no table at all — likely truly empty */ }
    await page.waitForTimeout(DELAY)
    tables = await page.locator('table').all()
    if (tables.length >= 2) break
    if (attempt === 0) await page.waitForTimeout(1500)
  }
  if (tables.length < 2) return null

  const result = {
    igreja_id_old: igrejaId,
    mes, ano,
    responsavel: '', status: '', saldo_anterior: 0,
    recibos: [],
    totais: {
      dizimos: 0, primicias: 0, assistencia_social: 0, escola_sabatina: 0,
      evangelismo: 0, radio_colportagem: 0, construcao: 0, musica: 0,
      gratidao_6pct: 0, diversos_assoc: 0, soma_associacao: 0,
      caixa_local_entradas: 0, missoes_estrangeiras: 0, caixa_local_saidas: 0
    },
    ofertas_resumo: { cultos_construcao: 0, juvenil: 0, missionaria: 0, gratidao_pobres: 0, diversos: 0 },
    despesas_locais: [],
    pagamentos: [],
    soma_pagamentos: 0, caixa_associacao: 0, saldo_acerto: 0
  }

  // Header
  try {
    const headerRows = await tables[0].locator('tr').all()
    for (const row of headerRows) {
      const text = (await row.textContent())?.trim() || ''
      if (text.includes('Responsável:')) result.responsavel = text.replace(/.*Responsável:\s*/, '').trim()
      if (text.includes('Status:')) {
        const m = text.match(/Status:\s*(\w+)/)
        if (m) result.status = m[1]
      }
      if (text.includes('Saldo Anterior:')) {
        const m = text.match(/Saldo Anterior:\s*R\$\s*([\d.,]+)/)
        if (m) result.saldo_anterior = parseMoneyBR(m[1])
      }
    }
  } catch {}

  // Recibos table
  try {
    const dataRows = await tables[1].locator('tr').all()
    for (let r = 2; r < dataRows.length; r++) {
      // Read TDs by position (NOT filtered) — empty cells must be preserved
      const tdEls = await dataRows[r].locator('td').all()
      const cleaned = []
      for (const td of tdEls) {
        cleaned.push(((await td.textContent()) || '').trim())
      }

      if (r >= dataRows.length - 2) {
        if (r === dataRows.length - 2) {
          // Totals row: 15 cells [0..14]. cell[0]=label/empty, cells[1..14]=values
          // Layout: Diz | Pri | ASoc | ESab | Evang | RdCB | Const | Mus | Grt | Div | SOMA | MisEstr | CxLEnt | CxLSai
          if (cleaned.length >= 14) {
            const t = result.totais
            // First non-empty numeric cell is dizimos. Find offset (usually 1, but be safe)
            let offset = 0
            while (offset < cleaned.length && !/[\d]/.test(cleaned[offset])) offset++
            t.dizimos             = parseMoneyBR(cleaned[offset + 0] || '')
            t.primicias           = parseMoneyBR(cleaned[offset + 1] || '')
            t.assistencia_social  = parseMoneyBR(cleaned[offset + 2] || '')
            t.escola_sabatina     = parseMoneyBR(cleaned[offset + 3] || '')
            t.evangelismo         = parseMoneyBR(cleaned[offset + 4] || '')
            t.radio_colportagem   = parseMoneyBR(cleaned[offset + 5] || '')
            t.construcao          = parseMoneyBR(cleaned[offset + 6] || '')
            t.musica              = parseMoneyBR(cleaned[offset + 7] || '')
            t.gratidao_6pct       = parseMoneyBR(cleaned[offset + 8] || '')
            t.diversos_assoc      = parseMoneyBR(cleaned[offset + 9] || '')
            t.soma_associacao     = parseMoneyBR(cleaned[offset + 10] || '')
            t.missoes_estrangeiras = parseMoneyBR(cleaned[offset + 11] || '')
            t.caixa_local_entradas = parseMoneyBR(cleaned[offset + 12] || '')
            t.caixa_local_saidas   = parseMoneyBR(cleaned[offset + 13] || '')
          }
        }
        continue
      }

      const isRecibo = /^\d+\.\d+$/.test(cleaned[0])
      const isExpense = !isRecibo && /^\d{2}\/\d{2}$/.test(cleaned[0])

      if (isRecibo) {
        result.recibos.push({
          recibo: cleaned[0],
          data: cleaned[1] || '',
          nome: cleaned[2] || '',
          valores_raw: cleaned.slice(3).filter(Boolean)
        })
      } else if (isExpense) {
        result.despesas_locais.push({
          data: cleaned[0],
          descricao: cleaned[1] || '',
          valor: parseMoneyBR(cleaned[cleaned.length - 1])
        })
      }
    }
  } catch (e) {
    console.log(`    warn parse t1: ${e.message?.slice(0,60)}`)
  }

  // Ofertas resumo
  try {
    if (tables.length > 2) {
      const ofRows = await tables[2].locator('tr').all()
      for (const row of ofRows) {
        const cells = await row.locator('td, th').allTextContents()
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i].trim().toLowerCase()
          const nextVal = i + 1 < cells.length ? parseMoneyBR(cells[i + 1].trim()) : 0
          if (cell.includes('cultos') || cell.includes('construção')) result.ofertas_resumo.cultos_construcao = nextVal
          else if (cell.includes('juvenil')) result.ofertas_resumo.juvenil = nextVal
          else if (cell.includes('missionária') || cell.includes('missionaria')) result.ofertas_resumo.missionaria = nextVal
          else if (cell.includes('gratidão') || cell.includes('pobres')) result.ofertas_resumo.gratidao_pobres = nextVal
          else if (cell.includes('diversos')) result.ofertas_resumo.diversos = nextVal
        }
      }
    }
  } catch {}

  // Pagamentos
  try {
    if (tables.length > 3) {
      const pagRows = await tables[3].locator('tr').all()
      for (let r = 1; r < pagRows.length; r++) {
        const cells = await pagRows[r].locator('td, th').allTextContents()
        const cleaned = cells.map(c => c.trim())
        const joined = cleaned.join(' ')
        if (joined.includes('Soma de Pagamentos')) result.soma_pagamentos = parseMoneyBR(cleaned[cleaned.length - 1])
        else if (joined.includes('Caixa Associação')) result.caixa_associacao = parseMoneyBR(cleaned[cleaned.length - 1])
        else if (joined.includes('Saldo para Acerto')) result.saldo_acerto = parseMoneyBR(cleaned[cleaned.length - 1])
        else if (cleaned.length >= 3 && /^\d{2}\/\d{2}\/\d{4}$/.test(cleaned[0])) {
          result.pagamentos.push({
            data: cleaned[0],
            descricao: cleaned[1],
            valor: parseMoneyBR(cleaned[2])
          })
        }
      }
    }
  } catch {}

  return result
}

async function main() {
  const t0 = Date.now()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  console.log(`=== ANOB Q1 2026 re-scrape (Fev + Mar) ===`)
  console.log(`Started ${new Date().toISOString()}`)

  await login(page)
  console.log('Logged in')
  await switchAssoc(page, ASSOC.id)
  console.log(`Switched to ${ASSOC.sigla}`)

  const churches = await discoverChurches(page)
  console.log(`Discovered ${churches.length} churches in ANOB`)

  const out = []
  let okCount = 0, emptyCount = 0, errorCount = 0

  for (let ci = 0; ci < churches.length; ci++) {
    const ch = churches[ci]

    // re-login every 15 churches to avoid session expiry
    if (ci > 0 && ci % 15 === 0) {
      console.log('  (re-login)')
      await login(page)
      await switchAssoc(page, ASSOC.id)
    }

    console.log(`[${ci + 1}/${churches.length}] ${ch.nome} (id=${ch.id})`)

    for (const { mes, ano } of MONTHS) {
      try {
        const data = await scrapeMonthDetail(page, ch.id, mes, ano)
        if (data) {
          data.igreja_nome = ch.nome
          data.associacao = ASSOC.sigla
          out.push(data)
          const hasData = data.recibos.length > 0 || data.totais.dizimos > 0
          if (hasData) {
            okCount++
            console.log(`   ${mes}/${ano}: ${data.recibos.length} recibos | Diz R$${data.totais.dizimos.toFixed(2)} | Pri R$${data.totais.primicias.toFixed(2)} | status=${data.status}`)
          } else {
            emptyCount++
            console.log(`   ${mes}/${ano}: vazio`)
          }
        } else {
          emptyCount++
          console.log(`   ${mes}/${ano}: sem tabela (não publicado?)`)
        }
      } catch (e) {
        errorCount++
        console.log(`   ${mes}/${ano}: ERROR ${e.message?.slice(0, 80)}`)
      }
    }

    // incremental save every 10 churches
    if ((ci + 1) % 10 === 0) {
      writeFileSync(`${OUTPUT_DIR}/financeiro_ANOB_2026Q1.json`, JSON.stringify(out, null, 2))
    }
  }

  // final save
  writeFileSync(`${OUTPUT_DIR}/financeiro_ANOB_2026Q1.json`, JSON.stringify(out, null, 2))

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n=== DONE ===`)
  console.log(`Saved ${out.length} records → ${OUTPUT_DIR}/financeiro_ANOB_2026Q1.json`)
  console.log(`Stats: OK=${okCount} | Empty=${emptyCount} | Error=${errorCount}`)
  console.log(`Elapsed: ${elapsed}s`)

  // quick aggregate
  const byMonth = {}
  for (const r of out) {
    const k = `${r.ano}-${String(r.mes).padStart(2,'0')}`
    if (!byMonth[k]) byMonth[k] = { igrejas: 0, recibos: 0, dizimos: 0, primicias: 0, ofertas_assoc: 0 }
    byMonth[k].igrejas++
    byMonth[k].recibos += r.recibos.length
    byMonth[k].dizimos += r.totais.dizimos
    byMonth[k].primicias += r.totais.primicias
    byMonth[k].ofertas_assoc += (r.totais.soma_associacao - r.totais.dizimos - r.totais.primicias)
  }
  console.log('\nResumo por mês:')
  for (const k of Object.keys(byMonth).sort()) {
    const m = byMonth[k]
    console.log(`  ${k}: ${m.igrejas} igrejas, ${m.recibos} recibos | Dízimos R$${m.dizimos.toFixed(2)} | Primícias R$${m.primicias.toFixed(2)} | Ofertas Assoc R$${m.ofertas_assoc.toFixed(2)}`)
  }

  await browser.close()
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

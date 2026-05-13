#!/usr/bin/env node
/**
 * Scraper da Escola da Inteligência → campanhas_marketing
 *
 * Uso (local):
 *   1) Definir variáveis de ambiente (no .env.local ou export):
 *        EI_USER=hebersilvagomes@yahoo.com.br
 *        EI_PASS=2025
 *        SUPABASE_URL=https://prqxiqykkijzpwdpqujv.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=<service_role>
 *   2) node scripts/scrape-escola-inteligencia.mjs
 *
 * Flags:
 *   --headless=false   abre janela visível pra você ver o navegador
 *   --limit=10         pega só as primeiras N campanhas
 *   --dry-run          extrai mas não grava no Supabase
 *
 * Idempotência: cada campanha extraída tem origem_externa_id (URL/id do card).
 * Antes de inserir, busca por fonte='escola_inteligencia' + origem_externa_id;
 * se já existe, faz UPDATE; senão INSERT.
 */

import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ───────── env loading (.env.local fallback) ─────────────────────────────
const ROOT = dirname(fileURLToPath(import.meta.url))
const ENV_FILE = join(ROOT, '..', '.env.local')
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const args = process.argv.slice(2)
const HEADLESS = !args.includes('--headless=false')
const DRY_RUN = args.includes('--dry-run')
const LIMIT_ARG = args.find(a => a.startsWith('--limit='))
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1], 10) : 0

const EI_USER = process.env.EI_USER
const EI_PASS = process.env.EI_PASS
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://prqxiqykkijzpwdpqujv.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!EI_USER || !EI_PASS) {
  console.error('❌ EI_USER e EI_PASS são obrigatórios (no .env.local ou env vars).')
  process.exit(1)
}
if (!DRY_RUN && !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY obrigatório (a menos que use --dry-run).')
  process.exit(1)
}

const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ───────── helpers ───────────────────────────────────────────────────────
function classifyTipo(titulo, descricao) {
  const t = `${titulo} ${descricao || ''}`.toLowerCase()
  if (/anivers/.test(t)) return 'aniversario'
  if (/instagram|post.*ig/.test(t)) return 'post_instagram'
  if (/whatsapp|status/.test(t)) return 'post_whatsapp'
  if (/facebook/.test(t)) return 'post_facebook'
  if (/banner/.test(t)) return 'banner_site'
  if (/flyer|impress/.test(t)) return 'flyer_impressao'
  if (/story|stories/.test(t)) return 'story'
  if (/reels/.test(t)) return 'reels'
  if (/v[íi]deo|mp4/.test(t)) return 'video'
  return 'outro'
}

function classifyCategoria(titulo, descricao) {
  const t = `${titulo} ${descricao || ''}`.toLowerCase()
  if (/anivers/.test(t)) return 'aniversario'
  if (/escola sabatina|sabbath/.test(t)) return 'escola_sabatina'
  if (/miss|evangel/.test(t)) return 'missoes'
  if (/jovem|jovens|adolesc/.test(t)) return 'jovens'
  if (/crian[çc]a|kids/.test(t)) return 'criancas'
  if (/idosos|terceira idade/.test(t)) return 'terceira_idade'
  if (/fam[íi]lia|casamento/.test(t)) return 'familia'
  if (/sa[úu]de|bem.estar/.test(t)) return 'saude'
  if (/mulher|f[êe]minino/.test(t)) return 'mulheres'
  if (/homem|masculino/.test(t)) return 'homens'
  if (/m[úu]sica/.test(t)) return 'musica'
  if (/independ[êe]ncia|p[áa]tria|cívica/.test(t)) return 'data_civica'
  if (/bem.vindo|boas.vindas/.test(t)) return 'bem_vindo'
  if (/convite/.test(t)) return 'conviteespecial'
  return 'geral'
}

async function uploadToSupabase(buffer, filename) {
  const ext = (filename.split('.').pop() || 'png').toLowerCase()
  const path = `campanhas/scrape_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  const contentType = ext === 'pdf' ? 'application/pdf'
    : ext === 'mp4' ? 'video/mp4'
    : ext === 'webp' ? 'image/webp'
    : ext === 'gif' ? 'image/gif'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : 'image/png'
  const { error } = await supabase.storage.from('marketing').upload(path, buffer, { contentType, upsert: false })
  if (error) throw error
  return supabase.storage.from('marketing').getPublicUrl(path).data.publicUrl
}

// ───────── main scraping flow ────────────────────────────────────────────
async function main() {
  console.log(`▶ Iniciando scrape (headless=${HEADLESS}, dry-run=${DRY_RUN}, limit=${LIMIT || 'all'})`)
  const browser = await chromium.launch({ headless: HEADLESS })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    // ── 1) LOGIN ─────────────────────────────────────────────────────────
    console.log('▶ Abrindo página de login...')
    await page.goto('https://portal.escoladainteligencia.com.br/login', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'scripts/debug_01_login_page.png', fullPage: true })
    console.log('  → screenshot scripts/debug_01_login_page.png')

    // Lista TODOS os inputs e botões pra debug
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
        type: i.type, name: i.name, id: i.id, placeholder: i.placeholder,
        ariaLabel: i.getAttribute('aria-label'),
      }))
      const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
        type: b.type, text: b.textContent?.trim().slice(0, 40),
      }))
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action, method: f.method, id: f.id,
      }))
      return { url: location.href, title: document.title, inputs, buttons, forms }
    })
    console.log('  Form info:', JSON.stringify(formInfo, null, 2))

    // Tenta seletores comuns de login
    const emailInput = page.locator('input[type="email"], input[name="email"], input#email, input[name="username"], input[name="login"]').first()
    const passInput  = page.locator('input[type="password"], input[name="password"], input#password').first()
    await emailInput.waitFor({ timeout: 15000 })
    await emailInput.fill(EI_USER)
    await passInput.fill(EI_PASS)
    await page.screenshot({ path: 'scripts/debug_02_filled.png', fullPage: true })

    // Botão de login
    const loginBtn = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Acessar"), input[type="submit"]').first()
    await loginBtn.click()
    await page.waitForTimeout(5000)  // aguarda redirecionamento e/ou mensagem de erro
    await page.screenshot({ path: 'scripts/debug_03_after_login.png', fullPage: true })

    const finalUrl = page.url()
    console.log('  URL após login:', finalUrl)

    // Captura mensagens de erro visíveis
    const errMsg = await page.evaluate(() => {
      const candidates = document.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"], [class*="danger"]')
      return Array.from(candidates).map(e => e.textContent?.trim()).filter(t => t && t.length < 200).slice(0, 5)
    })
    if (errMsg.length > 0) console.log('  ⚠ Mensagens visíveis:', errMsg)

    if (finalUrl.includes('/login') || finalUrl.includes('signin')) {
      throw new Error('Login falhou — URL ainda em /login. Verifique credenciais ou inspecione debug_03_after_login.png.')
    }
    console.log('✓ Login confirmado:', finalUrl)

    // ── 2) IR PARA /home → inspecionar estrutura → tentar /campanhas ─────
    await page.goto('https://portal.escoladainteligencia.com.br/home', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: 'scripts/debug_04_home.png', fullPage: true })
    console.log('▶ /home aberto, screenshot scripts/debug_04_home.png')

    // Lista links e seções pra entender estrutura
    const homeInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent?.trim().slice(0, 50), href: a.getAttribute('href'),
      })).filter(l => l.href && l.text)
      const imgs = Array.from(document.querySelectorAll('img')).slice(0, 30).map(i => ({
        alt: i.alt, src: i.src, w: i.naturalWidth, h: i.naturalHeight,
      })).filter(i => i.src && !i.src.endsWith('logo.png'))
      return { url: location.href, title: document.title, links: links.slice(0, 50), imgs: imgs.slice(0, 30) }
    })
    console.log('  Home links (50):', JSON.stringify(homeInfo.links, null, 2))
    console.log('  Home imgs (30):', JSON.stringify(homeInfo.imgs, null, 2))

    // Tenta navegar para /campanhas se aparecer no menu
    const campanhaLink = homeInfo.links.find(l =>
      /campanh|cart[oõ]es|materiais|marketing|posts?/i.test(l.text || '') ||
      /campanh|cart|material|marketing/i.test(l.href || ''),
    )
    if (campanhaLink) {
      const url = campanhaLink.href.startsWith('http') ? campanhaLink.href : `https://portal.escoladainteligencia.com.br${campanhaLink.href}`
      console.log(`▶ Indo para ${url} (texto: "${campanhaLink.text}")`)
      await page.goto(url, { waitUntil: 'networkidle' })
      await page.waitForTimeout(2500)
      await page.screenshot({ path: 'scripts/debug_05_campanhas.png', fullPage: true })
    } else {
      console.log('⚠ Nenhum link de "campanhas/materiais" encontrado no /home — continuando no /home mesmo.')
    }

    // Scroll até o fim pra carregar lazy loading (se houver)
    let prevHeight = 0
    for (let i = 0; i < 20; i++) {
      const h = await page.evaluate(() => document.body.scrollHeight)
      if (h === prevHeight) break
      prevHeight = h
      await page.mouse.wheel(0, 2000)
      await page.waitForTimeout(800)
    }
    await page.screenshot({ path: 'scripts/debug_06_after_scroll.png', fullPage: true })

    // ── 3) EXTRAIR CARDS ─────────────────────────────────────────────────
    // AJUSTE os seletores aqui depois de inspecionar o DOM real do site.
    // Heurística inicial: cards com imagem + título + link.
    const cards = await page.$$eval('a[href*="campanha"], .card, [class*="campanha"]', els =>
      els.map(el => {
        const img = el.querySelector('img')
        const titulo = el.querySelector('h1, h2, h3, h4, .title, [class*="title"]')?.textContent?.trim()
                   || el.querySelector('img')?.getAttribute('alt')
                   || el.textContent?.trim().slice(0, 80)
                   || ''
        const link = el.tagName === 'A' ? el.getAttribute('href') : el.querySelector('a')?.getAttribute('href') || null
        const desc = el.querySelector('p, .desc, [class*="desc"]')?.textContent?.trim() || null
        return {
          titulo,
          descricao: desc,
          imagemSrc: img?.getAttribute('src') || img?.getAttribute('data-src') || null,
          link,
        }
      }).filter(c => c.titulo && c.imagemSrc),
    )

    console.log(`✓ ${cards.length} cards extraídos (raw)`)
    const unique = Array.from(new Map(cards.map(c => [c.imagemSrc, c])).values())
    console.log(`✓ ${unique.length} cards únicos (dedupe por imagem)`)

    const toProcess = LIMIT > 0 ? unique.slice(0, LIMIT) : unique
    console.log(`▶ Processando ${toProcess.length} campanhas...`)

    // ── 4) DOWNLOAD + UPLOAD + UPSERT ───────────────────────────────────
    let inserted = 0, updated = 0, skipped = 0, errors = 0
    for (const [i, card] of toProcess.entries()) {
      const tipo = classifyTipo(card.titulo, card.descricao)
      const categoria = classifyCategoria(card.titulo, card.descricao)
      const origemId = card.link || card.imagemSrc

      try {
        if (DRY_RUN) {
          console.log(`  [${i + 1}/${toProcess.length}] ${tipo}/${categoria}: ${card.titulo.slice(0, 60)}`)
          continue
        }

        // Já existe?
        const { data: existing } = await supabase
          .from('campanhas_marketing')
          .select('id')
          .eq('fonte', 'escola_inteligencia')
          .eq('origem_externa_id', origemId)
          .maybeSingle()

        // Baixa a imagem da fonte externa
        const imgUrl = card.imagemSrc.startsWith('http') ? card.imagemSrc
                     : `https://portal.escoladainteligencia.com.br${card.imagemSrc}`
        const resp = await page.context().request.get(imgUrl)
        if (!resp.ok()) { console.warn(`  ⚠ falha img ${imgUrl}`); errors++; continue }
        const buf = await resp.body()
        const filename = imgUrl.split('/').pop() || 'image.png'
        const uploadedUrl = await uploadToSupabase(buf, filename)

        const payload = {
          titulo: card.titulo,
          descricao: card.descricao,
          tipo,
          categoria,
          midia_urls: [uploadedUrl],
          thumbnail_url: uploadedUrl,
          fonte: 'escola_inteligencia',
          origem_externa_id: origemId,
          origem_externa_url: card.link?.startsWith('http')
            ? card.link
            : `https://portal.escoladainteligencia.com.br${card.link || ''}`,
        }

        if (existing) {
          await supabase.from('campanhas_marketing').update(payload).eq('id', existing.id)
          updated++
        } else {
          await supabase.from('campanhas_marketing').insert(payload)
          inserted++
        }
        console.log(`  [${i + 1}/${toProcess.length}] ✓ ${existing ? 'upd' : 'ins'}: ${card.titulo.slice(0, 60)}`)
      } catch (e) {
        console.warn(`  ✗ [${i + 1}] ${e?.message || e}`)
        errors++
      }
    }

    console.log(`\n✓ Concluído. ${inserted} inseridas · ${updated} atualizadas · ${skipped} puladas · ${errors} erros.`)
  } finally {
    await browser.close()
  }
}

main().catch(e => {
  console.error('❌ Falha geral:', e)
  process.exit(1)
})

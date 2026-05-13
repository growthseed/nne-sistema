#!/usr/bin/env node
/**
 * Importa campanhas de uma pasta local → campanhas_marketing
 *
 * Use quando o scraper Playwright não funcionar (site fechado, layout
 * dinâmico, paywall, etc.). Você baixa os arquivos manualmente para
 * uma pasta e este script faz o upload em massa.
 *
 * Estrutura esperada da pasta:
 *
 *   campanhas/
 *     aniversario/
 *       cartao-feliz-aniversario.png
 *       cartao-feliz-aniversario.json   (opcional, metadata)
 *       cartao-50-anos.png
 *     post_instagram/
 *       missoes-2026.jpg
 *     post_whatsapp/
 *       boas-vindas.png
 *     ...
 *
 * O script lê cada subpasta (= tipo), cada arquivo (= campanha), e
 * o JSON opcional com mesmo nome para metadados extras.
 *
 * JSON opcional (qualquer chave é opcional):
 *   {
 *     "titulo": "Feliz Aniversário 2026",
 *     "categoria": "aniversario",
 *     "descricao": "Cartão padrão para felicitar membros no aniversário.",
 *     "texto_legenda": "Hoje é um dia especial! ...",
 *     "texto_compartilhar": "Olá! Parabéns! ...",
 *     "hashtags": ["aniversario", "igrejanne", "deusabencoe"],
 *     "publico": true,
 *     "destaque": false
 *   }
 *
 * Uso:
 *   node scripts/import-campanhas-pasta.mjs --pasta=./campanhas-bkp
 *   node scripts/import-campanhas-pasta.mjs --pasta=./campanhas-bkp --dry-run
 *
 * Idempotência: usa origem_externa_id = caminho relativo do arquivo,
 * fonte = 'pasta_local'. Rodar de novo só atualiza ou pula.
 */

import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync, existsSync } from 'fs'
import { join, basename, extname, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const ENV_FILE = join(ROOT, '..', '.env.local')
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const args = process.argv.slice(2)
const PASTA_ARG = args.find(a => a.startsWith('--pasta='))
const PASTA = PASTA_ARG ? PASTA_ARG.split('=')[1] : null
const DRY_RUN = args.includes('--dry-run')

if (!PASTA) {
  console.error('❌ Uso: node scripts/import-campanhas-pasta.mjs --pasta=./caminho-da-pasta [--dry-run]')
  process.exit(1)
}
if (!existsSync(PASTA)) {
  console.error(`❌ Pasta não encontrada: ${PASTA}`)
  process.exit(1)
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env.local')
  process.exit(1)
}

const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TIPOS_VALIDOS = new Set([
  'aniversario', 'post_instagram', 'post_whatsapp', 'post_facebook',
  'banner_site', 'flyer_impressao', 'story', 'reels', 'video', 'outro',
])

const EXTENSOES_MIDIA = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.mp4', '.pdf'])

function contentTypeFor(ext) {
  return ext === '.pdf' ? 'application/pdf'
    : ext === '.mp4' ? 'video/mp4'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif' ? 'image/gif'
    : ext === '.svg' ? 'image/svg+xml'
    : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : 'image/png'
}

function titleFromFilename(name) {
  return basename(name, extname(name))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

async function uploadBuffer(buffer, ext) {
  const path = `campanhas/import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
  const { error } = await supabase.storage.from('marketing').upload(path, buffer, {
    contentType: contentTypeFor(ext),
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from('marketing').getPublicUrl(path).data.publicUrl
}

async function processarPasta() {
  console.log(`▶ Importando de ${PASTA} (dry-run=${DRY_RUN})\n`)

  const tiposPastas = readdirSync(PASTA, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)

  if (tiposPastas.length === 0) {
    console.error(`❌ Nenhuma subpasta encontrada em ${PASTA}.`)
    console.error('   Crie subpastas com nome do tipo, ex: aniversario/, post_instagram/...')
    return
  }

  let inserted = 0, updated = 0, skipped = 0, errors = 0

  for (const tipoPasta of tiposPastas) {
    const tipo = TIPOS_VALIDOS.has(tipoPasta) ? tipoPasta : 'outro'
    if (tipo !== tipoPasta) {
      console.warn(`⚠ Subpasta "${tipoPasta}" não é tipo válido → classificada como 'outro'`)
    }
    const tipoDir = join(PASTA, tipoPasta)
    const arquivos = readdirSync(tipoDir).filter(f => EXTENSOES_MIDIA.has(extname(f).toLowerCase()))
    if (arquivos.length === 0) { console.log(`  [${tipoPasta}] vazia, pulando.`); continue }
    console.log(`▶ [${tipoPasta}] ${arquivos.length} arquivos`)

    for (const arquivo of arquivos) {
      const fullPath = join(tipoDir, arquivo)
      const ext = extname(arquivo).toLowerCase()
      const baseSem = basename(arquivo, ext)
      const jsonPath = join(tipoDir, `${baseSem}.json`)
      const origemId = `${tipoPasta}/${arquivo}`

      // metadata opcional
      let meta = {}
      if (existsSync(jsonPath)) {
        try { meta = JSON.parse(readFileSync(jsonPath, 'utf8')) }
        catch (e) { console.warn(`  ⚠ JSON inválido em ${jsonPath}: ${e.message}`) }
      }

      try {
        if (DRY_RUN) {
          console.log(`  ✓ [dry] ${arquivo} → ${tipo} / ${meta.categoria || 'geral'} / "${meta.titulo || titleFromFilename(arquivo)}"`)
          continue
        }

        // Já existe? (idempotência por arquivo)
        const { data: existing } = await supabase
          .from('campanhas_marketing')
          .select('id')
          .eq('fonte', 'pasta_local')
          .eq('origem_externa_id', origemId)
          .maybeSingle()

        const buf = readFileSync(fullPath)
        const stat = statSync(fullPath)
        if (stat.size > 20 * 1024 * 1024) {
          console.warn(`  ⚠ ${arquivo} maior que 20MB, pulando.`)
          skipped++; continue
        }
        const url = await uploadBuffer(buf, ext)

        const payload = {
          titulo: meta.titulo || titleFromFilename(arquivo),
          descricao: meta.descricao || null,
          tipo,
          categoria: meta.categoria || (tipo === 'aniversario' ? 'aniversario' : 'geral'),
          midia_urls: [url],
          thumbnail_url: url,
          texto_legenda: meta.texto_legenda || null,
          texto_compartilhar: meta.texto_compartilhar || null,
          hashtags: Array.isArray(meta.hashtags) ? meta.hashtags : null,
          publico: meta.publico === true,
          destaque: meta.destaque === true,
          fonte: 'pasta_local',
          origem_externa_id: origemId,
        }

        if (existing) {
          await supabase.from('campanhas_marketing').update(payload).eq('id', existing.id)
          updated++
          console.log(`  ✓ upd ${arquivo}`)
        } else {
          await supabase.from('campanhas_marketing').insert(payload)
          inserted++
          console.log(`  ✓ ins ${arquivo}`)
        }
      } catch (e) {
        console.error(`  ✗ ${arquivo}: ${e?.message || e}`)
        errors++
      }
    }
  }

  console.log(`\n✓ Concluído. ${inserted} inseridas · ${updated} atualizadas · ${skipped} puladas · ${errors} erros.`)
}

processarPasta().catch(e => { console.error('❌', e); process.exit(1) })

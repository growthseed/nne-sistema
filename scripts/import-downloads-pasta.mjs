#!/usr/bin/env node
/**
 * Importa materiais de uma pasta local → downloads_items + downloads_files
 *
 * Estrutura esperada:
 *
 *   downloads/
 *     escola-sabatina/                    ← slug da categoria
 *       chave-mestra-2o-tri-2026/         ← slug do item
 *         _meta.json                      ← (opcional) metadata do item
 *         capa.png                        ← (opcional) thumbnail
 *         rol-do-berco.pdf                ← arquivos do item
 *         infantis.pdf
 *         pre-adolescentes.pdf
 *       outro-item/...
 *     ministerio-crianca/
 *       ...
 *
 * _meta.json (TODOS os campos opcionais):
 *   {
 *     "titulo": "Chave Mestra - 2º Trimestre 2026",
 *     "subtitulo": "Materiais para professores",
 *     "descricao": "Suggestions, programs e projetos...",
 *     "subcategoria_slug": "manuais-e-guias",
 *     "subcategoria_nome": "Manuais e Guias",
 *     "ano": 2026,
 *     "trimestre": 2,
 *     "publicado_em": "2026-03-03",
 *     "idioma": "pt-BR",
 *     "tags": ["criancas", "adolescentes", "escola-sabatina"],
 *     "destaque": true,
 *     "publico": true,
 *     "origem_externa_url": "https://downloads.adventistas.org/pt/...",
 *     "arquivos": {
 *       "rol-do-berco.pdf": { "rotulo": "Rol do Berço e Jardim da Infância", "ordem": 1 },
 *       "infantis.pdf":     { "rotulo": "Infantis e Primários",               "ordem": 2 }
 *     }
 *   }
 *
 * Uso:
 *   node scripts/import-downloads-pasta.mjs --pasta=./downloads-bkp
 *   node scripts/import-downloads-pasta.mjs --pasta=./downloads-bkp --dry-run
 *
 * Idempotência: usa downloads_items.slug (= nome da subpasta) e
 * downloads_files.url (público). Rodar 2x não duplica.
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
  console.error('❌ Uso: node scripts/import-downloads-pasta.mjs --pasta=./caminho [--dry-run]')
  process.exit(1)
}
if (!existsSync(PASTA)) {
  console.error(`❌ Pasta não encontrada: ${PASTA}`)
  process.exit(1)
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.')
  process.exit(1)
}

const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EXTENSOES_MIDIA = new Set([
  '.pdf', '.epub', '.mobi', '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.svg', '.mp4', '.zip', '.docx', '.pptx', '.xlsx',
])

function mimeFor(ext) {
  const e = ext.toLowerCase()
  if (e === '.pdf') return 'application/pdf'
  if (e === '.epub') return 'application/epub+zip'
  if (e === '.mobi') return 'application/x-mobipocket-ebook'
  if (e === '.png') return 'image/png'
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg'
  if (e === '.webp') return 'image/webp'
  if (e === '.gif') return 'image/gif'
  if (e === '.svg') return 'image/svg+xml'
  if (e === '.mp4') return 'video/mp4'
  if (e === '.zip') return 'application/zip'
  if (e === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (e === '.pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (e === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  return 'application/octet-stream'
}

function titleFromName(name) {
  return basename(name, extname(name))
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

async function uploadBuffer(buf, ext, categoriaSlug, itemSlug, filename) {
  const safe = (filename || `file${ext}`).replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `${categoriaSlug}/${itemSlug}/${Date.now()}_${safe}`
  const { error } = await supabase.storage.from('downloads').upload(path, buf, {
    contentType: mimeFor(ext),
    upsert: false,
  })
  if (error) throw error
  return supabase.storage.from('downloads').getPublicUrl(path).data.publicUrl
}

async function getOrCreateSubcategoria(categoriaId, slug, nome) {
  const { data: existing } = await supabase
    .from('downloads_subcategorias')
    .select('id')
    .eq('categoria_id', categoriaId)
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return existing.id
  const { data: nova, error } = await supabase
    .from('downloads_subcategorias')
    .insert({ categoria_id: categoriaId, slug, nome })
    .select('id').single()
  if (error) throw error
  return nova.id
}

async function processar() {
  console.log(`▶ Importando de ${PASTA} (dry-run=${DRY_RUN})\n`)

  const categoriasPastas = readdirSync(PASTA, { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => e.name)

  if (categoriasPastas.length === 0) {
    console.error('❌ Nenhuma subpasta de categoria encontrada.')
    return
  }

  let itemsCreated = 0, itemsUpdated = 0, filesAdded = 0, errors = 0

  for (const catSlug of categoriasPastas) {
    let categoriaId = null
    if (!DRY_RUN) {
      const { data: cat } = await supabase
        .from('downloads_categorias').select('id, nome').eq('slug', catSlug).maybeSingle()
      if (!cat) {
        console.warn(`⚠ Categoria "${catSlug}" não existe — pulando. Crie em downloads_categorias antes.`)
        continue
      }
      categoriaId = cat.id
      console.log(`▶ [${cat.nome}] (${catSlug})`)
    } else {
      console.log(`▶ [dry] categoria: ${catSlug}`)
    }

    const catDir = join(PASTA, catSlug)
    const itemSlugs = readdirSync(catDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name)

    for (const itemSlug of itemSlugs) {
      const itemDir = join(catDir, itemSlug)
      const metaPath = join(itemDir, '_meta.json')
      let meta = {}
      if (existsSync(metaPath)) {
        try { meta = JSON.parse(readFileSync(metaPath, 'utf8')) }
        catch (e) { console.warn(`  ⚠ _meta.json inválido em ${itemDir}: ${e.message}`) }
      }

      const arquivos = readdirSync(itemDir)
        .filter(f => f !== '_meta.json' && EXTENSOES_MIDIA.has(extname(f).toLowerCase()))

      if (arquivos.length === 0) {
        console.log(`  ⚠ [${itemSlug}] sem arquivos`); continue
      }

      try {
        // Identifica a capa (arquivo capa.* OU primeiro arquivo de imagem)
        const capaFile = arquivos.find(f => /^capa\./i.test(f))
                      || arquivos.find(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
        let capaUrl = null

        if (DRY_RUN) {
          console.log(`  ✓ [dry] ${itemSlug}: ${arquivos.length} arquivo(s)${capaFile ? ` (capa=${capaFile})` : ''}`)
          continue
        }

        // Sobe capa primeiro (se tiver)
        if (capaFile) {
          const ext = extname(capaFile).toLowerCase()
          const buf = readFileSync(join(itemDir, capaFile))
          capaUrl = await uploadBuffer(buf, ext, catSlug, itemSlug, capaFile)
        }

        // Subcategoria opcional
        let subcategoriaId = null
        if (meta.subcategoria_slug && meta.subcategoria_nome) {
          subcategoriaId = await getOrCreateSubcategoria(categoriaId, meta.subcategoria_slug, meta.subcategoria_nome)
        }

        const itemPayload = {
          slug: itemSlug,
          titulo: meta.titulo || titleFromName(itemSlug),
          subtitulo: meta.subtitulo || null,
          descricao: meta.descricao || null,
          categoria_id: categoriaId,
          subcategoria_id: subcategoriaId,
          capa_url: capaUrl,
          publicado_em: meta.publicado_em || null,
          trimestre: meta.trimestre || null,
          ano: meta.ano || null,
          idioma: meta.idioma || 'pt-BR',
          tags: Array.isArray(meta.tags) ? meta.tags : [],
          destaque: meta.destaque === true,
          publico: meta.publico !== false,  // default true
          fonte: 'pasta_local',
          origem_externa_url: meta.origem_externa_url || null,
        }

        // Upsert por slug
        const { data: existing } = await supabase
          .from('downloads_items').select('id').eq('slug', itemSlug).maybeSingle()
        let itemId
        if (existing) {
          await supabase.from('downloads_items').update(itemPayload).eq('id', existing.id)
          itemId = existing.id
          itemsUpdated++
          console.log(`  ✓ upd item ${itemSlug}`)
        } else {
          const { data: ins, error: insErr } = await supabase
            .from('downloads_items').insert(itemPayload).select('id').single()
          if (insErr) throw insErr
          itemId = ins.id
          itemsCreated++
          console.log(`  ✓ new item ${itemSlug}`)
        }

        // Sobe os arquivos (exceto a capa, que já foi)
        const semCapa = arquivos.filter(f => f !== capaFile)
        const arqMeta = meta.arquivos || {}

        // Limpa files antigos pra reimportar limpo
        if (existing) {
          await supabase.from('downloads_files').delete().eq('item_id', itemId)
        }

        for (const [idx, arquivo] of semCapa.entries()) {
          const ext = extname(arquivo).toLowerCase()
          const fullPath = join(itemDir, arquivo)
          const stat = statSync(fullPath)
          if (stat.size > 100 * 1024 * 1024) {
            console.warn(`    ⚠ ${arquivo} > 100MB, pulando.`)
            continue
          }
          const buf = readFileSync(fullPath)
          const url = await uploadBuffer(buf, ext, catSlug, itemSlug, arquivo)
          const am = arqMeta[arquivo] || {}
          await supabase.from('downloads_files').insert({
            item_id: itemId,
            rotulo: am.rotulo || titleFromName(arquivo),
            formato: ext.replace('.', ''),
            url,
            filename: arquivo,
            tamanho_bytes: stat.size,
            mime_type: mimeFor(ext),
            ordem: am.ordem || (idx + 1) * 10,
          })
          filesAdded++
        }
      } catch (e) {
        console.error(`  ✗ [${itemSlug}] ${e?.message || e}`)
        errors++
      }
    }
  }

  console.log(`\n✓ ${itemsCreated} criados · ${itemsUpdated} atualizados · ${filesAdded} arquivos · ${errors} erros.`)
}

processar().catch(e => { console.error('❌', e); process.exit(1) })

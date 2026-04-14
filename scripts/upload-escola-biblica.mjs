/**
 * Upload completo dos pontos da Escola Bíblica para Supabase
 * Fonte: C:\Users\EFEITO DIGITAL\Vida Pllena APP\escola_biblica\
 * Destino: tabela eb_pontos no Supabase NNE
 *
 * Uso: node scripts/upload-escola-biblica.mjs [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://prqxiqykkijzpwdpqujv.supabase.co'
// Use service role or anon key - anon with RLS should work since authenticated
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_KEY) {
  // Try reading from .env
  const envPath = path.join(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const match = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)
    if (match) {
      var key = match[1].trim()
    }
  }
  if (!key) {
    console.error('SUPABASE_KEY not found. Set VITE_SUPABASE_ANON_KEY in .env')
    process.exit(1)
  }
}

const supabase = createClient(SUPABASE_URL, key || SUPABASE_KEY)
const DRY_RUN = process.argv.includes('--dry-run')
const BASE_PATH = 'C:/Users/EFEITO DIGITAL/Vida Pllena APP/escola_biblica'

// Map Firestore field names to Supabase column names
function mapPonto(raw, moduloId) {
  return {
    modulo_id: moduloId,
    ponto_numero: raw.pontoNumero || raw.numero,
    titulo: raw.titulo,
    subtitulo: raw.subtitulo || null,
    introducao: raw.introducao || null,
    imagem_url: raw.imagemUrl || null,
    video_url: raw.videoUrl || null,
    video_thumbnail: raw.videoThumbnail || null,
    secoes: raw.secoes || [],
    // Map perguntas: respostaCorreta → resposta_correta
    perguntas: (raw.perguntas || []).map(p => ({
      id: p.id,
      numero: p.numero,
      texto: p.texto,
      opcoes: p.opcoes,
      resposta_correta: p.respostaCorreta,
      explicacao: p.explicacao || '',
      referencias: p.referencias || [],
    })),
    compromissos_fe: raw.compromissosFe || [],
  }
}

async function uploadModulo(moduloId, filePrefix, filePattern) {
  const dir = path.join(BASE_PATH, moduloId)

  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`)
    return
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.match(filePattern) && f.endsWith('.json') && f !== 'indice.json' && f !== 'README.md' && f !== '_firestore_schema.json')
    .sort()

  console.log(`\n📚 ${moduloId}: ${files.length} arquivos encontrados`)

  let uploaded = 0
  let errors = 0

  for (const file of files) {
    const filePath = path.join(dir, file)
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const ponto = mapPonto(raw, moduloId)

    const numPerguntas = ponto.perguntas.length
    const numCompromissos = ponto.compromissos_fe.length
    const numSecoes = ponto.secoes.length

    if (DRY_RUN) {
      console.log(`  [DRY] ${file} → Ponto ${ponto.ponto_numero}: "${ponto.titulo}" (${numPerguntas} perguntas, ${numCompromissos} compromissos, ${numSecoes} seções)`)
      uploaded++
      continue
    }

    // Upsert (insert or update on conflict)
    const { error } = await supabase
      .from('eb_pontos')
      .upsert(ponto, { onConflict: 'modulo_id,ponto_numero' })

    if (error) {
      console.error(`  ❌ ${file}: ${error.message}`)
      errors++
    } else {
      console.log(`  ✅ Ponto ${ponto.ponto_numero}: "${ponto.titulo}" (${numPerguntas}P, ${numCompromissos}C)`)
      uploaded++
    }
  }

  console.log(`  → ${uploaded} uploaded, ${errors} errors`)
  return { uploaded, errors }
}

async function main() {
  console.log('🚀 Upload Escola Bíblica para Supabase NNE')
  console.log(`   URL: ${SUPABASE_URL}`)
  console.log(`   Dry run: ${DRY_RUN}`)
  console.log(`   Source: ${BASE_PATH}`)

  // Upload Princípios de Fé (ponto_01.json ... ponto_37.json)
  const pf = await uploadModulo('principios_fe', 'ponto_', /^ponto_\d+/)

  // Upload Crenças Fundamentais (tema_01.json ... tema_25.json)
  const cf = await uploadModulo('crencas_fundamentais', 'tema_', /^tema_\d+/)

  console.log('\n📊 Resumo:')
  console.log(`   PF: ${pf?.uploaded || 0} pontos`)
  console.log(`   CF: ${cf?.uploaded || 0} temas`)
  console.log(`   Total: ${(pf?.uploaded || 0) + (cf?.uploaded || 0)} itens`)

  if (DRY_RUN) {
    console.log('\n⚠️  Modo dry-run. Execute sem --dry-run para fazer o upload.')
  } else {
    console.log('\n✅ Upload completo!')
  }
}

main().catch(console.error)

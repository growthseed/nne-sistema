/**
 * Gera SQL para inserir todos os pontos da Escola Bíblica
 * Output: scripts/eb-data.sql
 */
import fs from 'fs'
import path from 'path'

const BASE_PATH = 'C:/Users/EFEITO DIGITAL/Vida Pllena APP/escola_biblica'
const OUTPUT = 'C:/Users/EFEITO DIGITAL/nne sistema/scripts/eb-data.sql'

function esc(str) {
  if (!str) return 'NULL'
  return `'${str.replace(/'/g, "''")}'`
}

function jsonEsc(obj) {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`
}

function mapPerguntas(raw) {
  return (raw || []).map(p => ({
    id: p.id,
    numero: p.numero,
    texto: p.texto,
    opcoes: p.opcoes,
    resposta_correta: p.respostaCorreta,
    explicacao: p.explicacao || '',
    referencias: p.referencias || [],
  }))
}

let sql = '-- Auto-generated: Escola Bíblica content upload\n'
sql += '-- PF: 37 pontos, CF: 25 temas\n\n'

// Delete existing (clean insert)
sql += 'DELETE FROM eb_pontos;\n\n'

function processModulo(moduloId, pattern) {
  const dir = path.join(BASE_PATH, moduloId)
  const files = fs.readdirSync(dir)
    .filter(f => f.match(pattern) && f.endsWith('.json'))
    .sort()

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
    const num = raw.pontoNumero || raw.numero
    const perguntas = mapPerguntas(raw.perguntas)

    sql += `INSERT INTO eb_pontos (modulo_id, ponto_numero, titulo, subtitulo, introducao, imagem_url, video_url, video_thumbnail, secoes, perguntas, compromissos_fe)\n`
    sql += `VALUES (${esc(moduloId)}, ${num}, ${esc(raw.titulo)}, ${esc(raw.subtitulo)}, ${esc(raw.introducao)}, ${esc(raw.imagemUrl || null)}, ${esc(raw.videoUrl || null)}, ${esc(raw.videoThumbnail || null)}, ${jsonEsc(raw.secoes || [])}, ${jsonEsc(perguntas)}, ${jsonEsc(raw.compromissosFe || [])})\n`
    sql += `ON CONFLICT (modulo_id, ponto_numero) DO UPDATE SET titulo=EXCLUDED.titulo, subtitulo=EXCLUDED.subtitulo, introducao=EXCLUDED.introducao, imagem_url=EXCLUDED.imagem_url, video_url=EXCLUDED.video_url, secoes=EXCLUDED.secoes, perguntas=EXCLUDED.perguntas, compromissos_fe=EXCLUDED.compromissos_fe, updated_at=now();\n\n`
  }
}

processModulo('principios_fe', /^ponto_\d+/)
processModulo('crencas_fundamentais', /^tema_\d+/)

fs.writeFileSync(OUTPUT, sql, 'utf-8')
console.log(`✅ SQL gerado: ${OUTPUT} (${sql.split('\n').length} linhas)`)

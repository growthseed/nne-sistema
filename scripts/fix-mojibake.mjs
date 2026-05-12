#!/usr/bin/env node
// Corrige mojibake UTF-8 lido como Latin-1 e re-encodado em UTF-8.
// Lista os arquivos abaixo, lê, aplica tabela de substituições e regrava.

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')

const FILES = [
  'src/components/escola-biblica/TurmasTab.tsx',
  'src/components/escola-biblica/ConteudoTab.tsx',
  'src/components/escola-biblica/RespostasTab.tsx',
  'src/pages/escola-sabatina/EscolaBiblicaPage.tsx',
  'src/pages/secretaria/ClassesBiblicasPage.tsx',
  'src/pages/secretaria/SecretariaPage.tsx',
  'src/pages/ValidarCartaoPage.tsx',
  'src/pages/financeiro/ReceitaCampoPage.tsx',
  'src/pages/financeiro/LancamentosPage.tsx',
  'src/pages/financeiro/FinanceiroPage.tsx',
  'src/pages/missoes/RelatorioCampoPage.tsx',
]

// Mapeia mojibake → caracter correto. Ordem importa: maiores antes (sequências
// de 3+ bytes do bullet/emojis primeiro, depois pares de 2 bytes).
const REPLACEMENTS = [
  // Bullet e travessões
  ['â€¢', '•'],
  ['â€"', '–'],
  ['â€"', '—'],
  ['â€™', "'"],
  ['â€œ', '"'],
  ['â€', '"'],
  ['âœ"', '✓'],
  ['âœ“', '✓'],
  ['âœ—', '✗'],
  ['âš ', '⚠'],
  // Emojis comuns
  ['ðŸ"ž', '📞'],
  ['ðŸ™', '🙏'],
  ['ðŸ™', '🙏'],
  ['ðŸ"§', '📧'],
  ['ðŸ\'š', '👥'],
  ['ðŸš€', '🚀'],
  ['ðŸ\'¡', '💡'],
  // Letras maiúsculas com acento
  ['Ã€', 'À'],
  ['Ã"', 'Ó'],
  ['Ã"', 'Ô'],
  ['Ã‚', 'Â'],
  ['Ãƒ', 'Ã'],
  ['Ã‡', 'Ç'],
  ['Ã‰', 'É'],
  ['ÃŠ', 'Ê'],
  ['Ã"', 'Õ'],
  ['Ãš', 'Ú'],
  ['Ã"', 'Ó'],
  ['Ã"', 'Î'],
  ['ÃÍ', 'Í'],
  // Letras minúsculas com acento — pares mais comuns
  ['Ã¡', 'á'],
  ['Ã£', 'ã'],
  ['Ã¢', 'â'],
  ['Ã©', 'é'],
  ['Ãª', 'ê'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãµ', 'õ'],
  ['Ã´', 'ô'],
  ['Ãº', 'ú'],
  ['Ã¼', 'ü'],
  ['Ã§', 'ç'],
  ['Ã±', 'ñ'],
  // Sinais
  ['Â°', '°'],
  ['Âº', 'º'],
  ['Âª', 'ª'],
  ['Â´', '´'],
  ['Â¨', '¨'],
  ['Â', ''],  // non-breaking space residual (Â solto) → remove

  // Frases / palavras comuns sem acento (PT-BR). Apenas casos seguros que
  // aparecem em texto de UI (toasts, parágrafos, placeholders), não em
  // identificadores de DB/código.
  ['Nao foi possivel', 'Não foi possível'],
  ['nao foi possivel', 'não foi possível'],
  ['Nao informado', 'Não informado'],
  ['nao informado', 'não informado'],
  ['Nao foi', 'Não foi'],
  ['nao pode ser desfeita', 'não pode ser desfeita'],
  ['nao pode ser', 'não pode ser'],
  [' possivel ', ' possível '],
  ['possivel.', 'possível.'],
  ['possivel,', 'possível,'],
  [' possivel\'', ' possível\''],
  [' possivel"', ' possível"'],
  ['questionario', 'questionário'],
  ['Questionario', 'Questionário'],
  ['Numero ', 'Número '],
  [' numero ', ' número '],
  [' numero.', ' número.'],
  ['o numero ', 'o número '],
  ['decisao agora', 'decisão agora'],
  ['a decisao', 'a decisão'],
  ['interacao agora', 'interação agora'],
  ['a interacao', 'a interação'],
  ['lancamento ', 'lançamento '],
  ['o lancamento', 'o lançamento'],
  ['lancamentos', 'lançamentos'],
  ['o diario', 'o diário'],
  ['Diario', 'Diário'],
  ['DIÁRIO', 'DIÁRIO'],
  [' diario ', ' diário '],
  ['modulo ', 'módulo '],
  ['Modulo', 'Módulo'],
  ['o modulo', 'o módulo'],
  ['periodo.', 'período.'],
  ['este periodo', 'este período'],
  ['credencial informado', 'credencial informado'],  // OK, already correct
]

let totalFiles = 0
let totalSubs = 0

for (const rel of FILES) {
  const full = resolve(ROOT, rel)
  let content
  try {
    content = readFileSync(full, 'utf8')
  } catch (e) {
    console.log(`SKIP ${rel} (não encontrado)`)
    continue
  }

  let fileSubs = 0
  let modified = content
  for (const [from, to] of REPLACEMENTS) {
    if (modified.includes(from)) {
      const before = modified
      modified = modified.split(from).join(to)
      const count = (before.length - modified.length) / Math.max(1, from.length - to.length) || (before.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))?.length ?? 0)
      // (cálculo aproximado de count — preciso mesmo é só não-zero)
      fileSubs += count
    }
  }

  if (modified !== content) {
    writeFileSync(full, modified, 'utf8')
    totalFiles += 1
    totalSubs += fileSubs
    console.log(`✓ ${rel} (~${fileSubs} substituições)`)
  } else {
    console.log(`  ${rel} (sem mojibake)`)
  }
}

console.log(`\nResumo: ${totalFiles} arquivo(s), ~${totalSubs} substituições.`)

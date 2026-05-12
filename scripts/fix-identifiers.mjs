#!/usr/bin/env node
// Reverte acentos em identifiers que o fix-mojibake quebrou.
// Identifiers são detectados pela presença de letra adjacente (não delimitado
// por espaço/pontuação/aspas), ou seja, parte de camelCase.

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

// Palavras acentuadas → sem acento. Aplicadas APENAS quando rodeadas por
// letras (parte de identifier camelCase), via regex com lookbehind/lookahead.
const ACCENTED_WORDS = [
  ['Questionário', 'Questionario'],
  ['Diário', 'Diario'],
  ['Lançamento', 'Lancamento'],
  ['Decisão', 'Decisao'],
  ['Módulo', 'Modulo'],
  ['Período', 'Periodo'],
  ['Número', 'Numero'],
  ['Interação', 'Interacao'],
  ['Informação', 'Informacao'],
  ['Operação', 'Operacao'],
  ['Atenção', 'Atencao'],
  ['Seleção', 'Selecao'],
  ['Função', 'Funcao'],
  ['Associação', 'Associacao'],
  ['Posição', 'Posicao'],
  ['Direção', 'Direcao'],
  // Minúsculas iniciando identifier (depois de letra)
  ['questionário', 'questionario'],
  ['diário', 'diario'],
  ['lançamento', 'lancamento'],
  ['decisão', 'decisao'],
  ['módulo', 'modulo'],
  ['período', 'periodo'],
  ['número', 'numero'],
  ['interação', 'interacao'],
]

let total = 0
for (const rel of FILES) {
  const full = resolve(ROOT, rel)
  let content
  try { content = readFileSync(full, 'utf8') } catch { continue }
  let modified = content
  for (const [accented, plain] of ACCENTED_WORDS) {
    // Lookbehind: letra ascii imediatamente antes (camelCase splice no meio)
    // OU lookahead: letra ascii imediatamente depois (camelCase splice no início)
    // Garante que só revertemos quando é parte de identifier.
    const pattern = new RegExp(
      `(?<=[a-zA-Z])${accented}|${accented}(?=[a-zA-Z])`,
      'g',
    )
    const before = modified
    modified = modified.replace(pattern, plain)
    if (modified !== before) total++
  }
  if (modified !== content) {
    writeFileSync(full, modified, 'utf8')
    console.log(`✓ ${rel}`)
  }
}
console.log(`\nResumo: ${total} substituições aplicadas.`)

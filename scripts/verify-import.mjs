// Quick verification — fetch 5 sample pessoas just imported
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://prqxiqykkijzpwdpqujv.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY'

const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } })

// 1. Aggregate stats: how many pessoas now have gs_id?
const { count: totalWithGsId } = await supabase
  .from('pessoas')
  .select('*', { count: 'exact', head: true })
  .not('gs_id', 'is', null)

const { count: totalWithEnderecoCompleto } = await supabase
  .from('pessoas')
  .select('*', { count: 'exact', head: true })
  .not('endereco_completo_legado', 'is', null)

const { count: totalWithCelular } = await supabase
  .from('pessoas')
  .select('*', { count: 'exact', head: true })
  .not('celular', 'is', null)

console.log('📊 Aggregate stats after import:')
console.log(`  Pessoas com gs_id:                ${totalWithGsId}`)
console.log(`  Pessoas com endereco_completo_legado: ${totalWithEnderecoCompleto}`)
console.log(`  Pessoas com celular:              ${totalWithCelular}`)

// 2. Sample 3 specific pessoas just imported (ABILENE, AGNALDO, ADAIR)
console.log('\n📋 Sample records (just imported):')
const ids = [1800, 15706, 6148]
for (const id of ids) {
  const { data, error } = await supabase
    .from('pessoas')
    .select('nome, gs_id, sexo, data_nascimento, estado_civil, conjuge_nome, celular, email, endereco_rua, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, profissao, nome_pai, nome_mae, oficiante_batismo, dados_legado_atualizado_em')
    .eq('gs_id', id)
    .single()
  if (error) {
    console.log(`\n  gs_id=${id}: ERROR ${error.message}`)
    continue
  }
  console.log(`\n  gs_id=${id} → ${data.nome}`)
  console.log(`    sexo=${data.sexo} | nasc=${data.data_nascimento} | civil=${data.estado_civil}`)
  console.log(`    conjuge=${data.conjuge_nome || '-'}`)
  console.log(`    cel=${data.celular || '-'} | email=${data.email || '-'}`)
  console.log(`    endereço: ${data.endereco_rua || ''} | ${data.endereco_bairro || ''} | ${data.endereco_cidade || ''} - ${data.endereco_estado || ''} | ${data.endereco_cep || ''}`)
  console.log(`    pai=${data.nome_pai || '-'}`)
  console.log(`    mãe=${data.nome_mae || '-'}`)
  console.log(`    profissão=${data.profissao || '-'}`)
  console.log(`    sync em ${data.dados_legado_atualizado_em}`)
}

// Validate import + run sample segmentation queries
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY',
  { auth: { persistSession: false } }
)

console.log('═══ AGGREGATE STATS ═══\n')

// 1. Total recibos
const { count: total } = await sb.from('pessoa_contribuicao_mensal').select('*', { count: 'exact', head: true })
console.log(`Total recibos no banco:    ${total}`)

// 2. Matched vs unmatched
const { count: matched } = await sb.from('pessoa_contribuicao_mensal').select('*', { count: 'exact', head: true }).not('pessoa_id', 'is', null)
const { count: unmatched } = await sb.from('pessoa_contribuicao_mensal').select('*', { count: 'exact', head: true }).is('pessoa_id', null)
console.log(`  com pessoa_id (matched): ${matched}  (${(matched/total*100).toFixed(0)}%)`)
console.log(`  sem pessoa_id (unmatched): ${unmatched}  (${(unmatched/total*100).toFixed(0)}%)`)

// 3. Total dízimos
const { data: somaData } = await sb.rpc('soma_dizimos_simple', {}).select() // may not exist
// Fallback: pull aggregated values
const { data: agg, error: aggErr } = await sb
  .from('pessoa_contribuicao_mensal')
  .select('dizimo, ofertas, total')

if (!aggErr && agg) {
  const sumDizimos = agg.reduce((s, r) => s + parseFloat(r.dizimo || 0), 0)
  const sumOfertas = agg.reduce((s, r) => s + parseFloat(r.ofertas || 0), 0)
  const sumTotal = agg.reduce((s, r) => s + parseFloat(r.total || 0), 0)
  console.log(`\nTotal dízimos:  R$ ${sumDizimos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`Total ofertas:  R$ ${sumOfertas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`Total geral:    R$ ${sumTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
}

// 4. Pessoas distintas que contribuíram
const { data: distinctPessoas } = await sb
  .from('pessoa_contribuicao_mensal')
  .select('pessoa_id', { count: 'exact' })
  .not('pessoa_id', 'is', null)
const uniquePessoasIds = new Set((distinctPessoas || []).map(r => r.pessoa_id))
console.log(`\nPessoas distintas com contribuição: ${uniquePessoasIds.size}`)

// 5. Pessoas com renda estimada (via view)
const { data: rendaSample, error: rendaErr } = await sb
  .from('pessoa_renda_estimada')
  .select('*')
  .limit(1)
if (rendaErr) console.log(`\n⚠ Renda view error: ${rendaErr.message}`)

const { count: comRenda } = await sb
  .from('pessoa_renda_estimada')
  .select('*', { count: 'exact', head: true })
console.log(`\nPessoas com renda_estimada (12m): ${comRenda}`)

// 6. SAMPLE QUERY: Top 10 contribuidores (com nome)
console.log('\n═══ TOP 10 CONTRIBUIDORES (12 MESES) ═══')
const { data: top10 } = await sb
  .from('pessoa_renda_estimada')
  .select(`
    pessoa_id,
    dizimo_12m_total,
    renda_mensal_estimada,
    meses_com_dizimo_12m,
    pessoa:pessoas!inner(nome, igreja:igrejas(nome), estado_civil)
  `)
  .order('dizimo_12m_total', { ascending: false })
  .limit(10)

if (top10) {
  for (const r of top10) {
    const nome = r.pessoa?.nome || '?'
    const igreja = r.pessoa?.igreja?.nome || '?'
    const estado = r.pessoa?.estado_civil || '-'
    console.log(`  ${nome.slice(0,35).padEnd(35)} | ${igreja.slice(0,20).padEnd(20)} | ${estado.padEnd(10)} | dz12m=R$${parseFloat(r.dizimo_12m_total).toLocaleString('pt-BR',{minimumFractionDigits:2}).padStart(11)} | renda~R$${parseFloat(r.renda_mensal_estimada || 0).toLocaleString('pt-BR',{minimumFractionDigits:2}).padStart(11)}`)
  }
}

// 7. SAMPLE SEGMENTATION: Casados com renda estimada > 5k
console.log('\n═══ SEGMENTAÇÃO: CASADOS RENDA > R$5.000 ═══')
const { data: casados5k, count: countCasados5k } = await sb
  .from('pessoa_renda_estimada')
  .select(`pessoa:pessoas!inner(nome, estado_civil, igreja:igrejas(nome))`, { count: 'exact' })
  .gte('renda_mensal_estimada', 5000)
  .eq('pessoa.estado_civil', 'casado')
  .limit(5)

console.log(`Total: ${countCasados5k} casados com renda mensal estimada > R$5.000`)
if (casados5k) {
  for (const r of casados5k.slice(0,5)) {
    console.log(`  ${(r.pessoa?.nome || '?').slice(0,40).padEnd(40)} | ${r.pessoa?.igreja?.nome || '?'}`)
  }
}

// fix-user-jovemdeiblan.mjs
// Cria ou reseta o usuário jovemdeiblan@hotmail.com com senha Jovens2026.
// Usa service_role para manipular auth.users.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://prqxiqykkijzpwdpqujv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg4NTIzMSwiZXhwIjoyMDg3NDYxMjMxfQ.83X8INnBcvhjg745hyQHIpFRUmP452kVLF7cjT-w8kY',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TARGET_EMAIL = 'jovemdeiblan@hotmail.com'
const TARGET_PASSWORD = 'Jovens2026'
const TARGET_NOME = 'Jovens IBLAN'  // placeholder, user can edit later
const TARGET_PAPEL = 'admin_uniao'   // admin da NNE
const NNE_UNIAO_ID = 'a0000000-0000-0000-0000-000000000001'  // União Norte Nordeste Brasileira

async function main() {
  console.log(`🔍 Procurando usuário ${TARGET_EMAIL} no Supabase Auth...`)

  // listUsers retorna no máx 50 por página, vamos paginar
  let userId = null
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) {
      console.error('❌ Erro ao listar:', error.message)
      process.exit(1)
    }
    const found = data.users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase())
    if (found) { userId = found.id; break }
    if (data.users.length < 1000) break
    page++
  }

  if (userId) {
    console.log(`✅ Usuário existe (ID: ${userId})`)
    console.log(`🔧 Resetando senha + confirmando email...`)
    const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
      password: TARGET_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: TARGET_NOME },
    })
    if (updErr) {
      console.error('❌ Erro ao atualizar:', updErr.message)
      process.exit(1)
    }
    console.log('✅ Senha atualizada e email confirmado')
  } else {
    console.log(`⚠ Usuário não existe — criando novo...`)
    const { data, error } = await supabase.auth.admin.createUser({
      email: TARGET_EMAIL,
      password: TARGET_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: TARGET_NOME },
    })
    if (error) {
      console.error('❌ Erro ao criar:', error.message)
      process.exit(1)
    }
    userId = data.user.id
    console.log(`✅ Usuário criado (ID: ${userId})`)
  }

  // Garantir profile na tabela usuarios
  console.log(`\n🔧 Garantindo profile na tabela usuarios...`)
  const { data: existingProfile } = await supabase
    .from('usuarios')
    .select('id, nome, papel, ativo')
    .eq('id', userId)
    .maybeSingle()

  if (existingProfile) {
    console.log(`✅ Profile já existe: nome="${existingProfile.nome}", papel="${existingProfile.papel}", ativo=${existingProfile.ativo}`)
    // Promover para admin_uniao + NNE scope, mas preservar nome se já estiver setado
    const updates = {
      papel: TARGET_PAPEL,
      uniao_id: NNE_UNIAO_ID,
      ativo: true,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('usuarios').update(updates).eq('id', userId)
    if (error) console.log('  ⚠ erro promovendo:', error.message)
    else console.log(`  → promovido a ${TARGET_PAPEL} (uniao_id=${NNE_UNIAO_ID})`)
  } else {
    console.log(`⚠ Profile não existe, criando com papel "${TARGET_PAPEL}" (admin NNE)...`)
    const { error } = await supabase
      .from('usuarios')
      .insert({
        id: userId,
        nome: TARGET_NOME,
        email: TARGET_EMAIL,
        papel: TARGET_PAPEL,
        uniao_id: NNE_UNIAO_ID,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    if (error) {
      console.error('❌ Erro ao criar profile:', error.message)
      console.log('   (auth user foi criado mas profile não — ajuste manualmente na tabela usuarios)')
    } else {
      console.log(`✅ Profile criado: ${TARGET_PAPEL} da NNE`)
    }
  }

  // Test login real
  console.log(`\n🔐 Testando login real com as credenciais...`)
  const testClient = createClient(
    'https://prqxiqykkijzpwdpqujv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycXhpcXlra2lqenB3ZHBxdWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODUyMzEsImV4cCI6MjA4NzQ2MTIzMX0.XhzfwStPx1LZ2ua1UbSgoYjtIAcwZIX3BGh0JtO9i_4',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: signIn, error: signInErr } = await testClient.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
  })
  if (signInErr) {
    console.error('❌ Login test FAILED:', signInErr.message)
    process.exit(1)
  }
  console.log(`✅ Login test PASSED — session token: ${signIn.session?.access_token?.slice(0, 20)}...`)

  console.log(`\n📋 RESUMO`)
  console.log(`   Email: ${TARGET_EMAIL}`)
  console.log(`   Senha: ${TARGET_PASSWORD}`)
  console.log(`   Auth ID: ${userId}`)
  console.log(`   Status: ✅ pronto para login em https://app.nne.org.br`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})

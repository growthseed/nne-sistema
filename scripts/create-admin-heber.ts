/**
 * Script para criar o usuário admin: Heber Silva Gomes
 *
 * COMO USAR:
 *
 * Opção 1 - Via Supabase Dashboard (RECOMENDADO):
 *   1. Acesse https://supabase.com/dashboard
 *   2. Vá em Authentication > Users > Add User
 *   3. Email: hebersilvagomes@yahoo.com.br
 *   4. Password: Mordomo2026
 *   5. Marque "Auto Confirm User"
 *   6. Copie o UUID gerado
 *   7. Vá em Table Editor > usuarios
 *   8. Insira um novo registro:
 *      - id: (cole o UUID copiado)
 *      - nome: Heber Silva Gomes
 *      - email: hebersilvagomes@yahoo.com.br
 *      - papel: admin
 *      - ativo: true
 *
 * Opção 2 - Via SQL Editor no Supabase Dashboard:
 *   Execute o conteúdo do arquivo supabase-migrations/017_create_admin_heber.sql
 *
 * Opção 3 - Via este script (requer SUPABASE_SERVICE_ROLE_KEY):
 *   SUPABASE_SERVICE_ROLE_KEY=sua_chave npx tsx scripts/create-admin-heber.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://prqxiqykkijzpwdpqujv.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida.')
  console.log('\nUse uma das opções manuais descritas no cabeçalho deste arquivo.')
  console.log('\nOu execute com: SUPABASE_SERVICE_ROLE_KEY=sua_chave npx tsx scripts/create-admin-heber.ts')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createAdmin() {
  console.log('🔑 Criando usuário admin: Heber Silva Gomes...\n')

  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'hebersilvagomes@yahoo.com.br',
    password: 'Mordomo2026',
    email_confirm: true,
    user_metadata: { nome: 'Heber Silva Gomes' }
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('⚠️  Usuário já existe no Auth. Buscando ID...')
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existingUser = listData?.users?.find(u => u.email === 'hebersilvagomes@yahoo.com.br')
      if (existingUser) {
        console.log(`   ID encontrado: ${existingUser.id}`)
        await upsertProfile(existingUser.id)
      }
    } else {
      console.error('❌ Erro ao criar usuário Auth:', authError.message)
      process.exit(1)
    }
  } else if (authData.user) {
    console.log(`✅ Usuário Auth criado! ID: ${authData.user.id}`)
    await upsertProfile(authData.user.id)
  }
}

async function upsertProfile(userId: string) {
  // 2. Criar/atualizar perfil na tabela usuarios
  const { error } = await supabase
    .from('usuarios')
    .upsert({
      id: userId,
      nome: 'Heber Silva Gomes',
      email: 'hebersilvagomes@yahoo.com.br',
      papel: 'admin',
      ativo: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

  if (error) {
    console.error('❌ Erro ao criar perfil:', error.message)
    process.exit(1)
  }

  console.log('✅ Perfil admin criado/atualizado na tabela usuarios!')
  console.log('\n📋 Credenciais de acesso:')
  console.log('   Email: hebersilvagomes@yahoo.com.br')
  console.log('   Senha: Mordomo2026')
  console.log('   Papel: admin (Administrador Geral)')
  console.log('\n🎉 Pronto! O usuário pode fazer login no NNE Sistema.')
}

createAdmin()

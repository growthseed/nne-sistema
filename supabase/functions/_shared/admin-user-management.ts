import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type UserRole =
  | 'admin'
  | 'admin_uniao'
  | 'admin_associacao'
  | 'diretor_es'
  | 'professor_es'
  | 'secretario_es'
  | 'tesoureiro'
  | 'secretario_igreja'
  | 'membro'

type ManagedProfile = {
  id: string
  papel: UserRole | null
  uniao_id: string | null
  associacao_id: string | null
  igreja_id: string | null
  ativo: boolean | null
}

const roleRank: Record<string, number> = {
  admin: 100,
  admin_uniao: 80,
  admin_associacao: 60,
  diretor_es: 40,
  professor_es: 30,
  secretario_es: 30,
  tesoureiro: 30,
  secretario_igreja: 30,
  membro: 10,
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function errorResponse(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return jsonResponse(
    {
      success: false,
      error: message,
      ...extra,
    },
    status,
  )
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null

  return token.trim()
}

function getRoleRank(role: string | null | undefined) {
  return role ? roleRank[role] ?? 0 : 0
}

async function loadProfile(adminClient: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await adminClient
    .from('usuarios')
    .select('id, papel, uniao_id, associacao_id, igreja_id, ativo')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return normalizeProfileScope(adminClient, data as ManagedProfile)
}

async function normalizeProfileScope(
  adminClient: ReturnType<typeof createClient>,
  profile: ManagedProfile,
): Promise<ManagedProfile> {
  let associacaoId = profile.associacao_id
  let uniaoId = profile.uniao_id

  if (!associacaoId && profile.igreja_id) {
    const { data, error } = await adminClient
      .from('igrejas')
      .select('associacao_id')
      .eq('id', profile.igreja_id)
      .maybeSingle()

    if (error) throw error
    associacaoId = data?.associacao_id ?? null
  }

  if (!uniaoId && associacaoId) {
    const { data, error } = await adminClient
      .from('associacoes')
      .select('uniao_id')
      .eq('id', associacaoId)
      .maybeSingle()

    if (error) throw error
    uniaoId = data?.uniao_id ?? null
  }

  return {
    ...profile,
    associacao_id: associacaoId,
    uniao_id: uniaoId,
  }
}

function ensureActorCanManage(actor: ManagedProfile, target: ManagedProfile) {
  if (!actor.ativo) {
    return 'Usuário administrador inativo.'
  }

  if (!actor.papel || !['admin', 'admin_uniao', 'admin_associacao'].includes(actor.papel)) {
    return 'Sem permissão administrativa para gerenciar usuários.'
  }

  if (actor.papel !== 'admin' && actor.id !== target.id && getRoleRank(actor.papel) <= getRoleRank(target.papel)) {
    return 'Seu perfil não pode gerenciar este usuário.'
  }

  if (actor.papel === 'admin') {
    return null
  }

  if (actor.papel === 'admin_uniao') {
    if (!actor.uniao_id || !target.uniao_id || actor.uniao_id !== target.uniao_id) {
      return 'Usuário fora do escopo da sua união.'
    }
    return null
  }

  if (actor.papel === 'admin_associacao') {
    if (!actor.associacao_id || !target.associacao_id || actor.associacao_id !== target.associacao_id) {
      return 'Usuário fora do escopo da sua associação.'
    }
    return null
  }

  return 'Ação não permitida para o seu perfil.'
}

function getPrimaryProvider(user: Record<string, any>) {
  const providers = user?.app_metadata?.providers
  if (Array.isArray(providers) && providers.length > 0) {
    return String(providers[0])
  }

  if (typeof user?.app_metadata?.provider === 'string' && user.app_metadata.provider.trim()) {
    return user.app_metadata.provider
  }

  return 'email'
}

export async function serveAdminUserManagement(req: Request, functionName: string) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse('Ambiente do Supabase não configurado.', 500)
    }

    const token = getBearerToken(req)
    if (!token) {
      return errorResponse('Token de autenticação ausente.', 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data: { user: authUser },
      error: authError,
    } = await adminClient.auth.getUser(token)

    if (authError || !authUser) {
      return errorResponse('Sessão inválida ou expirada.', 401)
    }

    const body = await req.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action : ''
    const userId = typeof body?.userId === 'string' ? body.userId : ''

    if (!action) {
      return errorResponse('Ação não informada.', 400)
    }

    if (!userId) {
      return errorResponse('Usuário alvo não informado.', 400)
    }

    const [actorProfile, targetProfile] = await Promise.all([
      loadProfile(adminClient, authUser.id),
      loadProfile(adminClient, userId),
    ])

    if (!actorProfile) {
      return errorResponse('Perfil administrativo do solicitante não encontrado.', 403)
    }

    if (!targetProfile) {
      return errorResponse('Usuário alvo não encontrado.', 404)
    }

    const permissionError = ensureActorCanManage(actorProfile, targetProfile)
    if (permissionError) {
      return errorResponse(permissionError, 403)
    }

    if (action === 'set_password') {
      const password = typeof body?.password === 'string' ? body.password : ''

      if (password.length < 6) {
        return errorResponse('A senha deve ter no mínimo 6 caracteres.', 400)
      }

      const { error } = await adminClient.auth.admin.updateUserById(userId, { password })
      if (error) {
        throw error
      }

      return jsonResponse({
        success: true,
        action,
        userId,
      })
    }

    if (action === 'get_sessions') {
      const { data, error } = await adminClient.auth.admin.getUserById(userId)
      if (error) {
        throw error
      }

      const managedUser = data.user
      if (!managedUser) {
        return errorResponse('Usuário de autenticação não encontrado.', 404)
      }

      return jsonResponse({
        lastSignIn: managedUser.last_sign_in_at ?? null,
        emailConfirmed: managedUser.email_confirmed_at ?? null,
        createdAt: managedUser.created_at ?? null,
        provider: getPrimaryProvider(managedUser as Record<string, any>),
      })
    }

    return errorResponse(`Ação não suportada nesta function: ${action}`, 400)
  } catch (error) {
    console.error(`${functionName} error`, error)
    return errorResponse(
      error instanceof Error ? error.message : 'Falha inesperada ao gerenciar usuário.',
      500,
    )
  }
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Gera (ou rotaciona) um share_token público para uma cadastro_resposta.
// Apenas usuários autenticados com escopo sobre o registro podem acionar.
// Use rotate=true para invalidar o link anterior antes de criar um novo.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const auth = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!auth?.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ success: false, message: 'Não autenticado.' }, 401)
    }
    const jwt = auth.slice(7).trim()

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: userData } = await admin.auth.getUser(jwt)
    const userId = userData?.user?.id
    if (!userId) return jsonResponse({ success: false, message: 'Sessão inválida.' }, 401)

    const body = await req.json().catch(() => ({}))
    const { responseId, rotate = false, revoke = false } = body ?? {}
    if (!responseId || typeof responseId !== 'string') {
      return jsonResponse({ success: false, message: 'responseId obrigatório.' }, 400)
    }

    // Verifica escopo: só permite gerar se o usuário pode gerenciar o registro
    const { data: row, error: rowErr } = await admin
      .from('cadastro_respostas')
      .select('id, uniao_id, associacao_id, igreja_id, share_token, nome')
      .eq('id', responseId)
      .maybeSingle()
    if (rowErr) throw rowErr
    if (!row) return jsonResponse({ success: false, message: 'Cadastro não encontrado.' }, 404)

    const { data: canManage } = await admin.rpc('can_manage_scope_secure', {
      p_uniao_id: row.uniao_id,
      p_associacao_id: row.associacao_id,
      p_igreja_id: row.igreja_id,
      p_instrutor_id: null,
    })
    // can_manage_scope_secure usa auth.uid() server-side; mas como aqui o admin
    // client é service role, auth.uid() é null. Validamos manualmente:
    const { data: usuarioRow } = await admin
      .from('usuarios')
      .select('papel, uniao_id, associacao_id, igreja_id')
      .eq('id', userId)
      .maybeSingle()
    const papel = (usuarioRow?.papel as string) || ''
    const allowed =
      papel === 'admin'
      || (papel === 'admin_uniao' && usuarioRow?.uniao_id && usuarioRow.uniao_id === row.uniao_id)
      || (papel === 'admin_associacao' && usuarioRow?.associacao_id && usuarioRow.associacao_id === row.associacao_id)
      || (['secretario_igreja', 'pastor', 'lider', 'missionario'].includes(papel)
          && usuarioRow?.igreja_id && usuarioRow.igreja_id === row.igreja_id)
    if (!allowed) return jsonResponse({ success: false, message: 'Sem permissão para gerar link desta ficha.' }, 403)

    if (revoke) {
      await admin
        .from('cadastro_respostas')
        .update({ share_token: null, share_token_at: null })
        .eq('id', responseId)
      await admin.from('cadastro_audit_log').insert({
        cadastro_id: responseId,
        user_id: userId,
        papel,
        acao: 'share_revoke',
      })
      return jsonResponse({ success: true, revoked: true })
    }

    let token = row.share_token
    if (!token || rotate) {
      token = crypto.randomUUID()
      await admin
        .from('cadastro_respostas')
        .update({ share_token: token, share_token_at: new Date().toISOString() })
        .eq('id', responseId)
    }

    await admin.from('cadastro_audit_log').insert({
      cadastro_id: responseId,
      user_id: userId,
      papel,
      acao: rotate ? 'share_rotate' : 'share_create',
    })

    return jsonResponse({ success: true, shareToken: token })
  } catch (error) {
    console.error('generate-share-token', error)
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : 'Falha.' }, 500)
  }
})

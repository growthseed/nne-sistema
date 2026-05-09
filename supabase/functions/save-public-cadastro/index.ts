import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { rateLimit } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: Record<string, unknown>, status = 200, extra?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...extra,
    },
  })
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, message: 'Ambiente do Supabase não configurado.' }, 500)
    }

    const body = await req.json()
    const {
      responseId,
      draftToken,
      payload,
      complete = false,
    } = body ?? {}

    // ── Rate limiting: separate limits for autosave vs final submit ─────────
    // Autosave: 60 req/min (formulário tem 12 steps + retries + navegação)
    // Submit final: 5 req/min (proteção anti-spam mais estrita, mas nunca bloqueia usuário legítimo)
    // IMPORTANTE: o limite anterior (10/min) derrubava usuários no submit final
    // depois de ~10 autosaves consecutivos, gerando "Edge Function returned non-2xx".
    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown'

    const rl = await rateLimit({
      supabaseUrl,
      serviceKey: serviceRoleKey,
      ip,
      endpoint: complete ? 'save-public-cadastro:submit' : 'save-public-cadastro:draft',
      limit: complete ? 5 : 60,
      windowSec: 60,
    })

    if (!rl.allowed) {
      return jsonResponse(
        { success: false, error: 'rate_limited', message: 'Muitas requisições. Aguarde um momento e tente novamente.', retryAfterSec: rl.retryAfterSec },
        429,
        { 'Retry-After': String(rl.retryAfterSec ?? 60) },
      )
    }
    // ────────────────────────────────────────────────────────────────────────

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return jsonResponse({ success: false, message: 'Payload inválido para o cadastro público.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Detecta se a chamada veio de um admin/missionário autenticado (Authorization
    // header com JWT do usuário). Se sim, registra last_edited_by + audit log
    // para compliance — exemplo: secretário preenche em nome de um membro idoso.
    let editorUserId: string | null = null
    let editorPapel: string | null = null
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const jwt = authHeader.slice(7).trim()
      try {
        const { data: userData } = await supabase.auth.getUser(jwt)
        if (userData?.user?.id) {
          // Validamos que NÃO é a anon key (que é JWT mas sem "sub" de user real)
          if (userData.user.aud === 'authenticated') {
            editorUserId = userData.user.id
            // Busca papel para audit
            const { data: usuarioRow } = await supabase
              .from('usuarios')
              .select('papel')
              .eq('id', editorUserId)
              .maybeSingle()
            editorPapel = (usuarioRow?.papel as string) || null
          }
        }
      } catch (_) {
        // JWT inválido / expirado / é anon — segue como anônimo
      }
    }

    const userAgent = req.headers.get('user-agent') || null

    const normalizedPayload = {
      ...payload,
      completo: Boolean(complete),
      ...(editorUserId
        ? { last_edited_by: editorUserId, last_edited_at: new Date().toISOString() }
        : {}),
    }

    async function recordAudit(cadastroId: string, acao: string, etapaBefore: number | null, etapaAfter: number | null) {
      try {
        await supabase.from('cadastro_audit_log').insert({
          cadastro_id: cadastroId,
          user_id: editorUserId,
          papel: editorPapel,
          acao,
          etapa_before: etapaBefore,
          etapa_after: etapaAfter,
          ip,
          user_agent: userAgent,
        })
      } catch (e) {
        console.error('audit log insert failed', e)
      }
    }

    if (!responseId) {
      const { data, error } = await supabase
        .from('cadastro_respostas')
        .insert(normalizedPayload)
        .select('id, draft_token')
        .single()

      if (error) throw error

      await recordAudit(data.id, complete ? 'create_complete' : 'create_draft', null, normalizedPayload.etapa_atual ?? null)

      return jsonResponse({
        success: true,
        id: data.id,
        draftToken: data.draft_token,
      })
    }

    if (!draftToken || typeof draftToken !== 'string') {
      return jsonResponse({ success: false, message: 'Token de rascunho ausente.' }, 400)
    }

    const { data: existing, error: fetchError } = await supabase
      .from('cadastro_respostas')
      .select('id, completo, draft_token, etapa_atual')
      .eq('id', responseId)
      .eq('draft_token', draftToken)
      .maybeSingle()

    if (fetchError) throw fetchError

    // Se rascunho sumiu (DB limpa, UUID antigo do localStorage, token rotacionado),
    // não trava o usuário — faz fallback para INSERT para permitir a submissão final.
    if (!existing) {
      const { data: inserted, error: insertError } = await supabase
        .from('cadastro_respostas')
        .insert(normalizedPayload)
        .select('id, draft_token')
        .single()

      if (insertError) throw insertError

      await recordAudit(inserted.id, complete ? 'create_complete_fallback' : 'create_draft_fallback', null, normalizedPayload.etapa_atual ?? null)

      return jsonResponse({
        success: true,
        id: inserted.id,
        draftToken: inserted.draft_token,
      })
    }

    // Cadastros já completos podem ser editados por admin (correção / ajuda),
    // mas não podem retroceder do completo via anon.
    if (existing.completo && !complete && !editorUserId) {
      return jsonResponse({ success: false, message: 'Este cadastro já foi concluído e não aceita novos rascunhos.' }, 409)
    }

    const { data, error } = await supabase
      .from('cadastro_respostas')
      .update(normalizedPayload)
      .eq('id', responseId)
      .eq('draft_token', draftToken)
      .select('id, draft_token')
      .single()

    if (error) throw error

    await recordAudit(
      data.id,
      complete ? (editorUserId ? 'admin_complete' : 'self_complete') : (editorUserId ? 'admin_autosave' : 'self_autosave'),
      existing.etapa_atual ?? null,
      normalizedPayload.etapa_atual ?? null,
    )

    return jsonResponse({
      success: true,
      id: data.id,
      draftToken: data.draft_token,
    })
  } catch (error) {
    console.error('save-public-cadastro error', error)
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : 'Falha inesperada ao salvar o cadastro público.',
    }, 500)
  }
})

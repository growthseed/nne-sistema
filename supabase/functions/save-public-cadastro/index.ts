import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

async function verifyTurnstile(token: string, secret: string, req: Request) {
  const remoteIpHeader = req.headers.get('CF-Connecting-IP') || req.headers.get('x-forwarded-for') || ''
  const remoteIp = remoteIpHeader.split(',')[0]?.trim()

  const body = new URLSearchParams()
  body.append('secret', secret)
  body.append('response', token)
  if (remoteIp) body.append('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  return response.json()
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
      captchaToken,
    } = body ?? {}

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return jsonResponse({ success: false, message: 'Payload inválido para o cadastro público.' }, 400)
    }

    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (complete && turnstileSecret) {
      if (!captchaToken || typeof captchaToken !== 'string') {
        return jsonResponse({ success: false, message: 'Captcha obrigatório para concluir o envio.' }, 400)
      }

      const verification = await verifyTurnstile(captchaToken, turnstileSecret, req)
      const actionMatches = !verification.action || verification.action === 'cadastro_publico'
      if (!verification.success || !actionMatches) {
        return jsonResponse({
          success: false,
          message: 'Não foi possível validar a proteção anti-bot.',
          errors: verification['error-codes'] || [],
        }, 400)
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const normalizedPayload = {
      ...payload,
      completo: Boolean(complete),
    }

    if (!responseId) {
      const { data, error } = await supabase
        .from('cadastro_respostas')
        .insert(normalizedPayload)
        .select('id, draft_token')
        .single()

      if (error) throw error

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
      .select('id, completo, draft_token')
      .eq('id', responseId)
      .eq('draft_token', draftToken)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!existing) {
      return jsonResponse({ success: false, message: 'Rascunho não encontrado ou token inválido.' }, 404)
    }

    if (existing.completo && !complete) {
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

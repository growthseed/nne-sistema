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

// Carrega um rascunho público (cadastro_respostas) a partir de id + draft_token.
// Usado quando o admin envia um link de retomada via WhatsApp/email para o membro.
// O draft_token é a chave secreta — sem ele não retorna nada. Por segurança,
// nunca devolve rascunhos já marcados como completo.
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

    const body = await req.json().catch(() => ({}))
    const { responseId, draftToken } = body ?? {}

    if (!responseId || typeof responseId !== 'string' || !draftToken || typeof draftToken !== 'string') {
      return jsonResponse({ success: false, message: 'Parâmetros inválidos.' }, 400)
    }

    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown'

    const rl = await rateLimit({
      supabaseUrl,
      serviceKey: serviceRoleKey,
      ip,
      endpoint: 'load-public-cadastro',
      limit: 30,
      windowSec: 60,
    })

    if (!rl.allowed) {
      return jsonResponse(
        { success: false, error: 'rate_limited', message: 'Muitas requisições.', retryAfterSec: rl.retryAfterSec },
        429,
        { 'Retry-After': String(rl.retryAfterSec ?? 60) },
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase
      .from('cadastro_respostas')
      .select('*')
      .eq('id', responseId)
      .eq('draft_token', draftToken)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return jsonResponse({ success: false, message: 'Rascunho não encontrado ou link inválido.' }, 404)
    }

    if (data.completo) {
      return jsonResponse({ success: false, message: 'Este cadastro já foi concluído.', alreadyComplete: true }, 409)
    }

    return jsonResponse({
      success: true,
      id: data.id,
      draftToken: data.draft_token,
      etapaAtual: data.etapa_atual,
      payload: data,
    })
  } catch (error) {
    console.error('load-public-cadastro error', error)
    return jsonResponse({
      success: false,
      message: error instanceof Error ? error.message : 'Falha inesperada ao carregar o rascunho.',
    }, 500)
  }
})

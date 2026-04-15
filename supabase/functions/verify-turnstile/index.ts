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
    // ── Rate limiting: 20 req/min por IP ────────────────────────────────────
    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown'

    const rl = await rateLimit({
      supabaseUrl: Deno.env.get('SUPABASE_URL')!,
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      ip,
      endpoint: 'verify-turnstile',
      limit: 20,
      windowSec: 60,
    })

    if (!rl.allowed) {
      return jsonResponse(
        { ok: false, error: 'rate_limited', retryAfterSec: rl.retryAfterSec },
        429,
        { 'Retry-After': String(rl.retryAfterSec ?? 60) },
      )
    }
    // ────────────────────────────────────────────────────────────────────────

    const { token, action } = await req.json()
    const secret = Deno.env.get('TURNSTILE_SECRET_KEY')

    if (!secret) {
      return jsonResponse({ success: false, message: 'TURNSTILE_SECRET_KEY não configurada.' }, 500)
    }

    if (!token) {
      return jsonResponse({ success: false, message: 'Token do captcha não informado.' }, 400)
    }

    const body = new URLSearchParams()
    body.append('secret', secret)
    body.append('response', token)
    if (ip && ip !== 'unknown') body.append('remoteip', ip)

    const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const verification = await verificationResponse.json()
    const actionMatches = !action || !verification.action || verification.action === action
    const success = Boolean(verification.success) && actionMatches

    return jsonResponse(
      {
        success,
        action: verification.action || null,
        errors: verification['error-codes'] || [],
        message: success ? 'Captcha validado com sucesso.' : 'Não foi possível validar a proteção anti-bot.',
      },
      success ? 200 : 400,
    )
  } catch (error) {
    console.error('verify-turnstile error', error)
    return jsonResponse({ success: false, message: 'Falha inesperada ao validar o captcha.' }, 500)
  }
})

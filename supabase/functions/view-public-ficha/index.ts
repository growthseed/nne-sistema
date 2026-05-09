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
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  })
}

// Carrega versão sanitizada de uma ficha do censo para visualização pública
// (link compartilhado pelo admin com share_token). Read-only — não devolve
// draft_token, share_token nem campos sensíveis de auditoria.
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const ip =
      req.headers.get('cf-connecting-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown'

    const rl = await rateLimit({
      supabaseUrl,
      serviceKey: serviceRoleKey,
      ip,
      endpoint: 'view-public-ficha',
      limit: 60,
      windowSec: 60,
    })
    if (!rl.allowed) {
      return jsonResponse({ success: false, message: 'Muitas requisições.' }, 429)
    }

    const body = await req.json().catch(() => ({}))
    const { responseId, shareToken } = body ?? {}
    if (!responseId || !shareToken) {
      return jsonResponse({ success: false, message: 'Parâmetros inválidos.' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase
      .from('cadastro_respostas')
      .select(`
        id, nome, sexo, estado_civil, escolaridade, profissao, data_nascimento,
        cidade, estado, bairro, faixa_etaria, tempo_membro, como_conheceu,
        distancia_igreja, meio_transporte, satisfacao, prioridades,
        participacao, pontos_fortes, pontos_fracos, cargos_ocupa,
        opiniao_departamentos, opiniao_estrutura, sugestoes, coisas_criar,
        coisas_alterar, motivacao_contribuir, tipo_contribuinte,
        enfase_justificativa, etapa_atual, completo, created_at,
        igreja_id, associacao_id
      `)
      .eq('id', responseId)
      .eq('share_token', shareToken)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return jsonResponse({ success: false, message: 'Ficha não encontrada ou link expirado.' }, 404)
    }

    // Buscar nome da igreja e sigla da associação para exibição
    let igrejaNome: string | null = null
    let associacaoSigla: string | null = null
    if (data.igreja_id) {
      const { data: ig } = await supabase
        .from('igrejas')
        .select('nome')
        .eq('id', data.igreja_id)
        .maybeSingle()
      igrejaNome = ig?.nome ?? null
    }
    if (data.associacao_id) {
      const { data: a } = await supabase
        .from('associacoes')
        .select('sigla, nome')
        .eq('id', data.associacao_id)
        .maybeSingle()
      associacaoSigla = a?.sigla ?? null
    }

    return jsonResponse({
      success: true,
      ficha: data,
      igreja_nome: igrejaNome,
      associacao_sigla: associacaoSigla,
    })
  } catch (error) {
    console.error('view-public-ficha', error)
    return jsonResponse({ success: false, message: error instanceof Error ? error.message : 'Falha.' }, 500)
  }
})

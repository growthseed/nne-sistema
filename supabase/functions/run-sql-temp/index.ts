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

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  return jsonResponse(
    {
      success: false,
      error: 'run-sql-temp está neutralizada por segurança e não aceita execução remota.',
      message: 'Use migrations versionadas ou RPCs revisadas para mudanças administrativas no banco.',
    },
    410,
  )
})

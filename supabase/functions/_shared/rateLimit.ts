import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface RateLimitOptions {
  supabaseUrl: string
  serviceKey: string
  ip: string
  endpoint: string
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in seconds */
  windowSec: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSec?: number
  remaining?: number
}

/**
 * Sliding-window rate limiter backed by Supabase.
 * Uses an atomic upsert RPC (increment_rate_limit) to avoid race conditions.
 * Fails open: if the DB call errors, the request is allowed through.
 */
export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { supabaseUrl, serviceKey, ip, endpoint, limit, windowSec } = opts

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const now = Date.now()
  const windowMs = windowSec * 1000
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs).toISOString()

  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_ip: ip,
    p_endpoint: endpoint,
    p_window_start: windowStart,
    p_window_sec: windowSec,
  })

  if (error) {
    // Fail open — never block a legitimate request due to a DB error
    console.error('[rateLimit] DB error, failing open:', error.message)
    return { allowed: true }
  }

  const count = data as number
  const allowed = count <= limit
  const elapsed = Math.floor((now - Math.floor(now / windowMs) * windowMs) / 1000)
  const retryAfterSec = allowed ? undefined : windowSec - elapsed

  return {
    allowed,
    retryAfterSec,
    remaining: Math.max(0, limit - count),
  }
}

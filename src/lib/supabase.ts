import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas')
}

// Custom lock that avoids Navigator.locks API (fails on some mobile browsers)
const noOpLock = async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
  return await fn()
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: noOpLock as any,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

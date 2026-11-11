import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const supabase = url && key?.startsWith('sb_publishable_')
  ? createClient(url, key, { global: { fetch: (input, options = {}) => fetch(input, { ...options, signal: options.signal || AbortSignal.timeout(15000) }) } })
  : null

export function requireSupabase() {
  if (!supabase) throw new Error('Falta configurar la conexión del catálogo. Revisá las variables de entorno indicadas en el README.')
  return supabase
}

// Public reads never inherit an administrator's stored session or URL auth callback.
let publicClient
export function requirePublicSupabase() {
  if (!supabase) return requireSupabase()
  return publicClient ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'mostacho-public' }, global: { fetch: (input, options = {}) => fetch(input, { ...options, signal: options.signal || AbortSignal.timeout(15000) }) } })
}

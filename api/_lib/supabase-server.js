import { createClient } from '@supabase/supabase-js'

export function privilegedClient() {
  const url = process.env.VITE_SUPABASE_URL
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.startsWith('https://') || !secret) {
    throw new Error('Falta configurar el servidor de Supabase')
  }
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
}

export async function authenticatedProfile(client, req, requiredRole) {
  const token = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return { error: { status: 401, text: 'Debes iniciar sesión.' } }
  const { data, error } = await client.auth.getUser(token)
  if (error || !data?.user) return { error: { status: 401, text: 'La sesión es inválida.' } }
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id,role,member_id,is_active').eq('id', data.user.id).maybeSingle()
  if (profileError || !profile || !profile.is_active || profile.role !== requiredRole) {
    return { error: { status: 403, text: 'No tienes permiso para realizar esta operación.' } }
  }
  return { profile, user: data.user }
}

export async function verifyAdminSession(client, service) {
  const { data, error } = await client.auth.getUser()
  if (error) {
    if (error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403 || ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired', 'user_not_found', 'bad_jwt', 'user_banned'].includes(error.code)) return { status: 'signedout', user: null }
    throw error
  }
  if (!data.user) return { status: 'signedout', user: null }
  return { status: await service.access() ? 'ready' : 'denied', user: data.user }
}
export function authMessage(error) {
  if (error?.code === 'invalid_credentials') return 'El correo o la contraseña no son correctos.'
  if (error?.code === 'email_not_confirmed') return 'Primero confirmá tu correo desde el mensaje de Supabase.'
  if (error?.status === 429 || error?.code?.includes('rate_limit')) return 'Se alcanzó el límite de intentos. Esperá unos minutos antes de volver a intentar.'
  if (error?.code === 'same_password') return 'Elegí una contraseña diferente de la anterior.'
  return 'No se pudo completar la solicitud. Revisá la conexión o intentá nuevamente.'
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { requireSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import RemoteState from '@/components/RemoteState'
import { createAdminService } from './admin-service'
import { verifyAdminSession } from './auth-service'
import { LoginForm, RecoveryForm, PasswordForm } from './AuthForms'
import { useAdminAction } from './useAdminAction'
import AdminFeedback from './AdminFeedback'
import AdminPanel from './AdminPanel'

export default function AdminPage({ client: suppliedClient }) {
  const client = useMemo(() => { try { return suppliedClient || requireSupabase() } catch { return null } }, [suppliedClient])
  const service = useMemo(() => client ? createAdminService(client) : null, [client])
  const [access, setAccess] = useState({ status: 'checking', user: null })
  const sequence = useRef(0)
  const navigate = useNavigate(), { pathname } = useLocation()
  const action = useAdminAction()
  const verify = useCallback(async () => {
    const ticket = ++sequence.current
    if (!client) { setAccess({ status: 'error', user: null }); return }
    try {
      const result = await verifyAdminSession(client, service)
      if (ticket === sequence.current) setAccess(result)
    } catch { if (ticket === sequence.current) setAccess({ status: 'error', user: null }) }
  }, [client, service])
  useEffect(() => {
    if (!client) { setAccess({ status: 'error', user: null }); return }
    let active = true
    const timers = new Set()
    verify()
    const { data: { subscription } } = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { sequence.current++; setAccess({ status: 'signedout', user: null }); return }
      // No esperar otras llamadas de Auth dentro de este callback: evita bloqueos del cliente.
      const timer = setTimeout(() => {
        timers.delete(timer)
        if (!active) return
        if (event === 'PASSWORD_RECOVERY') navigate('/admin/actualizar-clave', { replace: true })
        verify()
      }, 0)
      timers.add(timer)
    })
    const focus = () => verify()
    const interval = setInterval(() => { if (document.visibilityState === 'visible') verify() }, 60000)
    window.addEventListener('focus', focus)
    return () => { active = false; sequence.current++; subscription.unsubscribe(); timers.forEach(clearTimeout); clearInterval(interval); window.removeEventListener('focus', focus) }
  }, [client, verify, navigate])
  if (!client || access.status === 'error') return <section className="container catalog-page"><RemoteState error="No pudimos comprobar tu acceso. Revisá la conexión y volvé a intentar." retry={verify} /></section>
  if (access.status === 'checking') return <section className="container catalog-page"><RemoteState loading /></section>
  if (pathname === '/admin/recuperar') return <div className="container"><RecoveryForm client={client} /></div>
  if (access.status === 'signedout') return <div className="container">{pathname === '/admin/actualizar-clave' && <p className="demo-notice">Abrí el enlace de recuperación vigente desde tu correo. Si venció, solicitá otro.</p>}<LoginForm client={client} /></div>
  const logout = () => action.run(async () => { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) throw error }, 'Sesión cerrada.')
  if (access.status === 'denied') return <section className="container empty-page"><p className="eyebrow">ACCESO RESTRINGIDO</p><h1>Esta cuenta no tiene permiso.</h1><p>Solo las cuentas autorizadas pueden administrar el catálogo.</p><Button disabled={action.busy} onClick={logout}>Cerrar sesión</Button><AdminFeedback action={action} /></section>
  if (pathname === '/admin/actualizar-clave') return <div className="container"><PasswordForm client={client} /></div>
  return <section className="container admin-page"><header className="admin-header"><div><p className="eyebrow">MOSTACHO · ADMINISTRACIÓN</p><h1>Tu taller, al día.</h1><p>{access.user.email}</p></div><div className="hero-actions"><Button variant="outline" asChild><Link to="/catalogo">Ver catálogo público</Link></Button><Button disabled={action.busy} variant="outline" onClick={logout}>Cerrar sesión</Button></div></header><AdminFeedback action={action} /><AdminPanel client={client} service={service} /></section>
}

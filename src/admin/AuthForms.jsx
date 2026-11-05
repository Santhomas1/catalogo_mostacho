import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from './Fields'
import { useAdminAction } from './useAdminAction'
import AdminFeedback from './AdminFeedback'
import { authMessage } from './auth-service'

export function LoginForm({ client }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const action = useAdminAction()
  return <section className="admin-auth"><p className="eyebrow">MOSTACHO · ADMINISTRACIÓN</p><h1>Bienvenido de nuevo.</h1><p>Ingresá con tu cuenta autorizada para mantener el catálogo.</p><form onSubmit={e => { e.preventDefault(); action.run(async () => {
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(authMessage(error))
    setPassword('')
  }, 'Sesión iniciada. Comprobando permisos…') }}><fieldset disabled={action.busy}><Field label="Correo electrónico" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /><Field label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><Button type="submit">{action.busy ? 'Ingresando…' : 'Iniciar sesión'}</Button></fieldset></form><AdminFeedback action={action} /><Link className="back-link" to="/admin/recuperar">Olvidé mi contraseña</Link></section>
}
export function RecoveryForm({ client }) {
  const [email, setEmail] = useState('')
  const action = useAdminAction()
  return <section className="admin-auth"><p className="eyebrow">RECUPERAR ACCESO</p><h1>Volvamos a tu cuenta.</h1><p>Te enviaremos las instrucciones al correo de tu cuenta.</p><form onSubmit={e => { e.preventDefault(); action.run(async () => {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin/actualizar-clave` })
    if (error) throw new Error(authMessage(error))
  }, 'Si el correo corresponde a una cuenta, recibirá instrucciones. Revisá también la carpeta de spam.') }}><fieldset disabled={action.busy}><Field label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /><Button type="submit">{action.busy ? 'Enviando…' : 'Enviar instrucciones'}</Button></fieldset></form><AdminFeedback action={action} /><Link className="back-link" to="/admin/login">Volver al acceso</Link></section>
}
export function PasswordForm({ client }) {
  const [password, setPassword] = useState(''), [repeat, setRepeat] = useState('')
  const action = useAdminAction()
  return <section className="admin-auth"><p className="eyebrow">TU CONTRASEÑA</p><h1>Prepará tu acceso.</h1><p>Elegí una contraseña nueva de al menos 12 caracteres.</p><form onSubmit={e => { e.preventDefault(); action.run(async () => {
    if (password !== repeat) throw new Error('Las contraseñas no coinciden.')
    if (password.length < 12) throw new Error('Usá al menos 12 caracteres.')
    const { error } = await client.auth.updateUser({ password })
    if (error) throw new Error(authMessage(error))
    setPassword(''); setRepeat('')
  }, 'Contraseña actualizada. Ya podés volver al panel.') }}><fieldset disabled={action.busy}><Field label="Nueva contraseña" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} /><Field label="Repetir contraseña" type="password" autoComplete="new-password" minLength={12} required value={repeat} onChange={e => setRepeat(e.target.value)} /><Button type="submit">{action.busy ? 'Guardando…' : 'Guardar contraseña'}</Button></fieldset></form><AdminFeedback action={action} /><Link className="back-link" to="/admin">Volver al panel</Link></section>
}

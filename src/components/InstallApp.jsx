import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function InstallApp() {
  const [prompt, setPrompt] = useState(null)
  const [ios, setIos] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone
    if (standalone) { setInstalled(true); return }
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    const ready = event => { event.preventDefault(); setPrompt(event) }
    const complete = () => { setInstalled(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', ready)
    window.addEventListener('appinstalled', complete)
    return () => {
      window.removeEventListener('beforeinstallprompt', ready)
      window.removeEventListener('appinstalled', complete)
    }
  }, [])
  if (installed) return null
  async function install() {
    if (pending.current) return
    if (!prompt) {
      if (ios) setMessage('En el menú Compartir del navegador, elegí «Agregar a la pantalla de inicio».')
      else if (/Firefox/.test(navigator.userAgent) && !/Android/.test(navigator.userAgent)) setMessage('Para instalar desde esta computadora, abrí Mostacho en Chrome o Edge y usá la opción de instalación del navegador. Podés seguir usando la página normalmente en Firefox.')
      else setMessage('Abrí el menú del navegador y buscá «Instalar aplicación» o «Agregar a la pantalla de inicio». Si no aparece, probá con Chrome o Edge. La instalación requiere HTTPS o localhost y puede no estar disponible si ya instalaste la app.')
      return
    }
    pending.current = true
    setBusy(true)
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      setMessage(choice.outcome === 'accepted' ? 'Seguí los pasos de tu navegador para completar la instalación.' : 'Podés instalar Mostacho más adelante desde el menú del navegador.')
    } catch { setMessage('Abrí el menú del navegador y buscá «Instalar aplicación» o «Agregar a la pantalla de inicio».') }
    finally { setPrompt(null); pending.current = false; setBusy(false) }
  }
  return <aside className="container pwa-install" aria-label="Instalar Mostacho 3D"><div><h2>Mostacho, a mano.</h2><p>Agregá Mostacho a tu celular o computadora para volver cuando tengas otra idea.</p>{message && <p id="pwa-install-help" role="status">{message}</p>}</div><Button variant="outline" onClick={install} disabled={busy} aria-describedby={message ? 'pwa-install-help' : undefined}><Download aria-hidden="true" />{busy ? 'Preparando instalación…' : 'Instalar Mostacho'}</Button></aside>
}

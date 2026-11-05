import { useEffect, useState } from 'react'

export function useRemote(loader, refreshMs = 0) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  useEffect(() => {
    let active = true
    let running = false
    // No muestra datos de una búsqueda anterior mientras llega la nueva.
    setState({ data: null, loading: true, error: '' })
    async function run() {
      if (running) return
      running = true
      try {
        const data = await loader()
        if (active) setState({ data, loading: false, error: '' })
      } catch {
        if (active) setState({ data: null, loading: false, error: 'No pudimos actualizar la información. Revisá tu conexión y volvé a intentar.' })
      } finally { running = false }
    }
    run()
    const timer = refreshMs ? setInterval(() => { if (document.visibilityState === 'visible') run() }, refreshMs) : null
    const focus = () => run()
    if (refreshMs) window.addEventListener('focus', focus)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [loader, attempt, refreshMs])
  return { ...state, retry: () => setAttempt(n => n + 1) }
}

import { useEffect, useState } from 'react'

export function useRemote(loader, refreshMs = 0, delayMs = 0) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  useEffect(() => {
    let active = true
    let running = false
    let lastStarted = -Infinity
    // No muestra datos de una búsqueda anterior mientras llega la nueva.
    setState({ data: null, loading: true, error: '' })
    async function run() {
      if (!active || running) return
      running = true
      lastStarted = Date.now()
      try {
        const data = await loader()
        if (active) setState({ data, loading: false, error: '' })
      } catch {
        if (active) setState({ data: null, loading: false, error: 'No pudimos actualizar la información. Revisá tu conexión y volvé a intentar.' })
      } finally { running = false }
    }
    const initial = delayMs ? setTimeout(run, delayMs) : (run(), null)
    const timer = refreshMs ? setInterval(() => { if (document.visibilityState === 'visible') run() }, refreshMs) : null
    const focus = () => { if (Date.now() - lastStarted >= refreshMs) run() }
    if (refreshMs) window.addEventListener('focus', focus)
    return () => { active = false; clearTimeout(initial); clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [loader, attempt, refreshMs, delayMs])
  return { ...state, retry: () => setAttempt(n => n + 1) }
}

// El worker no se registra en desarrollo ni desde HTTP de una IP de la red local.
export function registerPwa(browser = window) {
  if (!browser.isSecureContext || !browser.navigator?.serviceWorker) return
  const register = () => {
    browser.navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => console.warn('No se pudo preparar el modo sin conexión. El sitio sigue disponible con Internet.'))
  }
  if (browser.document.readyState === 'complete') register()
  else browser.addEventListener('load', register, { once: true })
}

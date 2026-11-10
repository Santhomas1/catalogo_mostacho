import { useEffect, useRef } from 'react'

export default function usePageNavigation(pathname, menuOpen, closeMenu) {
  const previousPath = useRef(null)
  useEffect(() => {
    const changed = previousPath.current !== null && previousPath.current !== pathname
    if (previousPath.current === null || changed) window.scrollTo(0, 0)
    // Closing restores the background and menu focus first. Focus the new page
    // on the following render, once its main element is no longer inert.
    if (changed && menuOpen) { closeMenu(); return }
    if (changed) document.getElementById?.('contenido')?.focus({ preventScroll: true })
    previousPath.current = pathname
  }, [pathname, menuOpen, closeMenu])
}

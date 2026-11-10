import { useEffect, useRef } from 'react'

export default function useMobileMenu(open, close) {
  const menuRef = useRef(null)
  const toggleRef = useRef(null)

  useEffect(() => {
    const menu = menuRef.current
    const toggle = toggleRef.current
    if (!open || !menu || !toggle) return

    const previousOverflow = document.body.style.overflow
    const background = [...document.querySelector('.site').children]
      .filter(element => element.tagName !== 'HEADER' && !element.classList.contains('skip-link'))
    const previousInert = background.map(element => element.inert)
    background.forEach(element => { element.inert = true })
    document.body.style.overflow = 'hidden'
    const links = [...menu.querySelectorAll('a[href]')]
    links[0]?.focus()

    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key !== 'Tab') return
      const controls = [toggle, ...links]
      const index = controls.indexOf(document.activeElement)
      const next = event.shiftKey ? (index - 1 + controls.length) % controls.length : (index + 1) % controls.length
      event.preventDefault()
      controls[next].focus()
    }
    const media = window.matchMedia('(min-width: 768px)')
    const onResize = event => { if (event.matches) close() }
    media.addEventListener('change', onResize)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      background.forEach((element, index) => { element.inert = previousInert[index] })
      document.removeEventListener('keydown', onKeyDown)
      media.removeEventListener('change', onResize)
      toggle.focus()
    }
  }, [open, close])

  return { menuRef, toggleRef }
}

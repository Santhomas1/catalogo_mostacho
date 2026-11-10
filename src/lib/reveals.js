// Animate small visual blocks; never make an entire page depend on visibility thresholds.
const TARGETS = '.hero-copy, .idea-shell, .product-card, .contact-grid article, .catalog-intro, .process-strip'

export function startReveals(root, browser = window) {
  if (!root || !browser.IntersectionObserver || browser.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {}
  const tracked = new Set()
  const observer = new browser.IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    })
  }, { threshold: 0 })
  const scan = () => root.querySelectorAll(TARGETS).forEach(element => {
    if (tracked.has(element)) return
    tracked.add(element)
    element.setAttribute('data-premium-reveal', '')
    observer.observe(element)
  })
  scan()
  const mutations = browser.MutationObserver ? new browser.MutationObserver(scan) : null
  mutations?.observe(root, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    mutations?.disconnect()
    tracked.forEach(element => {
      element.removeAttribute('data-premium-reveal')
      element.classList.remove('is-visible')
    })
  }
}

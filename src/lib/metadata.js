export const BRAND_DESCRIPTION = 'Impresión 3D por pedido en San Miguel de Tucumán. Contanos tu idea y coordinamos el retiro con Mostacho 3D.'
export const SHARE_IMAGE = '/logo/mostacho.png'
export function siteOrigin(value = '') {
  if (!value.trim()) return ''
  const url = new URL(value)
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('VITE_SITE_URL debe ser un origen HTTPS sin ruta, credenciales ni parámetros (HTTP solo para localhost).')
  return url.origin
}
export function routeMetadata(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  const pages = {
    '/': ['Mostacho 3D · Tu idea toma forma', BRAND_DESCRIPTION],
    '/catalogo': ['Catálogo · Mostacho 3D', 'Explorá productos impresos en 3D por pedido. Opciones con precio fijo o a acordar con el vendedor.'],
    '/contacto': ['Contacto · Mostacho 3D', 'Contactá a Mostacho 3D por WhatsApp o Instagram. Estamos en San Miguel de Tucumán, con retiro coordinado.'],
    '/carrito': ['Tu consulta · Mostacho 3D', 'Revisá tu selección y prepará una cotización por WhatsApp.', true],
  }
  if (path === '/admin' || path.startsWith('/admin/')) return { title: 'Administración · Mostacho 3D', description: 'Acceso privado para administrar el catálogo de Mostacho 3D.', noIndex: true }
  if (path.startsWith('/productos/')) return { title: 'Producto · Mostacho 3D', description: BRAND_DESCRIPTION, noIndex: false }
  const page = pages[path]
  return page ? { title: page[0], description: page[1], noIndex: Boolean(page[2]) } : { title: 'Página no encontrada · Mostacho 3D', description: 'La página solicitada no está disponible.', noIndex: true }
}
export function productMetadata(product) {
  const text = String(product.description || `${product.name}. Impresión 3D por pedido en Mostacho 3D.`).replace(/\s+/g, ' ').trim()
  return { title: `${product.name} · Mostacho 3D`, description: Array.from(text).slice(0, 160).join(''), noIndex: false }
}
export function writeMetadata(doc, metadata, origin, pathname) {
  doc.title = metadata.title
  const set = (attribute, key, value) => {
    let tag = doc.querySelector(`meta[${attribute}="${key}"]`)
    if (!tag) { tag = doc.createElement('meta'); tag.setAttribute(attribute, key); doc.head.appendChild(tag) }
    tag.setAttribute('content', value)
  }
  set('name', 'description', metadata.description)
  set('name', 'robots', metadata.noIndex ? 'noindex,nofollow' : 'index,follow')
  set('property', 'og:title', metadata.title)
  set('property', 'og:description', metadata.description)
  set('property', 'og:url', new URL(pathname, origin).href)
  set('property', 'og:image', new URL(SHARE_IMAGE, origin).href)
  set('property', 'og:image:alt', 'Logo de Mostacho 3D Prints')
  set('name', 'twitter:card', 'summary_large_image')
  set('name', 'twitter:title', metadata.title)
  set('name', 'twitter:description', metadata.description)
  set('name', 'twitter:image', new URL(SHARE_IMAGE, origin).href)
}

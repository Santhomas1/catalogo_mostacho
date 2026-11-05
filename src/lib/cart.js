import { isAgreedPrice, pricingSummary, variantPriceLabel, formatPrice, productionLabel, AGREED_PRICE_LABEL } from './pricing.js'
export const CART_KEY = 'mostacho-cart-v1'
export function readCart(storage) {
  try {
    const data = JSON.parse(storage.getItem(CART_KEY) || '[]')
    if (!Array.isArray(data)) throw Error()
    const items = []
    for (const row of data) {
      if (!row || typeof row.variantId !== 'string' || !Number.isSafeInteger(row.quantity) || row.quantity < 1) throw Error()
      const found = items.find(i => i.variantId === row.variantId)
      if (found) { found.quantity += row.quantity; if (!Number.isSafeInteger(found.quantity)) throw Error() }
      else items.push({ variantId: row.variantId, quantity: row.quantity })
    }
    return { items, warning: '' }
  } catch { return { items: [], warning: 'No pudimos recuperar el carrito. Podés seguir eligiendo; el almacenamiento puede no estar disponible.' } }
}
export function changeQuantity(items, variantId, quantity, add = false) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return items
  const existing = items.find(i => i.variantId === variantId)
  const next = add ? (existing?.quantity || 0) + quantity : quantity
  if (!Number.isSafeInteger(next)) return items
  return existing ? items.map(i => i.variantId === variantId ? { ...i, quantity: next } : i) : [...items, { variantId, quantity: next }]
}
export function resolveCart(items, products) {
  return items.map(item => {
    const product = products.find(p => p.variants.some(v => v.id === item.variantId))
    const variant = product?.variants.find(v => v.id === item.variantId)
    let error = ''
    if (!variant || product.published === false || !variant.active || variant.availability === 'no_disponible') error = 'Esta opción ya no está disponible. Quitala del carrito.'
    else if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) error = 'Ingresá una cantidad entera positiva.'
    else if (!isAgreedPrice(variant) && (!Number.isFinite(variant.price) || variant.price < 0 || !variant.currency || !Number.isFinite(variant.price * item.quantity))) error = 'Precio no disponible.'
    return { ...item, product, variant, error, subtotal: variant && !isAgreedPrice(variant) ? variant.price * item.quantity : null }
  })
}
export function makeSummary(lines, origin) {
  const pricing = pricingSummary(lines)
  if (!lines.length || lines.some(l => l.error) || !pricing.valid) return ''
  return ['Hola Mostacho 3D, quisiera cotizar:', ...lines.map(l => [
    `\n${l.product.name}${l.product.demo ? ' [PRUEBA FICTICIA]' : ''}`, `SKU: ${l.variant.sku}`,
    `Variante: ${l.variant.name}`, `Medidas: ${l.variant.dimensions}`, `Cantidad: ${l.quantity}`,
    `Precio: ${variantPriceLabel(l.variant)}`,
    `Subtotal: ${isAgreedPrice(l.variant) ? AGREED_PRICE_LABEL : formatPrice(l.subtotal, l.variant.currency)}`,
    productionLabel(l.variant), `${origin}/productos/${l.product.slug}`,
  ].join('\n')), `\n${pricing.label}`,
  ...(pricing.quoted ? ['El importe de las opciones a acordar no está incluido. Total final a confirmar con el vendedor.'] : []),
  'Todos los productos se realizan por pedido. Precio final, tamaños y plazos a confirmar; esta consulta no crea un pedido.'].join('\n')
}
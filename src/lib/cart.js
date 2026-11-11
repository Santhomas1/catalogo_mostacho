import { isAgreedPrice, pricingSummary } from './pricing.js'
import { variantLabel } from './variants.js'
export const CART_KEY = 'mostacho-cart-v1'
export const cartItemId = item => item.productId ? `product:${item.productId}` : item.variantId
export function readCart(storage) {
  try {
    const data = JSON.parse(storage.getItem(CART_KEY) || '[]')
    if (!Array.isArray(data)) throw Error()
    const items = []
    for (const row of data) {
      if (!row || (typeof row.variantId === 'string') === (typeof row.productId === 'string') || (!row.productId && !row.variantId)
        || (row.productId !== undefined && typeof row.productId !== 'string') || (row.variantId !== undefined && typeof row.variantId !== 'string')
        || row.variantId?.startsWith('product:') || !Number.isSafeInteger(row.quantity) || row.quantity < 1) throw Error()
      const found = items.find(i => cartItemId(i) === cartItemId(row))
      if (found) { found.quantity += row.quantity; if (!Number.isSafeInteger(found.quantity)) throw Error() }
      else items.push({ ...(row.productId ? { productId: row.productId } : { variantId: row.variantId }), quantity: row.quantity })
    }
    return { items, warning: '' }
  } catch { return { items: [], warning: 'No pudimos recuperar el carrito. Podés seguir eligiendo; el almacenamiento puede no estar disponible.' } }
}
export function changeQuantity(items, variantId, quantity, add = false) {
  if (typeof variantId !== 'string' || !variantId || variantId === 'product:' || !Number.isSafeInteger(quantity) || quantity < 1) return items
  const existing = items.find(i => cartItemId(i) === variantId)
  const next = add ? (existing?.quantity || 0) + quantity : quantity
  if (!Number.isSafeInteger(next)) return items
  const identity = variantId.startsWith('product:') ? { productId: variantId.slice(8) } : { variantId }
  return existing ? items.map(i => cartItemId(i) === variantId ? { ...i, quantity: next } : i) : [...items, { ...identity, quantity: next }]
}
export function resolveCart(items, products) {
  return items.map(item => {
    const product = products.find(p => item.productId ? p.id === item.productId : p.variants.some(v => v.id === item.variantId))
    const variant = item.productId
      ? product && !product.hasVariants && !product.variants.length ? { name: 'Producto sin variantes', active: true, availability: 'bajo_pedido', priceMode: product.priceMode || 'a_acordar', price: product.price, currency: product.currency } : null
      : product?.variants.find(v => v.id === item.variantId)
    let error = ''
    if (!variant || product.published === false || product.demo || !variant.active || variant.availability === 'no_disponible') error = 'Esta opción ya no está disponible. Quitala del carrito.'
    else if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) error = 'Ingresá una cantidad entera positiva.'
    else if (!isAgreedPrice(variant) && (!Number.isFinite(variant.price) || variant.price < 0 || !variant.currency || !Number.isFinite(variant.price * item.quantity))) error = 'Precio no disponible.'
    return { ...item, product, variant, error, subtotal: variant && !isAgreedPrice(variant) ? variant.price * item.quantity : null }
  })
}
export function makeSummary(lines, origin) {
  const pricing = pricingSummary(lines)
  if (!lines.length || lines.some(l => l.error) || !pricing.valid) return ''
  return ['Hola Mostacho 3D, estoy interesado en:', ...lines.map(l => [
    `\n- ${l.product.name}${l.product.demo ? ' [PRUEBA FICTICIA]' : ''}`,
    ...(!l.productId ? [`Variante: ${variantLabel(l.variant)}`, ...(l.variant.dimensions ? [`Medidas: ${l.variant.dimensions}`] : [])] : []),
    `Cantidad: ${l.quantity}`,
    `${origin}/productos/${l.product.slug}`,
  ].join('\n')), `\n${pricing.label}`,
  ...(pricing.quoted ? ['Las opciones a acordar se calculan aparte.'] : []),
  'Total final y plazo a confirmar.'].join('\n')
}

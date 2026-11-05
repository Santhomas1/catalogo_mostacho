export const AGREED_PRICE_LABEL = 'Acordar con el vendedor'
export const isAgreedPrice = variant => variant.priceMode === 'a_acordar'
export const formatPrice = (price, currency) => new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(price)
export const variantPriceLabel = variant => isAgreedPrice(variant) ? AGREED_PRICE_LABEL : formatPrice(variant.price, variant.currency)
export const productionLabel = variant => variant.availability === 'no_disponible' ? 'No disponible' : Number.isInteger(variant.days) ? `Por pedido: ${variant.days} días estimados` : 'Por pedido · Plazo a coordinar'

export function pricingSummary(lines) {
  const quoted = lines.some(line => line.variant && isAgreedPrice(line.variant))
  const fixed = lines.filter(line => line.variant && !isAgreedPrice(line.variant) && !line.error)
  const currencies = new Set(fixed.map(line => line.variant.currency))
  if (currencies.size > 1) return { valid: false, label: 'Los precios publicados tienen monedas diferentes.' }
  if (!fixed.length) return { valid: true, label: `Total: ${AGREED_PRICE_LABEL}`, quoted }
  const amount = fixed.reduce((sum, line) => sum + line.subtotal, 0)
  if (!Number.isFinite(amount)) return { valid: false, label: 'Revisá las cantidades.' }
  return { valid: true, label: `${quoted ? 'Subtotal con precio publicado' : 'Total estimado'}: ${formatPrice(amount, fixed[0].variant.currency)}`, quoted }
}

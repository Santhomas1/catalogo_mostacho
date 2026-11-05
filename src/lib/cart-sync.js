import { resolveCart, makeSummary } from './cart.js'

export function cartFingerprint(items, products) {
  return JSON.stringify(resolveCart(items, products).map(line => ({
    id: line.variantId, error: line.error, name: line.product?.name,
    price: line.variant?.price, mode: line.variant?.priceMode, currency: line.variant?.currency,
    availability: line.variant?.availability, days: line.variant?.days,
  })))
}

export async function refreshCartSnapshot(service, items, previousProducts = []) {
  const products = await service.byVariantIds(items.map(item => item.variantId))
  const changed = previousProducts.length > 0 && cartFingerprint(items, previousProducts) !== cartFingerprint(items, products)
  return { products, items, changed, lines: resolveCart(items, products) }
}

export function prepareCartSummary(snapshot, origin) {
  return makeSummary(snapshot.lines, origin)
}

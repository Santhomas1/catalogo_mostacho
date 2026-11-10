import { resolveCart, makeSummary, cartItemId } from './cart.js'

export function cartFingerprint(items, products) {
  return JSON.stringify(resolveCart(items, products).map(line => ({
    id: cartItemId(line), error: line.error, name: line.product?.name,
    price: line.variant?.price, mode: line.variant?.priceMode, currency: line.variant?.currency,
    availability: line.variant?.availability, days: line.variant?.days,
  })))
}

export async function refreshCartSnapshot(service, items, previousProducts = []) {
  const variantIds = items.filter(item => !item.productId).map(item => item.variantId)
  const productIds = items.filter(item => item.productId).map(item => item.productId)
  const groups = await Promise.all([
    variantIds.length ? service.byVariantIds(variantIds) : [],
    productIds.length ? service.byProductIds(productIds) : [],
  ])
  const products = [...new Map(groups.flat().map(product => [product.id, product])).values()]
  const changed = previousProducts.length > 0 && cartFingerprint(items, previousProducts) !== cartFingerprint(items, products)
  return { products, items, changed, lines: resolveCart(items, products) }
}

export function prepareCartSummary(snapshot, origin) {
  return makeSummary(snapshot.lines, origin)
}

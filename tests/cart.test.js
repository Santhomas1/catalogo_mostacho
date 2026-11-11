import test from 'node:test'
import assert from 'node:assert/strict'
import { readCart, changeQuantity, resolveCart, makeSummary } from '../src/lib/cart.js'
const product = { id: 'p1', name: 'Diseño á & ñ', slug: 'diseno', published: true, variants: [
 { id: 'v1', sku: 'SKU-1', name: 'PLA · Blanco · Pequeño', dimensions: '10 × 20 mm', active: true, availability: 'bajo_pedido', days: 2, price: 100, currency: 'ARS' },
 { id: 'v2', sku: 'SKU-2', name: 'PLA · Azul · Mediano', dimensions: '20 × 30 mm', active: true, availability: 'bajo_pedido', days: 4, price: 250, currency: 'ARS' },
] }
test('agregar acumula una variante y mantiene separadas las otras', () => {
 let items = changeQuantity([], 'v1', 1, true)
 items = changeQuantity(items, 'v1', 2, true)
 items = changeQuantity(items, 'v2', 4, true)
 assert.deepEqual(items, [{ variantId: 'v1', quantity: 3 }, { variantId: 'v2', quantity: 4 }])
 assert.deepEqual(changeQuantity(items, 'v1', 0), items)
 assert.deepEqual(changeQuantity(items, 'v1', 1.5), items)
})
test('guardado restaura solo identificadores y cantidades y rechaza corrupción', () => {
 const saved = JSON.stringify([{ variantId: 'v1', quantity: 2, price: 0 }])
 assert.deepEqual(readCart({ getItem: () => saved }).items, [{ variantId: 'v1', quantity: 2 }])
 for (const data of ['{', '{}', '[{"variantId":"v1","quantity":-1}]']) assert.ok(readCart({ getItem: () => data }).warning)
 assert.ok(readCart({ getItem: () => { throw Error('blocked') } }).warning)
})
test('variantes inactivas y eliminadas impiden enviar', () => {
 const lines = resolveCart([{ variantId: 'missing', quantity: 1 }], [product])
 assert.ok(lines.every(l => l.error)); assert.equal(makeSummary(lines, 'https://example.com'), '')
 const hidden = { ...product, variants: product.variants.map(v => ({ ...v, active: false })) }
 assert.ok(resolveCart([{ variantId: 'v1', quantity: 1 }], [hidden])[0].error)
})
test('recuperar vuelve a usar el precio del catálogo, no un precio guardado', () => {
 const lines = resolveCart([{ variantId: 'v1', quantity: 2 }], [{ ...product, variants: [{ ...product.variants[0], price: 125 }] }])
 assert.equal(lines[0].subtotal, 250)
})
test('mensaje reúne variantes, total y caracteres especiales sin perder texto', () => {
 const lines = resolveCart([{ variantId: 'v1', quantity: 2 }, { variantId: 'v2', quantity: 3 }], [product])
 const message = makeSummary(lines, 'https://example.com')
 assert.equal(decodeURIComponent(encodeURIComponent(message)), message)
 for (const fragment of ['Hola Mostacho 3D, estoy interesado en:', product.name, ...product.variants.map(v => v.name), ...product.variants.map(v => v.dimensions), 'Cantidad: 2', 'Cantidad: 3', '950,00', 'https://example.com/productos/diseno']) assert.ok(message.includes(fragment), fragment)
 for (const redundant of ['cotizar', 'SKU:', 'Precio:', 'Subtotal:', 'días estimados']) assert.ok(!message.includes(redundant), redundant)
 assert.equal(lines.reduce((s, l) => s + l.subtotal, 0), 950)
})
test('monedas distintas no se suman y carrito vacío no produce mensaje', () => {
 assert.equal(makeSummary([], 'https://example.com'), '')
 const mixed = { ...product, variants: [product.variants[0], { ...product.variants[1], currency: 'USD' }] }
 assert.equal(makeSummary(resolveCart([{ variantId: 'v1', quantity: 1 }, { variantId: 'v2', quantity: 1 }], [mixed]), 'https://example.com'), '')
})

test('cantidades por pedido no tienen limite de stock', () => {
 const lines = resolveCart([{ variantId: 'v1', quantity: 100 }], [product])
 assert.equal(lines[0].error, '')
 assert.ok(makeSummary(lines, 'https://example.com').includes('Cantidad: 100'))
})
test('precio a acordar no es cero y permite cotizar sin moneda', () => {
 const quoteProduct = { ...product, variants: [{ ...product.variants[0], priceMode: 'a_acordar', price: null, currency: null }] }
 const lines = resolveCart([{ variantId: 'v1', quantity: 2 }], [quoteProduct])
 assert.equal(lines[0].subtotal, null)
 assert.equal(lines[0].error, '')
 const message = makeSummary(lines, 'https://example.com')
 assert.ok(message.includes('Acordar con el vendedor'))
 assert.ok(!message.includes('Total estimado:'))
 assert.ok(!message.includes('$'))
})
test('carrito mixto informa subtotal conocido y excluye lo pendiente de cotizar', () => {
 const mixed = { ...product, variants: [product.variants[0], { ...product.variants[1], priceMode: 'a_acordar', price: null, currency: null }] }
 const lines = resolveCart([{ variantId: 'v1', quantity: 2 }, { variantId: 'v2', quantity: 3 }], [mixed])
 const message = makeSummary(lines, 'https://example.com')
 assert.ok(message.includes('Subtotal con precio publicado:'))
 assert.ok(message.includes('200,00'))
 assert.ok(message.includes('Total final y plazo a confirmar'))
 assert.ok(!message.includes('Total estimado:'))
})
test('mensaje distingue colores aunque las variantes compartan nombre', () => {
 const colored = { ...product, variants: product.variants.map((v, i) => ({ ...v, name: 'Grande', material: 'PLA', color: i ? 'Azul' : 'Blanco' })) }
 const message = makeSummary(resolveCart([{ variantId: 'v1', quantity: 2 }, { variantId: 'v2', quantity: 1 }], [colored]), 'https://example.com')
 assert.ok(message.includes('Variante: Grande · PLA · Blanco'))
 assert.ok(message.includes('Variante: Grande · PLA · Azul'))
})

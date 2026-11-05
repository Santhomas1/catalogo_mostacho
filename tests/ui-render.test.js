import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { render, renderCard, closeClient } from './react-harness.js'

test('catálogo y detalle muestran carga inicial sin datos locales ni falsas inexistencias', () => {
 const catalog = render('/catalogo?q=maceta')
 assert.ok(catalog.includes('Cargando información'))
 assert.ok(catalog.includes('Buscar por nombre'))
 assert.ok(!catalog.includes('Maceta geométrica'))
 const product = render('/productos/maceta-geometrica-demo')
 assert.ok(product.includes('Cargando información'))
 assert.ok(!product.includes('Este producto no está disponible.'))
})
test('selección guardada conserva cantidades pero no habilita envío antes de validación remota', () => {
 const html = render('/carrito', [{ variantId: 'anterior', quantity: 3 }])
 assert.ok(html.includes('3 unidades'))
 assert.ok(html.includes('value="3"'))
 assert.ok(!html.includes('https://wa.me/5493816795568?text='))
})
test('contacto conserva el pie oculto y carrito vacío permite seguir eligiendo', () => {
 assert.ok(!render('/contacto').includes('<footer'))
 assert.ok(render('/').includes('<footer'))
 assert.ok(render('/carrito').includes('Tu carrito está vacío.'))
})
test('tarjetas distinguen precio fijo, a acordar y opciones mixtas', () => {
 const fixed = { id: 'a', active: true, availability: 'bajo_pedido', priceMode: 'fijo', price: 5000, currency: 'ARS' }
 const quote = { id: 'b', active: true, availability: 'bajo_pedido', priceMode: 'a_acordar', price: null, currency: null }
 const onlyQuote = renderCard([quote])
 assert.ok(onlyQuote.includes('Acordar con el vendedor'))
 assert.ok(!onlyQuote.includes('$'))
 assert.ok(renderCard([fixed]).includes('5.000,00'))
 const mixed = renderCard([fixed, quote])
 assert.ok(mixed.includes('Desde'))
 assert.ok(mixed.includes('Otras opciones: acordar con el vendedor'))
})

after(closeClient)

import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { render, renderCard, mountPhoto, act, closeClient } from './react-harness.js'

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
 for (const html of [onlyQuote, mixed, renderCard([fixed]), renderCard([])]) {
  assert.ok(html.includes('Ver producto'))
  assert.ok(html.includes('role="article"'))
  assert.ok(!/lucide-star|rating|valoraci[oó]n|reseñas/i.test(html))
 }
 const withoutVariants = renderCard([])
 assert.ok(withoutVariants.includes('Acordar con el vendedor'))
 assert.ok(withoutVariants.includes('Consultar disponibilidad'))
 assert.ok(!withoutVariants.includes('$'))
 const basePrice = {priceMode:'fijo',price:12500.5,currency:'ARS'}
 assert.ok(renderCard([],basePrice).includes('12.500,50'))
 assert.ok(!renderCard([],basePrice).includes('Acordar con el vendedor'))
 assert.ok(renderCard([fixed],basePrice).includes('5.000,00'))
 assert.ok(renderCard([], {...basePrice,price:0}).includes('0,00'))
})

after(closeClient)


test('foto ya cargada conserva su URL al renovar firmas; foto pendiente y archivo reemplazado usan la URL nueva', async () => {
 const image = { path: 'products/a.webp', url: 'https://example.invalid/a?token=first' }
 const view = await mountPhoto(image)
 try {
  const pending = { ...image, url: 'https://example.invalid/a?token=second' }
  await view.update(pending)
  assert.equal(view.renderer.root.findByType('img').props.src, pending.url)
  await act(async () => { view.renderer.root.findByType('img').props.onLoad({}) })
  await view.update({ ...image, url: 'https://example.invalid/a?token=third' })
  assert.equal(view.renderer.root.findByType('img').props.src, pending.url, 'no new download for the same loaded file')
  const replacement = { path: 'products/b.webp', url: 'https://example.invalid/b?token=new' }
  await view.update(replacement)
  assert.equal(view.renderer.root.findByType('img').props.src, replacement.url)
  await view.update({ ...replacement, url: '/images/producto-sin-imagen.svg' })
  await act(async () => { view.renderer.root.findByType('img').props.onLoad({}) })
  await view.update(replacement)
  assert.equal(view.renderer.root.findByType('img').props.src, replacement.url, 'fallback must recover after a signing error')
 } finally { await view.close() }
})

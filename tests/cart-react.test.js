import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mountCart, act, closeClient } from './react-harness.js'
const pid = '00000000-0000-4000-8000-000000000001', vid = '00000000-0000-4000-8000-000000000002'
function backend() {
 let price = '5000.00', failed = false, hidden = false
 const row = () => ({ id: pid, nombre: 'Producto remoto', slug: 'producto-remoto', publicado: true, es_ejemplo: false, categorias: { nombre: 'Decoración', slug: 'decoracion', activa: true }, imagenes_producto: [], variantes_producto: [{ id: vid, sku: 'SKU-REMOTO', nombre: 'PLA Blanco', activa: true, tipo_precio: 'fijo', precio: price, moneda: 'ARS', disponibilidad: 'bajo_pedido', plazo_produccion_dias: null, ancho_mm: null, alto_mm: null, profundidad_mm: null, materiales: { nombre: 'PLA', activo: true }, colores: { nombre: 'Blanco', activo: true } }] })
 return { price: value => { price = value }, fail: value => { failed = value }, hide: () => { hidden = true }, fetch: async input => {
  const variant = String(input).includes('/variantes_producto?')
  const data = hidden ? [] : variant ? [{ id: vid, producto_id: pid }] : [row()]
  return new Response(JSON.stringify(failed ? { code: 'TEST', message: 'Fallo API' } : data), { status: failed ? 400 : 200, headers: { 'Content-Type': 'application/json' } })
 } }
}
function sendLinks(view) { return view.renderer.root.findAllByType('a').filter(a => String(a.props.href).includes('wa.me/5493816795568?text=')) }

test('recupera, revalida antes de WhatsApp y anula el mensaje al cambiar cantidades', async () => {
 const api = backend(), view = await mountCart([{ variantId: vid, quantity: 2 }], api.fetch)
 try {
  assert.equal(view.context().sync.status, 'ready')
  assert.equal(sendLinks(view).length, 0)
  api.price('6000.00')
  const prepare = view.renderer.root.findAllByType('button').find(b => b.children.includes('Actualizar y preparar consulta'))
  assert.ok(prepare)
  await act(async () => { await prepare.props.onClick() })
  assert.ok(view.context().sync.message.includes('Cambiaron precios'))
  assert.equal(view.context().items[0].quantity, 2)
  const links = sendLinks(view)
  assert.equal(links.length, 1)
  assert.ok(decodeURIComponent(links[0].props.href).includes('12.000,00'))
  await act(async () => { view.context().update(vid, 3) })
  assert.equal(sendLinks(view).length, 0)
  assert.equal(JSON.parse(view.memory.get('mostacho-cart-v1'))[0].quantity, 3)
 } finally { await view.close() }
})
test('fallo y reintento conservan la selección; producto retirado bloquea cotización', async () => {
 const api = backend(); api.fail(true)
 const view = await mountCart([{ variantId: vid, quantity: 4 }], api.fetch)
 try {
  assert.equal(view.context().sync.status, 'error')
  assert.equal(view.context().items[0].quantity, 4)
  assert.equal(sendLinks(view).length, 0)
  api.fail(false)
  await act(async () => { await view.context().refresh() })
  assert.equal(view.context().sync.status, 'ready')
  api.hide()
  await act(async () => { await view.context().refresh() })
  assert.equal(view.context().products.length, 0)
  assert.equal(view.context().items[0].quantity, 4)
  assert.ok(JSON.stringify(view.renderer.toJSON()).includes('Esta opción ya no está disponible'))
  assert.equal(sendLinks(view).length, 0)
 } finally { await view.close() }
})

test('dos validaciones en el mismo milisegundo no reutilizan una consulta anterior', async () => {
 const originalNow = Date.now
 Date.now = () => 1800000000000
 const api = backend()
 let view
 try {
  view = await mountCart([{ variantId: vid, quantity: 1 }], api.fetch)
  const prepare = view.renderer.root.findAllByType('button').find(b => b.children.includes('Actualizar y preparar consulta'))
  await act(async () => { await prepare.props.onClick() })
  assert.equal(sendLinks(view).length, 1)
  api.price('7000.00')
  await act(async () => { await view.context().refresh() })
  assert.equal(sendLinks(view).length, 0, 'Cambiar la versión de precios debe invalidar el mensaje preparado')
 } finally {
  if (view) await view.close()
  Date.now = originalNow
 }
})

after(closeClient)

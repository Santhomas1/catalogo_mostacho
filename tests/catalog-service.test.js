import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { createCatalogService, mapProduct } from '../src/services/catalog-service.js'
import { refreshCartSnapshot, prepareCartSummary } from '../src/lib/cart-sync.js'

const pid = '00000000-0000-4000-8000-000000000001'
const vid = '00000000-0000-4000-8000-000000000002'
export const row = {
 id: pid, nombre: 'Maceta de prueba de contrato', slug: 'maceta-test', descripcion: 'Prueba', publicado: true, es_ejemplo: false, destacado: true,
 categorias: { id: 'category', nombre: 'Decoración', slug: 'decoracion', activa: true }, imagenes_producto: [],
 variantes_producto: [{ id: vid, sku: 'TEST-1', nombre: 'PLA blanco', activa: true, tipo_precio: 'fijo', precio: '5000.00', moneda: 'ARS', disponibilidad: 'bajo_pedido', plazo_produccion_dias: 3, ancho_mm: 80, alto_mm: 90, profundidad_mm: 80, materiales: { nombre: 'PLA', activo: true }, colores: { nombre: 'Blanco', activo: true } }],
}
function clientWith(handler) {
 return createClient('https://example.invalid', 'sb_publishable_test', { auth: { persistSession: false }, global: { fetch: handler } })
}
const json = (data, headers = {}) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', ...headers } })

test('consulta real del SDK incluye filtros públicos, búsqueda literal y rango de página', async () => {
 let url
 const service = createCatalogService(clientWith(async input => { url = new URL(input); return json([row], { 'Content-Range': '12-12/25' }) }))
 const result = await service.list({ query: '50%_ñ', category: 'decoracion', page: 2 })
 assert.equal(url.searchParams.get('publicado'), 'eq.true')
 assert.equal(url.searchParams.get('es_ejemplo'), 'eq.false')
 assert.equal(url.searchParams.get('categorias.activa'), 'eq.true')
 assert.equal(url.searchParams.get('categorias.slug'), 'eq.decoracion')
 assert.equal(url.searchParams.get('nombre'), 'ilike.%50\\%\\_ñ%')
 assert.equal(url.searchParams.get('offset'), '12')
 assert.equal(url.searchParams.get('limit'), '12')
 assert.equal(result.count, 25)
 assert.equal(result.products[0].variants[0].price, 5000)
})
test('página fuera de rango vuelve a consultar la primera página', async () => {
 const offsets = []
 const service = createCatalogService(clientWith(async input => {
  const url = new URL(input); offsets.push(url.searchParams.get('offset'))
  return offsets.length === 1 ? new Response(JSON.stringify({ code: 'PGRST103', message: 'range' }), { status: 416 }) : json([], { 'Content-Range': '*/0' })
 }))
 const result = await service.list({ page: 10 })
 assert.deepEqual(offsets, ['108', '0'])
 assert.equal(result.page, 1)
 assert.equal(result.pageReset, true)
})
test('firma las rutas con vencimiento y usa respaldo si falla Storage', async () => {
 const imageRow = { ...row, imagenes_producto: [{ id: 'img', storage_path: 'products/path.webp', texto_alternativo: 'Vista frontal', orden: 0 }] }
 let payload
 const service = createCatalogService(clientWith(async (input, options) => {
  if (String(input).includes('/storage/')) { payload = JSON.parse(options.body); return new Response(JSON.stringify({ message: 'Fallo temporal' }), { status: 403 }) }
  return json([imageRow], { 'Content-Range': '0-0/1' })
 }))
 const result = await service.list()
 assert.equal(payload.expiresIn, 60)
 assert.equal(result.imageWarning, true)
 assert.equal(result.products[0].images[0].url, '/images/producto-sin-imagen.svg')
})
test('mapea precios a acordar, filtra variantes inactivas y no convierte nulos a cero', () => {
 const mapped = mapProduct({ ...row, variantes_producto: [{ ...row.variantes_producto[0], tipo_precio: 'a_acordar', precio: null, moneda: null }, { ...row.variantes_producto[0], id: 'inactive', activa: false }] })
 assert.equal(mapped.variants.length, 1)
 assert.equal(mapped.variants[0].priceMode, 'a_acordar')
 assert.equal(mapped.variants[0].price, null)
 assert.equal(mapped.variants[0].currency, null)
})
test('consulta variantes en lotes acotados y rechaza IDs locales antiguos sin consultar', async () => {
 const calls = []
 const service = createCatalogService(clientWith(async input => {
  const url = new URL(input); calls.push(url)
  return url.pathname.endsWith('/variantes_producto') ? json([{ id: vid, producto_id: pid }]) : json([row])
 }))
 assert.deepEqual(await service.byVariantIds(['demo-small']), [])
 assert.equal(calls.length, 0)
 const products = await service.byVariantIds([vid])
 assert.equal(products.length, 1)
 assert.equal(calls.length, 2)
 assert.ok(calls[1].searchParams.get('id').includes(pid))
 assert.equal(calls[1].searchParams.get('limit'), '50')
})
test('revalidar informa cambios, conserva cantidades y no genera resumen con una opción retirada', async () => {
 const items = [{ variantId: vid, quantity: 4 }]
 const before = [mapProduct(row)]
 const after = mapProduct({ ...row, variantes_producto: [{ ...row.variantes_producto[0], precio: '6000.00' }] })
 const snapshot = await refreshCartSnapshot({ byVariantIds: async () => [after] }, items, before)
 assert.equal(snapshot.changed, true)
 assert.equal(snapshot.items[0].quantity, 4)
 assert.ok(prepareCartSummary(snapshot, 'https://example.com').includes('24.000,00'))
 const removed = await refreshCartSnapshot({ byVariantIds: async () => [] }, items, before)
 assert.equal(prepareCartSummary(removed, 'https://example.com'), '')
 assert.deepEqual(items, [{ variantId: vid, quantity: 4 }])
})
test('un fallo de red no modifica la selección guardada', async () => {
 const items = [{ variantId: vid, quantity: 2 }]
 await assert.rejects(refreshCartSnapshot({ byVariantIds: async () => { throw Error('red') } }, items))
 assert.deepEqual(items, [{ variantId: vid, quantity: 2 }])
})

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


test('listado limita las fotos a la portada; detalle y carrito evitan conteos exactos', async () => {
 const calls = []
 const service = createCatalogService(clientWith(async (input, options) => {
  const url = new URL(input)
  calls.push({ url, prefer: new Headers(options.headers).get('prefer') || '' })
  if (url.searchParams.get('slug')) return json(row)
  return json([row], { 'Content-Range': '0-0/1' })
 }))
 await service.list()
 assert.equal(calls[0].url.searchParams.get('imagenes_producto.limit'), '1')
 assert.equal(calls[0].url.searchParams.get('imagenes_producto.order'), 'orden.asc')
 assert.ok(!calls[0].url.searchParams.get('select').includes('instrucciones_cuidado'))
 await service.bySlug(row.slug)
 assert.ok(!calls[1].prefer.includes('count=exact'))
 await service.byProductIds([pid])
 assert.ok(!calls[2].prefer.includes('count=exact'))
 assert.ok(!calls[2].url.searchParams.get('select').includes('imagenes_producto'))
 await service.list({ featured: true, pageSize: 6, includeCount: false })
 assert.ok(!calls[3].prefer.includes('count=exact'))
})

test('URLs de portada se reutilizan brevemente sin cachear precios ni extender su vencimiento', async () => {
 let now = 1000, signs = 0, reads = 0
 const picture = { id: 'img', storage_path: 'products/path.webp', texto_alternativo: 'Portada', orden: 0 }
 const service = createCatalogService(clientWith(async (input, options) => {
  if (String(input).includes('/storage/')) {
   signs++
   const payload = JSON.parse(options.body)
   assert.equal(payload.expiresIn, 60)
   return json(payload.paths.map(path => ({ path, signedURL: '/object/sign/productos/' + path + '?token=' + signs })))
  }
  reads++
  return json([{ ...row, precio: String(reads), imagenes_producto: [picture] }], { 'Content-Range': '0-0/1' })
 }), { reuseSignedUrls: true, now: () => now })
 const a = await service.list()
 now += 10000
 const b = await service.list()
 assert.equal(reads, 2)
 assert.equal(signs, 1)
 assert.equal(a.products[0].images[0].url, b.products[0].images[0].url)
 assert.notEqual(a.products[0].price, b.products[0].price)
 now += 45000
 const c = await service.list()
 assert.equal(signs, 2)
 assert.notEqual(c.products[0].images[0].url, b.products[0].images[0].url)
})

test('miniaturas requieren activacion; listado firma solo portada pequena y detalle conserva ambas resoluciones', async () => {
 const photo = { id: 'picture', storage_path: 'products/full.webp', thumbnail_path: 'products/small.webp', texto_alternativo: 'Vista', orden: 0 }
 const calls = []
 const client = clientWith(async (input, options) => {
  const url = new URL(input)
  if (url.pathname.includes('/storage/')) {
   const { paths } = JSON.parse(options.body); calls.push(paths)
   return json(paths.map(path => ({ path, signedURL: '/object/sign/productos/' + path + '?token=test' })))
  }
  const result = { ...row, imagenes_producto: [photo] }
  return json(url.searchParams.has('slug') ? result : [result], { 'Content-Range': '0-0/1' })
 })
 const service = createCatalogService(client, { thumbnails: true })
 const list = await service.list()
 assert.deepEqual(calls[0], ['products/small.webp'])
 assert.ok(list.products[0].images[0].url.includes('small.webp'))
 const detail = await service.bySlug(row.slug)
 assert.deepEqual(calls[1], ['products/full.webp', 'products/small.webp'])
 assert.ok(detail.product.images[0].url.includes('full.webp'))
 assert.ok(detail.product.images[0].thumbnailUrl.includes('small.webp'))
 await createCatalogService(client).list()
 assert.deepEqual(calls[2], ['products/full.webp'])
})

test('lecturas simultaneas se unifican; una carga posterior vuelve a leer datos y errores no quedan cacheados', async () => {
 let reads = 0, fail = false
 const service = createCatalogService(clientWith(async () => {
  reads++
  await new Promise(resolve => setTimeout(resolve, 5))
  return fail ? new Response(JSON.stringify({ message: 'Unavailable' }), { status: 400 }) : json([row])
 }), { reuseSignedUrls: true })
 await Promise.all([service.list(), service.list()])
 assert.equal(reads, 1)
 await service.list()
 assert.equal(reads, 2)
 fail = true
 await assert.rejects(service.list())
 fail = false
 await service.list()
 assert.equal(reads, 4)
})

test('cache publica reutiliza resultados 30s, separa filtros y permite reintentar sin cache', async () => {
 let now = 1000, reads = 0
 const service = createCatalogService(clientWith(async () => {
  reads++
  return json([{ ...row, precio: String(reads) }], { 'Content-Range': '0-0/1' })
 }), { reuseSignedUrls: true, cacheResults: true, signedUrlSeconds: 300, now: () => now })
 const first = await service.list({ query: 'maceta', page: 1 })
 first.products[0].name = 'Mutación del consumidor'
 now += 20000
 const back = await service.list({ page: 1, query: 'maceta' })
 assert.equal(reads, 1)
 assert.equal(back.products[0].name, row.nombre)
 await service.list({ query: 'otra' })
 assert.equal(reads, 2)
 const fresh = await service.list({ query: 'maceta', page: 1, force: true })
 assert.equal(fresh.products[0].price, 3)
 now += 30000
 await service.list({ query: 'maceta', page: 1 })
 assert.equal(reads, 4)
})

test('categorias se conservan tres minutos; carrito y detalle siempre leen datos actuales', async () => {
 let now = 1000, reads = 0, price = '100'
 const service = createCatalogService(clientWith(async input => {
  reads++
  const url = new URL(input)
  if (url.pathname.endsWith('/categorias')) return json([{ id: 'cat', nombre: 'Decoración', slug: 'decoracion' }])
  const current = { ...row, precio: price }
  return json(url.searchParams.has('slug') ? current : [current])
 }), { reuseSignedUrls: true, cacheResults: true, signedUrlSeconds: 300, now: () => now })
 await service.categories()
 now += 179999
 await service.categories()
 assert.equal(reads, 1)
 now++
 await service.categories()
 assert.equal(reads, 2)
 await service.categories({ force: true })
 assert.equal(reads, 3)
 assert.equal((await service.byProductIds([pid]))[0].price, 100)
 assert.equal((await service.bySlug(row.slug)).product.price, 100)
 price = '250'
 assert.equal((await service.byProductIds([pid]))[0].price, 250)
 assert.equal((await service.bySlug(row.slug)).product.price, 250)
 assert.equal(reads, 7)
})

test('firmas de cinco minutos se reutilizan entre refrescos y se renuevan antes de vencer', async () => {
 let now = 1000, signs = 0, reads = 0
 const photo = { id: 'img', storage_path: 'products/full.webp', thumbnail_path: 'products/small.webp', orden: 0 }
 const service = createCatalogService(clientWith(async (input, options) => {
  if (String(input).includes('/storage/')) {
   signs++
   const { paths, expiresIn } = JSON.parse(options.body)
   assert.equal(expiresIn, 300)
   return json(paths.map(path => ({ path, signedURL: '/object/sign/productos/' + path + '?token=' + signs })))
  }
  reads++
  return json([{ ...row, imagenes_producto: [photo] }])
 }), { reuseSignedUrls: true, cacheResults: true, signedUrlSeconds: 300, thumbnails: true, now: () => now })
 const first = await service.list()
 now += 180000
 const refreshed = await service.list()
 assert.equal(reads, 2)
 assert.equal(signs, 1)
 assert.equal(first.products[0].images[0].url, refreshed.products[0].images[0].url)
 now += 75000
 await service.list()
 assert.equal(signs, 2)
})

test('errores y fotos fallidas no se conservan; clientes sin opt-in no cachean datos', async () => {
 let reads = 0, fail = true
 const client = clientWith(async input => {
  if (String(input).includes('/storage/')) return new Response('{}', { status: 403 })
  reads++
  if (fail) return new Response('{}', { status: 400 })
  return json([{ ...row, imagenes_producto: [{ storage_path: 'products/photo.webp', orden: 0 }] }])
 })
 const service = createCatalogService(client, { reuseSignedUrls: true, cacheResults: true, signedUrlSeconds: 300 })
 await assert.rejects(service.list())
 fail = false
 assert.equal((await service.list()).imageWarning, true)
 await service.list()
 assert.equal(reads, 3)
 const isolated = createCatalogService(client, { cacheResults: true })
 await isolated.list()
 await isolated.list()
 assert.equal(reads, 5)
})

test('tarjetas piden solo datos de precio, disponibilidad y portada; detalle mantiene especificaciones', async () => {
 const selections = []
 const service = createCatalogService(clientWith(async input => {
  const url = new URL(input)
  selections.push(url.searchParams.get('select'))
  return json(url.searchParams.has('slug') ? row : [row])
 }))
 await service.list()
 for (const field of ['sku', 'ancho_mm', 'alto_mm', 'profundidad_mm', 'plazo_produccion_dias', 'descripcion', 'instrucciones_cuidado']) {
  assert.ok(!selections[0].includes(field), field)
 }
 await service.bySlug(row.slug)
 assert.ok(selections[1].includes('sku'))
 assert.ok(selections[1].includes('ancho_mm'))
})

test('invalidar descarta resultados anteriores incluso si una lectura vieja termina despues', async () => {
 let reads = 0, releaseOld
 const service = createCatalogService(clientWith(async () => {
  const read = ++reads
  if (read === 1) await new Promise(resolve => { releaseOld = resolve })
  return json([{ ...row, precio: String(read) }])
 }), { reuseSignedUrls: true, cacheResults: true, signedUrlSeconds: 300 })
 const old = service.list()
 while (!releaseOld) await new Promise(resolve => setTimeout(resolve, 0))
 service.clearCache()
 const fresh = await service.list()
 assert.equal(fresh.products[0].price, 2)
 releaseOld()
 await old
 assert.equal((await service.list()).products[0].price, 2)
 assert.equal(reads, 2)
 service.clearCache()
 assert.equal((await service.list()).products[0].price, 3)
})

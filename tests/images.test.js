import test from 'node:test'
import assert from 'node:assert/strict'
import { imagePath, optimizeImage, uploadProductImage, signedImageUrl, cleanImageQueue, MAX_IMAGE_BYTES } from '../src/services/images.js'

const productId = '00000000-0000-4000-8000-000000000001'
const blob = new Blob(['test image payload'], { type: 'image/webp' })

test('si el navegador devuelve PNG, null o lanza un error genera WebP con el codificador alternativo', async t => {
 const oldBitmap = globalThis.createImageBitmap, oldDocument = globalThis.document
 const bitmap = { width: 2, height: 2, close: t.mock.fn() }
 const pixels = { width: 2, height: 2, data: new Uint8ClampedArray(16) }
 let nativeResult = new Blob(['png'], { type: 'image/png' })
 const encoder = t.mock.fn(async data => { assert.equal(data, pixels); return blob })
 globalThis.createImageBitmap = async () => bitmap
 globalThis.document = { createElement: () => ({
  getContext: () => ({ drawImage() {}, getImageData: () => pixels }),
  toBlob: cb => { if (nativeResult instanceof Error) throw nativeResult; cb(nativeResult) },
 }) }
 try {
  const file = { type: 'image/jpeg', size: 100 }
  for (const result of [nativeResult, null, new Error('Sin exportación'), new Blob([], { type: 'image/webp' })]) {
   nativeResult = result
   const converted = await optimizeImage(file, { webpEncoder: encoder })
   assert.equal(converted, blob)
   const client = fakeClient()
   await uploadProductImage(client, { productId, blob: converted, alt: 'Foto iPhone' })
   assert.equal(client.calls[0][3].contentType, 'image/webp')
  }
  assert.equal(encoder.mock.callCount(), 4)
  nativeResult = blob
  await optimizeImage(file, { webpEncoder: encoder })
  assert.equal(encoder.mock.callCount(), 4)
  nativeResult = null
  await assert.rejects(optimizeImage(file, { webpEncoder: async () => { throw Error('Sin red') } }), /conexión/)
  await assert.rejects(optimizeImage(file, { webpEncoder: async () => new Blob(['png'], { type: 'image/png' }) }), /WebP válida/)
  await assert.rejects(optimizeImage(file, { webpEncoder: async () => ({ type: 'image/webp', size: MAX_IMAGE_BYTES + 1 }) }), /supera los 5 MB/)
  assert.equal(bitmap.close.mock.callCount(), 8)
 } finally {
  if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap
  if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument
 }
})

test('el codificador WASM real produce un archivo RIFF/WEBP desde píxeles', async () => {
 const { readFile } = await import('node:fs/promises')
 const { simd } = await import('wasm-feature-detect')
 const { default: encode, init } = await import('@jsquash/webp/encode.js')
 const variant = await simd() ? 'webp_enc_simd.wasm' : 'webp_enc.wasm'
 const bytes = await readFile(new URL('../node_modules/@jsquash/webp/codec/enc/' + variant, import.meta.url))
 await init(await WebAssembly.compile(bytes))
 const result = Buffer.from(await encode({ width: 2, height: 2, data: new Uint8ClampedArray([
  255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
 ]) }, { quality: 82 }))
 assert.equal(result.toString('ascii', 0, 4), 'RIFF')
 assert.equal(result.toString('ascii', 8, 12), 'WEBP')
 assert.equal(result.readUInt32LE(4) + 8, result.length)
 assert.ok(result.length < MAX_IMAGE_BYTES)
})

test('convierte formatos comunes y HEIC/HEIF con MIME ausente; libera recursos y rechaza fallos', async t => {
 const bitmap = { width: 4000, height: 6000, close: t.mock.fn() }
 const decode = t.mock.fn(async () => bitmap)
 const draw = t.mock.fn()
 let output = blob
 const canvas = { getContext: () => ({ drawImage: draw }), toBlob: cb => cb(output) }
 const previousBitmap = globalThis.createImageBitmap
 globalThis.createImageBitmap = async file => {
  if (/heic|heif/i.test(file.type + file.name)) throw new Error('Sin soporte nativo')
  return bitmap
 }
 const previousDocument = globalThis.document
 globalThis.document = { createElement: () => canvas }
 try {
  for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp']) {
   assert.equal(await optimizeImage({ type, size: 100 }), blob)
  }
  for (const file of [
   { type: 'image/heic', name: 'IMG_123.HEIC', size: 100 },
   { type: 'image/heif', name: 'foto.heif', size: 100 },
   { type: '', name: 'foto.HEIC', size: 100 },
   { type: 'application/octet-stream', name: 'foto.heif', size: 100 },
  ]) {
   assert.equal(await optimizeImage(file, { heicDecoder: decode }), blob)
  }
  assert.equal(decode.mock.callCount(), 4)
  assert.equal(canvas.width, 1067)
  assert.equal(canvas.height, 1600)
  assert.equal(bitmap.close.mock.callCount(), 10)
  output = new Blob(['PNG fallback'], { type: 'image/png' })
  await assert.rejects(optimizeImage({ type: 'image/jpeg', size: 100 }), /WebP/)
  assert.equal(bitmap.close.mock.callCount(), 11)
  await assert.rejects(optimizeImage({ type: 'image/heic', size: 100 }, {
   heicDecoder: async () => { throw new Error('Archivo dañado') },
  }), /HEIC\/HEIF/)
  const before = decode.mock.callCount()
  await assert.rejects(optimizeImage({ type: 'image/heic', size: 51 * 1024 * 1024 }, { heicDecoder: decode }), /50 MB/)
  assert.equal(decode.mock.callCount(), before)
 } finally {
  if (previousBitmap === undefined) delete globalThis.createImageBitmap
  else globalThis.createImageBitmap = previousBitmap
  if (previousDocument === undefined) delete globalThis.document
  else globalThis.document = previousDocument
 }
})

function fakeClient({ saveError = null, removeError = null, queueError = null } = {}) {
  const calls = []
  return { calls,
    storage: { from: bucket => ({
      upload: async (path, file, options) => { calls.push(['upload', bucket, path, options]); return { error: null } },
      remove: async paths => { calls.push(['remove', paths]); return { error: removeError } },
      createSignedUrl: async (path, ttl) => { calls.push(['sign', path, ttl]); return { data: { signedUrl: 'https://example.invalid/signed' } } },
    }) },
    from: table => ({ insert: value => {
      calls.push(['insert', table, value])
      if (table === 'archivos_pendientes_limpieza') return Promise.resolve({ error: queueError })
      return { select: () => ({ single: async () => ({ data: saveError ? null : value, error: saveError }) }) }
    } }),
  }
}
test('rutas únicas conservan el producto y rechazan identificadores inválidos', () => {
  const a = imagePath(productId), b = imagePath(productId)
  assert.notEqual(a, b)
  assert.ok(a.startsWith(`products/${productId}/`))
  assert.ok(a.endsWith('.webp'))
  assert.throws(() => imagePath('../otro'))
})
test('rechaza archivos y texto alternativo inválidos antes de cargar', async () => {
  const client = fakeClient()
  await assert.rejects(uploadProductImage(client, { productId, blob, alt: ' ' }))
  await assert.rejects(uploadProductImage(client, { productId, blob: new Blob(['x'], { type: 'image/svg+xml' }), alt: 'Objeto' }))
  await assert.rejects(uploadProductImage(client, { productId, blob: { type: 'image/webp', size: MAX_IMAGE_BYTES + 1 }, alt: 'Objeto' }))
  assert.equal(client.calls.length, 0)
})
test('guarda una referencia estable después de subir, sin sobrescribir', async () => {
  const client = fakeClient()
  const row = await uploadProductImage(client, { productId, blob, alt: ' Vista frontal ', order: 2 })
  assert.equal(row.texto_alternativo, 'Vista frontal')
  assert.equal(row.orden, 2)
  assert.equal(row.bucket_id, 'productos')
  assert.ok(row.storage_path.includes(productId))
  assert.equal(client.calls[0][0], 'upload')
  assert.equal(client.calls[0][3].upsert, false)
  assert.ok(!('url' in row))
})
test('si falla la referencia elimina por API; si falla eliminar, encola', async () => {
  const problem = new Error('Orden duplicado')
  const client = fakeClient({ saveError: problem })
  await assert.rejects(uploadProductImage(client, { productId, blob, alt: 'Objeto' }), /Orden duplicado/)
  assert.equal(client.calls.at(-1)[0], 'remove')
  const queued = fakeClient({ saveError: problem, removeError: new Error('Sin red') })
  await assert.rejects(uploadProductImage(queued, { productId, blob, alt: 'Objeto' }))
  assert.equal(queued.calls.at(-1)[1], 'archivos_pendientes_limpieza')
  const failed = fakeClient({ saveError: problem, removeError: problem, queueError: problem })
  await assert.rejects(uploadProductImage(failed, { productId, blob, alt: 'Objeto' }), /Ruta para revisar/)
})
test('URL temporal expira en 60 segundos, sin guardarse como referencia', async () => {
  const client = fakeClient()
  assert.equal(await signedImageUrl(client, imagePath(productId)), 'https://example.invalid/signed')
  assert.equal(client.calls[0][2], 60)
})
test('la limpieza no borra archivos que vuelven a tener una referencia', async () => {
  let removed = false
  const client = {
    from: table => table === 'archivos_pendientes_limpieza'
      ? { select: () => ({ order: () => ({ limit: async () => ({ data: [{ id: 'pending', bucket_id: 'productos', storage_path: 'path' }] }) }) }) }
      : { select: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: 'linked' }] }) }) }) }) },
    storage: { from: () => ({ remove: async () => { removed = true; return {} } }) },
  }
  const result = await cleanImageQueue(client)
  assert.equal(removed, false)
  assert.equal(result[0].skipped, true)
})

test('limpieza no informa éxito si falta permiso para retirar el pendiente', async () => {
 const client = {
  from: table => table === 'archivos_pendientes_limpieza' ? {
   select: () => ({ order: () => ({ limit: async () => ({ data: [{ id: 'pending', bucket_id: 'productos', storage_path: 'path' }] }) }) }),
   delete: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }),
  } : { select: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: [] }) }) }) }) },
  storage: { from: () => ({ remove: async () => ({ data: [{ name: 'path' }], error: null }) }) },
 }
 const result = await cleanImageQueue(client)
 assert.ok(result[0].error)
})

test('la limpieza de una imagen se limita a las rutas solicitadas y no procesa otros pendientes', async () => {
 let filter
 const client = { from: () => ({ select: () => ({ order: () => ({ limit: () => ({ in: async (field, paths) => { filter = { field, paths }; return { data: [] } } }) }) }) }) }
 assert.deepEqual(await cleanImageQueue(client, 50, ['products/only-this.webp']), [])
 assert.deepEqual(filter, { field: 'storage_path', paths: ['products/only-this.webp'] })
 assert.deepEqual(await cleanImageQueue({}, 50, []), [])
})

test('acepta originales de 30 y 50 MB y sube solamente el WebP optimizado', async () => {
 const { optimizeImage } = await import('../src/services/images.js')
 const oldBitmap = globalThis.createImageBitmap
 const oldDocument = globalThis.document
 let closed = 0
 let drawn = 0
 const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() { drawn++ } }), toBlob: callback => callback(blob) }
 globalThis.createImageBitmap = async () => ({ width: 6000, height: 4000, close() { closed++ } })
 globalThis.document = { createElement: () => canvas }
 try {
  for (const size of [30, 50]) {
   const optimized = await optimizeImage({ type: 'image/jpeg', size: size * 1024 * 1024 })
   assert.equal(optimized, blob)
   assert.equal(canvas.width, 1600)
   assert.equal(canvas.height, 1067)
   assert.ok(optimized.size < MAX_IMAGE_BYTES)
   const client = fakeClient()
   await uploadProductImage(client, { productId, blob: optimized, alt: 'Foto grande' })
   assert.equal(client.calls[0][0], 'upload')
  }
  assert.equal(drawn, 2)
  assert.equal(closed, 2)
  await assert.rejects(optimizeImage({ type: 'image/jpeg', size: 50 * 1024 * 1024 + 1 }), /50 MB/)
  await assert.rejects(optimizeImage({ type: 'image/jpeg', size: 0 }), /50 MB/)
  await assert.rejects(optimizeImage({ type: 'application/pdf', size: 100 }), /archivo de imagen/)
  assert.equal(closed, 2)
 } finally {
  if (oldBitmap === undefined) delete globalThis.createImageBitmap; else globalThis.createImageBitmap = oldBitmap
  if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument
 }
})


test('miniatura limita el lado mayor a 640 sin ampliar imagenes pequenas', async () => {
 const previousBitmap = globalThis.createImageBitmap, previousDocument = globalThis.document
 let width = 1600, height = 1200
 const canvas = { getContext: () => ({ drawImage() {} }), toBlob: callback => callback(blob) }
 globalThis.createImageBitmap = async () => ({ width, height, close() {} })
 globalThis.document = { createElement: () => canvas }
 try {
  await optimizeImage(blob, { maxDimension: 640 })
  assert.equal(canvas.width, 640); assert.equal(canvas.height, 480)
  width = 200; height = 100
  await optimizeImage(blob, { maxDimension: 640 })
  assert.equal(canvas.width, 200); assert.equal(canvas.height, 100)
  await assert.rejects(optimizeImage(blob, { maxDimension: 0 }))
 } finally { globalThis.createImageBitmap = previousBitmap; globalThis.document = previousDocument }
})

test('carga ambas resoluciones antes de guardar la referencia; si falla, compensa los dos archivos', async () => {
 const client = fakeClient()
 const saved = await uploadProductImage(client, { productId, blob, thumbnailBlob: blob, alt: 'Vista' })
 const uploads = client.calls.filter(call => call[0] === 'upload')
 assert.equal(uploads.length, 2)
 assert.notEqual(saved.storage_path, saved.thumbnail_path)
 assert.equal(saved.storage_path, uploads[0][2])
 assert.equal(saved.thumbnail_path, uploads[1][2])
 const failed = fakeClient({ saveError: new Error('No se pudo guardar') })
 await assert.rejects(uploadProductImage(failed, { productId, blob, thumbnailBlob: blob, alt: 'Vista' }))
 assert.equal(failed.calls.find(call => call[0] === 'remove')[1].length, 2)
})

test('firma por lotes deduplica rutas y mantiene el vencimiento y los errores parciales', async () => {
 const { signedImageUrls } = await import('../src/services/images.js')
 const requests = []
 const client = { storage: { from: () => ({ createSignedUrls: async (paths, ttl) => {
  requests.push({ paths, ttl })
  return { data: [{ path: 'a', signedUrl: 'https://example.invalid/a' }, { path: 'b', error: 'denied' }] }
 } }) } }
 const urls = await signedImageUrls(client, ['a', 'b', 'a'])
 assert.deepEqual(requests, [{ paths: ['a', 'b'], ttl: 60 }])
 assert.equal(urls.get('a'), 'https://example.invalid/a')
 assert.equal(urls.has('b'), false)
 assert.equal((await signedImageUrls(client, [])).size, 0)
 assert.equal(requests.length, 1)
})


test('si falla la subida de la miniatura, retira el original nuevo sin guardar una referencia incompleta', async () => {
 const client = fakeClient()
 const from = client.storage.from
 let uploads = 0
 client.storage.from = bucket => {
  const storage = from(bucket)
  return { ...storage, upload: async (...args) => {
   uploads++
   return uploads === 2 ? { error: new Error('Thumbnail upload failed') } : storage.upload(...args)
  } }
 }
 await assert.rejects(uploadProductImage(client, { productId, blob, thumbnailBlob: blob, alt: 'Vista' }), /Thumbnail upload failed/)
 assert.equal(client.calls.some(call => call[0] === 'insert' && call[1] === 'imagenes_producto'), false)
 assert.equal(client.calls.find(call => call[0] === 'remove')[1].length, 1)
})

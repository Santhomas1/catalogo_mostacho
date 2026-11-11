// Se recibe el cliente autenticado; la conexión y las pantallas se integran en etapas 6/7.
export const IMAGE_BUCKET = 'productos'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_SOURCE_IMAGE_BYTES = 50 * 1024 * 1024
export const SIGNED_IMAGE_SECONDS = 60
const imageExtension = /\.(jpe?g|png|webp|gif|avif|bmp|ico|svg|heic|heif)$/i

async function encodeWebpFallback(imageData) {
  const { encodeWebp } = await import('./webp-encoder.js')
  return encodeWebp(imageData)
}

async function decodeHeic(file) {
  // Se carga solo cuando el navegador no puede abrir una foto de iPhone.
  const { heicTo } = await import('heic-to/csp')
  return heicTo({ blob: file, type: 'bitmap' })
}

async function decodeImage(file, heicDecoder) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const heic = /^image\/hei[cf](?:-sequence)?$/i.test(file.type) || /\.hei[cf]$/i.test(file.name || '')
    if (heic) {
      try { return await heicDecoder(file) }
      catch { throw new Error('No se pudo convertir la foto HEIC/HEIF. Probá con otra foto o exportala como JPEG.') }
    }
    // Safari y algunos formatos pueden necesitar el decodificador de <img>.
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      return { width: image.naturalWidth, height: image.naturalHeight, source: image, close() {} }
    } catch {
      throw new Error('No se pudo abrir la imagen. El formato no es compatible o el archivo está dañado.')
    } finally { URL.revokeObjectURL(url) }
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function imagePath(productId, imageId = crypto.randomUUID()) {
  if (!uuid.test(productId) || !uuid.test(imageId)) throw new Error('Identificador de imagen o producto inválido.')
  return `products/${productId.toLowerCase()}/${imageId.toLowerCase()}.webp`
}

export async function optimizeImage(file, { heicDecoder = decodeHeic, webpEncoder = encodeWebpFallback, maxDimension = 1600 } = {}) {
  if (!file || (!file.type?.startsWith('image/') && !imageExtension.test(file.name || ''))) throw new Error('Elegí un archivo de imagen, como JPEG, PNG, WebP o HEIC/HEIF.')
  if (!file.size || file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error('La imagen original debe pesar entre 1 byte y 50 MB.')
  if (!Number.isInteger(maxDimension) || maxDimension < 1 || maxDimension > 1600) throw new Error('Dimensiones de imagen inválidas.')
  const bitmap = await decodeImage(file, heicDecoder)
  try {
    if (!bitmap.width || !bitmap.height) throw new Error('La imagen no tiene dimensiones válidas.')
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Este navegador no permite procesar imágenes.')
    context.drawImage(bitmap.source || bitmap, 0, 0, canvas.width, canvas.height)
    let blob
    try { blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82)) }
    catch { /* Si falla la exportación nativa, usar el codificador independiente. */ }
    if (!blob || blob.type !== 'image/webp' || !blob.size) {
      try {
        blob = await webpEncoder(context.getImageData(0, 0, canvas.width, canvas.height))
      } catch {
        throw new Error('No se pudo iniciar la conversión a WebP. Revisá la conexión y volvé a intentar.')
      }
    }
    if (!blob || blob.type !== 'image/webp' || !blob.size) throw new Error('El codificador no pudo generar una imagen WebP válida.')
    if (blob.size > MAX_IMAGE_BYTES) throw new Error('La imagen convertida supera los 5 MB. Probá con una imagen de menor tamaño.')
    return blob
  } finally { bitmap.close() }
}

export async function uploadProductImage(client, { productId, blob, thumbnailBlob, alt, order = 0 }) {
  if (!alt?.trim()) throw new Error('Describí la imagen para su texto alternativo.')
  if (!Number.isSafeInteger(order) || order < 0) throw new Error('El orden debe ser un entero no negativo.')
  if (blob.type !== 'image/webp' || !blob.size || blob.size > MAX_IMAGE_BYTES) throw new Error('Primero optimizá la imagen a WebP, con un máximo de 5 MB.')
  if (thumbnailBlob && (thumbnailBlob.type !== 'image/webp' || !thumbnailBlob.size || thumbnailBlob.size > MAX_IMAGE_BYTES)) throw new Error('Miniatura WebP inválida.')
  const path = imagePath(productId)
  const thumbnailPath = thumbnailBlob ? imagePath(productId) : null
  const uploadedPaths = [path]
  const storage = client.storage.from(IMAGE_BUCKET)
  const uploaded = await storage.upload(path, blob, { upsert: false, contentType: 'image/webp', cacheControl: '60' })
  if (uploaded.error) throw uploaded.error
  let saved
  try {
    if (thumbnailPath) {
      const thumbnail = await storage.upload(thumbnailPath, thumbnailBlob, { upsert: false, contentType: 'image/webp', cacheControl: '60' })
      if (thumbnail.error) throw thumbnail.error
      uploadedPaths.push(thumbnailPath)
    }
    saved = await client.from('imagenes_producto').insert({ ...(thumbnailPath ? { thumbnail_path: thumbnailPath } : {}), producto_id: productId, bucket_id: IMAGE_BUCKET, storage_path: path, texto_alternativo: alt.trim(), orden: order }).select().single()
  } catch (error) { saved = { error } }
  if (!saved.error) return saved.data
  // Compensación por API: nunca borrar filas de storage.objects por SQL.
  let removed
  try { removed = await storage.remove(uploadedPaths) } catch (error) { removed = { error } }
  if (removed.error || (Array.isArray(removed.data) && removed.data.length < uploadedPaths.length)) {
    const queued = await client.from('archivos_pendientes_limpieza').insert(uploadedPaths.map(storage_path => ({ bucket_id: IMAGE_BUCKET, storage_path, motivo: 'fallo_al_guardar_referencia' })))
    if (queued.error) throw new Error(`No se guardó la imagen ni se pudo registrar su limpieza. Ruta para revisar: ${path}`)
  }
  throw saved.error
}

export async function signedImageUrl(client, path) {
  const { data, error } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(path, SIGNED_IMAGE_SECONDS)
  if (error) throw error
  return data.signedUrl
}

export async function deleteProductImage(client, id) {
  // El trigger encola el archivo; rechaza quitar la última foto de un producto publicado.
  const { data, error } = await client.from('imagenes_producto').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('No se eliminó la referencia. Revisá el acceso y el identificador.')
}

export async function cleanImageQueue(client, limit = 50, paths, thumbnails = false) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Límite de limpieza inválido.')
  if (paths !== undefined && (!Array.isArray(paths) || paths.some(path => typeof path !== 'string'))) throw new Error('Rutas de limpieza inválidas.')
  if (paths?.length === 0) return []
  let request = client.from('archivos_pendientes_limpieza').select('*').order('creado_en').limit(limit)
  if (paths) request = request.in('storage_path', paths)
  const { data, error } = await request
  if (error) throw error
  const results = []
  for (const row of data) {
    let referenceQuery = client.from('imagenes_producto').select('id').eq('bucket_id', row.bucket_id)
    referenceQuery = thumbnails ? referenceQuery.or('storage_path.eq.' + row.storage_path + ',thumbnail_path.eq.' + row.storage_path) : referenceQuery.eq('storage_path', row.storage_path)
    const linked = await referenceQuery.limit(1)
    if (linked.error) { results.push({ path: row.storage_path, error: linked.error }); continue }
    if (linked.data.length) { results.push({ path: row.storage_path, skipped: true }); continue }
    const removed = await client.storage.from(row.bucket_id).remove([row.storage_path])
    if (removed.error) { results.push({ path: row.storage_path, error: removed.error }); continue }
    const done = await client.from('archivos_pendientes_limpieza').delete().eq('id', row.id).select('id')
    results.push({ path: row.storage_path, error: done.error || (!done.data?.length ? new Error('No se pudo cerrar el pendiente de limpieza. Revisá tus permisos y reintentá.') : null) })
  }
  return results
}

export async function signedImageUrls(client, paths) {
  const unique = [...new Set(paths)]
  if (!unique.length) return new Map()
  const { data, error } = await client.storage.from(IMAGE_BUCKET).createSignedUrls(unique, SIGNED_IMAGE_SECONDS)
  if (error) throw error
  return new Map(data.filter(image => image.signedUrl && !image.error).map(image => [image.path, image.signedUrl]))
}

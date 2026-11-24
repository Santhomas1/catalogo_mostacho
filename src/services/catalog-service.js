export const PAGE_SIZE = 12
export const PUBLIC_REFRESH_MS = 180000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const selection = `id,nombre,slug,descripcion,instrucciones_cuidado,destacado,publicado,es_ejemplo,creado_en,tipo_precio,precio,moneda,
  categorias!inner(id,nombre,slug,activa),
  variantes_producto(id,sku,nombre,ancho_mm,alto_mm,profundidad_mm,precio,moneda,tipo_precio,disponibilidad,plazo_produccion_dias,activa,
    materiales!inner(nombre,activo),colores!inner(nombre,codigo_hex,activo)),
  imagenes_producto(id,bucket_id,storage_path,texto_alternativo,orden)`

export function mapProduct(row, urls = new Map()) {
  return {
    id: row.id, name: row.nombre, slug: row.slug, description: row.descripcion,
    care: row.instrucciones_cuidado, category: row.categorias.nombre,
    categorySlug: row.categorias.slug, featured: row.destacado,
    published: row.publicado, demo: row.es_ejemplo,
    hasVariants: Boolean(row.variantes_producto?.length),
    priceMode: row.tipo_precio || 'a_acordar', price: row.precio == null ? null : Number(row.precio), currency: row.moneda || null,
    variants: (row.variantes_producto || []).filter(v => v.activa && v.materiales?.activo && v.colores?.activo).map(v => ({
      id: v.id, sku: v.sku, name: v.nombre, material: v.materiales.nombre, color: v.colores.nombre,
      active: v.activa, priceMode: v.tipo_precio, price: v.precio === null ? null : Number(v.precio),
      currency: v.moneda, availability: v.disponibilidad, days: v.plazo_produccion_dias,
      dimensions: [v.ancho_mm, v.alto_mm, v.profundidad_mm].every(n => n != null)
        ? `${v.ancho_mm} × ${v.alto_mm} × ${v.profundidad_mm} mm` : 'Medidas a coordinar',
    })),
    images: [...(row.imagenes_producto || [])].sort((a, b) => a.orden - b.orden).map(image => ({
      id: image.id, path: image.storage_path, alt: image.texto_alternativo,
      url: urls.get(image.storage_path) || urls.get(image.thumbnail_path) || '/images/producto-sin-imagen.svg',
      thumbnailUrl: urls.get(image.thumbnail_path),
    })),
  }
}

const cardSelection = `id,nombre,slug,destacado,publicado,es_ejemplo,tipo_precio,precio,moneda,
  categorias!inner(nombre,slug,activa),
  variantes_producto(id,activa,precio,moneda,tipo_precio,disponibilidad,
    materiales!inner(activo),colores!inner(activo)),
  imagenes_producto(id,storage_path,texto_alternativo,orden)`
const cartSelection = selection.replace(/,\s*imagenes_producto\([^)]*\)/, '').replace('descripcion,instrucciones_cuidado,', '')

export function selectPublicProducts(client, columns, options = {}) {
  return client.from('productos').select(columns, options)
    .eq('publicado', true).eq('es_ejemplo', false).eq('categorias.activa', true)
}

// Reuse is opt-in: only enable it with the isolated, anonymous catalog client.
export function createCatalogService(client, { reuseSignedUrls = false, cacheResults = false, signedUrlSeconds = 60, thumbnails = false, now = Date.now } = {}) {
  if (!Number.isInteger(signedUrlSeconds) || signedUrlSeconds < 60 || signedUrlSeconds > 300) throw new Error('Vigencia de imagen inválida.')
  const signed = new Map()
  let generation = 0
  function publicProducts(columns = selection, count = false) {
    return selectPublicProducts(client, thumbnails ? columns.replace('storage_path,', 'storage_path,thumbnail_path,') : columns, count ? { count: 'exact' } : {})
      .eq('variantes_producto.activa', true)
      .eq('variantes_producto.materiales.activo', true).eq('variantes_producto.colores.activo', true)
  }
  async function hydrate(rows, images = true, coverOnly = false) {
    if (coverOnly) rows = rows.map(row => ({ ...row, imagenes_producto: [...(row.imagenes_producto || [])].sort((a, b) => a.orden - b.orden).slice(0, 1) }))
    const paths = images ? [...new Set(rows.flatMap(row => (row.imagenes_producto || []).flatMap(i => thumbnails && i.thumbnail_path ? (coverOnly ? [i.thumbnail_path] : [i.storage_path, i.thumbnail_path]) : [i.storage_path])))] : []
    const urls = new Map()
    let imageWarning = false
    for (const [path, entry] of signed) if (entry.expiresAt - now() <= 45000) signed.delete(path)
    const missing = paths.filter(path => {
      const entry = reuseSignedUrls && signed.get(path)
      if (entry) urls.set(path, entry.url)
      return !entry
    })
    if (missing.length) {
      try {
        const issuedAt = now()
        const signingGeneration = generation
        const { data, error } = await client.storage.from('productos').createSignedUrls(missing, signedUrlSeconds)
        if (error) throw error
        for (const image of data) {
          if (image.signedUrl && !image.error) {
            urls.set(image.path, image.signedUrl)
            if (reuseSignedUrls && signingGeneration === generation) {
              if (signed.size >= 256) signed.delete(signed.keys().next().value)
              signed.set(image.path, { url: image.signedUrl, expiresAt: issuedAt + signedUrlSeconds * 1000 })
            }
          } else imageWarning = true
        }
      } catch { imageWarning = true }
    }
    return { products: rows.map(row => mapProduct(row, urls)), imageWarning }
  }
  const service = {
    async categories() {
      // Un solo ID por categoría: no descarga todos sus productos para comprobar visibilidad.
      const { data, error } = await client.from('categorias')
        .select('id,nombre,slug,orden,productos!inner(id)').eq('activa', true)
        .eq('productos.publicado', true).eq('productos.es_ejemplo', false)
        .limit(1, { referencedTable: 'productos' }).order('orden').order('nombre')
      if (error) throw error
      return data.map(row => ({ id: row.id, name: row.nombre, slug: row.slug }))
    },
    async list({ query = '', category = '', page = 1, featured = false, pageSize = PAGE_SIZE, includeCount = true } = {}) {
      const safePage = Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1
      const size = Math.min(Math.max(pageSize, 1), PAGE_SIZE)
      let request = publicProducts(cardSelection, includeCount).order('creado_en', { ascending: false }).order('id')
        .order('orden', { referencedTable: 'imagenes_producto' }).limit(1, { referencedTable: 'imagenes_producto' })
      if (query.trim()) request = request.ilike('nombre', `%${query.trim().slice(0, 120).replace(/[\\%_]/g, '\\$&')}%`)
      if (category) request = request.eq('categorias.slug', category)
      if (featured) request = request.eq('destacado', true)
      const { data, count, error } = await request.range((safePage - 1) * size, safePage * size - 1)
      if (error?.code === 'PGRST103' && safePage > 1) {
        return { ...await this.list({ query, category, page: 1, featured, pageSize: size, includeCount }), pageReset: true }
      }
      if (error) throw error
      return { ...await hydrate(data, true, true), count: count || 0, page: safePage, pageSize: size }
    },
    async bySlug(slug) {
      const { data, error } = await publicProducts().eq('slug', slug).maybeSingle()
      if (error) throw error
      if (!data) return { product: null, imageWarning: false }
      const result = await hydrate([data])
      return { product: result.products[0], imageWarning: result.imageWarning }
    },
    async byProductIds(ids) {
      const valid = [...new Set(ids.filter(id => UUID.test(id)))]
      const products = []
      for (let start = 0; start < valid.length; start += 50) {
        const result = await publicProducts(cartSelection).in('id', valid.slice(start, start + 50)).limit(50)
        if (result.error) throw result.error
        products.push(...(await hydrate(result.data, false)).products)
      }
      return products
    },
    async byVariantIds(ids) {
      const valid = [...new Set(ids.filter(id => UUID.test(id)))]
      if (!valid.length) return []
      const products = new Map()
      for (let start = 0; start < valid.length; start += 50) {
        const { data: variants, error } = await client.from('variantes_producto').select('id,producto_id').in('id', valid.slice(start, start + 50)).eq('activa', true)
        if (error) throw error
        const parentIds = [...new Set(variants.map(v => v.producto_id))]
        if (!parentIds.length) continue
        // Cada lote tiene como máximo 50 padres; no descarga el catálogo completo.
        const result = await publicProducts(cartSelection).in('id', parentIds).limit(50)
        if (result.error) throw result.error
        for (const product of (await hydrate(result.data, false)).products) products.set(product.id, product)
      }
      return [...products.values()]
    },
  }
  if (reuseSignedUrls) {
    const pending = new Map()
    // Memory only, on the anonymous client. Cart and detail always revalidate.
    const completed = new Map()
    for (const name of Object.keys(service)) {
      const method = service[name].bind(service)
      service[name] = (...args) => {
        const force = Boolean(args[0]?.force)
        if (name === 'list' || name === 'categories') {
          const { force: ignored, ...options } = args[0] || {}
          args = Object.keys(options).length ? [Object.fromEntries(Object.entries(options).sort(([a], [b]) => a.localeCompare(b)))] : []
        }
        const key = name + JSON.stringify(args)
        const ttl = cacheResults ? (name === 'categories' ? PUBLIC_REFRESH_MS : name === 'list' ? 30000 : 0) : 0
        const startedAt = now()
        const requestGeneration = generation
        for (const [cachedKey, entry] of completed) if (entry.expiresAt <= startedAt) completed.delete(cachedKey)
        if (force) completed.delete(key)
        const cached = completed.get(key)
        if (cached) return Promise.resolve(structuredClone(cached.value))
        if (pending.has(key)) return pending.get(key)
        const request = method(...args).then(value => {
          // Do not retain failed photos, page redirects, or already old responses.
          // Even a reused image URL has >45s left; this cache lasts at most 30s.
          if (ttl && requestGeneration === generation && !value?.imageWarning && !value?.pageReset && startedAt + ttl > now()) {
            if (completed.size >= 24) completed.delete(completed.keys().next().value)
            completed.set(key, { value: structuredClone(value), expiresAt: startedAt + ttl })
          }
          return value
        })
        pending.set(key, request)
        const clear = () => { if (pending.get(key) === request) pending.delete(key) }
        request.then(clear, clear)
        return request
      }
    }
    service.clearCache = () => {
      generation++
      completed.clear()
      pending.clear()
      signed.clear()
    }
  }
  return service

}

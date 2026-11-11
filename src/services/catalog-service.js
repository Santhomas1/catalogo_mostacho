export const PAGE_SIZE = 12
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
      dimensions: [v.ancho_mm, v.alto_mm, v.profundidad_mm].every(n => n !== null)
        ? `${v.ancho_mm} × ${v.alto_mm} × ${v.profundidad_mm} mm` : 'Medidas a coordinar',
    })),
    images: [...(row.imagenes_producto || [])].sort((a, b) => a.orden - b.orden).map(image => ({
      id: image.id, path: image.storage_path, alt: image.texto_alternativo,
      url: urls.get(image.storage_path) || urls.get(image.thumbnail_path) || '/images/producto-sin-imagen.svg',
      thumbnailUrl: urls.get(image.thumbnail_path),
    })),
  }
}

const cardSelection = selection.replace('descripcion,instrucciones_cuidado,', '').replace('codigo_hex,', '')
const cartSelection = selection.replace(/,\s*imagenes_producto\([^)]*\)/, '').replace('descripcion,instrucciones_cuidado,', '')

// Reuse is opt-in: only enable it with the isolated, anonymous catalog client.
export function createCatalogService(client, { reuseSignedUrls = false, thumbnails = false, now = Date.now } = {}) {
  const signed = new Map()
  function publicProducts(columns = selection, count = false) {
    return client.from('productos').select(thumbnails ? columns.replace('storage_path,', 'storage_path,thumbnail_path,') : columns, count ? { count: 'exact' } : {})
      .eq('publicado', true).eq('es_ejemplo', false).eq('categorias.activa', true)
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
        const { data, error } = await client.storage.from('productos').createSignedUrls(missing, 60)
        if (error) throw error
        for (const image of data) {
          if (image.signedUrl && !image.error) {
            urls.set(image.path, image.signedUrl)
            if (reuseSignedUrls) {
              if (signed.size >= 256) signed.delete(signed.keys().next().value)
              signed.set(image.path, { url: image.signedUrl, expiresAt: issuedAt + 60000 })
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
    for (const name of Object.keys(service)) {
      const method = service[name].bind(service)
      service[name] = (...args) => {
        const key = name + JSON.stringify(args)
        if (pending.has(key)) return pending.get(key)
        const request = method(...args)
        pending.set(key, request)
        const clear = () => { if (pending.get(key) === request) pending.delete(key) }
        request.then(clear, clear)
        return request
      }
    }
  }
  return service

}

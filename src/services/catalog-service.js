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
      url: urls.get(image.storage_path) || '/images/producto-sin-imagen.svg',
    })),
  }
}

export function createCatalogService(client) {
  function publicProducts() {
    return client.from('productos').select(selection, { count: 'exact' })
      .eq('publicado', true).eq('es_ejemplo', false).eq('categorias.activa', true)
      .eq('variantes_producto.activa', true)
      .eq('variantes_producto.materiales.activo', true).eq('variantes_producto.colores.activo', true)
  }
  async function hydrate(rows, images = true) {
    const paths = images ? [...new Set(rows.flatMap(row => (row.imagenes_producto || []).map(i => i.storage_path)))] : []
    const urls = new Map()
    let imageWarning = false
    if (paths.length) {
      try {
        const { data, error } = await client.storage.from('productos').createSignedUrls(paths, 60)
        if (error) throw error
        for (const image of data) { if (image.signedUrl && !image.error) urls.set(image.path, image.signedUrl); else imageWarning = true }
      } catch { imageWarning = true }
    }
    return { products: rows.map(row => mapProduct(row, urls)), imageWarning }
  }
  return {
    async categories() {
      // Un solo ID por categoría: no descarga todos sus productos para comprobar visibilidad.
      const { data, error } = await client.from('categorias')
        .select('id,nombre,slug,orden,productos!inner(id)').eq('activa', true)
        .eq('productos.publicado', true).eq('productos.es_ejemplo', false)
        .limit(1, { referencedTable: 'productos' }).order('orden').order('nombre')
      if (error) throw error
      return data.map(row => ({ id: row.id, name: row.nombre, slug: row.slug }))
    },
    async list({ query = '', category = '', page = 1, featured = false, pageSize = PAGE_SIZE } = {}) {
      const safePage = Number.isSafeInteger(page) && page > 0 ? Math.min(page, 100000) : 1
      const size = Math.min(Math.max(pageSize, 1), PAGE_SIZE)
      let request = publicProducts().order('creado_en', { ascending: false }).order('id')
      if (query.trim()) request = request.ilike('nombre', `%${query.trim().slice(0, 120).replace(/[\\%_]/g, '\\$&')}%`)
      if (category) request = request.eq('categorias.slug', category)
      if (featured) request = request.eq('destacado', true)
      const { data, count, error } = await request.range((safePage - 1) * size, safePage * size - 1)
      if (error?.code === 'PGRST103' && safePage > 1) {
        return { ...await this.list({ query, category, page: 1, featured, pageSize: size }), pageReset: true }
      }
      if (error) throw error
      return { ...await hydrate(data), count: count || 0, page: safePage, pageSize: size }
    },
    async bySlug(slug) {
      const { data, error } = await publicProducts().eq('slug', slug).maybeSingle()
      if (error) throw error
      if (!data) return { product: null, imageWarning: false }
      const result = await hydrate([data])
      return { product: result.products[0], imageWarning: result.imageWarning }
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
        const result = await publicProducts().in('id', parentIds).limit(50)
        if (result.error) throw result.error
        for (const product of (await hydrate(result.data, false)).products) products.set(product.id, product)
      }
      return [...products.values()]
    },
  }
}

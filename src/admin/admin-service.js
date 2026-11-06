const tables = new Set(['categorias', 'materiales', 'colores', 'productos', 'variantes_producto', 'imagenes_producto'])
const fields = {
  categorias: ['nombre', 'slug', 'descripcion', 'orden', 'activa'],
  materiales: ['nombre', 'descripcion', 'activo'], colores: ['nombre', 'codigo_hex', 'activo'],
  productos: ['categoria_id', 'nombre', 'slug', 'descripcion', 'instrucciones_cuidado', 'destacado', 'publicado', 'tipo_precio', 'precio', 'moneda'],
  variantes_producto: ['producto_id', 'material_id', 'color_id', 'sku', 'nombre', 'ancho_mm', 'alto_mm', 'profundidad_mm', 'peso_g', 'tipo_precio', 'precio', 'moneda', 'disponibilidad', 'plazo_produccion_dias', 'activa'],
  imagenes_producto: ['texto_alternativo'],
}
export function slugify(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
export function adminError(error) {
  if (error?.code === '23505') return 'Ya existe un registro con ese nombre, dirección, SKU u orden. Revisá los datos o actualizá la lista si ya habías guardado.'
  if (error?.code === '23503') return 'Hay registros relacionados. Desactivá u ocultá este elemento en lugar de eliminarlo.'
  if (error?.code === '23514') return 'No se pudo guardar: revisá los campos. Para publicar se necesita una imagen; no se puede quitar la última foto de un producto publicado.'
  if (error?.code === 'PGRST116') return 'El registro cambió o ya no tenés permiso. Recargá los datos antes de volver a guardar.'
  if (error?.code === '42501' || error?.status === 401 || error?.status === 403) return 'La sesión no tiene permiso para esta operación. Volvé a iniciar sesión o comprobá tu acceso.'
  return error instanceof Error ? error.message : 'No se pudo completar la operación. Revisá los datos y la conexión e intentá nuevamente.'
}
export function productPricePayload(form) {
  if (form.tipo_precio === 'a_acordar') return { tipo_precio: 'a_acordar', precio: null, moneda: null }
  const precio = form.precio === '' || form.precio == null ? null : Number(form.precio)
  const moneda = form.moneda?.trim().toUpperCase()
  if (form.tipo_precio !== 'fijo' || precio === null || !Number.isFinite(precio) || precio < 0 || !/^[A-Z]{3}$/.test(moneda || '')) throw new Error('El precio fijo requiere importe no negativo y moneda de tres letras.')
  return { tipo_precio: 'fijo', precio, moneda }
}
export function variantPayload(form) {
  const optional = value => value === '' || value === null || value === undefined ? null : Number(value)
  const result = { ...form }
  if (typeof form.nombre === 'string') result.nombre = form.nombre.trim()
  if (typeof form.sku === 'string') result.sku = form.sku.trim()
  for (const field of ['ancho_mm', 'alto_mm', 'profundidad_mm', 'peso_g', 'plazo_produccion_dias']) result[field] = optional(form[field])
  if (form.tipo_precio === 'a_acordar') { result.precio = null; result.moneda = null }
  else { result.precio = optional(form.precio); result.moneda = form.moneda?.trim().toUpperCase() }
  if (!['fijo', 'a_acordar'].includes(result.tipo_precio)) throw new Error('Elegí una modalidad de precio.')
  if (result.tipo_precio === 'fijo' && (!Number.isFinite(result.precio) || result.precio < 0 || !/^[A-Z]{3}$/.test(result.moneda))) throw new Error('El precio fijo requiere importe no negativo y moneda de tres letras.')
  for (const field of ['ancho_mm', 'alto_mm', 'profundidad_mm', 'peso_g']) if (result[field] !== null && (!Number.isFinite(result[field]) || result[field] <= 0)) throw new Error('Las medidas y el peso deben ser mayores que cero o quedar vacíos.')
  if (result.plazo_produccion_dias !== null && (!Number.isInteger(result.plazo_produccion_dias) || result.plazo_produccion_dias < 0)) throw new Error('El plazo debe ser un entero no negativo o quedar a coordinar.')
  return result
}
export function createAdminService(client) {
  const tableName = table => { if (!tables.has(table)) throw new Error('Sección no permitida.'); return table }
  return {
    async access() {
      const { data, error } = await client.rpc('mi_acceso_admin')
      if (error) throw error
      return data === true
    },
    async list(table, { page = 1, query = '' } = {}) {
      let request = client.from(tableName(table)).select('*', { count: 'exact' }).order('actualizado_en', { ascending: false }).order('id')
      if (query.trim()) request = request.ilike('nombre', `%${query.trim().replace(/[\\%_]/g, '\\$&')}%`)
      const { data, error, count } = await request.range((page - 1) * 20, page * 20 - 1)
      if (error?.code === 'PGRST103' && page > 1) return { ...await this.list(table, { query }), page: 1 }
      if (error) throw error
      return { rows: data, count: count || 0, page }
    },
    async references() {
      const result = await Promise.all(['categorias', 'materiales', 'colores'].map(async table => {
        const { data, error, count } = await client.from(table).select('*', { count: 'exact' }).order('nombre').limit(1000)
        if (error) throw error
        if (count > 1000) throw new Error('Hay más de 1000 opciones de referencia; se necesita búsqueda paginada antes de editar.')
        return [table, data]
      }))
      return Object.fromEntries(result)
    },
    async product(id) {
      const { data, error } = await client.from('productos').select('*,variantes_producto(*),imagenes_producto(*)').eq('id', id).single()
      if (error) throw error
      return data
    },
    async save(table, values, existing = null) {
      tableName(table)
      const clean = Object.fromEntries(fields[table].filter(key => key in values).map(key => [key, values[key]]))
      let request
      if (existing) {
        request = client.from(table).update(clean).eq('id', existing.id)
        if (existing.actualizado_en) request = request.eq('actualizado_en', existing.actualizado_en)
      } else request = client.from(table).insert({ ...clean, id: values.id || crypto.randomUUID() })
      const { data, error } = await request.select().single()
      if (error) throw error
      return data
    },
    async remove(table, record) {
      let request = client.from(tableName(table)).delete().eq('id', record.id)
      if (record.actualizado_en) request = request.eq('actualizado_en', record.actualizado_en)
      const { data, error } = await request.select('id')
      if (error) throw error
      if (!data?.length) throw new Error('No se eliminó el registro. Puede haber cambiado o faltar permisos; recargá la lista.')
    },
    async reorder(productId, ids) {
      const { error } = await client.rpc('reordenar_imagenes', { p_producto_id: productId, p_imagenes: ids })
      if (error) throw error
    },
  }
}

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { createCatalogService } from '../src/services/catalog-service.js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert.ok(url && key?.startsWith('sb_publishable_'), 'Configurar las variables públicas de Supabase.')
const client = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, options = {}) => fetch(input, { ...options, signal: AbortSignal.timeout(15000) }) } })
const service = createCatalogService(client)
const list = await service.list()
const categories = await service.categories()
const filtered = await service.list({ query: 'prueba-que-no-debe-existir-8123', category: 'sin-categoria-8123', page: 2 })
assert.equal(filtered.products.length, 0)
assert.equal((await service.bySlug('sin-producto-8123')).product, null)
assert.equal((await service.bySlug('maceta-geometrica-ejemplo')).product, null)
assert.deepEqual(await service.byVariantIds(['ffffffff-ffff-4fff-8fff-ffffffffffff']), [])
assert.ok(list.products.every(p => p.published && !p.demo))
console.log(JSON.stringify({ ok: true, productsOnFirstPage: list.products.length, publicCount: list.count, categories: categories.length, filtersAndPagination: 'OK', hiddenAndMissingSlugs: 'OK', missingCartVariants: 'OK' }))

// Read-only comparison; never prints keys or signed URLs. Run with --env-file=.env.local.
import { createClient } from '@supabase/supabase-js'
import { createCatalogService } from '../src/services/catalog-service.js'
import { pathToFileURL } from 'node:url'
const baselineService = process.env.BASELINE_CATALOG_MODULE ? (await import(pathToFileURL(process.env.BASELINE_CATALOG_MODULE).href)).createCatalogService : null
const origin = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!origin || !key?.startsWith('sb_publishable_')) throw Error('Missing public Supabase configuration')
for (const [label, factory] of [...(baselineService ? [['before', baselineService]] : []), ['after', createCatalogService]]) {
 const requests = []
 const client = createClient(origin, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: async (input, options) => {
  const started = performance.now()
  const response = await fetch(input, { ...options, signal: AbortSignal.timeout(15000) })
  const body = await response.clone().arrayBuffer()
  const path = new URL(input).pathname
  requests.push({ type: path.includes('/storage/') ? 'sign' : 'data', status: response.status, bytes: body.byteLength, ms: Math.round(performance.now() - started), exactCount: new Headers(options.headers).get('prefer')?.includes('count=exact') || false, signedPaths: path.includes('/storage/') ? JSON.parse(options.body).paths?.length : 0 })
  return response
 } } })
 const service = factory(client, { reuseSignedUrls: true, thumbnails: process.env.VITE_PRODUCT_THUMBNAILS === 'true' })
 const list = await service.list()
 if (list.products[0]) await service.bySlug(list.products[0].slug)
 await service.list({ featured: true, pageSize: 6, includeCount: false })
 console.log(JSON.stringify({ label, products: list.count, requests, responseBytes: requests.reduce((sum, r) => sum + r.bytes, 0), exactCounts: requests.filter(r => r.exactCount).length, signedPaths: requests.reduce((sum, r) => sum + (r.signedPaths || 0), 0) }))
 await client.auth.dispose()
}

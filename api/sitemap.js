import { createClient } from '@supabase/supabase-js'
import { PRODUCTION_ORIGIN, siteOrigin } from '../src/lib/metadata.js'
import { selectPublicProducts } from '../src/services/catalog-service.js'

const pageSize = 500
const publicPaths = ['/', '/catalogo', '/contacto']
const productSlug = /^[a-z0-9]+(-[a-z0-9]+)*$/

export async function listProductSlugs(client, signal) {
  const slugs = []
  let cursor = ''
  while (true) {
    const query = selectPublicProducts(client, 'slug,categorias!inner(activa)')
      .order('slug').limit(pageSize).abortSignal(signal)
    const { data, error } = await (cursor ? query.gt('slug', cursor) : query)
    if (error) throw error
    if (data.length === 0) return slugs
    slugs.push(...data.map(row => row.slug))
    cursor = data.at(-1).slug
  }
}

export default async function handler(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return response.status(405).setHeader('Allow', 'GET, HEAD').end()
  }

  try {
    const { VITE_SITE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = process.env
    const origin = siteOrigin(VITE_SITE_URL || PRODUCTION_ORIGIN)
    if (!VITE_SUPABASE_URL || !VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')) {
      throw new Error('Missing public catalog configuration')
    }
    const client = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const slugs = await listProductSlugs(client, AbortSignal.timeout(8000))
    const paths = [...publicPaths, ...slugs.filter(slug => productSlug.test(slug)).map(slug => `/productos/${slug}`)]
    const urls = paths.map(path => `  <url><loc>${new URL(path, origin).href}</loc></url>`).join('\n')
    response.setHeader('Content-Type', 'application/xml; charset=utf-8')
    response.setHeader('Cache-Control', 'public, max-age=0')
    response.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
    return response.status(200).end(request.method === 'HEAD' ? undefined : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  } catch (error) {
    console.error('Sitemap unavailable', error.code || error.message)
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Retry-After', '300')
    return response.status(503).end('Sitemap temporalmente no disponible')
  }
}

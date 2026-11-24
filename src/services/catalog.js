import { requirePublicSupabase } from '@/lib/supabase'
import { createCatalogService } from './catalog-service'
import { PRODUCT_THUMBNAILS } from '@/lib/image-settings'
export { PUBLIC_REFRESH_MS } from './catalog-service'
let service
export function invalidateCatalog() {
  service?.clearCache()
}
export function catalogService() {
  service ||= createCatalogService(requirePublicSupabase(), { reuseSignedUrls: true, cacheResults: true, signedUrlSeconds: 300, thumbnails: PRODUCT_THUMBNAILS })
  return service
}

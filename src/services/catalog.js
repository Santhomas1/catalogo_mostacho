import { requirePublicSupabase } from '@/lib/supabase'
import { createCatalogService } from './catalog-service'
import { PRODUCT_THUMBNAILS } from '@/lib/image-settings'
let service
export function catalogService() {
  service ||= createCatalogService(requirePublicSupabase(), { reuseSignedUrls: true, thumbnails: PRODUCT_THUMBNAILS })
  return service
}

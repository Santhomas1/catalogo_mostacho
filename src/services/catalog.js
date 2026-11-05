import { requireSupabase } from '@/lib/supabase'
import { createCatalogService } from './catalog-service'
let service
export function catalogService() {
  service ||= createCatalogService(requireSupabase())
  return service
}

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { routeMetadata, writeMetadata, siteOrigin } from '@/lib/metadata'
const configuredOrigin = siteOrigin(import.meta.env.VITE_SITE_URL || '')
export default function PageMetadata({ metadata }) {
  const { pathname, search } = useLocation()
  const value = metadata || routeMetadata(pathname, search)
  useEffect(() => { writeMetadata(document, value, configuredOrigin || window.location.origin, pathname) }, [value.title, value.description, value.noIndex, value.followLinks, value.canonicalPath, pathname, search])
  return null
}

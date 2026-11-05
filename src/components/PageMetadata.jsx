import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { routeMetadata, writeMetadata } from '@/lib/metadata'
export default function PageMetadata({ metadata }) {
  const { pathname } = useLocation()
  const value = metadata || routeMetadata(pathname)
  useEffect(() => { writeMetadata(document, value, window.location.origin, pathname) }, [value.title, value.description, value.noIndex, pathname])
  return null
}

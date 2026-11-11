import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { catalogService } from '@/services/catalog'
import { useRemote } from '@/hooks/useRemote'
import RemoteState from '@/components/RemoteState'
import ProductCard from '@/components/ProductCard'
export default function HomeCatalog() {
  const loader = useCallback(async () => {
    return catalogService().list({ featured: true, pageSize: 6, includeCount: false })
  }, [])
  const { data, loading, error, retry } = useRemote(loader, 45000)
  return <section className="container catalog-page"><p className="eyebrow">EXPLORÁ MOSTACHO</p><div className="section-heading"><h2>Destacados</h2><Link className="catalog-all-link" to="/catalogo">Ver todo el catálogo <ArrowRight size={16} aria-hidden="true" /></Link></div><RemoteState loading={loading} error={error} retry={retry} />{data && <>{data.imageWarning && <p role="status">Algunas fotos están temporalmente sin conexión.</p>}{data.products.length ? <div className="product-grid home-products">{data.products.map(p => <ProductCard product={p} headingLevel={3} key={p.id} />)}</div> : <p className="home-products">No hay destacados disponibles en este momento. Explorá el catálogo para ver todos los productos.</p>}</>}</section>
}

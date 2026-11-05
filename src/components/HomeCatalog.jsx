import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { catalogService } from '@/services/catalog'
import { useRemote } from '@/hooks/useRemote'
import RemoteState from '@/components/RemoteState'
import ProductCard from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
export default function HomeCatalog() {
  const loader = useCallback(async () => {
    const service = catalogService()
    const [result, categories] = await Promise.all([service.list({ featured: true, pageSize: 6 }), service.categories()])
    return { ...result, categories }
  }, [])
  const { data, loading, error, retry } = useRemote(loader, 45000)
  return <section className="container catalog-page"><p className="eyebrow">EXPLORÁ MOSTACHO</p><h2>Categorías y destacados</h2><RemoteState loading={loading} error={error} retry={retry} />{data && <><div className="hero-actions">{data.categories.map(c => <Button asChild variant="outline" key={c.id}><Link to={`/catalogo?categoria=${encodeURIComponent(c.slug)}`}>{c.name}</Link></Button>)}</div>{data.imageWarning && <p role="status">Algunas fotos están temporalmente sin conexión.</p>}{data.products.length ? <div className="product-grid home-products">{data.products.map(p => <ProductCard product={p} key={p.id} />)}</div> : <p className="home-products">Estamos preparando nuestros próximos destacados. Mientras tanto, contanos qué te gustaría imprimir.</p>}</>}</section>
}

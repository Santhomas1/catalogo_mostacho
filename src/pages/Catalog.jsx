import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '@/components/ProductCard'
import { catalogService } from '@/services/catalog'
import { PAGE_SIZE } from '@/services/catalog-service'
import { useRemote } from '@/hooks/useRemote'
import RemoteState from '@/components/RemoteState'
import { Button } from '@/components/ui/button'
import { Search, ChevronDown } from 'lucide-react'
export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') || '').slice(0, 120), category = params.get('categoria') || ''
  const rawPage = Number(params.get('pagina') || 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100000) : 1
  const loader = useCallback(async () => {
    const service = catalogService()
    const [result, categories] = await Promise.all([service.list({ query, category, page }), service.categories()])
    return { ...result, categories }
  }, [query, category, page])
  const { data, loading, error, retry } = useRemote(loader, 45000)
  const currentPage = data?.page || page
  function filter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'pagina') next.delete('pagina')
    setParams(next, { replace: key !== 'pagina' })
  }
  return <section className="container catalog-page"><p className="eyebrow">CATÁLOGO MOSTACHO</p><h1>Ideas para llevar a casa.</h1>
    <div className="catalog-filters" role="group" aria-label="Buscar y filtrar productos">
      <label className="catalog-search"><span className="catalog-filter-label">Buscar por nombre</span><span className="catalog-search-control"><Search size={18} aria-hidden="true" /><input type="search" value={query} maxLength={120} onChange={e => filter('q', e.target.value)} placeholder="Buscar productos…" /></span></label>
      <label className="catalog-category"><span className="catalog-filter-label">Categoría</span><span className="catalog-category-control"><select value={category} onChange={e => filter('categoria', e.target.value)}><option value="">Todas las categorías</option>{category && !data?.categories.some(c => c.slug === category) && <option value={category}>{category}</option>}{data?.categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></span></label>
      <p className="catalog-result-count" role="status" aria-atomic="true">{data && <><span>{data.count}</span> {data.count === 1 ? 'producto' : 'productos'}</>}</p>
    </div>
    <RemoteState loading={loading} error={error} retry={retry} />
    {data && <>{data.pageReset && <p role="status">Esa página ya no está disponible. Mostramos la primera.</p>}
      {data.imageWarning && <p role="status">Algunas fotos no pudieron cargarse. <button className="back-link" onClick={retry}>Reintentar fotos</button></p>}
      {data.products.length ? <div className="product-grid">{data.products.map(p => <ProductCard key={p.id} product={p} />)}</div> : <div className="catalog-no-results"><h2>{query || category || page > 1 ? 'No encontramos productos con esos filtros.' : 'El catálogo está tomando forma.'}</h2><p>{query || category || page > 1 ? 'Probá otro nombre, categoría o página.' : 'Todavía no hay productos publicados. Podés consultarnos por tu idea.'}</p>{(query || category || page > 1) && <Button variant="outline" onClick={() => setParams({})}>Limpiar filtros</Button>}</div>}
      {(currentPage > 1 || data.count > PAGE_SIZE) && <nav className="pagination" aria-label="Páginas del catálogo"><Button variant="outline" disabled={currentPage === 1} onClick={() => filter('pagina', String(currentPage - 1))}>Anterior</Button><span>Página {currentPage} de {Math.max(1, Math.ceil(data.count / PAGE_SIZE))}</span><Button variant="outline" disabled={currentPage * PAGE_SIZE >= data.count} onClick={() => filter('pagina', String(currentPage + 1))}>Siguiente</Button></nav>}
    </>}
  </section>
}

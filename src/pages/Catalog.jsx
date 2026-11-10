import { useCallback, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  const loader = useCallback(() => catalogService().list({ query, category, page }), [query, category, page])
  const categoryLoader = useCallback(() => catalogService().categories(), [])
  const { data, loading, error, retry } = useRemote(loader, 45000)
  const { data: categories, loading: categoriesLoading, error: categoriesError, retry: retryCategories } = useRemote(categoryLoader, 45000)
  const currentPage = data?.page || page
  const hasFilters = Boolean(query || category)
  const heading = useRef(null), previousPage = useRef(page)
  useEffect(() => {
    if (previousPage.current !== page) {
      heading.current?.focus({ preventScroll: true })
      heading.current?.scrollIntoView({ block: 'start' })
    }
    previousPage.current = page
  }, [page])
  useEffect(() => {
    if (!data?.pageReset || page === data.page) return
    const next = new URLSearchParams(params)
    if (data.page > 1) next.set('pagina', String(data.page)); else next.delete('pagina')
    setParams(next, { replace: true })
  }, [data?.pageReset, data?.page, page, params, setParams])
  function pageHref(value) {
    const next = new URLSearchParams(params)
    if (value > 1) next.set('pagina', String(value)); else next.delete('pagina')
    const search = next.toString()
    return `/catalogo${search ? `?${search}` : ''}`
  }
  function filter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'pagina') next.delete('pagina')
    setParams(next, { replace: key !== 'pagina' })
  }
  return <section className="container catalog-page"><p className="eyebrow">CATÁLOGO MOSTACHO</p><h1 ref={heading} tabIndex={-1}>Ideas para llevar a casa.</h1>
    <div className="catalog-filters" role="group" aria-label="Buscar y filtrar productos">
      <label className="catalog-search"><span className="catalog-filter-label">Buscar por nombre</span><span className="catalog-search-control"><Search size={18} aria-hidden="true" /><input type="search" value={query} maxLength={120} onChange={e => filter('q', e.target.value)} placeholder="Buscar productos…" /></span></label>
      <label className="catalog-category"><span className="catalog-filter-label">Categoría</span><span className="catalog-category-control"><select value={category} disabled={categoriesLoading && !categories} onChange={e => filter('categoria', e.target.value)}><option value="">Todas las categorías</option>{category && !categories?.some(c => c.slug === category) && <option value={category}>{category}</option>}{categories?.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></span></label>
      <div className="catalog-filter-actions"><p className="catalog-result-count" role="status" aria-atomic="true">{data && <><span>{data.count}</span> {data.count === 1 ? 'producto' : 'productos'}</>}</p>{hasFilters && <Button variant="ghost" onClick={() => setParams({})}>Limpiar filtros</Button>}</div>
    </div>
    {categoriesError && <p role="alert">No pudimos cargar las categorías. Podés buscar por nombre o <button className="back-link" onClick={retryCategories}>Reintentar categorías</button>.</p>}
    <RemoteState loading={loading} error={error} retry={retry} />
    {data && <>{data.pageReset && <p role="status">Esa página ya no está disponible. Mostramos la primera.</p>}
      {data.imageWarning && <p role="status">Algunas fotos no pudieron cargarse. <button className="back-link" onClick={retry}>Reintentar fotos</button></p>}
      {data.products.length ? <div className="product-grid">{data.products.map(p => <ProductCard key={p.id} product={p} />)}</div> : <div className="catalog-no-results"><h2>{hasFilters || page > 1 ? 'No encontramos productos con esos filtros.' : 'No hay productos disponibles por el momento.'}</h2><p>{hasFilters || page > 1 ? 'Probá otro nombre, categoría o página.' : 'Podés volver más tarde o consultarnos por tu idea.'}</p>{!hasFilters && (page > 1 ? <Button variant="outline" onClick={() => setParams({})}>Volver a la primera página</Button> : <Button asChild variant="outline"><Link to="/contacto">Consultar por una idea</Link></Button>)}</div>}
      {(currentPage > 1 || data.count > PAGE_SIZE) && <nav className="pagination" aria-label="Páginas del catálogo">{currentPage > 1 ? <Button variant="outline" asChild><Link to={pageHref(currentPage - 1)} rel="prev">Anterior</Link></Button> : <Button variant="outline" disabled>Anterior</Button>}<span role="status" aria-live="polite">Página {currentPage} de {Math.max(1, Math.ceil(data.count / PAGE_SIZE))}</span>{currentPage * PAGE_SIZE < data.count ? <Button variant="outline" asChild><Link to={pageHref(currentPage + 1)} rel="next">Siguiente</Link></Button> : <Button variant="outline" disabled>Siguiente</Button>}</nav>}
    </>}
  </section>
}

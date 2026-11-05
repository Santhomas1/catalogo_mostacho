import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPrice, isAgreedPrice, AGREED_PRICE_LABEL } from '@/lib/pricing'

export { formatPrice } from '@/lib/pricing'

export function ProductVisual() {
  return <div className="product-visual"><img className="product-placeholder" src="/images/producto-sin-imagen.svg" alt="Imagen no disponible" width="640" height="640" /></div>
}

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false)
  const cover = product.images?.[0]
  useEffect(() => { setImageFailed(false) }, [cover?.url])
  const variants = product.variants.filter(v => v.active && v.availability !== 'no_disponible')
  const fixed = variants.filter(v => !isAgreedPrice(v))
  const quoted = variants.some(isAgreedPrice)
  const currencies = new Set(fixed.map(v => v.currency))
  const canPrice = fixed.length > 0 && currencies.size === 1
  const price = canPrice ? Math.min(...fixed.map(v => v.price)) : null
  const differentPrices = canPrice && (quoted || fixed.some(v => v.price !== price))
  const availability = !product.variants.length ? 'Consultar disponibilidad' : !variants.length ? 'No disponible' : 'Por pedido'
  const href = `/productos/${product.slug}`
  return <Card className="product-card" role="article" aria-label={product.name}>
    <div className="product-media">
      <Link className="product-image-link" to={href} aria-label={`Ver ${product.name}`} tabIndex={-1}>
        {cover && !imageFailed ? <img className="product-photo" src={cover.url} alt={cover.alt} loading="lazy" decoding="async" width="640" height="640" onError={() => setImageFailed(true)} /> : <ProductVisual />}
      </Link>
      {product.demo && <span className="demo-badge">Producto de prueba</span>}
    </div>
    <CardContent className="product-card-content">
      <div className="product-card-meta">
        <p className="product-category">{product.category}</p>
        <span className={`product-status${variants.length ? '' : ' product-status-muted'}`}>{availability}</span>
      </div>
      <h2 className="product-name"><Link to={href} title={product.name}>{product.name}</Link></h2>
      <div className="product-card-bottom">
        <div className="product-pricing">
          <p className="product-price-caption">{canPrice ? 'Precio' : 'Precio a consultar'}</p>
          <p className={`product-price${canPrice ? '' : ' product-price-quote'}`}>{canPrice ? `${differentPrices ? 'Desde ' : ''}${formatPrice(price, fixed[0].currency)}` : AGREED_PRICE_LABEL}</p>
          {canPrice && quoted && <p className="product-price-note">Otras opciones: acordar con el vendedor</p>}
        </div>
        <Button asChild className="product-button"><Link to={href} aria-label={`Ver producto: ${product.name}`}>Ver producto <ArrowRight aria-hidden="true" /></Link></Button>
      </div>
    </CardContent>
  </Card>
}

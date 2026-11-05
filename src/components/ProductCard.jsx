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
  return <Card className="product-card">
    <div className="product-media">{cover && !imageFailed ? <img className="product-photo" src={cover.url} alt={cover.alt} loading="lazy" onError={() => setImageFailed(true)} /> : <ProductVisual />}{product.demo && <span className="demo-badge">Producto de prueba</span>}</div>
    <CardContent>
      <p className="product-category">{product.category}</p>
      <h2 className="product-name"><Link to={`/productos/${product.slug}`}>{product.name}</Link></h2>
      <p className="product-price">{canPrice ? `${differentPrices ? 'Desde ' : ''}${formatPrice(price, fixed[0].currency)}` : AGREED_PRICE_LABEL}</p>
      {canPrice && quoted && <p className="product-availability">Otras opciones: acordar con el vendedor</p>}
      <p className="product-availability">{availability}</p>
      <Button asChild variant="outline" className="product-button"><Link to={`/productos/${product.slug}`}>Ver opciones <ArrowRight /></Link></Button>
    </CardContent>
  </Card>
}

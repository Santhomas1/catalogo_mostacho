import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, MessageCircle, Sparkles, MapPin, Printer, Layers3, Shapes, PackageCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { business } from '@/lib/business'
import HomeCatalog from '@/components/HomeCatalog'
import GoogleReviewCard from '@/components/GoogleReviewCard'

export default function Home() {
  return <>
    <section className="container hero">
      <div className="hero-copy">
        <p className="eyebrow hero-location"><MapPin size={16} aria-hidden="true" />{business.city}, {business.region}, {business.country}</p>
        <h1>Tu idea.<br />Otra <span className="highlight">dimensión.</span></h1>
        <p className="hero-description">Hacemos impresiones 3D por pedido en {business.city}. Contanos qué querés imprimir y coordinamos el retiro.</p>
        <div className="hero-actions"><Button asChild className="atelier-shimmer"><Link to="/catalogo">Explorar catálogo <ArrowRight aria-hidden="true" /></Link></Button></div>
        <div className="hero-details"><span><Shapes aria-hidden="true" />Diseños a pedido</span><span><Layers3 aria-hidden="true" />Capa por capa</span></div>
        <p className="hero-note"><MapPin size={14} aria-hidden="true" /> San Miguel de Tucumán · Retiro coordinado</p>
      </div>
      <div className="idea-shell">
        <span className="atelier-border-beam" aria-hidden="true" />
        <div className="idea-panel">
          <div className="atelier-dot-pattern" aria-hidden="true" />
          <div className="panel-top"><span className="panel-index"><Printer aria-hidden="true" />DE LA IDEA A LA FORMA</span><img className="panel-favicon" src="/logo/favicon-mostacho.svg" alt="" width="48" height="48" /></div>
          <div className="sculpture" aria-hidden="true"><div className="sculpture-orbit" /><div className="sculpture-core" /><span className="sculpture-caption">CAPAS DE IMAGINACIÓN</span></div>
          <div className="type-art" aria-hidden="true"><span>¿Y si</span><span>lo hacemos</span><span className="art-last">real?<Sparkles /></span></div>
          <div className="idea-material-tag" aria-hidden="true"><Layers3 /><span>Una idea.<br /><strong>Muchas posibilidades.</strong></span></div>
          <div className="panel-bottom"><span>Vos imaginás.<br /><strong>Nosotros imprimimos.</strong></span><Shapes className="panel-signature" aria-hidden="true" /></div>
        </div>
      </div>
    </section>
    <section className="process-strip" aria-label="Cómo trabajamos">
      <div className="container process-inner">
        <span><span className="process-icon"><MessageCircle aria-hidden="true" /></span><span className="process-copy"><strong>Contanos qué imaginás</strong><small>Un producto del catálogo o tu propia idea.</small></span></span>
        <span><span className="process-icon"><Printer aria-hidden="true" /></span><span className="process-copy"><strong>Le damos forma</strong><small>Coordinamos materiales, tamaño y detalles.</small></span></span>
        <span><span className="process-icon"><PackageCheck aria-hidden="true" /></span><span className="process-copy"><strong>Coordinamos tu retiro</strong><small>Hecho para vos, acá en Tucumán.</small></span></span>
      </div>
    </section>
    <HomeCatalog />
    <section className="container catalog-intro">
      <Shapes className="intro-ornament" aria-hidden="true" />
      <div><p className="eyebrow">UN ESPACIO PARA TUS IDEAS</p><h2>Encontrá tu próxima idea favorita.</h2><p>Descubrí nuestros productos y, si tenés algo distinto en mente, contanos qué te gustaría imprimir.</p></div>
      <Button variant="outline" asChild><a href={business.whatsapp} target="_blank" rel="noreferrer">Consultar por WhatsApp <ArrowUpRight aria-hidden="true" /></a></Button>
    </section>
    <div className="container home-google-review"><GoogleReviewCard /></div>
  </>
}

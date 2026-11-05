import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, MessageCircle, Sparkles, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { business } from '@/lib/business'
import HomeCatalog from '@/components/HomeCatalog'


export default function Home() {
  return <>
    <section className="container hero">
      <div className="hero-copy"><p className="eyebrow hero-location"><MapPin size={16} aria-hidden="true" />San Miguel de Tucumán - Tucumán</p><h1>Tu idea.<br />Otra <span className="highlight">dimensión.</span></h1><p className="hero-description">Eso que tenés en mente puede tomar forma. Contanos tu idea y veamos cómo llevarla al mundo de la impresión 3D.</p><div className="hero-actions"><Button asChild><a href={business.whatsapp} target="_blank" rel="noreferrer">Hablemos de tu idea <ArrowUpRight /></a></Button><Button asChild variant="outline"><Link to="/catalogo">Explorar catálogo <ArrowRight /></Link></Button></div><p className="hero-note"><MapPin size={14} /> San Miguel de Tucumán · Retiro coordinado</p></div>
      <div className="idea-panel"><div className="panel-top"><span className="panel-index">DE LA IDEA A LA FORMA / 01</span><img className="panel-favicon" src="/logo/favicon-mostacho.svg" alt="" width="48" height="48" /></div><div className="type-art" aria-hidden="true"><span>¿Y si</span><span>lo hacemos</span><span className="art-last">real?<Sparkles /></span></div><div className="panel-bottom"><span>Vos imaginás.<br /><strong>Nosotros imprimimos.</strong></span><span className="smile" aria-hidden="true">:)</span></div></div>
    </section>
    <section className="process-strip"><div className="container process-inner"><span><MessageCircle /> Contanos qué imaginás</span><span><Sparkles /> Evaluamos cómo imprimirlo</span><span><MapPin /> Coordinamos tu retiro</span></div></section>
    <HomeCatalog />
    <section className="container catalog-intro"><div><p className="eyebrow">UN ESPACIO PARA TUS IDEAS</p><h2>El catálogo está tomando forma.</h2><p>Explorá el catálogo o conversemos sobre lo que te gustaría imprimir.</p></div><Button variant="outline" asChild><a href={business.whatsapp} target="_blank" rel="noreferrer">Consultar por WhatsApp <ArrowUpRight /></a></Button></section>
  </>
}

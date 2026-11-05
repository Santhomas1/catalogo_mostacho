import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function EmptyPage({ eyebrow, title, description, action = 'Volver al inicio', to = '/' }) {
  return <section className="container empty-page"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p><Button asChild variant="outline"><Link to={to}>{action}</Link></Button></section>
}

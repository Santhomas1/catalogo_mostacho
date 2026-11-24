import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { business } from '@/lib/business'

export default function GoogleReviewCard() {
  if (!business.googleReviews) return null

  return <section className="google-review-card" aria-label="Dejá tu reseña en Google Maps">
    <div className="google-review-icon" aria-hidden="true"><Star /></div>
    <div className="google-review-copy">
      <p className="google-review-label">MOSTACHO 3D EN GOOGLE MAPS</p>
      <h2>Tu experiencia también cuenta.</h2>
      <p>¿Ya hicimos realidad tu idea? Contanos cómo fue. Tu reseña ayuda a que más personas conozcan nuestro trabajo.</p>
    </div>
    <div className="google-review-action">
      <Button asChild><a href={business.googleReviews} target="_blank" rel="noopener noreferrer">Dejar una reseña</a></Button>
      <p>Se abre Google Maps en otra pestaña.</p>
    </div>
  </section>
}

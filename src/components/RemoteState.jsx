import { Button } from '@/components/ui/button'
export default function RemoteState({ loading, error, retry }) {
  if (loading) return <div className="remote-state" role="status" aria-live="polite"><span className="loading-bar" />Cargando información…</div>
  if (error) return <div className="remote-state" role="alert"><p>{error}</p><Button variant="outline" onClick={retry}>Reintentar</Button></div>
  return null
}

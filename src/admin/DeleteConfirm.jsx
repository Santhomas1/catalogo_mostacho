import { Button } from '@/components/ui/button'
export default function DeleteConfirm({ title, busy, onConfirm, onCancel }) {
  return <div className="admin-danger" role="group" aria-label="Confirmar eliminación"><p><strong>{title}</strong></p><p>Esta eliminación es definitiva. Si solo querés dejar de mostrarlo, cancelá y usá desactivar u ocultar.</p><div className="hero-actions"><Button disabled={busy} onClick={onConfirm}>Sí, eliminar definitivamente</Button><Button disabled={busy} variant="outline" autoFocus onClick={onCancel}>Cancelar</Button></div></div>
}

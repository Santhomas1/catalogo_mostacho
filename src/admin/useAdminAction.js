import { useRef, useState } from 'react'
import { adminError } from './admin-service'
export function useAdminAction() {
  const locked = useRef(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  async function run(task, message = 'Cambios guardados.') {
    if (locked.current) return false
    locked.current = true; setBusy(true); setError(''); setNotice('')
    try { await task(); setNotice(message); return true }
    catch (problem) { setError(adminError(problem)); return false }
    finally { locked.current = false; setBusy(false) }
  }
  return { busy, error, notice, run, clear: () => { setError(''); setNotice('') } }
}
